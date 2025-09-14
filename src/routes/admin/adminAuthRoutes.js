const express = require('express');
const router = express.Router();

// Import individual controllers
const authController = require('../../controllers/admin/authController');
const managementController = require('../../controllers/admin/managementController');
const passwordController = require('../../controllers/admin/passwordController');
const totpController = require('../../controllers/admin/totpController');

const { validate } = require('../../utils/validators');
const { authenticateAdmin, requirePermission } = require('../../middleware/admin');
const rateLimiter = require('../../middleware/rateLimiter');
const Joi = require('joi');

// Admin validation schemas
const adminValidators = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    totpToken: Joi.string().length(6).pattern(/^\d+$/).optional(),
    backupCode: Joi.string().length(8).pattern(/^[A-Z0-9]+$/).optional()
  }),

  setupTOTP: Joi.object({}), // No body needed

  enableTOTP: Joi.object({
    token: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  disableTOTP: Joi.object({
    currentPassword: Joi.string().required(),
    totpToken: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  generateBackupCodes: Joi.object({
    currentPassword: Joi.string().required(),
    totpToken: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  updateUserStatus: Joi.object({
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    reason: Joi.string().max(500).optional()
  }),

  getUserManagement: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    verified: Joi.string().valid('true', 'false').optional(),
    state: Joi.string().optional(),
    sortBy: Joi.string().valid('createdAt', 'firstName', 'lastName', 'email', 'reputationScore').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  getAuditLogs: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    action: Joi.string().optional(),
    resource: Joi.string().optional(),
    adminId: Joi.string().uuid().optional(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  }),

  getUserGrowthMetrics: Joi.object({
    period: Joi.number().integer().min(1).max(365).default(30),
    interval: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').default('daily')
  }),

  // Password related validations
  requestPasswordReset: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required()
  }),

  // Admin management validations
  createAdmin: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid('admin', 'moderator', 'analyst').default('admin')
  }),

  acceptInvitation: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required()
  }),

  updateAdmin: Joi.object({
    role: Joi.string().valid('admin', 'moderator', 'analyst').optional(),
    permissions: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional()
  }),

  getAdmins: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    role: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    search: Joi.string().optional()
  })
};

// ================================
// AUTH ROUTES
// ================================
router.post('/auth/login',
  rateLimiter.auth,
  validate(adminValidators.login),
  authController.login
);

router.post('/auth/refresh',
  authController.refreshToken
);

router.post('/auth/logout',
  authenticateAdmin,
  authController.logout
);

// ================================
// PASSWORD ROUTES
// ================================
router.post('/password/request-reset',
  rateLimiter.auth,
  validate(adminValidators.requestPasswordReset),
  passwordController.requestPasswordReset
);

router.post('/password/reset',
  rateLimiter.auth,
  validate(adminValidators.resetPassword),
  passwordController.resetPassword
);

router.post('/password/change',
  authenticateAdmin,
  validate(adminValidators.changePassword),
  passwordController.changePassword
);

// ================================
// TOTP ROUTES
// ================================
router.post('/totp/generate-secret',
  authenticateAdmin,
  totpController.generateTOTPSecret
);

router.post('/totp/enable',
  authenticateAdmin,
  validate(adminValidators.enableTOTP),
  totpController.enableTOTP
);

router.post('/totp/disable',
  authenticateAdmin,
  validate(adminValidators.disableTOTP),
  totpController.disableTOTP
);

router.get('/totp/status',
  authenticateAdmin,
  totpController.getTOTPStatus
);

router.post('/totp/regenerate-backup-codes',
  authenticateAdmin,
  validate(adminValidators.generateBackupCodes),
  totpController.regenerateBackupCodes
);

// ================================
// ADMIN MANAGEMENT ROUTES
// ================================
router.post('/admins',
  authenticateAdmin,
  requirePermission('admin.create'),
  validate(adminValidators.createAdmin),
  managementController.createAdmin
);

router.post('/admins/accept-invitation',
  validate(adminValidators.acceptInvitation),
  managementController.acceptInvitation
);

router.get('/admins',
  authenticateAdmin,
  requirePermission('admin.view'),
  validate(adminValidators.getAdmins, 'query'),
  managementController.getAdmins
);

router.put('/admins/:adminId',
  authenticateAdmin,
  requirePermission('admin.edit'),
  validate(adminValidators.updateAdmin),
  managementController.updateAdmin
);

// ================================
// DASHBOARD & ANALYTICS ROUTES
// ================================
router.get('/dashboard',
  authenticateAdmin,
  requirePermission('analytics.view'),
  authController.getDashboardOverview
);

router.get('/analytics/user-growth',
  authenticateAdmin,
  requirePermission('analytics.view'),
  validate(adminValidators.getUserGrowthMetrics, 'query'),
  authController.getUserGrowthMetrics
);

router.get('/analytics/geographic',
  authenticateAdmin,
  requirePermission('analytics.view'),
  authController.getGeographicAnalytics
);

// ================================
// SYSTEM & MONITORING ROUTES
// ================================
router.get('/system/health',
  authenticateAdmin,
  requirePermission('system.health'),
  authController.getSystemHealth
);

router.get('/audit-logs',
  authenticateAdmin,
  requirePermission('system.logs'),
  validate(adminValidators.getAuditLogs, 'query'),
  authController.getAuditLogs
);

// ================================
// USER MANAGEMENT ROUTES
// ================================
router.get('/users',
  authenticateAdmin,
  requirePermission('users.view'),
  validate(adminValidators.getUserManagement, 'query'),
  authController.getUserManagement
);

router.put('/users/:userId/status',
  authenticateAdmin,
  requirePermission('users.edit'),
  validate(adminValidators.updateUserStatus),
  authController.updateUserStatus
);

module.exports = router;