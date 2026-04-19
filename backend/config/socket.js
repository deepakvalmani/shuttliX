/**
 * backend/config/socket.js  v2.0
 *
 * ROOT CAUSE OF CHAT BUG (now fixed):
 * The previous code handled `chat:join` and `chat:leave` events
 * which are emitted by the frontend when opening a room — but the
 * socket server ALSO needs to persist the membership so that when
 * a REST POST /messages fires `getIO().to('chat:roomId').emit(...)`,
 * the recipient's socket has already joined that room.
 *
 * Fix: on `join:organization`, automatically join all chat rooms the
 * user is a member of. This ensures messages are delivered even if the
 * recipient hasn't opened that specific conversation.
 */
const { Server } = require('socket.io');
const jwt     = require('jsonwebtoken');
const redis   = require('./redis');
const logger  = require('../utils/logger');
const { haversine } = require('../utils/geo');

let io;

const initSocket = server => {
  const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',').map(s => s.trim());

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  30000,
    pingInterval: 10000,
  });

  // ── Auth middleware ────────────────────────────────────
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
      next(); // still allow connection for public page
    }
  });

  io.on('connection', socket => {
    const uid  = socket.user?.id   || 'guest';
    const role = socket.user?.role || 'guest';
    logger.debug(`🔌 Connected: ${uid} (${role})`);

    // ── Join org room + auto-join all chat rooms ────────
    socket.on('join:organization', async ({ organizationId }) => {
      if (!organizationId) return;
      socket.join(`org:${organizationId}`);
      socket.organizationId = organizationId;

      // Send current shuttle positions immediately
      try {
        const positions = await redis.getAllPositions();
        const relevant  = positions.filter(p => p.organizationId === organizationId);
        if (relevant.length) socket.emit('shuttle:allPositions', relevant);
      } catch {}

      // ★ FIX: auto-join all chat rooms this user belongs to
      // This ensures getIO().to('chat:roomId').emit() delivers to them
      // even when they haven't opened the chat tab
      if (socket.user?.id) {
        try {
          const { ChatRoom } = require('../models/index');
          const rooms = await ChatRoom.find({ members: socket.user.id }).select('roomId');
          rooms.forEach(r => socket.join(`chat:${r.roomId}`));
          logger.debug(`💬 ${uid} auto-joined ${rooms.length} chat room(s)`);
        } catch {}
      }
    });

    // ── Driver: start trip ─────────────────────────────
    socket.on('driver:startTrip', ({ tripId, shuttleId, routeId }) => {
      if (socket.user?.role !== 'driver') return;
      socket.tripId    = tripId;
      socket.shuttleId = shuttleId;
      socket.join(`shuttle:${shuttleId}`);
      logger.info(`🚌 Driver ${uid} started trip ${tripId}`);
    });

    // ── Driver: location update ────────────────────────
    socket.on('driver:location', async ({ lat, lng, speed, heading, passengerCount, shuttleId }) => {
      if (socket.user?.role !== 'driver' || !socket.organizationId) return;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return; // reject bad coords

      const posData = {
        shuttleId,
        organizationId: socket.organizationId,
        lat:  parseFloat(lat),
        lng:  parseFloat(lng),
        speed:          speed          || 0,
        heading:        heading        || 0,
        passengerCount: passengerCount || 0,
        timestamp: Date.now(),
        driverId:  uid,
      };

      await redis.setPosition(shuttleId, posData);
      io.to(`org:${socket.organizationId}`).emit('shuttle:position', posData);

      // Geofence check (non-fatal)
      try {
        const { Geofence } = require('../models/index');
        const fences = await Geofence.find({
          organizationId: socket.organizationId,
          isActive: true,
        }).populate('stopId', 'name');

        for (const fence of fences) {
          const dist = haversine(lat, lng, fence.center.lat, fence.center.lng) * 1000;
          if (dist <= fence.radiusMeters) {
            io.to(`org:${socket.organizationId}`).emit('geofence:arrived', {
              shuttleId,
              stopId:    fence.stopId._id,
              stopName:  fence.stopId.name,
              timestamp: Date.now(),
            });
          }
        }
      } catch {}
    });

    // ── Driver: passenger count ────────────────────────
    socket.on('driver:passengerCount', ({ shuttleId, count }) => {
      if (socket.user?.role !== 'driver') return;
      io.to(`org:${socket.organizationId}`).emit('shuttle:capacity', {
        shuttleId, passengerCount: count,
      });
    });

    // ── Driver: delay report ───────────────────────────
    socket.on('driver:delay', ({ shuttleId, routeId, estimatedDelay, message }) => {
      if (socket.user?.role !== 'driver') return;
      io.to(`org:${socket.organizationId}`).emit('shuttle:delay', {
        shuttleId, routeId, estimatedDelay, message, reportedAt: Date.now(),
      });
    });

    // ── Driver: SOS ────────────────────────────────────
    socket.on('driver:emergency', ({ shuttleId, lat, lng }) => {
      if (socket.user?.role !== 'driver') return;
      io.to(`org:${socket.organizationId}`).emit('emergency:sos', {
        shuttleId, driverId: uid, location: { lat, lng }, timestamp: Date.now(),
      });
      io.to(`org:${socket.organizationId}`).emit('shuttle:emergency', { shuttleId });
      logger.warn(`🆘 SOS from driver ${uid} at ${lat},${lng}`);
    });

    // ── Driver: end trip ───────────────────────────────
    socket.on('driver:endTrip', async ({ shuttleId }) => {
      if (socket.user?.role !== 'driver') return;
      try { await redis.removePosition(shuttleId); } catch {}
      io.to(`org:${socket.organizationId}`).emit('shuttle:offline', { shuttleId });
      socket.leave(`shuttle:${shuttleId}`);
      delete socket.shuttleId;
      delete socket.tripId;
    });

    // ── Admin: broadcast ───────────────────────────────
    socket.on('admin:broadcast', ({ organizationId, message, type }) => {
      if (!['admin', 'superadmin'].includes(socket.user?.role)) return;
      io.to(`org:${organizationId}`).emit('admin:announcement', {
        message, type, timestamp: Date.now(),
      });
    });

    // ── Chat: join / leave room ────────────────────────
    // (used for "active conversation" state — unread tracking, typing)
    socket.on('chat:join', ({ roomId }) => {
      socket.join(`chat:${roomId}`);
      socket.activeRoomId = roomId;
    });

    socket.on('chat:leave', ({ roomId }) => {
      // Don't fully leave — keep them in for message delivery
      // Just clear the active room flag
      if (socket.activeRoomId === roomId) socket.activeRoomId = null;
    });

    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`chat:${roomId}`).emit('chat:typing', {
        userId: uid, roomId, isTyping,
      });
    });

    // ── Disconnect ─────────────────────────────────────
    socket.on('disconnect', async reason => {
      logger.debug(`🔌 Disconnected: ${uid} (${reason})`);
      if (socket.user?.role === 'driver' && socket.shuttleId) {
        try { await redis.removePosition(socket.shuttleId); } catch {}
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
  if (!io) throw new Error('Socket.IO not initialised — call initSocket first');
  return io;
};

module.exports = { initSocket, getIO };
