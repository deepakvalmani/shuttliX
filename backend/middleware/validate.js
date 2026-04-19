/**
 * middleware/validate.js
 * Centralised express-validator runner + error formatter.
 *
 * Usage:
 *   router.post('/login', validate(loginRules), authController.login);
 */
const { validationResult, body, param, query } = require('express-validator');

// ── Runner ────────────────────────────────────────────────
const validate = (rules) => async (req, res, next) => {
  await Promise.all(rules.map(r => r.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
};

// ── Shared rule sets ──────────────────────────────────────
const emailRule = body('email')
  .isEmail().withMessage('Valid email required')
  .normalizeEmail();

const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/\d/).withMessage('Password must contain at least one number');

const newPasswordRule = body('newPassword')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/\d/).withMessage('Password must contain at least one number');

// ── Auth rules ────────────────────────────────────────────
const loginRules = [
  emailRule,
  body('password').notEmpty().withMessage('Password required'),
];

const sendOtpRules = [
  emailRule,
  body('purpose').isIn(['register','reset']).withMessage('purpose must be register or reset'),
];

const verifyOtpRules = [
  emailRule,
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit number'),
  body('purpose').isIn(['register','reset']).withMessage('Invalid purpose'),
];

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
  emailRule,
  passwordRule,
  body('role').isIn(['student','driver']).withMessage('Role must be student or driver'),
  body('organizationId').isMongoId().withMessage('Valid organisation ID required'),
  body('tempToken').notEmpty().withMessage('Verification token required'),
];

const adminRegisterRules = [
  body('adminName').trim().isLength({ min: 2, max: 60 }).withMessage('Admin name required (2–60 chars)'),
  emailRule,
  passwordRule,
  body('organizationName').trim().isLength({ min: 2, max: 100 }).withMessage('Organisation name required'),
];

const resetPasswordRules = [
  emailRule,
  body('tempToken').notEmpty().withMessage('Reset token required'),
  newPasswordRule,
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  newPasswordRule,
];

// ── Shuttle rules ─────────────────────────────────────────
const shuttleRules = [
  body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name required'),
  body('plateNumber').trim().isLength({ min: 2, max: 20 }).withMessage('Plate number required'),
  body('capacity').isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1–200'),
];

// ── Pagination rules ──────────────────────────────────────
const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
];

module.exports = {
  validate,
  rules: {
    loginRules, sendOtpRules, verifyOtpRules, registerRules,
    adminRegisterRules, resetPasswordRules, changePasswordRules,
    shuttleRules, paginationRules,
  },
};
