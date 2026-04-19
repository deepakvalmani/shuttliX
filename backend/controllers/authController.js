'use strict';
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const User     = require('../models/User');
const redis    = require('../config/redis');
const { sendOTPEmail } = require('../utils/email');
const AuditLog = require('../models/AuditLog');
const logger   = require('../utils/logger');

const signAccess  = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
const signRefresh = id => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });

// POST /auth/send-otp
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await redis.setOTP(`${purpose}:${email}`, otp, 300);
    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) { next(err); }
};

// POST /auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;
    const stored = await redis.getOTP(`${purpose}:${email}`);
    if (!stored || stored !== otp) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    await redis.delOTP(`${purpose}:${email}`);
    const tempToken = jwt.sign({ email, purpose, verified: true }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.json({ success: true, tempToken });
  } catch (err) { next(err); }
};

// POST /auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organizationId, tempToken, studentId, licenseNumber } = req.body;
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.verified || decoded.email !== email || decoded.purpose !== 'register')
      return res.status(400).json({ success: false, message: 'Invalid verification token' });

    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, organizationId, isVerified: true, studentId, licenseNumber });
    const access  = signAccess(user._id);
    const refresh = signRefresh(user._id);
    await user.addSession(refresh, req.headers['user-agent'] || '', req.ip);
    await AuditLog.log({ userId: user._id, organizationId, action: 'auth.register', status: 'success', ip: req.ip });
    res.status(201).json({ success: true, data: { accessToken: access, refreshToken: refresh, user: { _id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId } } });
  } catch (err) { next(err); }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password, organizationCode } = req.body;
    const user = await User.findOne({ email }).select('+password').populate('organizationId');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.isLocked) return res.status(429).json({ success: false, message: 'Account locked — try again in 15 minutes' });
    const ok = await user.comparePassword(password);
    if (!ok) { await user.addLoginAttempt(); return res.status(401).json({ success: false, message: 'Invalid credentials' }); }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account suspended' });
    if (user.organizationId && !user.organizationId.isActive) return res.status(403).json({ success: false, message: 'Organisation suspended' });

    await user.resetLoginAttempts();
    const access  = signAccess(user._id);
    const refresh = signRefresh(user._id);
    await user.addSession(refresh, req.headers['user-agent'] || '', req.ip);
    await AuditLog.log({ userId: user._id, organizationId: user.organizationId?._id, action: 'auth.login', status: 'success', ip: req.ip });
    res.json({ success: true, data: { accessToken: access, refreshToken: refresh, user: { _id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId?._id, organization: user.organizationId } } });
  } catch (err) { next(err); }
};

// POST /auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || !user.sessions.find(s => s.refreshToken === refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const newAccess  = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    await user.removeSession(refreshToken);
    await user.addSession(newRefresh, req.headers['user-agent'] || '', req.ip);
    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
    next(err);
  }
};

// POST /auth/logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) await req.user.removeSession(refreshToken);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

// GET /auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('organizationId');
  res.json({ success: true, data: user });
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await redis.setOTP(`reset:${email}`, otp, 600);
    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'Reset OTP sent' });
  } catch (err) { next(err); }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const stored = await redis.getOTP(`reset:${email}`);
    if (!stored || stored !== otp) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    await redis.delOTP(`reset:${email}`);
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    user.sessions = [];
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

// POST /auth/org-lookup
exports.orgLookup = async (req, res, next) => {
  try {
    const { code } = req.query;
    const { Organization } = require('../models/index');
    const org = await Organization.findOne({ code: code?.toUpperCase() }).select('name code logo isActive');
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
};

// GET /auth/data-export (GDPR)
exports.exportData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('organizationId');
    const { Message } = require('../models/index');
    const messages = await Message.find({ sender: req.user._id }).limit(1000);
    user.exportedAt = new Date();
    await user.save();
    res.json({ success: true, data: { user: user.toObject(), messages, exportedAt: new Date() } });
  } catch (err) { next(err); }
};

// DELETE /auth/delete-account (GDPR)
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.name          = '[Deleted]';
    user.email         = `deleted_${user._id}@deleted.invalid`;
    user.password      = 'deleted';
    user.isActive      = false;
    user.sessions      = [];
    user.dataDeletedAt = new Date();
    await user.save();
    await AuditLog.log({ userId: user._id, action: 'auth.deleteAccount', status: 'success', ip: req.ip });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { next(err); }
};
