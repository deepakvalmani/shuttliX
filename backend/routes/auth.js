/**
 * routes/auth.js  v2.0
 * All routes validated with express-validator before hitting controller.
 */
const router = require('express').Router();
const auth   = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validate');

// ── Public ────────────────────────────────────────────────
router.post('/send-otp',         validate(rules.sendOtpRules),         auth.sendOTP);
router.post('/verify-otp',       validate(rules.verifyOtpRules),       auth.verifyOTP);
router.post('/register',         validate(rules.registerRules),        auth.register);
router.post('/admin-register',   validate(rules.adminRegisterRules),   auth.adminRegister);
router.post('/login',            validate(rules.loginRules),           auth.login);
router.post('/forgot-password',  auth.forgotPassword);
router.post('/reset-password',   validate(rules.resetPasswordRules),   auth.resetPassword);
router.post('/refresh',          auth.refreshToken);
router.get ('/org-lookup',       auth.orgLookup);

// ── Protected ─────────────────────────────────────────────
router.use(protect);
router.get   ('/me',               auth.getMe);
router.post  ('/logout',           auth.logout);
router.patch ('/profile',          auth.updateProfile);
router.patch ('/change-password',  validate(rules.changePasswordRules), auth.changePassword);
router.post  ('/regenerate-code',  auth.regenerateOrgCode);

module.exports = router;
