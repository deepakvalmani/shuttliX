const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth   = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');

// ── Validation helper ─────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// ── OTP flow ─────────────────────────────────────────────
router.post('/send-otp',
  body('email').isEmail().withMessage('Valid email required'),
  body('purpose').isIn(['register', 'reset']).withMessage('purpose must be register or reset'),
  validate,
  auth.sendOTP
);

router.post('/verify-otp',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('purpose').isIn(['register', 'reset']),
  validate,
  auth.verifyOTP
);

// ── Registration ──────────────────────────────────────────
router.post('/register',
  body('name').trim().notEmpty().isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['student', 'driver']),
  body('organizationId').notEmpty(),
  body('tempToken').notEmpty(),
  validate,
  auth.register
);

router.post('/admin-register',
  body('adminName').trim().notEmpty().isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('organizationName').trim().notEmpty().isLength({ min: 2, max: 100 }),
  validate,
  auth.adminRegister
);

// ── Login / session ───────────────────────────────────────
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  auth.login
);

router.post('/refresh',   auth.refreshToken);
router.post('/logout',    protect, auth.logout);

// ── Password reset ────────────────────────────────────────
router.post('/forgot-password',
  body('email').isEmail(),
  validate,
  auth.forgotPassword
);

router.post('/reset-password',
  body('email').isEmail(),
  body('tempToken').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  auth.resetPassword
);

// ── Org lookup (public) ───────────────────────────────────
router.get('/org-lookup', auth.orgLookup);

// ── Authenticated endpoints ───────────────────────────────
router.get('/me',               protect, auth.getMe);
router.patch('/update-profile', protect, auth.updateProfile);
router.patch('/change-password',protect, auth.changePassword);
router.post('/regenerate-org-code',
  protect, restrictTo('admin', 'superadmin'),
  auth.regenerateOrgCode
);

module.exports = router;
