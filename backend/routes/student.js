const express = require('express');
const router = express.Router();
const { protect, restrictTo, sameOrganization } = require('../middleware/auth');
const { getAllActiveShuttles, getShuttlePosition } = require('../config/redis');
const { Route, Stop } = require('../models/Route');
const Shuttle = require('../models/Shuttle');
const Trip = require('../models/Trip');
const Rating = require('../models/Rating');

// All student routes require authentication
router.use(protect, restrictTo('student', 'admin', 'superadmin'));

// GET /api/student/live-shuttles — get all active shuttle positions for organization
router.get('/live-shuttles', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId?.toString();
    const allPositions = await getAllActiveShuttles();
    const organizationShuttles = allPositions.filter(s => s.organizationId === organizationId);
    res.json({ success: true, data: organizationShuttles });
  } catch (err) { next(err); }
});

// GET /api/student/routes — all active routes for the organization
router.get('/routes', async (req, res, next) => {
  try {
    const routes = await Route.find({
      organizationId: req.user.organizationId,
      isActive: true,
    }).populate('stops.stopId');
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

// GET /api/student/stops — all stops for the organization
router.get('/stops', async (req, res, next) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId, isActive: true });
    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

// GET /api/student/shuttle/:shuttleId — single shuttle position
router.get('/shuttle/:shuttleId', async (req, res, next) => {
  try {
    const position = await getShuttlePosition(req.params.shuttleId);
    if (!position) {
      return res.json({ success: true, data: null, message: 'Shuttle is currently offline' });
    }
    res.json({ success: true, data: position });
  } catch (err) { next(err); }
});

// GET /api/student/history — student's ride history
router.get('/history', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const trips = await Trip.find({
      organizationId: req.user.organizationId,
      status: 'completed',
    })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('shuttleId', 'name plateNumber')
      .populate('driverId', 'name')
      .populate('routeId', 'name shortCode color');

    const total = await Trip.countDocuments({ organizationId: req.user.organizationId, status: 'completed' });

    res.json({ success: true, data: trips, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// POST /api/student/rate — submit a ride rating
router.post('/rate', async (req, res, next) => {
  try {
    const { tripId, score, comment, tags } = req.body;
    if (!tripId || !score) {
      return res.status(400).json({ success: false, message: 'tripId and score are required' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const existing = await Rating.findOne({ studentId: req.user._id, tripId });
    if (existing) return res.status(400).json({ success: false, message: 'You have already rated this trip' });

    const rating = await Rating.create({
      organizationId: req.user.organizationId,
      studentId: req.user._id,
      tripId,
      driverId: trip.driverId,
      shuttleId: trip.shuttleId,
      score,
      comment,
      tags,
    });

    res.status(201).json({ success: true, data: rating });
  } catch (err) { next(err); }
});

// PATCH /api/student/favorite-stops — update favorite stops
router.patch('/favorite-stops', async (req, res, next) => {
  try {
    const { stopId, action } = req.body; // action: 'add' | 'remove'
    const user = req.user;

    if (action === 'add') {
      if (!user.favoriteStops.includes(stopId)) user.favoriteStops.push(stopId);
    } else {
      user.favoriteStops = user.favoriteStops.filter(s => s.toString() !== stopId);
    }

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, favoriteStops: user.favoriteStops });
  } catch (err) { next(err); }
});

module.exports = router;