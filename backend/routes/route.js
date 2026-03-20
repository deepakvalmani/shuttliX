const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const { Route, Stop } = require('../models/Route');

// ─── STOPS ────────────────────────────────────────────────

// GET /api/routes/stops — all stops for organization
router.get('/stops', protect, async (req, res, next) => {
  try {
    const stops = await Stop.find({
      organizationId: req.user.organizationId,
      isActive: true,
    }).sort({ name: 1 });
    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

// POST /api/routes/stops — create stop (admin only)
router.post('/stops', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { name, lat, lng, description, facilities } = req.body;

    const stop = await Stop.create({
      organizationId: req.user.organizationId,
      name,
      lat,
      lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      description,
      facilities,
    });
    res.status(201).json({ success: true, data: stop });
  } catch (err) { next(err); }
});

// PATCH /api/routes/stops/:id — update stop
router.patch('/stops/:id', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const updates = req.body;
    if (updates.lat && updates.lng) {
      updates.location = { type: 'Point', coordinates: [updates.lng, updates.lat] };
    }
    const stop = await Stop.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updates,
      { new: true, runValidators: true }
    );
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
    res.json({ success: true, data: stop });
  } catch (err) { next(err); }
});

// DELETE /api/routes/stops/:id — soft delete
router.delete('/stops/:id', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    await Stop.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { isActive: false }
    );
    res.json({ success: true, message: 'Stop deactivated' });
  } catch (err) { next(err); }
});

// GET /api/routes/stops/nearby — find stops near a lat/lng
router.get('/stops/nearby', protect, async (req, res, next) => {
  try {
    const { lat, lng, radiusMeters = 500 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const stops = await Stop.find({
      organizationId: req.user.organizationId,
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radiusMeters),
        },
      },
    }).limit(10);

    res.json({ success: true, data: stops });
  } catch (err) { next(err); }
});

// ─── ROUTES ───────────────────────────────────────────────

// GET /api/routes — all routes for organization
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.activeOnly === 'true') filter.isActive = true;

    const routes = await Route.find(filter)
      .populate('stops.stopId')
      .populate('assignedShuttles', 'name plateNumber status');
    res.json({ success: true, data: routes });
  } catch (err) { next(err); }
});

// GET /api/routes/:id — single route with full stop details
router.get('/:id', protect, async (req, res, next) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate('stops.stopId')
      .populate('assignedShuttles', 'name plateNumber status isOnline');

    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) { next(err); }
});

// POST /api/routes — create route (admin only)
router.post('/', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const route = await Route.create({
      ...req.body,
      organizationId: req.user.organizationId,
    });
    res.status(201).json({ success: true, data: route });
  } catch (err) { next(err); }
});

// PATCH /api/routes/:id — update route
router.patch('/:id', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const route = await Route.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true, runValidators: true }
    ).populate('stops.stopId');

    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) { next(err); }
});

// DELETE /api/routes/:id — soft delete
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    await Route.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { isActive: false }
    );
    res.json({ success: true, message: 'Route deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;