const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  ip:        { type: String },
  device:    { type: String },
  loginAt:   { type: Date, default: Date.now },
  userAgent: { type: String },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Name is required'], trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String, required: [true, 'Email is required'],
      unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String, required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'driver', 'admin', 'superadmin'],
      default: 'student',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId, ref: 'Organization',
      required: function () { return this.role !== 'superadmin'; },
    },
    profilePicture: { type: String, default: null },

    // ── STATUS ──────────────────────────────────────────────
    isActive:   { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // ── SECURITY: account lockout ────────────────────────────
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil:     { type: Date, default: null, select: false },

    // ── SESSION TRACKING ─────────────────────────────────────
    sessions: { type: [sessionSchema], default: [], select: false },
    lastLoginAt:     { type: Date },
    lastLoginIP:     { type: String },
    lastLoginDevice: { type: String },

    // ── STUDENT ──────────────────────────────────────────────
    studentId:     { type: String, trim: true },
    favoriteStops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
    favoriteRoutes:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Route' }],
    subscribedRoutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Route' }],

    // ── DRIVER ───────────────────────────────────────────────
    licenseNumber:     { type: String, trim: true },
    assignedShuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', default: null },
    assignedRouteId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Route',   default: null },
    currentTripId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Trip',    default: null },
    isOnDuty:          { type: Boolean, default: false },
    totalTrips:        { type: Number, default: 0 },
    totalDistanceKm:   { type: Number, default: 0 },
    totalPassengersServed: { type: Number, default: 0 },
    avgRating:         { type: Number, default: 0 },
    totalRatings:      { type: Number, default: 0 },

    // ── NOTIFICATIONS ─────────────────────────────────────────
    fcmTokens: [{
      token: String, device: String,
      updatedAt: { type: Date, default: Date.now },
    }],
    notificationPreferences: {
      shuttleArriving:    { type: Boolean, default: true },
      shuttleFull:        { type: Boolean, default: true },
      routeDelay:         { type: Boolean, default: true },
      adminAnnouncements: { type: Boolean, default: true },
    },

    // ── AUTH TOKENS ──────────────────────────────────────────
    refreshToken:      { type: String, select: false },
    passwordChangedAt: Date,
    lastLogin:         Date,
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// ── INDEXES ──────────────────────────────────────────────
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });

// ── VIRTUAL: isLocked ─────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── PRE-SAVE: hash password ───────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ── METHODS ───────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    return parseInt(this.passwordChangedAt.getTime() / 1000, 10) > JWTTimestamp;
  }
  return false;
};

// Increment login failures; lock after 5
userSchema.methods.incLoginAttempts = async function () {
  // If previous lock expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + 15 * 60 * 1000) }; // 15 min
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

// Record session (keep last 5)
userSchema.methods.recordSession = async function (ip, device, userAgent) {
  const session = { ip, device, loginAt: new Date(), userAgent };
  const sessions = [session, ...(this.sessions || [])].slice(0, 5);
  this.sessions  = sessions;
  this.lastLoginAt     = new Date();
  this.lastLoginIP     = ip;
  this.lastLoginDevice = device;
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    organizationId: this.organizationId,
    profilePicture: this.profilePicture,
    isActive: this.isActive,
    isVerified: this.isVerified,
    studentId: this.studentId,
    licenseNumber: this.licenseNumber,
    assignedShuttleId: this.assignedShuttleId,
    assignedRouteId: this.assignedRouteId,
    isOnDuty: this.isOnDuty,
    totalTrips: this.totalTrips,
    totalDistanceKm: this.totalDistanceKm,
    avgRating: this.avgRating,
    totalRatings: this.totalRatings,
    subscribedRoutes: this.subscribedRoutes,
    favoriteStops: this.favoriteStops,
    favoriteRoutes: this.favoriteRoutes,
    notificationPreferences: this.notificationPreferences,
    lastLoginAt: this.lastLoginAt,
    lastLoginIP: this.lastLoginIP,
    lastLoginDevice: this.lastLoginDevice,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
  };
};

module.exports = mongoose.model('User', userSchema);
