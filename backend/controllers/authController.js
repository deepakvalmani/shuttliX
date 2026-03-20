const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { validationResult } = require('express-validator');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const { setOTP, getOTP, deleteOTP } = require('../config/redis');
const sendEmail    = require('../utils/email');

// ── CONSTANTS ─────────────────────────────────────────────
const OTP_TTL      = 300;   // 5 min
const TEMP_TTL     = 600;   // 10 min
const LOCK_MINUTES = 15;
const MAX_ATTEMPTS = 5;

// ── TOKEN HELPERS ─────────────────────────────────────────
const signAccess = (userId, role, orgId) =>
  jwt.sign({ id: userId, role, organizationId: orgId?.toString() },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });

const signRefresh = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });

const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'web';
};

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress || 'unknown';

const sendTokens = async (user, statusCode, res, req) => {
  const accessToken  = signAccess(user._id, user.role, user.organizationId);
  const refreshToken = signRefresh(user._id);
  const ip     = getIP(req);
  const device = getDeviceInfo(req);

  await user.recordSession(ip, device, req.headers['user-agent']);
  user.refreshToken = refreshToken;
  user.lastLogin    = Date.now();
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true, accessToken, refreshToken,
    user: user.toPublicJSON(),
  });
};

const generateOrgCode = async () => {
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!await Organization.findOne({ code })) return code;
  }
  throw new Error('Could not generate unique org code');
};

// ── EMAIL TEMPLATES ───────────────────────────────────────
const otpEmail = (otp, purpose = 'verification') => `
<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0D2137;padding:32px;border-radius:16px">
  <div style="text-align:center;margin-bottom:24px">
    <div style="display:inline-block;background:#1A56DB;padding:12px 24px;border-radius:50px;color:white;font-size:20px;font-weight:700">
      ShutliX
    </div>
  </div>
  <h2 style="color:#F9FAFB;margin:0 0 8px">${purpose === 'reset' ? 'Reset your password' : 'Verify your email'}</h2>
  <p style="color:#9CA3AF;margin:0 0 24px">Your one-time code is valid for 5 minutes.</p>
  <div style="background:#132C47;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
    <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#1A56DB">${otp}</div>
  </div>
  <p style="color:#6B7280;font-size:13px;text-align:center">Do not share this code. ShutliX will never ask for it.</p>
</div>`;

// ── SEND OTP ──────────────────────────────────────────────
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, purpose = 'register' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const normalized = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalized });

    // Enforce purpose rules
    if (purpose === 'register' && existing)
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    if (purpose === 'login' && !existing)
      return res.status(400).json({ success: false, message: 'No account found with this email.' });
    if (purpose === 'reset' && !existing)
      return res.status(404).json({ success: false, message: 'No account found with this email.' });

    const otp = crypto.randomInt(100000, 999999).toString();
    await setOTP(`otp:${normalized}:${purpose}`, otp, OTP_TTL);

    const subjects = {
      register: 'Your ShutliX verification code',
      reset:    'Reset your ShutliX password',
      login:    'Your ShutliX login code',
    };

    await sendEmail({
      to: normalized,
      subject: subjects[purpose] || 'Your ShutliX code',
      html: otpEmail(otp, purpose),
    });

    res.json({ success: true, message: `OTP sent to ${normalized}` });
  } catch (err) { next(err); }
};

// ── VERIFY OTP ────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose = 'register' } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });
    const normalized = email.toLowerCase().trim();

    const stored = await getOTP(`otp:${normalized}:${purpose}`);
    if (!stored || stored !== otp)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Request a new one.' });

    await deleteOTP(`otp:${normalized}:${purpose}`);

    const tempToken = crypto.randomBytes(32).toString('hex');
    await setOTP(`temp:${normalized}:${purpose}`, tempToken, TEMP_TTL);

    res.json({ success: true, tempToken });
  } catch (err) { next(err); }
};

// ── STUDENT / DRIVER REGISTER ─────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role, organizationId, studentId, licenseNumber, tempToken } = req.body;
    const normalized = email.toLowerCase().trim();

    // Verify tempToken
    if (!tempToken) return res.status(400).json({ success: false, message: 'Email verification required' });
    const stored = await getOTP(`temp:${normalized}:register`);
    if (!stored || stored !== tempToken)
      return res.status(400).json({ success: false, message: 'Verification expired. Please restart registration.' });
    await deleteOTP(`temp:${normalized}:register`);

    // Confirm org
    const org = await Organization.findById(organizationId);
    if (!org || !org.isActive)
      return res.status(404).json({ success: false, message: 'Organisation not found or inactive' });

    // Duplicate guard (handles race conditions)
    const existing = await User.findOne({ email: normalized });
    if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const user = await User.create({
      name: name.trim(), email: normalized, password, role, organizationId,
      studentId:     role === 'student' ? studentId : undefined,
      licenseNumber: role === 'driver'  ? licenseNumber : undefined,
      isVerified: true,
    });

    await sendTokens(user, 201, res, req);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already registered.' });
    next(err);
  }
};

// ── ADMIN SELF-REGISTER ───────────────────────────────────
exports.adminRegister = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { adminName, email, password, organizationName, organizationShortName,
      contactEmail, contactPhone, address, timezone } = req.body;
    const normalized = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalized });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const code = await generateOrgCode();

    // Create org first — if admin creation fails we clean up
    const org = await Organization.create({
      name: organizationName, shortName: organizationShortName, code,
      contactEmail: contactEmail || normalized, contactPhone, address,
      timezone: timezone || 'Asia/Karachi', isActive: true, plan: 'pilot',
    });

    let admin;
    try {
      admin = await User.create({
        name: adminName.trim(), email: normalized, password,
        role: 'admin', organizationId: org._id,
        isActive: true, isVerified: true,
      });
    } catch (err) {
      // Rollback org if user creation fails
      await Organization.findByIdAndDelete(org._id);
      throw err;
    }

    await sendEmail({
      to: normalized,
      subject: 'Welcome to ShutliX — Your organisation is ready',
      html: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0D2137;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#1A56DB;padding:12px 24px;border-radius:50px;color:white;font-size:20px;font-weight:700">ShutliX</div>
        </div>
        <h2 style="color:#F9FAFB">Welcome, ${adminName}!</h2>
        <p style="color:#9CA3AF">Your organisation <strong style="color:#F9FAFB">${organizationName}</strong> is ready.</p>
        <div style="background:#132C47;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin:20px 0">
          <p style="color:#9CA3AF;margin:0 0 6px;font-size:12px">ORGANISATION CODE</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1A56DB">${code}</div>
          <p style="color:#6B7280;margin:8px 0 0;font-size:12px">Share this with drivers and members so they can join</p>
        </div>
        <p style="color:#9CA3AF;font-size:13px">Login requires: email + password + code <strong style="color:#F9FAFB">${code}</strong></p>
      </div>`,
    });

    await sendTokens(admin, 201, res, req);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already registered.' });
    next(err);
  }
};

// ── LOGIN ─────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password, organizationCode } = req.body;
    const normalized = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalized })
      .select('+password +refreshToken +loginAttempts +lockUntil')
      .populate('organizationId');

    // Generic error — never reveal whether email or password was wrong
    const GENERIC = 'Invalid credentials';

    if (!user) return res.status(401).json({ success: false, message: GENERIC });

    // Check account lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
      });
    }

    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact your admin.' });

    // Admin org code check
    if (user.role === 'admin' || user.role === 'superadmin') {
      if (!organizationCode)
        return res.status(400).json({ success: false, message: 'Organisation code required for admin login' });
      if (!user.organizationId || user.organizationId.code !== organizationCode)
        return res.status(401).json({ success: false, message: 'Invalid organisation code' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incLoginAttempts();
      const attemptsLeft = MAX_ATTEMPTS - (user.loginAttempts + 1);
      return res.status(401).json({
        success: false,
        message: attemptsLeft > 0
          ? `${GENERIC}. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
          : `Account locked for ${LOCK_MINUTES} minutes due to too many failed attempts.`,
      });
    }

    if (!user.isVerified && !['admin','superadmin'].includes(user.role))
      return res.status(401).json({ success: false, message: 'Email not verified. Please complete registration.' });

    // Success — reset attempts
    await user.resetLoginAttempts();
    await sendTokens(user, 200, res, req);
  } catch (err) { next(err); }
};

// ── FORGOT PASSWORD ───────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const normalized = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalized });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account found with this email' });

    const otp = crypto.randomInt(100000, 999999).toString();
    await setOTP(`otp:${normalized}:reset`, otp, OTP_TTL);

    await sendEmail({
      to: normalized,
      subject: 'Reset your ShutliX password',
      html: otpEmail(otp, 'reset'),
    });

    res.json({ success: true, message: `Reset code sent to ${normalized}` });
  } catch (err) { next(err); }
};

// ── RESET PASSWORD (after OTP verified) ──────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, tempToken, newPassword } = req.body;
    if (!email || !tempToken || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, token and new password required' });

    const normalized = email.toLowerCase().trim();

    const stored = await getOTP(`temp:${normalized}:reset`);
    if (!stored || stored !== tempToken)
      return res.status(400).json({ success: false, message: 'Reset link expired. Request a new one.' });
    await deleteOTP(`temp:${normalized}:reset`);

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword))
      return res.status(400).json({ success: false, message: 'Password must be 8+ chars with uppercase, lowercase and number.' });

    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    user.refreshToken = null; // invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) { next(err); }
};

// ── ORG LOOKUP (public) ───────────────────────────────────
exports.orgLookup = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });
    const org = await Organization.findOne({
      $or: [{ code: code.toUpperCase() }, { _id: code.length === 24 ? code : null }],
      isActive: true,
    }).select('_id name shortName code');
    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
};

// ── REGENERATE ORG CODE ───────────────────────────────────
exports.regenerateOrgCode = async (req, res, next) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Forbidden' });
    const code = await generateOrgCode();
    const org = await Organization.findByIdAndUpdate(req.user.organizationId, { code }, { new: true });
    res.json({ success: true, data: { code: org.code } });
  } catch (err) { next(err); }
};

// ── REFRESH TOKEN ─────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
    let decoded;
    try { decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    const newAccessToken = signAccess(user._id, user.role, user.organizationId);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) =>
  res.json({ success: true, user: req.user.toPublicJSON() });

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'profilePicture', 'notificationPreferences'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both current and new password required' });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword))
      return res.status(400).json({ success: false, message: 'New password must be 8+ chars with uppercase, lowercase and number.' });
    const user = await User.findById(req.user._id).select('+password');
    if (!await user.comparePassword(currentPassword))
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    await sendTokens(user, 200, res, req);
  } catch (err) { next(err); }
};

exports.updateFCMToken = async (req, res, next) => {
  try {
    const { token, device } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    const user = await User.findById(req.user._id);
    user.fcmTokens = user.fcmTokens.filter(t => t.device !== device);
    user.fcmTokens.push({ token, device: device || 'web', updatedAt: new Date() });
    if (user.fcmTokens.length > 5) user.fcmTokens = user.fcmTokens.slice(-5);
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'FCM token updated' });
  } catch (err) { next(err); }
};
