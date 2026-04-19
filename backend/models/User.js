'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  refreshToken: { type: String, required: true },
  deviceInfo:   { type: String, default: '' },
  ip:           { type: String, default: '' },
  lastUsed:     { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 100 },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true, select: false, minlength: 8 },
  role:           { type: String, enum: ['student','driver','admin','superadmin'], required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  studentId:      { type: String },
  licenseNumber:  { type: String },
  profilePicture: { type: String },
  isVerified:     { type: Boolean, default: false },
  isActive:       { type: Boolean, default: true },
  sessions:       [sessionSchema],
  loginAttempts:  { type: Number, default: 0 },
  lockUntil:      { type: Date },
  // GDPR
  consentGivenAt: { type: Date, default: Date.now },
  dataDeletedAt:  { type: Date },
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ 'sessions.refreshToken': 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.addLoginAttempt = async function() {
  const MAX = 5, LOCK_MS = 15 * 60 * 1000;
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1; this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX) this.lockUntil = new Date(Date.now() + LOCK_MS);
  }
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0; this.lockUntil = undefined;
  return this.save();
};

userSchema.methods.addSession = function(refreshToken, deviceInfo = '', ip = '') {
  if (this.sessions.length >= 5) {
    this.sessions.sort((a, b) => a.lastUsed - b.lastUsed);
    this.sessions.shift();
  }
  this.sessions.push({ refreshToken, deviceInfo, ip });
  return this.save();
};

userSchema.methods.removeSession = function(refreshToken) {
  this.sessions = this.sessions.filter(s => s.refreshToken !== refreshToken);
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
