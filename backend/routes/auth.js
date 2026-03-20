const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// OTP flow for students/drivers
router.post('/send-otp', body('email').isEmail(), authController.sendOTP);
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], authController.verifyOTP);

// Student / Driver register (requires OTP)
router.post('/register', [
  body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['student', 'driver']),
  body('organizationId').notEmpty(),
], authController.register);

// Admin self-registration (creates org + admin account in one step)
router.post('/admin-register', [
  body('adminName').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('organizationName').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('organizationShortName').trim().notEmpty().isLength({ min: 2, max: 20 }),
], authController.adminRegister);

// Login (all roles)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

// Lookup org by code or QR (public — used on register page)
router.get('/org-lookup', authController.orgLookup);

// Forgot / reset password
router.post('/forgot-password', body('email').isEmail(), authController.forgotPassword);
router.post('/reset-password', [
  body('email').isEmail(),
  body('tempToken').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], authController.resetPassword);

router.post('/refresh', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/update-profile', protect, authController.updateProfile);
router.patch('/change-password', protect, authController.changePassword);
router.post('/fcm-token', protect, authController.updateFCMToken);

// Admin: regenerate org QR / code
router.post('/regenerate-org-code', protect, authController.regenerateOrgCode);

module.exports = router;
