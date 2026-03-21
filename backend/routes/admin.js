const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const { Shuttle, Trip, Rating, Geofence } = require('../models/index');
const { Stop, Route } = require('../models/Route');
const { getIO } = require('../config/socket');

router.use(protect, restrictTo('admin', 'superadmin'));

// ── Dashboard summary ─────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const [students, drivers, routes, trips, shuttles] = await Promise.all([
      User.countDocuments({ organizationId: orgId, role: 'student', isActive: true }),
      User.countDocuments({ organizationId: orgId, role: 'driver',  isActive: true }),
      Route.countDocuments({ organizationId: orgId, isActive: true }),
      Trip.countDocuments({ organizationId: orgId, startTime: { $gte: todayStart } }),
      Shuttle.countDocuments({ organizationId: orgId }),
    ]);

    res.json({
      success: true, data: {
        totalStudents: students,
        totalDrivers:  drivers,
        totalRoutes:   routes,
        totalShuttles: shuttles,
        tripsToday:    trips,
      },
    });
  } catch (err) { next(err); }
});

// ── Organisation info ─────────────────────────────────────
router.get('/organisation', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

router.patch('/organisation', async (req, res, next) => {
  try {
    const allowed = ['name','shortName','contactEmail','contactPhone','address','settings','mapCenter','defaultZoom'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const org = await Organization.findByIdAndUpdate(req.user.organizationId, updates, { new: true });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

// ── Shuttles ─────────────────────────────────────────────
router.get('/shuttles', async (req, res, next) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId })
      .populate('currentDriverId', 'name email')
      .populate('assignedRouteId', 'name shortCode color')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: shuttles });
  } catch (err) { next(err); }
});

router.post('/shuttles', async (req, res, next) => {
  try {
    const { name, plateNumber, capacity, shortCode, make, model, year, color, notes } = req.body;
    if (!name || !plateNumber || !capacity) {
      return res.status(400).json({ success: false, message: 'name, plateNumber and capacity required' });
    }
    const shuttle = await Shuttle.create({
      organizationId: req.user.organizationId,
      name, plateNumber, capacity, shortCode, make, model, year, color, notes,
    });
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
    await Shuttle.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true, message: 'Shuttle deleted' });
  } catch (err) { next(err); }
});

router.post('/shuttles/:id/maintenance', async (req, res, next) => {
  try {
    const { date, type, description, performedBy, cost, nextServiceDue } = req.body;
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      {
        $push: { maintenanceLog: { date, type, description, performedBy, cost, nextServiceDue } },
        $set:  { status: 'maintenance' },
      },
      { new: true }
    );
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

// ── Drivers ──────────────────────────────────────────────
router.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await User.find({ organizationId: req.user.organizationId, role: 'driver' })
      .populate('assignedShuttleId', 'name plateNumber shortCode')
      .populate('assignedRouteId',   'name shortCode color')
      .sort({ name: 1 });
    res.json({ success: true, data: drivers.map(d => d.toPublicJSON()) });
  } catch (err) { next(err); }
});

router.post('/drivers/:id/assign', async (req, res, next) => {
  try {
    const { shuttleId, routeId } = req.body;
    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId, role: 'driver' },
      { assignedShuttleId: shuttleId || null, assignedRouteId: routeId || null },
      { new: true }
    ).populate('assignedShuttleId assignedRouteId');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver.toPublicJSON() });
  } catch (err) { next(err); }
});

// ── Students ─────────────────────────────────────────────
router.get('/students', async (req, res, next) => {
  try {
    const students = await User.find({ organizationId: req.user.organizationId, role: 'student' })
      .sort({ name: 1 });
    res.json({ success: true, data: students.map(s => s.toPublicJSON()) });
  } catch (err) { next(err); }
});

// ── Stops ────────────────────────────────────────────────
router.get('/stops', async (req, res, next) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId }).sort({ name: 1 });
    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

router.post('/stops', async (req, res, next) => {
  try {
    const { name, lat, lng, description, facilities } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'name, lat and lng required' });
    }
    const stop = await Stop.create({
      organizationId: req.user.organizationId,
      name, lat, lng, description, facilities,
    });
    res.status(201).json({ success: true, data: stop });
  } catch (err) { next(err); }
});

router.patch('/stops/:id', async (req, res, next) => {
  try {
    const stop = await Stop.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body, { new: true }
    );
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
    res.json({ success: true, data: stop });
  } catch (err) { next(err); }
});

router.delete('/stops/:id', async (req, res, next) => {
  try {
    await Stop.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true, message: 'Stop deleted' });
  } catch (err) { next(err); }
});

// ── Routes ────────────────────────────────────────────────
router.get('/routes', async (req, res, next) => {
  try {
    const routes = await Route.find({ organizationId: req.user.organizationId })
      .populate('stops.stopId', 'name lat lng')
      .sort({ name: 1 });
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

router.post('/routes', async (req, res, next) => {
  try {
    const { name, shortCode, color, stops, schedule, isCircular, pathCoordinates, notes,
      totalDistanceKm, estimatedTotalMinutes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Route name required' });
    const route = await Route.create({
      organizationId: req.user.organizationId,
      name, shortCode, color, stops, schedule, isCircular,
      pathCoordinates, notes, totalDistanceKm, estimatedTotalMinutes,
    });
    res.status(201).json({ success: true, data: route });
  } catch (err) { next(err); }
});

router.patch('/routes/:id', async (req, res, next) => {
  try {
    const route = await Route.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body, { new: true, runValidators: true }
    ).populate('stops.stopId', 'name lat lng');
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    // Notify all live users of route change
    try {
      getIO().to(`org:${req.user.organizationId}`).emit('route:updated', {
        routeId: route._id, timestamp: Date.now(),
      });
    } catch {}

    res.json({ success: true, data: route });
  } catch (err) { next(err); }
});

router.delete('/routes/:id', async (req, res, next) => {
  try {
    await Route.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true, message: 'Route deleted' });
  } catch (err) { next(err); }
});

// ── Analytics ─────────────────────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const days  = parseInt(req.query.days, 10) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trips = await Trip.find({ organizationId: orgId, startTime: { $gte: since } })
      .populate('routeId', 'name shortCode');

    // Daily ridership
    const byDay = {};
    trips.forEach(t => {
      const d = t.startTime.toISOString().slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    });
    const ridership = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Trips by route
    const byRoute = {};
    trips.forEach(t => {
      const name = t.routeId?.name || 'Unassigned';
      byRoute[name] = (byRoute[name] || 0) + 1;
    });
    const tripsByRoute = Object.entries(byRoute)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Ratings
    const ratings = await Rating.find({ organizationId: orgId, createdAt: { $gte: since } });
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({
      success: true, data: {
        totalTrips: trips.length,
        ridership,
        tripsByRoute,
        avgRating: avgRating ? parseFloat(avgRating) : null,
        totalRatings: ratings.length,
      },
    });
  } catch (err) { next(err); }
});

// ── Broadcast ─────────────────────────────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { message, type = 'info' } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    try {
      getIO().to(`org:${req.user.organizationId}`).emit('admin:announcement', {
        message, type, timestamp: Date.now(),
      });
    } catch {}

    res.json({ success: true, message: 'Broadcast sent' });
  } catch (err) { next(err); }
});

// ── Geofences ─────────────────────────────────────────────
router.get('/geofences', async (req, res, next) => {
  try {
    const fences = await Geofence.find({ organizationId: req.user.organizationId })
      .populate('stopId', 'name lat lng');
    res.json({ success: true, data: fences });
  } catch (err) { next(err); }
});

router.post('/geofences', async (req, res, next) => {
  try {
    const { stopId, radiusMeters = 100 } = req.body;
    const stop = await Stop.findById(stopId);
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
    const fence = await Geofence.create({
      organizationId: req.user.organizationId,
      stopId, name: stop.name,
      center: { lat: stop.lat, lng: stop.lng },
      radiusMeters,
    });
    res.status(201).json({ success: true, data: fence });
  } catch (err) { next(err); }
});

router.delete('/geofences/:id', async (req, res, next) => {
  try {
    await Geofence.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
