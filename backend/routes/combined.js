// ── STUDENT ROUTES ────────────────────────────────────────
const express = require('express');
const studentRouter = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const { Shuttle, Trip, Rating } = require('../models/index');
const { Stop, Route } = require('../models/Route');
const { getIO } = require('../config/socket');
const redis = require('../config/redis');

studentRouter.use(protect, restrictTo('student', 'admin', 'superadmin'));

// Live shuttles
studentRouter.get('/live-shuttles', async (req, res, next) => {
  try {
    const positions = await redis.getAllPositions();
    const orgPositions = positions.filter(p => p.organizationId?.toString() === req.user.organizationId?.toString());
    res.json({ success: true, data: orgPositions });
  } catch (err) { next(err); }
});

// Routes list
studentRouter.get('/routes', async (req, res, next) => {
  try {
    const routes = await Route.find({ organizationId: req.user.organizationId, isActive: true })
      .populate('stops.stopId', 'name lat lng description facilities')
      .sort({ name: 1 });
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

// Stops list
studentRouter.get('/stops', async (req, res, next) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId, isActive: true })
      .sort({ name: 1 });
    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

// Ride history
studentRouter.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const trips = await Trip.find({ organizationId: req.user.organizationId })
      .populate('routeId', 'name shortCode color')
      .populate('driverId', 'name')
      .sort({ startTime: -1 })
      .limit(limit);

    // Attach ratings
    const tripIds = trips.map(t => t._id);
    const ratings = await Rating.find({ tripId: { $in: tripIds }, studentId: req.user._id });
    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r.tripId.toString()] = r.rating; });

    const data = trips.map(t => ({
      ...t.toObject(),
      rating: ratingMap[t._id.toString()] || null,
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Rate a trip
studentRouter.post('/rate', async (req, res, next) => {
  try {
    const { tripId, rating, comment } = req.body;
    if (!tripId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'tripId and rating (1-5) required' });
    }
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    await Rating.findOneAndUpdate(
      { tripId, studentId: req.user._id },
      { organizationId: req.user.organizationId, tripId, studentId: req.user._id, driverId: trip.driverId, rating, comment },
      { upsert: true, new: true }
    );

    // Update driver avg rating
    const ratings = await Rating.find({ driverId: trip.driverId });
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    await User.findByIdAndUpdate(trip.driverId, { avgRating: parseFloat(avg.toFixed(1)), totalRatings: ratings.length });

    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) { next(err); }
});

// Report issue
studentRouter.post('/report', async (req, res, next) => {
  try {
    const { type, note, shuttleId } = req.body;
    console.log(`📢 Report from ${req.user.email}: ${type} — ${note}`);

    try {
      getIO().to(`org:${req.user.organizationId}`).emit('student:report', {
        studentId: req.user._id, studentName: req.user.name,
        type, note, shuttleId, timestamp: Date.now(),
      });
    } catch {}

    res.json({ success: true, message: 'Report submitted. Admin notified.' });
  } catch (err) { next(err); }
});

module.exports.studentRouter = studentRouter;

// ── DRIVER ROUTES ─────────────────────────────────────────
const driverRouter = express.Router();
driverRouter.use(protect, restrictTo('driver', 'admin', 'superadmin'));

driverRouter.post('/start-trip', async (req, res, next) => {
  try {
    const { shuttleId, routeId } = req.body;
    if (!shuttleId) return res.status(400).json({ success: false, message: 'shuttleId required' });

    // Check no active trip
    const existing = await Trip.findOne({ driverId: req.user._id, status: 'active' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an active trip' });
    }

    const trip = await Trip.create({
      organizationId: req.user.organizationId,
      shuttleId, routeId: routeId || null,
      driverId: req.user._id,
      status: 'active',
    });

    await User.findByIdAndUpdate(req.user._id, { isOnDuty: true, currentTripId: trip._id });
    await Shuttle.findByIdAndUpdate(shuttleId, { isOnline: true, currentDriverId: req.user._id, status: 'active' });

    res.status(201).json({ success: true, data: { tripId: trip._id, trip } });
  } catch (err) { next(err); }
});

driverRouter.post('/end-trip', async (req, res, next) => {
  try {
    const { tripId, shuttleId, distanceCoveredKm } = req.body;

    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, driverId: req.user._id, status: 'active' },
      { status: 'completed', endTime: new Date(), distanceCoveredKm: distanceCoveredKm || 0 },
      { new: true }
    );
    if (!trip) return res.status(404).json({ success: false, message: 'Active trip not found' });

    await User.findByIdAndUpdate(req.user._id, {
      isOnDuty: false, currentTripId: null,
      $inc: { totalTrips: 1, totalDistanceKm: distanceCoveredKm || 0 },
    });

    if (shuttleId) {
      await Shuttle.findByIdAndUpdate(shuttleId, { isOnline: false, currentDriverId: null, status: 'idle' });
    }

    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

driverRouter.get('/current-trip', async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ driverId: req.user._id, status: 'active' })
      .populate('shuttleId', 'name plateNumber capacity shortCode')
      .populate('routeId', 'name shortCode color stops')
      .populate({ path: 'routeId', populate: { path: 'stops.stopId', select: 'name lat lng' } });
    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

driverRouter.get('/my-trips', async (req, res, next) => {
  try {
    const trips = await Trip.find({ driverId: req.user._id })
      .populate('routeId', 'name shortCode')
      .populate('shuttleId', 'name plateNumber')
      .sort({ startTime: -1 })
      .limit(20);
    res.json({ success: true, data: trips });
  } catch (err) { next(err); }
});

module.exports.driverRouter = driverRouter;

// ── PUBLIC ROUTES ─────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.use(optionalAuth);

publicRouter.get('/routes', async (req, res, next) => {
  try {
    const routes = await Route.find({ isActive: true })
      .populate('stops.stopId', 'name lat lng')
      .populate('organizationId', 'name shortName')
      .sort({ name: 1 });
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

publicRouter.get('/live', async (req, res, next) => {
  try {
    const positions = await redis.getAllPositions();
    res.json({ success: true, data: positions });
  } catch (err) { next(err); }
});

module.exports.publicRouter = publicRouter;

// ── CHAT ROUTES ───────────────────────────────────────────
const chatRouter = express.Router();
const { Message, ChatRoom } = require('../models/index');
chatRouter.use(protect);

chatRouter.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await ChatRoom.find({
      organizationId: req.user.organizationId,
      members: req.user._id,
    })
      .populate('members', 'name email role profilePicture')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
});

chatRouter.post('/rooms/direct', async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId required' });
    const ids = [req.user._id.toString(), targetUserId].sort();
    const roomId = `dm:${ids[0]}:${ids[1]}`;
    let room = await ChatRoom.findOne({ roomId }).populate('members', 'name email role profilePicture');
    if (!room) {
      room = await ChatRoom.create({
        organizationId: req.user.organizationId,
        roomId, type: 'direct',
        members: [req.user._id, targetUserId],
      });
      room = await ChatRoom.findById(room._id).populate('members', 'name email role profilePicture');
    }
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

chatRouter.post('/rooms/group', async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds?.length) {
      return res.status(400).json({ success: false, message: 'name and memberIds required' });
    }
    const allMembers = [...new Set([req.user._id.toString(), ...memberIds])];
    const roomId = `group:${req.user.organizationId}:${Date.now()}`;
    const room = await ChatRoom.create({
      organizationId: req.user.organizationId,
      roomId, type: 'group', name,
      members: allMembers, admins: [req.user._id],
      createdBy: req.user._id,
    });
    const populated = await ChatRoom.findById(room._id).populate('members', 'name email role profilePicture');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
});

chatRouter.get('/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ roomId: req.params.roomId, isDeleted: false })
      .populate('sender', 'name role profilePicture')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    await Message.updateMany(
      { roomId: req.params.roomId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) { next(err); }
});

chatRouter.post('/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const { content, replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'content required' });

    const message = await Message.create({
      organizationId: req.user.organizationId,
      roomId: req.params.roomId,
      sender: req.user._id,
      content: content.trim(),
      replyTo: replyTo || null,
      readBy: [req.user._id],
    });

    await ChatRoom.findOneAndUpdate(
      { roomId: req.params.roomId },
      { lastMessage: message._id, lastMessageAt: new Date() }
    );

    const populated = await Message.findById(message._id)
      .populate('sender', 'name role profilePicture')
      .populate('replyTo');

    try {
      getIO().to(`chat:${req.params.roomId}`).emit('chat:message', populated);
    } catch {}

    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
});

chatRouter.delete('/messages/:id', async (req, res, next) => {
  try {
    const msg = await Message.findOne({ _id: req.params.id, sender: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    msg.isDeleted = true;
    msg.content   = 'This message was deleted';
    await msg.save();
    try {
      getIO().to(`chat:${msg.roomId}`).emit('chat:deleted', { messageId: msg._id });
    } catch {}
    res.json({ success: true });
  } catch (err) { next(err); }
});

chatRouter.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({
      organizationId: req.user.organizationId,
      _id: { $ne: req.user._id },
      isActive: true,
    }).select('name email role profilePicture isOnDuty');
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

module.exports.chatRouter = chatRouter;

// ── SHUTTLE ROUTES (for driver dropdown) ──────────────────
const shuttleRouter = express.Router();
shuttleRouter.use(protect);

shuttleRouter.get('/', async (req, res, next) => {
  try {
    const shuttles = await Shuttle.find({
      organizationId: req.user.organizationId,
      status: { $ne: 'retired' },
    }).populate('assignedRouteId', 'name shortCode color').sort({ name: 1 });
    res.json({ success: true, data: shuttles });
  } catch (err) { next(err); }
});

module.exports.shuttleRouter = shuttleRouter;

// ── ROUTE LIST (for driver dropdown) ─────────────────────
const routeListRouter = express.Router();
routeListRouter.use(protect);

routeListRouter.get('/', async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const query = { organizationId: req.user.organizationId };
    if (activeOnly === 'true') query.isActive = true;
    const routes = await Route.find(query)
      .populate('stops.stopId', 'name lat lng')
      .sort({ name: 1 });
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

module.exports.routeListRouter = routeListRouter;

// ── QR CHECKIN ────────────────────────────────────────────
const checkinRouter = express.Router();
checkinRouter.use(protect);

checkinRouter.post('/', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Check-in token required' });

    // Token format: tripId:shuttleId (base64 encoded)
    let tripId, shuttleId;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      [tripId, shuttleId] = decoded.split(':');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid check-in token' });
    }

    const trip = await Trip.findOne({ _id: tripId, status: 'active' });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not active' });

    trip.totalBoardings = (trip.totalBoardings || 0) + 1;
    await trip.save();

    res.json({ success: true, message: 'Checked in successfully', data: { tripId, shuttleId } });
  } catch (err) { next(err); }
});

module.exports.checkinRouter = checkinRouter;
