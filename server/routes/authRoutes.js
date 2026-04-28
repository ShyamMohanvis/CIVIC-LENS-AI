const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes — rate-limited to prevent brute-force
router.post('/login',    authLimiter, validate(schemas.login),    authController.login);
router.post('/register', authLimiter, validate(schemas.register), authController.register);

// Protected routes
router.get('/me',     authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);

// Admin: create staff users
router.post(
    '/create-staff',
    authenticate,
    authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN'),
    validate(schemas.createStaff),
    authController.createStaffUser
);

// ── Phase C features: Token Rotation & MFA ──
router.post('/refresh', authLimiter, authController.refreshToken);
router.post('/mfa/verify', authLimiter, authController.verifyMFA); // complete login
router.post('/mfa/setup', authenticate, authController.setupMFA); // logged in user doing setup

module.exports = router;
