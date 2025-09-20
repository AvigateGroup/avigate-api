// routes/user/auth.js - Updated with individual controller imports
const express = require('express')
const router = express.Router()

// Import individual controllers
const authController = require('../../controllers/user/authController')
const loginHelper = require('../../controllers/user/loginHelper')
const verificationController = require('../../controllers/user/verificationController')
const profileController = require('../../controllers/user/profileController')
const { deviceController, tokenController } = require('../../controllers/user/deviceController')
const testController = require('../../controllers/user/testController')

// Import middleware
const { validationMiddleware } = require('../../middleware/user/validation')
const { authenticate } = require('../../middleware/user/auth')
const rateLimiter = require('../../middleware/rateLimiter')

// Registration and Email Verification
router.post(
    '/register',
    rateLimiter.auth,
    validationMiddleware.validateRegister,
    authController.register
)

router.post(
    '/verify-email',
    rateLimiter.auth,
    validationMiddleware.validateVerifyEmail,
    verificationController.verifyEmail
)

router.post(
    '/resend-verification',
    rateLimiter.auth,
    validationMiddleware.validateResendVerificationEmail,
    verificationController.resendVerificationEmail
)

router.get(
    '/verification-status',
    rateLimiter.general,
    verificationController.checkVerificationStatus
)

// Login and OTP Verification
router.post(
    '/login',
    rateLimiter.auth,
    validationMiddleware.validateLogin,
    authController.login
)

router.post(
    '/verify-login-otp',
    rateLimiter.auth,
    validationMiddleware.validateVerifyLoginOTP,
    loginHelper.verifyLoginOTP
)

// Google OAuth
router.post(
    '/google',
    rateLimiter.auth,
    validationMiddleware.validateGoogleAuth,
    authController.googleAuth
)

// Token Management
router.post(
    '/refresh-token',
    rateLimiter.general,
    validationMiddleware.validateRefreshToken,
    tokenController.refreshToken
)

router.post(
    '/revoke-token',
    authenticate,
    tokenController.revokeToken
)

router.get(
    '/validate-token',
    authenticate,
    tokenController.validateToken
)

router.get(
    '/token-info',
    authenticate,
    tokenController.getTokenInfo
)

router.post(
    '/logout',
    authenticate,
    validationMiddleware.validateLogout,
    loginHelper.logout
)

// Profile Management
router.get(
    '/profile',
    authenticate,
    profileController.getProfile
)

router.put(
    '/profile',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateUpdateProfile,
    profileController.updateProfile
)

router.post(
    '/change-password',
    authenticate,
    rateLimiter.auth,
    validationMiddleware.validateChangePassword,
    profileController.changePassword
)

router.put(
    '/preferences',
    authenticate,
    rateLimiter.general,
    profileController.updatePreferences
)

router.get(
    '/stats',
    authenticate,
    profileController.getUserStats
)

// Device Management
router.get(
    '/devices',
    authenticate,
    profileController.getUserDevices
)

router.post(
    '/devices/register',
    authenticate,
    rateLimiter.general,
    deviceController.registerDevice
)

router.put(
    '/devices/activity',
    authenticate,
    rateLimiter.general,
    deviceController.updateDeviceActivity
)

router.patch(
    '/devices/:deviceId/deactivate',
    authenticate,
    profileController.deactivateDevice
)

// FCM Token Management
router.post(
    '/fcm-token',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateUpdateFCMToken,
    deviceController.updateFCMToken
)

router.delete(
    '/fcm-token',
    authenticate,
    deviceController.removeFCMToken
)

// Account Deletion
router.delete(
    '/account',
    authenticate,
    rateLimiter.auth,
    validationMiddleware.validateDeleteAccount,
    profileController.deleteAccount
)

// Test Accounts Endpoints (Development/Staging only)
router.get(
    '/test-accounts',
    testController.getTestAccounts
)

router.post(
    '/test-accounts/:email/reset',
    testController.resetTestAccount
)

router.post(
    '/test-token/validate',
    testController.validateTestToken
)

// Development endpoints
router.get(
    '/otp-info',
    verificationController.getOTPInfo
)

module.exports = router