const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true,
    minlength: 2, maxlength: 60,
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  password: {
    type: String, required: true, minlength: 8, select: false,
  },
  role: {
    type: String,
    enum: ['student', 'driver', 'admin', 'superadmin'],
    default: 'student',
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Organization',
    required() { return this.role !== 'superadmin'; },
  },

  // ── Status ─────────────────────────────────────────────
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  // ── Account lockout ─────────────────────────────────────
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil:     { type: Date,   default: null, select: false },

  // ── Tokens ──────────────────────────────────────────────
  refreshToken:      { type: String, select: false },
  passwordChangedAt: Date,

  // ── Session tracking ────────────────────────────────────
  lastLoginAt:     Date,
  lastLoginIP:     String,
  lastLoginDevice: String,

  // ── Student fields ──────────────────────────────────────
  studentId:      { type: String, trim: true },
  favoriteStops:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],

  // ── Driver fields ────────────────────────────────────────
  licenseNumber:     { type: String, trim: true },
  assignedShuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', default: null },
  assignedRouteId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Route',   default: null },
  isOnDuty:          { type: Boolean, default: false },
  totalTrips:        { type: Number, default: 0 },
  avgRating:         { type: Number, default: 0 },
  totalRatings:      { type: Number, default: 0 },

  // ── Notifications ────────────────────────────────────────
  notificationPreferences: {
    shuttleArriving:    { type: Boolean, default: true },
    delays:             { type: Boolean, default: true },
    announcements:      { type: Boolean, default: true },
  },

  profilePicture: { type: String, default: null },
}, { timestamps: true, toJSON: { virtuals: true } });

// ── Indexes ─────────────────────────────────────────────
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });

// ── Virtual ─────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Hash password before save ────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ── Instance methods ────────────────────────────────────
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.incLoginAttempts = async function () {
  // Reset if old lock expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const lockMin     = parseInt(process.env.LOCK_DURATION_MINUTES, 10) || 15;
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + lockMin * 60 * 1000) };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
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
    avgRating: this.avgRating,
    totalRatings: this.totalRatings,
    favoriteStops: this.favoriteStops,
    notificationPreferences: this.notificationPreferences,
    lastLoginAt: this.lastLoginAt,
    lastLoginIP: this.lastLoginIP,
    lastLoginDevice: this.lastLoginDevice,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
