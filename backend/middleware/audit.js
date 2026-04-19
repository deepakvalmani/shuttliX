'use strict';
const AuditLog = require('../models/AuditLog');

/**
 * Usage: router.post('/route', protect, audit('action.name'), handler)
 */
const audit = (action, resource) => async (req, _res, next) => {
  try {
    await AuditLog.log({
      userId:         req.user?._id,
      organizationId: req.user?.organizationId,
      action,
      resource,
      ip:             req.ip,
      userAgent:      req.headers['user-agent'],
      requestId:      req.requestId,
    });
  } catch {}
  next();
};

module.exports = audit;
