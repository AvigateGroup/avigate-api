// routes/admin/userManagement.js
const express = require('express')
const router = express.Router()
const userManagementController = require('../../controllers/admin/userManagementController')
const { adminAuth, requirePermission } = require('../../middleware/admin/authMiddleware')
const { adminValidators } = require('../../utils/adminValidators')
const rateLimiter = require('../../middleware/rateLimiter')

// Get all users with pagination and filters
router.get(
    '/users',
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateGetAllUsers,
    userManagementController.getAllUsers
)

// Get user statistics dashboard
router.get(
    '/users/stats',
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateGetUserStats,
    userManagementController.getUserStats
)

// Search users with advanced filters
router.post(
    '/users/search',
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateSearchUsers,
    userManagementController.searchUsers
)

// Get single user details
router.get(
    '/users/:userId',
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    userManagementController.getUserDetails
)

// Update user status (verify, activate/deactivate)
router.patch(
    '/users/:userId/status',
    adminAuth,
    requirePermission('edit_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateUpdateUserStatus,
    userManagementController.updateUserStatus
)

// Reset user password (admin action)
router.post(
    '/users/:userId/reset-password',
    adminAuth,
    requirePermission('edit_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateResetUserPassword,
    userManagementController.resetUserPassword
)

// Delete user account (admin action)
router.delete(
    '/users/:userId',
    adminAuth,
    requirePermission('delete_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validateDeleteUserAccount,
    userManagementController.deleteUserAccount
)

// Get user devices
router.get(
    '/users/:userId/devices',
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    userManagementController.getUserDevices
)

// Deactivate user device
router.patch(
    '/users/:userId/devices/:deviceId/deactivate',
    adminAuth,
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
    adminAuth,
    requirePermission('view_users'),
    rateLimiter.admin,
    adminValidators.validateUserId,
    adminValidators.validatePagination,
    userManagementController.getUserOTPHistory
)

module.exports = router
