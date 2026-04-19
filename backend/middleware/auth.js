/**
 * middleware/auth.js  v2.0
 * – Validates JWT access token
 * – Checks account / org status
 * – Attaches full user to req.user
 */
const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// ── Protect ───────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Authentication required' });

    const token = header.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      const msg = e.name === 'TokenExpiredError'
        ? 'Session expired — please log in again'
        : 'Invalid token';
      return res.status(401).json({ success: false, message: msg });
    }

    const user = await User.findById(decoded.id)
      .populate('organizationId', 'name shortName code isActive settings');

    if (!user)
      return res.status(401).json({ success: false, message: 'Account not found' });

    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account deactivated — contact your administrator' });

    // Organisation suspension check (non-superadmins only)
    if (user.role !== 'superadmin' && user.organizationId && !user.organizationId.isActive)
      return res.status(403).json({ success: false, message: 'Your organisation has been suspended' });

    req.user = user;
    next();
  } catch (err) {
    logger.error('protect middleware error:', err);
    next(err);
  }
};

// ── RestrictTo ────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({
      success: false,
      message: `This action requires one of the following roles: ${roles.join(', ')}`,
    });
  next();
};

// ── Same organisation guard ───────────────────────────────
// Ensures the target resource belongs to req.user's organisation
const sameOrg = (getOrgId) => async (req, res, next) => {
  try {
    const resourceOrgId = await getOrgId(req);
    if (!resourceOrgId) return next();
    if (resourceOrgId.toString() !== req.user.organizationId?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied — resource belongs to another organisation' });
    }
    next();
  } catch (err) { next(err); }
};

// ── Optional auth ─────────────────────────────────────────
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

module.exports = { protect, restrictTo, sameOrg, optionalAuth };
