const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    description: String,
    facilities: [{ type: String, enum: ['shelter', 'bench', 'lighting', 'accessibility', 'cctv'] }],
    isActive: { type: Boolean, default: true },
    order: { type: Number },
  },
  { timestamps: true }
);
stopSchema.index({ location: '2dsphere' });
stopSchema.index({ organizationId: 1 });

const scheduleEntrySchema = new mongoose.Schema({
  days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
  startTime: String,
  endTime: String,
  frequency: Number,
}, { _id: false });

const routeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    shortCode: { type: String, uppercase: true, trim: true },
    color: { type: String, default: '#1A56DB' },
    stops: [
      {
        stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
        order: { type: Number, required: true },
        estimatedMinutesFromStart: { type: Number, default: 0 },
      },
    ],
    encodedPolyline: String,
    pathCoordinates: [{ lat: Number, lng: Number, _id: false }],
    schedule: [scheduleEntrySchema],
    isActive: { type: Boolean, default: true },
    isCircular: { type: Boolean, default: false },
    totalDistanceKm: Number,
    estimatedTotalMinutes: Number,
    assignedShuttles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle' }],
    notes: String,
  },
  { timestamps: true }
);
routeSchema.index({ organizationId: 1, isActive: 1 });

const Stop = mongoose.model('Stop', stopSchema);
const Route = mongoose.model('Route', routeSchema);

module.exports = { Stop, Route };