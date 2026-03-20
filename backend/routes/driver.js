const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Trip = require('../models/Trip');
const Shuttle = require('../models/Shuttle');
const User = require('../models/User');
const { getShuttlePosition, removeShuttlePosition } = require('../config/redis');

router.use(protect, restrictTo('driver', 'admin', 'superadmin'));

// POST /api/driver/start-trip — begin a trip
router.post('/start-trip', async (req, res, next) => {
  try {
    const { shuttleId, routeId } = req.body;
    const driver = req.user;

    const shuttle = await Shuttle.findOne({ _id: shuttleId, organizationId: driver.organizationId });
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });

    const activeTrip = await Trip.findOne({ shuttleId, status: 'active' });
    if (activeTrip) {
      return res.status(400).json({ success: false, message: 'This shuttle already has an active trip' });
    }

    const trip = await Trip.create({
      organizationId: driver.organizationId,
      shuttleId,
      driverId: driver._id,
      routeId: routeId || null,
      status: 'active',
      startTime: new Date(),
    });

    await User.findByIdAndUpdate(driver._id, {
      isOnDuty: true,
      currentTripId: trip._id,
    });

    await Shuttle.findByIdAndUpdate(shuttleId, {
      status: 'active',
      currentDriverId: driver._id,
      isOnline: true,
    });

    res.status(201).json({ success: true, data: { tripId: trip._id, shuttleId, routeId } });
  } catch (err) { next(err); }
});

// POST /api/driver/end-trip — end a trip
router.post('/end-trip', async (req, res, next) => {
  try {
    const { tripId, shuttleId } = req.body;

    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, driverId: req.user._id, status: 'active' },
      { status: 'completed', endTime: new Date() },
      { new: true }
    );

    if (!trip) return res.status(404).json({ success: false, message: 'Active trip not found' });

    await User.findByIdAndUpdate(req.user._id, { isOnDuty: false, currentTripId: null });

    await Shuttle.findByIdAndUpdate(shuttleId, {
      status: 'idle',
      currentDriverId: null,
      isOnline: false,
    });

    await removeShuttlePosition(shuttleId);

    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

// GET /api/driver/my-trips — driver's trip history
router.get('/my-trips', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const trips = await Trip.find({ driverId: req.user._id })
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('shuttleId', 'name plateNumber')
      .populate('routeId', 'name shortCode');

    const total = await Trip.countDocuments({ driverId: req.user._id });
    res.json({ success: true, data: trips, pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

// GET /api/driver/current-trip — get driver's active trip
router.get('/current-trip', async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ driverId: req.user._id, status: 'active' })
      .populate('shuttleId')
      .populate('routeId');

    res.json({ success: true, data: trip || null });
  } catch (err) { next(err); }
});

// GET /api/driver/schedule — placeholder for shift schedule
router.get('/schedule', async (req, res, next) => {
  try {
    const driver = await User.findById(req.user._id)
      .populate('assignedShuttleId');
    res.json({ success: true, data: { assignedShuttle: driver.assignedShuttleId } });
  } catch (err) { next(err); }
});

module.exports = router;