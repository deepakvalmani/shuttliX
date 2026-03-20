const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const {
  setShuttlePosition,
  getAllActiveShuttles,
  removeShuttlePosition,
} = require('./redis');
const Trip = require('../models/Trip');
const Shuttle = require('../models/Shuttle');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        socket.user = null;
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id || 'guest';
    const role = socket.user?.role || 'guest';
    console.log(`🔌 Socket connected: ${socket.id} | User: ${userId} | Role: ${role}`);

    socket.on('join:organization', ({ organizationId }) => {
      if (!organizationId) return;
      socket.join(`organization:${organizationId}`);
      socket.organizationId = organizationId;
      console.log(`📍 ${socket.id} joined organization room: ${organizationId}`);
      sendCurrentPositions(socket, organizationId);
    });

    socket.on('driver:startTrip', async ({ tripId, shuttleId, routeId }) => {
      if (socket.user?.role !== 'driver') return;
      socket.tripId = tripId;
      socket.shuttleId = shuttleId;
      socket.join(`shuttle:${shuttleId}`);
      console.log(`🚌 Driver ${socket.user.id} started trip. Shuttle: ${shuttleId}`);
    });

    socket.on('driver:location', async (data) => {
      if (socket.user?.role !== 'driver') return;
      const { lat, lng, speed, heading, passengerCount, shuttleId } = data;
      if (!lat || !lng || !shuttleId) return;

      const positionData = {
        shuttleId,
        driverId: socket.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: parseFloat(speed) || 0,
        heading: parseFloat(heading) || 0,
        passengerCount: parseInt(passengerCount) || 0,
        tripId: socket.tripId,
        routeId: socket.routeId,
        organizationId: socket.organizationId,
        timestamp: Date.now(),
        isActive: true,
      };

      await setShuttlePosition(shuttleId, positionData);
      if (socket.organizationId) {
        io.to(`organization:${socket.organizationId}`).emit('shuttle:position', positionData);
      }
      socket.emit('driver:locationAck', { timestamp: positionData.timestamp });
    });

    socket.on('driver:passengerCount', async ({ shuttleId, count }) => {
      if (socket.user?.role !== 'driver') return;
      try {
        const current = await setShuttlePosition(shuttleId, {
          ...await getShuttlePosition(shuttleId),
          passengerCount: count,
        });
        if (socket.organizationId) {
          io.to(`organization:${socket.organizationId}`).emit('shuttle:capacity', {
            shuttleId,
            passengerCount: count,
            timestamp: Date.now(),
          });
        }
      } catch (err) { console.error('passengerCount update error:', err); }
    });

    socket.on('driver:delay', ({ shuttleId, routeId, estimatedDelay, message }) => {
      if (socket.user?.role !== 'driver') return;
      if (socket.organizationId) {
        io.to(`organization:${socket.organizationId}`).emit('shuttle:delay', {
          shuttleId,
          routeId,
          estimatedDelay,
          message: message || `Route is delayed by approximately ${estimatedDelay} minutes`,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('driver:emergency', async ({ shuttleId, lat, lng, message }) => {
      if (socket.user?.role !== 'driver') return;
      const emergencyData = {
        driverId: socket.user.id,
        shuttleId,
        location: { lat, lng },
        message: message || 'Driver has triggered emergency SOS',
        timestamp: Date.now(),
      };
      io.to(`admin:${socket.organizationId}`).emit('emergency:sos', emergencyData);
      if (socket.organizationId) {
        io.to(`organization:${socket.organizationId}`).emit('shuttle:emergency', emergencyData);
      }
      console.log(`🆘 EMERGENCY from driver ${socket.user.id} at shuttle ${shuttleId}`);
    });

    socket.on('driver:endTrip', async ({ shuttleId, tripId }) => {
      if (socket.user?.role !== 'driver') return;
      await removeShuttlePosition(shuttleId);
      if (socket.organizationId) {
        io.to(`organization:${socket.organizationId}`).emit('shuttle:offline', {
          shuttleId,
          timestamp: Date.now(),
        });
      }
      socket.leave(`shuttle:${shuttleId}`);
      console.log(`🏁 Driver ${socket.user.id} ended trip. Shuttle ${shuttleId} offline.`);
    });

    socket.on('admin:join', ({ organizationId }) => {
      if (socket.user?.role !== 'admin' && socket.user?.role !== 'superadmin') return;
      socket.join(`admin:${organizationId}`);
      console.log(`👮 Admin ${socket.user.id} joined admin room for organization ${organizationId}`);
    });

    socket.on('admin:broadcast', ({ organizationId, message, type }) => {
      if (socket.user?.role !== 'admin' && socket.user?.role !== 'superadmin') return;
      io.to(`organization:${organizationId}`).emit('admin:announcement', {
        message,
        type: type || 'info',
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
      if (socket.user?.role === 'driver' && socket.shuttleId) {
        setTimeout(async () => {
          const current = await getShuttlePosition(socket.shuttleId);
          if (current && current.driverId === socket.user.id) {
            const timeSinceUpdate = Date.now() - (current.timestamp || 0);
            if (timeSinceUpdate > 25000) {
              await removeShuttlePosition(socket.shuttleId);
              if (socket.organizationId) {
                io.to(`organization:${socket.organizationId}`).emit('shuttle:offline', {
                  shuttleId: socket.shuttleId,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }, 30000);
      }
    });
  });

  console.log('📡 Socket.IO initialized');
  return io;
};

const sendCurrentPositions = async (socket, organizationId) => {
  try {
    const allPositions = await getAllActiveShuttles();
    const orgPositions = allPositions.filter(p => p.organizationId === organizationId);
    if (orgPositions.length > 0) {
      socket.emit('shuttle:allPositions', orgPositions);
    }
  } catch (err) { console.error('Error sending current positions:', err); }
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = initSocket;
module.exports.getIO = getIO;