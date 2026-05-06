const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, enum: ['scheduled', 'repair', 'inspection', 'other'], required: true },
  description: { type: String, required: true },
  performedBy: String,
  cost: Number,
  nextServiceDue: Date,
}, { _id: true });

const shuttleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, uppercase: true, trim: true },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    shortCode: { type: String, uppercase: true, trim: true, maxlength: 5 },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    color: { type: String, trim: true },
    currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    status: { type: String, enum: ['active', 'idle', 'maintenance', 'retired'], default: 'idle' },
    isOnline: { type: Boolean, default: false },
    maintenanceLog: [maintenanceLogSchema],
    nextMaintenanceDue: Date,
    maintenanceAlert: { type: Boolean, default: false },
    notes: String,
  },
  { timestamps: true }
);
shuttleSchema.index({ organizationId: 1, status: 1 });
shuttleSchema.index({ plateNumber: 1 });

module.exports = mongoose.model('Shuttle', shuttleSchema);