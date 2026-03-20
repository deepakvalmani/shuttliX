const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, uppercase: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    logo: String,
    plan: {
      type: String,
      enum: ['pilot', 'starter', 'growth', 'enterprise'],
      default: 'pilot',
    },
    isActive: { type: Boolean, default: true },
    campusBounds: {
      northeast: { lat: Number, lng: Number },
      southwest: { lat: Number, lng: Number },
    },
    mapCenter: { lat: { type: Number, default: 24.9056 }, lng: { type: Number, default: 67.0822 } },
    defaultMapZoom: { type: Number, default: 15 },
    operatingHours: { start: { type: String, default: '07:00' }, end: { type: String, default: '22:00' } },
    timezone: { type: String, default: 'Asia/Karachi' },
    contactEmail: String,
    contactPhone: String,
    address: String,
    settings: {
      allowGuestTracking: { type: Boolean, default: true },
      requireStudentId: { type: Boolean, default: false },
      enableQRCheckIn: { type: Boolean, default: true },
      enableRatings: { type: Boolean, default: true },
      maxShuttles: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);