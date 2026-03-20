const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Shuttle = require('../models/Shuttle');
const Trip = require('../models/Trip');
const { Route, Stop } = require('../models/Route');
const Organization = require('../models/Organization');
const Rating = require('../models/Rating');
const { getAllActiveShuttles } = require('../config/redis');
const { getIO } = require('../config/socket');

router.use(protect, restrictTo('admin', 'superadmin'));

// ─── DASHBOARD ────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date(); today.setHours(0,0,0,0);
    const [activeShuttles,totalStudents,totalDrivers,totalShuttles,totalRoutes,tripsToday,livePositions] =
      await Promise.all([
        Shuttle.countDocuments({ organizationId, status: 'active' }),
        User.countDocuments({ organizationId, role: 'student', isActive: true }),
        User.countDocuments({ organizationId, role: 'driver', isActive: true }),
        Shuttle.countDocuments({ organizationId }),
        Route.countDocuments({ organizationId, isActive: true }),
        Trip.countDocuments({ organizationId, startTime: { $gte: today } }),
        getAllActiveShuttles(),
      ]);
    const liveShuttles = livePositions.filter(p => p.organizationId === organizationId?.toString()).length;
    res.json({ success: true, data: { liveShuttles, activeShuttles, totalStudents, totalDrivers, totalShuttles, totalRoutes, tripsToday } });
  } catch (err) { next(err); }
});

// ─── ORGANISATION INFO & QR ───────────────────────────────
router.get('/organisation', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    // Build QR URL that students will scan → auto-fills org on register
    const qrUrl = `${process.env.CLIENT_URL}/register?org=${org._id}&code=${org.code}`;
    res.json({ success: true, data: { ...org.toObject(), qrUrl } });
  } catch (err) { next(err); }
});

router.patch('/organisation', async (req, res, next) => {
  try {
    const allowed = ['name','shortName','contactEmail','contactPhone','address','timezone',
      'mapCenter','defaultMapZoom','operatingHours','settings'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const org = await Organization.findByIdAndUpdate(req.user.organizationId, updates, { new: true });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

// ─── FLEET (SHUTTLES) ─────────────────────────────────────
router.get('/shuttles', async (req, res, next) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId })
      .populate('currentDriverId', 'name email')
      .populate('assignedRouteId', 'name shortCode color');
    res.json({ success: true, data: shuttles });
  } catch (err) { next(err); }
});

router.post('/shuttles', async (req, res, next) => {
  try {
    const shuttle = await Shuttle.create({ ...req.body, organizationId: req.user.organizationId });
    res.status(201).json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

router.patch('/shuttles/:id', async (req, res, next) => {
  try {
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body, { new: true, runValidators: true }
    );
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

router.delete('/shuttles/:id', async (req, res, next) => {
  try {
    await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { status: 'retired', isOnline: false }
    );
    res.json({ success: true, message: 'Shuttle retired' });
  } catch (err) { next(err); }
});

router.post('/shuttles/:id/maintenance', async (req, res, next) => {
  try {
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { $push: { maintenanceLog: req.body }, $set: { maintenanceAlert: false } },
      { new: true }
    );
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

// ─── DRIVER MANAGEMENT ────────────────────────────────────
router.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await User.find({ organizationId: req.user.organizationId, role: 'driver' })
      .populate('assignedShuttleId', 'name plateNumber')
      .populate('currentTripId');
    res.json({ success: true, data: drivers.map(d => d.toPublicJSON()) });
  } catch (err) { next(err); }
});

router.patch('/drivers/:id', async (req, res, next) => {
  try {
    const allowed = ['isActive','assignedShuttleId','assignedRouteId','name','licenseNumber'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId, role: 'driver' },
      updates, { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver.toPublicJSON() });
  } catch (err) { next(err); }
});

// Assign driver to route
router.post('/drivers/:id/assign', async (req, res, next) => {
  try {
    const { routeId, shuttleId } = req.body;
    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId, role: 'driver' },
      { assignedRouteId: routeId || null, assignedShuttleId: shuttleId || null },
      { new: true }
    ).populate('assignedShuttleId', 'name').populate('assignedRouteId', 'name shortCode');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (shuttleId) await Shuttle.findByIdAndUpdate(shuttleId, { currentDriverId: driver._id });
    res.json({ success: true, data: driver.toPublicJSON() });
  } catch (err) { next(err); }
});

// ─── STUDENT MANAGEMENT ───────────────────────────────────
router.get('/students', async (req, res, next) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const query = { organizationId: req.user.organizationId, role: 'student' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [students, total] = await Promise.all([
      User.find(query).skip((page-1)*limit).limit(+limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    res.json({ success: true, data: students.map(s => s.toPublicJSON()), pagination: { page: +page, limit: +limit, total } });
  } catch (err) { next(err); }
});

// ─── STOPS ────────────────────────────────────────────────
router.get('/stops', async (req, res, next) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId, isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

router.post('/stops', async (req, res, next) => {
  try {
    const { name, lat, lng, description, facilities } = req.body;
    const stop = await Stop.create({
      organizationId: req.user.organizationId,
      name, lat, lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      description, facilities,
    });
    res.status(201).json({ success: true, data: stop });
  } catch (err) { next(err); }
});

router.patch('/stops/:id', async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.lat && updates.lng) updates.location = { type: 'Point', coordinates: [updates.lng, updates.lat] };
    const stop = await Stop.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updates, { new: true }
    );
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
    res.json({ success: true, data: stop });
  } catch (err) { next(err); }
});

router.delete('/stops/:id', async (req, res, next) => {
  try {
    await Stop.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId }, { isActive: false });
    res.json({ success: true, message: 'Stop deactivated' });
  } catch (err) { next(err); }
});

// ─── ROUTES ───────────────────────────────────────────────
router.get('/routes', async (req, res, next) => {
  try {
    const routes = await Route.find({ organizationId: req.user.organizationId })
      .populate('stops.stopId')
      .populate('assignedShuttles', 'name plateNumber status');
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

router.post('/routes', async (req, res, next) => {
  try {
    const route = await Route.create({ ...req.body, organizationId: req.user.organizationId });
    res.status(201).json({ success: true, data: route });
  } catch (err) { next(err); }
});

router.patch('/routes/:id', async (req, res, next) => {
  try {
    const route = await Route.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body, { new: true }
    ).populate('stops.stopId');
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) { next(err); }
});

router.delete('/routes/:id', async (req, res, next) => {
  try {
    await Route.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId }, { isActive: false });
    res.json({ success: true, message: 'Route deactivated' });
  } catch (err) { next(err); }
});

// ─── ANALYTICS ────────────────────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trips = await Trip.find({ organizationId, startTime: { $gte: since }, status: 'completed' })
      .populate('routeId', 'name shortCode');
    const byDay = {};
    trips.forEach(t => {
      const day = t.startTime.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + (t.peakPassengerCount || 0);
    });
    const byRoute = {};
    trips.forEach(t => {
      const key = t.routeId?.name || 'Unknown';
      byRoute[key] = (byRoute[key] || 0) + 1;
    });
    const ratings = await Rating.find({ organizationId, createdAt: { $gte: since } });
    const avgRating = ratings.length
      ? (ratings.reduce((s,r) => s + r.score, 0) / ratings.length).toFixed(1) : null;
    res.json({
      success: true,
      data: {
        totalTrips: trips.length,
        ridership: Object.entries(byDay).map(([date,count]) => ({ date, count })),
        tripsByRoute: Object.entries(byRoute).map(([name,count]) => ({ name, count })),
        avgRating, totalRatings: ratings.length,
      },
    });
  } catch (err) { next(err); }
});

// ─── BROADCAST ────────────────────────────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    const io = getIO();
    io.to(`org:${req.user.organizationId}`).emit('admin:announcement', {
      message, type: type || 'info', timestamp: Date.now(),
    });
    res.json({ success: true, message: 'Broadcast sent' });
  } catch (err) { next(err); }
});

module.exports = router;
