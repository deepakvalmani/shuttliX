const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const redis        = require('../config/redis');
const { sendEmail, otpTemplate, welcomeTemplate } = require('../utils/email');

// ── Constants ─────────────────────────────────────────────
const OTP_TTL  = 300;   // 5 minutes
const TEMP_TTL = 600;   // 10 minutes — for the verified temp token

// ── Redis key builders ────────────────────────────────────
// All keys are explicit and readable in Redis
const otpKey  = (email, purpose) => `shutlix:otp:${email}:${purpose}`;
const tempKey = (email, purpose) => `shutlix:temp:${email}:${purpose}`;

// ── JWT helpers ───────────────────────────────────────────
const signAccess = (userId, role, orgId) =>
  jwt.sign(
    { id: userId, role, organizationId: orgId?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

const signRefresh = userId =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

// ── Extract client info ───────────────────────────────────
const getIP = req =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  'unknown';

const getDevice = req => {
  const ua = req.headers['user-agent'] || '';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'web';
};

// ── Send tokens + update session ─────────────────────────
const sendTokens = async (user, statusCode, res, req) => {
  const accessToken  = signAccess(user._id, user.role, user.organizationId);
  const refreshToken = signRefresh(user._id);

  // Save refresh token and session info
  user.refreshToken    = refreshToken;
  user.lastLoginAt     = new Date();
  user.lastLoginIP     = getIP(req);
  user.lastLoginDevice = getDevice(req);
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
};

// ── Generate unique org code ──────────────────────────────
const generateOrgCode = async () => {
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!(await Organization.findOne({ code }))) return code;
  }
  throw new Error('Could not generate unique org code');
};

// ─────────────────────────────────────────────────────────
// ── SEND OTP ─────────────────────────────────────────────
// POST /api/auth/send-otp
// body: { email, purpose }  purpose: 'register' | 'reset'
// ─────────────────────────────────────────────────────────
exports.sendOTP = async (req, res, next) => {
  try {
    const { email, purpose = 'register' } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: 'Email and purpose required' });
    }

    const normalized = email.toLowerCase().trim();

    // Validate allowed purposes
    if (!['register', 'reset'].includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Invalid purpose' });
    }

    const existingUser = await User.findOne({ email: normalized });

    if (purpose === 'register' && existingUser) {
      return res.status(400).json({
        success: false, message: 'An account with this email already exists. Please log in.',
      });
    }
    if (purpose === 'reset' && !existingUser) {
      return res.status(404).json({
        success: false, message: 'No account found with this email.',
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store in Redis with explicit namespaced key
    const key = otpKey(normalized, purpose);
    await redis.set(key, otp, OTP_TTL);

    // Send email
    const subjects = {
      register: 'Your ShutliX verification code',
      reset:    'Reset your ShutliX password',
    };

    await sendEmail({
      to:      normalized,
      subject: subjects[purpose],
      html:    otpTemplate(otp, purpose),
    });

    res.json({ success: true, message: `OTP sent to ${normalized}` });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── VERIFY OTP ───────────────────────────────────────────
// POST /api/auth/verify-otp
// body: { email, otp, purpose }
// Returns: { tempToken } — use this to complete the action
// ─────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose = 'register' } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    const normalized = email.toLowerCase().trim();
    const key        = otpKey(normalized, purpose);

    // Get OTP from Redis
    const storedOTP = await redis.get(key);

    if (!storedOTP) {
      return res.status(400).json({
        success: false, message: 'OTP expired or not requested. Please request a new code.',
      });
    }

    if (storedOTP !== otp.toString().trim()) {
      return res.status(400).json({
        success: false, message: 'Incorrect OTP. Please try again.',
      });
    }

    // OTP is correct — delete it immediately (one-time use)
    await redis.del(key);

    // Issue a short-lived temp token to complete the action
    const tempToken = crypto.randomBytes(32).toString('hex');
    await redis.set(tempKey(normalized, purpose), tempToken, TEMP_TTL);

    res.json({ success: true, message: 'OTP verified', tempToken });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── STUDENT / DRIVER REGISTER ────────────────────────────
// POST /api/auth/register
// body: { name, email, password, role, organizationId, tempToken, studentId?, licenseNumber? }
// ─────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organizationId, tempToken, studentId, licenseNumber } = req.body;

    // Validate required
    if (!name || !email || !password || !role || !organizationId || !tempToken) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (!['student', 'driver'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be student or driver' });
    }

    const normalized = email.toLowerCase().trim();

    // Verify temp token
    const storedTemp = await redis.get(tempKey(normalized, 'register'));
    if (!storedTemp || storedTemp !== tempToken) {
      return res.status(400).json({
        success: false, message: 'Verification expired. Please start registration again.',
      });
    }
    await redis.del(tempKey(normalized, 'register'));

    // Validate org
    const org = await Organization.findById(organizationId);
    if (!org || !org.isActive) {
      return res.status(404).json({ success: false, message: 'Organisation not found or inactive' });
    }

    // Check duplicate
    if (await User.findOne({ email: normalized })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        success: false, message: 'Password must be 8+ chars with uppercase, lowercase and number',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalized,
      password,
      role,
      organizationId,
      isVerified: true,
      isActive: true,
      studentId:     role === 'student' ? studentId : undefined,
      licenseNumber: role === 'driver'  ? licenseNumber : undefined,
    });

    await sendTokens(user, 201, res, req);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already registered' });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── ADMIN REGISTER (creates org + admin in one step) ─────
// POST /api/auth/admin-register
// No OTP required — admin creates org directly
// ─────────────────────────────────────────────────────────
exports.adminRegister = async (req, res, next) => {
  try {
    const { adminName, email, password, organizationName, organizationShortName,
      contactEmail, contactPhone, address, timezone } = req.body;

    if (!adminName || !email || !password || !organizationName) {
      return res.status(400).json({ success: false, message: 'adminName, email, password and organizationName required' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        success: false, message: 'Password must be 8+ chars with uppercase, lowercase and number',
      });
    }

    const normalized = email.toLowerCase().trim();
    if (await User.findOne({ email: normalized })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const code = await generateOrgCode();

    const org = await Organization.create({
      name: organizationName,
      shortName: organizationShortName || organizationName.slice(0, 10).toUpperCase(),
      code,
      contactEmail: contactEmail || normalized,
      contactPhone,
      address,
      timezone: timezone || 'Asia/Karachi',
      isActive: true,
    });

    let admin;
    try {
      admin = await User.create({
        name: adminName.trim(),
        email: normalized,
        password,
        role: 'admin',
        organizationId: org._id,
        isVerified: true,
        isActive: true,
      });
    } catch (err) {
      await Organization.findByIdAndDelete(org._id); // rollback org
      throw err;
    }

    // Send welcome email (non-blocking — don't fail registration if email fails)
    sendEmail({
      to:      normalized,
      subject: `Welcome to ShutliX — ${organizationName} is ready`,
      html:    welcomeTemplate(adminName, organizationName, code),
    }).catch(err => console.warn('Welcome email failed (non-fatal):', err.message));

    await sendTokens(admin, 201, res, req);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Email already registered' });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── LOGIN ────────────────────────────────────────────────
// POST /api/auth/login
// body: { email, password, organizationCode? }
// ─────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password, organizationCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const normalized = email.toLowerCase().trim();
    const GENERIC    = 'Invalid email or password';

    const user = await User.findOne({ email: normalized })
      .select('+password +refreshToken +loginAttempts +lockUntil')
      .populate('organizationId', 'name shortName code isActive');

    if (!user) return res.status(401).json({ success: false, message: GENERIC });

    // Account lock check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const min = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${min} minute${min !== 1 ? 's' : ''}.`,
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact your admin.' });
    }

    // Org code check for admins
    if (['admin', 'superadmin'].includes(user.role)) {
      if (!organizationCode) {
        return res.status(400).json({ success: false, message: 'Organisation code required for admin login' });
      }
      const orgCode = user.organizationId?.code || '';
      if (orgCode.toUpperCase() !== organizationCode.toUpperCase()) {
        return res.status(401).json({ success: false, message: 'Invalid organisation code' });
      }
    }

    // Password check
    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incLoginAttempts();
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
      const left = maxAttempts - (user.loginAttempts + 1);
      return res.status(401).json({
        success: false,
        message: left > 0
          ? `${GENERIC}. ${left} attempt${left !== 1 ? 's' : ''} left.`
          : 'Account locked for 15 minutes.',
      });
    }

    // Email verification required (not for admins — they are auto-verified)
    if (!user.isVerified && !['admin', 'superadmin'].includes(user.role)) {
      return res.status(401).json({
        success: false, message: 'Email not verified. Please complete registration.',
      });
    }

    // Success
    await user.resetLoginAttempts();
    await sendTokens(user, 200, res, req);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── FORGOT PASSWORD ──────────────────────────────────────
// POST /api/auth/forgot-password
// body: { email }
// ─────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const normalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalized });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: `If an account exists for ${normalized}, a reset code was sent.` });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const key = otpKey(normalized, 'reset');
    await redis.set(key, otp, OTP_TTL);

    await sendEmail({
      to:      normalized,
      subject: 'Reset your ShutliX password',
      html:    otpTemplate(otp, 'reset'),
    });

    res.json({ success: true, message: `Reset code sent to ${normalized}` });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── RESET PASSWORD ───────────────────────────────────────
// POST /api/auth/reset-password
// body: { email, tempToken, newPassword }
// ─────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, tempToken, newPassword } = req.body;
    if (!email || !tempToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'email, tempToken and newPassword required' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      return res.status(400).json({
        success: false, message: 'Password must be 8+ chars with uppercase, lowercase and number',
      });
    }

    const normalized = email.toLowerCase().trim();
    const storedTemp = await redis.get(tempKey(normalized, 'reset'));

    if (!storedTemp || storedTemp !== tempToken) {
      return res.status(400).json({
        success: false, message: 'Reset token expired or invalid. Please start over.',
      });
    }

    await redis.del(tempKey(normalized, 'reset'));

    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    user.refreshToken = undefined; // invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── REFRESH TOKEN ────────────────────────────────────────
// POST /api/auth/refresh
// body: { refreshToken }
// ─────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const newAccessToken = signAccess(user._id, user.role, user.organizationId);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── ORG LOOKUP (public) ──────────────────────────────────
// GET /api/auth/org-lookup?code=XXX
// ─────────────────────────────────────────────────────────
exports.orgLookup = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'code required' });

    const org = await Organization.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
    }).select('_id name shortName code');

    if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// ── OTHER ENDPOINTS ──────────────────────────────────────
// ─────────────────────────────────────────────────────────
exports.getMe = (req, res) =>
  res.json({ success: true, user: req.user.toPublicJSON() });

exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

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
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password too weak' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    await sendTokens(user, 200, res, req);
  } catch (err) { next(err); }
};

exports.regenerateOrgCode = async (req, res, next) => {
  try {
    const code = await generateOrgCode();
    await Organization.findByIdAndUpdate(req.user.organizationId, { code });
    res.json({ success: true, data: { code } });
  } catch (err) { next(err); }
};
