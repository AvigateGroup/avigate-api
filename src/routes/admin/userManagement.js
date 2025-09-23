// routes/admin/userManagement.js
const express = require('express')
const router = express.Router()
const userManagementController = require('../../controllers/admin/userManagementController')
const { authenticateAdmin, requirePermission } = require('../../middleware/admin')
const { adminValidators } = require('../../utils/adminValidators')
const rateLimiter = require('../../middleware/rateLimiter')
const { logger } = require('../../utils/logger')

// Debug middleware
const debugMiddleware = (name) => (req, res, next) => {
    logger.info(`=== ${name} MIDDLEWARE START ===`)
    logger.info(`${name} - Request URL:`, req.url)
    logger.info(`${name} - Request Method:`, req.method)
    logger.info(`${name} - Request Query:`, req.query)
    logger.info(`${name} - Admin present:`, !!req.admin)
    if (req.admin) {
        logger.info(`${name} - Admin ID:`, req.admin.id)
        logger.info(`${name} - Admin Email:`, req.admin.email)
        logger.info(`${name} - Admin Role:`, req.admin.role)
    }
    logger.info(`=== ${name} MIDDLEWARE END ===`)
    next()
}

// Get all users with pagination and filters
router.get(
    '/users',
    debugMiddleware('ROUTE_START'),
    authenticateAdmin,
    debugMiddleware('AUTH_PASSED'),
    requirePermission('view_users'),
    debugMiddleware('PERMISSION_PASSED'),
    rateLimiter.admin,
    debugMiddleware('RATE_LIMIT_PASSED'),
    adminValidators.validateGetAllUsers,
    debugMiddleware('VALIDATION_PASSED'),
    (req, res, next) => {
        logger.info('=== CALLING CONTROLLER ===')
        next()
    },
    userManagementController.getAllUsers
)

// Get user statistics dashboard
router.get(
    '/users/stats',
    authenticateAdmin,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateGetUserStats,
    userManagementController.getUserStats
)

// Search users with advanced filters
router.post(
    '/users/search',
    authenticateAdmin,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateSearchUsers,
    userManagementController.searchUsers
)

// Get single user details
router.get(
    '/users/:userId',
    authenticateAdmin,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    userManagementController.getUserDetails
)

// Update user status (verify, activate/deactivate)
router.patch(
    '/users/:userId/status',
    authenticateAdmin,
    requirePermission('edit_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateUpdateUserStatus,
    userManagementController.updateUserStatus
)

// Reset user password (admin action)
router.post(
    '/users/:userId/reset-password',
    authenticateAdmin,
    requirePermission('edit_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateResetUserPassword,
    userManagementController.resetUserPassword
)

// Delete user account (admin action)
router.delete(
    '/users/:userId',
    authenticateAdmin,
    requirePermission('delete_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateDeleteUserAccount,
    userManagementController.deleteUserAccount
)

// Get user devices
router.get(
    '/users/:userId/devices',
    authenticateAdmin,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    userManagementController.getUserDevices
)

// Deactivate user device
router.patch(
    '/users/:userId/devices/:deviceId/deactivate',
    authenticateAdmin,
    requirePermission('edit_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateDeviceId,
    adminValidators.validateDeactivateUserDevice,
    userManagementController.deactivateUserDevice
)

// Get user OTP history
router.get(
    '/users/:userId/otp-history',
    authenticateAdmin,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validatePagination,
    userManagementController.getUserOTPHistory
)

module.exports = router