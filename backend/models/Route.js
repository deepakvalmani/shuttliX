const mongoose = require('mongoose');

// ── Stop ────────────────────────────────────────────────
const stopSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true,
  },
  name:        { type: String, required: true, trim: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
  description: String,
  facilities:  [{ type: String, enum: ['shelter', 'bench', 'lighting', 'accessibility', 'cctv'] }],
  isActive:    { type: Boolean, default: true },
  order:       Number,
}, { timestamps: true });

stopSchema.index({ organizationId: 1 });

// ── Route ────────────────────────────────────────────────
const scheduleSchema = new mongoose.Schema({
  days:      [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  startTime: String,
  endTime:   String,
  frequency: Number, // minutes between trips
}, { _id: false });

const routeSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true,
  },
  name:      { type: String, required: true, trim: true },
  shortCode: { type: String, uppercase: true, trim: true },
  color:     { type: String, default: '#2563EB' },

  stops: [{
    stopId:                    { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    order:                     { type: Number, required: true },
    estimatedMinutesFromStart: { type: Number, default: 0 },
  }],

  pathCoordinates:       [{ lat: Number, lng: Number, _id: false }],
  schedule:              [scheduleSchema],
  isActive:              { type: Boolean, default: true },
  isCircular:            { type: Boolean, default: false },
  totalDistanceKm:       Number,
  estimatedTotalMinutes: Number,
  notes:                 String,
}, { timestamps: true });

routeSchema.index({ organizationId: 1, isActive: 1 });

const Stop  = mongoose.model('Stop',  stopSchema);
const Route = mongoose.model('Route', routeSchema);

module.exports = { Stop, Route };
