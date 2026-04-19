const mongoose = require('mongoose');

// ── Shuttle ──────────────────────────────────────────────
const shuttleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name:        { type: String, required: true, trim: true },
  plateNumber: { type: String, required: true, uppercase: true, trim: true },
  capacity:    { type: Number, required: true, min: 1, max: 200 },
  shortCode:   { type: String, uppercase: true, trim: true, maxlength: 5 },
  make:  String,
  model: String,
  year:  Number,
  color: String,
  status: {
    type: String,
    enum: ['active', 'idle', 'maintenance', 'retired'],
    default: 'idle',
  },
  currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  isOnline: { type: Boolean, default: false },
  maintenanceLog: [{
    date:           { type: Date, required: true },
    type:           { type: String, enum: ['scheduled','repair','inspection','other'], required: true },
    description:    { type: String, required: true },
    performedBy:    String,
    cost:           Number,
    nextServiceDue: Date,
  }],
  notes: String,
}, { timestamps: true });

shuttleSchema.index({ organizationId: 1 });

// ── Trip ─────────────────────────────────────────────────
const tripSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  shuttleId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', required: true },
  driverId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  routeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Route',   default: null },

  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'emergency'],
    default: 'active',
  },
  startTime:        { type: Date, default: Date.now },
  endTime:          Date,
  peakPassengers:   { type: Number, default: 0 },
  totalBoardings:   { type: Number, default: 0 },
  distanceCoveredKm:{ type: Number, default: 0 },

  positions: [{
    lat: Number, lng: Number, speed: Number,
    heading: Number, passengerCount: Number,
    timestamp: Number,
    _id: false,
  }],

  delays: [{
    reportedAt:      { type: Date, default: Date.now },
    estimatedDelay:  Number,
    message:         String,
    _id: false,
  }],

  emergencyData: {
    triggeredAt: Date,
    location:    { lat: Number, lng: Number },
    message:     String,
    resolvedAt:  Date,
  },
}, { timestamps: true });

tripSchema.index({ organizationId: 1, status: 1 });
tripSchema.index({ driverId: 1, startTime: -1 });

// ── Rating ───────────────────────────────────────────────
const ratingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  tripId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Trip',         required: true },
  studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  driverId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  rating:         { type: Number, required: true, min: 1, max: 5 },
  comment:        String,
}, { timestamps: true });

ratingSchema.index({ tripId: 1, studentId: 1 }, { unique: true });
ratingSchema.index({ driverId: 1 });

// ── Message ──────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  roomId:  { type: String, required: true, index: true },
  roomType:{ type: String, enum: ['direct','group','announcement'], default: 'direct' },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type:    { type: String, enum: ['text','system'], default: 'text' },
  readBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: -1 });

// ── ChatRoom ─────────────────────────────────────────────
const chatRoomSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  roomId:  { type: String, required: true, unique: true },
  type:    { type: String, enum: ['direct','group'], default: 'direct' },
  name:    String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage:   { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  lastMessageAt: Date,
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chatRoomSchema.index({ organizationId: 1, members: 1 });

// ── Geofence ─────────────────────────────────────────────
const geofenceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  stopId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  name:           String,
  center:         { lat: Number, lng: Number },
  radiusMeters:   { type: Number, default: 100 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

const Shuttle   = mongoose.model('Shuttle',   shuttleSchema);
const Trip      = mongoose.model('Trip',      tripSchema);
const Rating    = mongoose.model('Rating',    ratingSchema);
const Message   = mongoose.model('Message',   messageSchema);
const ChatRoom  = mongoose.model('ChatRoom',  chatRoomSchema);
const Geofence  = mongoose.model('Geofence',  geofenceSchema);

module.exports = { Shuttle, Trip, Rating, Message, ChatRoom, Geofence };
