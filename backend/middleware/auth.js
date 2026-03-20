const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated.' });
    }
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ success: false, message: 'Password was recently changed. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token.' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired.' });
    next(err);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
};

const sameOrganization = (req, res, next) => {
  const paramOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
  if (req.user.role === 'superadmin') return next();
  if (paramOrgId && paramOrgId !== req.user.organizationId?.toString()) {
    return res.status(403).json({ success: false, message: 'You can only access data from your own organization.' });
  }
  req.organizationId = req.user.organizationId;
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      req.user = user || null;
    }
  } catch { req.user = null; }
  next();
};

module.exports = { protect, restrictTo, sameOrganization, optionalAuth };