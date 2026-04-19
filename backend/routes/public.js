const express = require('express');
const router = express.Router();
const { Route, Stop } = require('../models/Route');
const Organization = require('../models/Organization');

// Public routes – only active routes from active organizations, with no private data
router.get('/routes', async (req, res, next) => {
  try {
    const { orgCode } = req.query;
    let orgFilter = { isActive: true };
    if (orgCode) {
      const org = await Organization.findOne({ code: orgCode, isActive: true });
      if (!org) return res.json({ success: true, data: [] });
      orgFilter = { _id: org._id };
    }
    const routes = await Route.find({ isActive: true }).populate({
      path: 'organizationId',
      match: orgFilter,
      select: 'name shortName',
    }).populate('stops.stopId', 'name lat lng');
    const filtered = routes.filter(r => r.organizationId !== null);
    res.json({ success: true, data: filtered });
  } catch (err) { next(err); }
});

// Public stops
router.get('/stops', async (req, res, next) => {
  try {
    const { orgCode } = req.query;
    let orgFilter = { isActive: true };
    if (orgCode) {
      const org = await Organization.findOne({ code: orgCode, isActive: true });
      if (!org) return res.json({ success: true, data: [] });
      orgFilter = { _id: org._id };
    }
    const stops = await Stop.find({ isActive: true }).populate({
      path: 'organizationId',
      match: orgFilter,
      select: 'name',
    });
    const filtered = stops.filter(s => s.organizationId !== null);
    res.json({ success: true, data: filtered });
  } catch (err) { next(err); }
});

module.exports = router;