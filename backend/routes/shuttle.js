const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Shuttle = require('../models/Shuttle');
const Trip = require('../models/Trip');
const { getShuttlePosition } = require('../config/redis');

// GET /api/shuttles — all shuttles for organization (admin/driver)
router.get('/', protect, restrictTo('admin', 'superadmin', 'driver'), async (req, res, next) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId })
      .populate('currentDriverId', 'name email isOnDuty')
      .populate('assignedRouteId', 'name shortCode color');
    res.json({ success: true, data: shuttles });
  } catch (err) { next(err); }
});

// GET /api/shuttles/:id — single shuttle with live position
router.get('/:id', protect, async (req, res, next) => {
  try {
    const shuttle = await Shuttle.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate('currentDriverId', 'name')
      .populate('assignedRouteId', 'name shortCode color stops');

    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });

    const livePosition = await getShuttlePosition(req.params.id);

    res.json({ success: true, data: { ...shuttle.toObject(), livePosition } });
  } catch (err) { next(err); }
});

// GET /api/shuttles/:id/trips — trip history for a shuttle
router.get('/:id/trips', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const trips = await Trip.find({ shuttleId: req.params.id })
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('driverId', 'name')
      .populate('routeId', 'name shortCode');

    res.json({ success: true, data: trips });
  } catch (err) { next(err); }
});

// POST /api/shuttles/:id/maintenance — add maintenance log entry
router.post('/:id/maintenance', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { date, type, description, performedBy, cost, nextServiceDue } = req.body;

    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      {
        $push: { maintenanceLog: { date, type, description, performedBy, cost, nextServiceDue } },
        $set: {
          nextMaintenanceDue: nextServiceDue || null,
          maintenanceAlert: false,
        },
      },
      { new: true }
    );

    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

// DELETE /api/shuttles/:id — soft delete (set retired)
router.delete('/:id', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { status: 'retired', isOnline: false },
      { new: true }
    );
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, message: 'Shuttle retired successfully' });
  } catch (err) { next(err); }
});

module.exports = router;