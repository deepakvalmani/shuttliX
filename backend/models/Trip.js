const mongoose = require('mongoose');

const positionSnapshotSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  speed: Number,
  heading: Number,
  passengerCount: Number,
  timestamp: Number,
}, { _id: false });

const tripSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    status: { type: String, enum: ['active', 'completed', 'cancelled', 'emergency'], default: 'active' },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    positions: [positionSnapshotSchema],
    peakPassengerCount: { type: Number, default: 0 },
    totalBoardings: { type: Number, default: 0 },
    distanceCoveredKm: { type: Number, default: 0 },
    delays: [
      {
        reportedAt: Date,
        estimatedDelay: Number,
        message: String,
        _id: false,
      },
    ],
    emergencyData: {
      triggeredAt: Date,
      location: { lat: Number, lng: Number },
      message: String,
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    notes: String,
  },
  { timestamps: true }
);

tripSchema.virtual('durationMinutes').get(function () {
  if (!this.endTime) return null;
  return Math.round((this.endTime - this.startTime) / 60000);
});

tripSchema.index({ organizationId: 1, status: 1 });
tripSchema.index({ driverId: 1, startTime: -1 });
tripSchema.index({ shuttleId: 1, startTime: -1 });
tripSchema.index({ startTime: -1 });

module.exports = mongoose.model('Trip', tripSchema);
