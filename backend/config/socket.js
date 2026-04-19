const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const redis = require('./redis');
const { haversine } = require('../utils/geo');

let io;

const initSocket = server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // ── Auth middleware ──────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) { socket.user = null; return next(); }
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on('connection', socket => {
    const uid  = socket.user?.id   || 'guest';
    const role = socket.user?.role || 'guest';
    console.log(`🔌 Connected: ${uid} (${role})`);

    // ── Join org room ──────────────────────────────────────
    socket.on('join:organization', async ({ organizationId }) => {
      if (!organizationId) return;
      socket.join(`org:${organizationId}`);
      socket.organizationId = organizationId;

      // Send current shuttle positions
      const positions = await redis.getAllPositions();
      const relevant  = positions.filter(p => p.organizationId === organizationId);
      if (relevant.length) socket.emit('shuttle:allPositions', relevant);
    });

    // ── Driver: start trip ─────────────────────────────────
    socket.on('driver:startTrip', ({ tripId, shuttleId, routeId }) => {
      if (socket.user?.role !== 'driver') return;
      socket.tripId   = tripId;
      socket.shuttleId = shuttleId;
      socket.join(`shuttle:${shuttleId}`);
      console.log(`🚌 Driver ${uid} started trip ${tripId}`);
    });

    // ── Driver: location update ────────────────────────────
    socket.on('driver:location', async ({ lat, lng, speed, heading, passengerCount, shuttleId }) => {
      if (socket.user?.role !== 'driver' || !socket.organizationId) return;

      const posData = {
        shuttleId,
        organizationId: socket.organizationId,
        lat, lng, speed: speed || 0,
        heading: heading || 0,
        passengerCount: passengerCount || 0,
        timestamp: Date.now(),
        driverId: uid,
      };

      // Persist in Redis (30s TTL — auto-cleans if driver disconnects)
      await redis.setPosition(shuttleId, posData);

      // Broadcast to all org members
      io.to(`org:${socket.organizationId}`).emit('shuttle:position', posData);

      // Geofence check — server-side for reliability
      try {
        const { Geofence } = require('../models/index');
        const fences = await Geofence.find({
          organizationId: socket.organizationId,
          isActive: true,
        }).populate('stopId', 'name');

        for (const fence of fences) {
          const dist = haversine(lat, lng, fence.center.lat, fence.center.lng) * 1000; // metres
          if (dist <= fence.radiusMeters) {
            io.to(`org:${socket.organizationId}`).emit('geofence:arrived', {
              shuttleId,
              stopId:   fence.stopId._id,
              stopName: fence.stopId.name,
              timestamp: Date.now(),
            });
          }
        }
      } catch { /* Geofence check non-fatal */ }
    });

    // ── Driver: passenger count ───────────────────────────
    socket.on('driver:passengerCount', ({ shuttleId, count }) => {
      if (socket.user?.role !== 'driver') return;
      io.to(`org:${socket.organizationId}`).emit('shuttle:capacity', { shuttleId, passengerCount: count });
    });

    // ── Driver: delay report ──────────────────────────────
    socket.on('driver:delay', ({ shuttleId, routeId, estimatedDelay, message }) => {
      if (socket.user?.role !== 'driver') return;
      io.to(`org:${socket.organizationId}`).emit('shuttle:delay', {
        shuttleId, routeId, estimatedDelay, message,
        reportedAt: Date.now(),
      });
    });

    // ── Driver: emergency SOS ─────────────────────────────
    socket.on('driver:emergency', ({ shuttleId, lat, lng }) => {
      if (socket.user?.role !== 'driver') return;
      // Alert admin
      io.to(`org:${socket.organizationId}`).emit('emergency:sos', {
        shuttleId, driverId: uid, location: { lat, lng }, timestamp: Date.now(),
      });
      // Alert all students
      io.to(`org:${socket.organizationId}`).emit('shuttle:emergency', { shuttleId });
      console.log(`🆘 SOS from driver ${uid} at ${lat},${lng}`);
    });

    // ── Driver: end trip ──────────────────────────────────
    socket.on('driver:endTrip', async ({ shuttleId }) => {
      if (socket.user?.role !== 'driver') return;
      await redis.removePosition(shuttleId);
      io.to(`org:${socket.organizationId}`).emit('shuttle:offline', { shuttleId });
      socket.leave(`shuttle:${shuttleId}`);
    });

    // ── Admin: broadcast ──────────────────────────────────
    socket.on('admin:broadcast', ({ organizationId, message, type }) => {
      if (!['admin', 'superadmin'].includes(socket.user?.role)) return;
      io.to(`org:${organizationId}`).emit('admin:announcement', { message, type, timestamp: Date.now() });
    });

    // ── Admin: live route update ──────────────────────────
    socket.on('admin:updateRoute', ({ routeId, changes }) => {
      if (!['admin', 'superadmin'].includes(socket.user?.role)) return;
      io.to(`org:${socket.organizationId}`).emit('route:updated', {
        routeId, changes, timestamp: Date.now(),
      });
    });

    // ── Chat: join room ───────────────────────────────────
    socket.on('chat:join', ({ roomId }) => {
      socket.join(`chat:${roomId}`);
    });

    socket.on('chat:leave', ({ roomId }) => {
      socket.leave(`chat:${roomId}`);
    });

    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`chat:${roomId}`).emit('chat:typing', {
        userId: uid, roomId, isTyping,
      });
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${uid}`);
      // If driver was on trip, remove position from Redis
      if (socket.user?.role === 'driver' && socket.shuttleId) {
        await redis.removePosition(socket.shuttleId);
        if (socket.organizationId) {
          io.to(`org:${socket.organizationId}`).emit('shuttle:offline', {
            shuttleId: socket.shuttleId,
          });
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
