const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  shortName: { type: String, trim: true, uppercase: true },
  code: {
    type: String, required: true, unique: true,
    uppercase: true, trim: true,
  },
  logo: String,
  plan: {
    type: String,
    enum: ['pilot', 'starter', 'growth', 'enterprise'],
    default: 'pilot',
  },
  isActive: { type: Boolean, default: true },

  // ── Map config ──────────────────────────────────────────
  mapCenter: {
    lat: { type: Number, default: 24.9056 },
    lng: { type: Number, default: 67.0822 },
  },
  defaultZoom: { type: Number, default: 15 },

  // ── Contact ─────────────────────────────────────────────
  contactEmail: String,
  contactPhone: String,
  address:      String,
  timezone:     { type: String, default: 'Asia/Karachi' },

  // ── Settings ────────────────────────────────────────────
  settings: {
    allowGuestTracking: { type: Boolean, default: true },
    enableQRCheckIn:    { type: Boolean, default: true },
    enableRatings:      { type: Boolean, default: true },
    maxShuttles:        { type: Number,  default: 10 },
  },
}, { timestamps: true });

// Virtual: QR link
organizationSchema.virtual('qrUrl').get(function () {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${base}/register?org=${this.code}`;
});

organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Organization', organizationSchema);
