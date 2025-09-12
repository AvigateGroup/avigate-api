const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validate } = require('../utils/validators');
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const rateLimiter = require('../middleware/rateLimiter');
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
  })
};

router.post('/auth/login',
  rateLimiter.auth,
  validate(adminValidators.login),
  adminController.login
);

router.post('/totp/setup',
  authenticateAdmin,
  validate(adminValidators.setupTOTP),
  adminController.setupTOTP
);

router.post('/totp/enable',
  authenticateAdmin,
  validate(adminValidators.enableTOTP),
  adminController.enableTOTP
);

router.post('/totp/disable',
  authenticateAdmin,
  validate(adminValidators.disableTOTP),
  adminController.disableTOTP
);

router.post('/totp/backup-codes',
  authenticateAdmin,
  validate(adminValidators.generateBackupCodes),
  adminController.generateBackupCodes
);


router.get('/dashboard',
  authenticateAdmin,
  requirePermission('analytics.view'),
  adminController.getDashboardOverview
);

router.get('/analytics/user-growth',
  authenticateAdmin,
  requirePermission('analytics.view'),
  validate(adminValidators.getUserGrowthMetrics, 'query'),
  adminController.getUserGrowthMetrics
);

router.get('/analytics/geographic',
  authenticateAdmin,
  requirePermission('analytics.view'),
  adminController.getGeographicAnalytics
);


router.get('/system/health',
  authenticateAdmin,
  requirePermission('system.health'),
  adminController.getSystemHealth
);

router.get('/audit-logs',
  authenticateAdmin,
  requirePermission('system.logs'),
  validate(adminValidators.getAuditLogs, 'query'),
  adminController.getAuditLogs
);

router.get('/users',
  authenticateAdmin,
  requirePermission('users.view'),
  validate(adminValidators.getUserManagement, 'query'),
  adminController.getUserManagement
);

router.put('/users/:userId/status',
  authenticateAdmin,
  requirePermission('users.edit'),
  validate(adminValidators.updateUserStatus),
  adminController.updateUserStatus
);

module.exports = router;