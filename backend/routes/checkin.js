const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect, restrictTo } = require('../middleware/auth');
const Trip = require('../models/Trip');
const { getRedisClient } = require('../config/redis');

router.post('/generate', protect, restrictTo('driver'), async (req, res, next) => {
  try {
    const { tripId, shuttleId } = req.body;
    if (!tripId || !shuttleId) {
      return res.status(400).json({ success: false, message: 'tripId and shuttleId required' });
    }

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user._id, status: 'active' });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Active trip not found' });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 60 * 1000; // 60 seconds

    const redis = getRedisClient();
    if (redis) {
      await redis.setex(
        `checkin:${token}`,
        65,
        JSON.stringify({ tripId, shuttleId, driverId: req.user._id.toString(), expiresAt })
      );
    }

    const qrUrl = `${process.env.CLIENT_URL}/checkin/${token}`;

    res.json({
      success: true,
      data: { token, qrUrl, expiresAt, refreshIn: 60 },
    });
  } catch (err) { next(err); }
});

router.post('/scan', protect, restrictTo('student'), async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'token required' });

    const redis = getRedisClient();
    let checkinData = null;

    if (redis) {
      const raw = await redis.get(`checkin:${token}`);
      if (raw) checkinData = JSON.parse(raw);
    }

    if (!checkinData) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired or is invalid. Ask the driver to refresh.',
      });
    }

    if (Date.now() > checkinData.expiresAt) {
      return res.status(400).json({ success: false, message: 'QR code has expired' });
    }

    const { tripId, shuttleId } = checkinData;

    await Trip.findByIdAndUpdate(tripId, {
      $inc: { totalBoardings: 1 },
    });

    const posKey = `shuttle:${shuttleId}:position`;
    if (redis) {
      const posData = await redis.get(posKey);
      if (posData) {
        const pos = JSON.parse(posData);
        pos.passengerCount = (pos.passengerCount || 0) + 1;
        await redis.setex(posKey, 30, JSON.stringify(pos));

        const { getIO } = require('../config/socket');
        try {
          const io = getIO();
          if (pos.organizationId) {
            io.to(`organization:${pos.organizationId}`).emit('shuttle:capacity', {
              shuttleId,
              passengerCount: pos.passengerCount,
              timestamp: Date.now(),
            });
          }
        } catch {}
      }
    }

    res.json({
      success: true,
      message: 'Boarding confirmed!',
      data: { tripId, shuttleId },
    });
  } catch (err) { next(err); }
});

module.exports = router;