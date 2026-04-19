const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: verify JWT, attach user to req ──────────────
const protect = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;

    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id).populate('organizationId', 'name shortName code isActive');
    if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ── RestrictTo: allow only specific roles ────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

// ── Optional auth: attach user if token present ──────────
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch {}
  next();
};

module.exports = { protect, restrictTo, optionalAuth };
