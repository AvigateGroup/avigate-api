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

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     AdminBearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [super_admin, admin, moderator, analyst]
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *         totpEnabled:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *     DashboardOverview:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             totalUsers:
 *               type: integer
 *             newUsersToday:
 *               type: integer
 *             verifiedUsers:
 *               type: integer
 *             activeUsersLastMonth:
 *               type: integer
 *             userGrowthRate:
 *               type: number
 *             totalLocations:
 *               type: integer
 *             verifiedLocations:
 *               type: integer
 *             totalRoutes:
 *               type: integer
 *         topStates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *               userCount:
 *                 type: integer
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel endpoints with TOTP authentication
 */

/**
 * @swagger
 * /api/v1/admin/auth/login:
 *   post:
 *     summary: Admin login with TOTP support
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@avigate.com"
 *               password:
 *                 type: string
 *                 example: "SecureAdminPass123"
 *               totpToken:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *                 example: "123456"
 *                 description: "6-digit TOTP token (required if TOTP is enabled)"
 *               backupCode:
 *                 type: string
 *                 pattern: '^[A-Z0-9]{8}$'
 *                 example: "ABC12345"
 *                 description: "8-character backup code (alternative to TOTP)"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       $ref: '#/components/schemas/Admin'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials or TOTP token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 requiresTOTP:
 *                   type: boolean
 *                   description: "Indicates if TOTP token is required"
 *       423:
 *         description: Account locked due to failed attempts
 */
router.post('/auth/login',
  rateLimiter.auth,
  validate(adminValidators.login),
  adminController.login
);

/**
 * @swagger
 * /api/v1/admin/totp/setup:
 *   post:
 *     summary: Setup TOTP for admin account
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                       description: "Base32 encoded secret"
 *                     qrCode:
 *                       type: string
 *                       description: "QR code data URL"
 *                     manualEntryKey:
 *                       type: string
 *                       description: "Manual entry key for authenticator apps"
 *       400:
 *         description: TOTP already enabled
 *       401:
 *         description: Unauthorized
 */
router.post('/totp/setup',
  authenticateAdmin,
  validate(adminValidators.setupTOTP),
  adminController.setupTOTP
);

/**
 * @swagger
 * /api/v1/admin/totp/enable:
 *   post:
 *     summary: Enable TOTP authentication
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *                 example: "123456"
 *                 description: "6-digit TOTP token for verification"
 *     responses:
 *       200:
 *         description: TOTP enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "10 backup codes for account recovery"
 *       400:
 *         description: Invalid TOTP token or TOTP already enabled
 */
router.post('/totp/enable',
  authenticateAdmin,
  validate(adminValidators.enableTOTP),
  adminController.enableTOTP
);

/**
 * @swagger
 * /api/v1/admin/totp/disable:
 *   post:
 *     summary: Disable TOTP authentication
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - totpToken
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: "Current admin password"
 *               totpToken:
 *                 type: string
 *                 pattern: '^\\d{6}
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: TOTP disabled successfully
 *       401:
 *         description: Invalid password or TOTP token
 */
router.post('/totp/disable',
  authenticateAdmin,
  validate(adminValidators.disableTOTP),
  adminController.disableTOTP
);

/**
 * @swagger
 * /api/v1/admin/totp/backup-codes:
 *   post:
 *     summary: Generate new backup codes
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totpToken
 *             properties:
 *               totpToken:
 *                 type: string
 *                 pattern: '^\\d{6}
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: New backup codes generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/totp/backup-codes',
  authenticateAdmin,
  validate(adminValidators.generateBackupCodes),
  adminController.generateBackupCodes
);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardOverview'
 *       403:
 *         description: Insufficient permissions
 */
router.get('/dashboard',
  authenticateAdmin,
  requirePermission('analytics.view'),
  adminController.getDashboardOverview
);

/**
 * @swagger
 * /api/v1/admin/analytics/user-growth:
 *   get:
 *     summary: Get user growth metrics
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *           default: daily
 *         description: Data aggregation interval
 *     responses:
 *       200:
 *         description: User growth metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userGrowth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           newUsers:
 *                             type: integer
 *                           cumulativeUsers:
 *                             type: integer
 *                     verificationRates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           totalUsers:
 *                             type: integer
 *                           verifiedUsers:
 *                             type: integer
 *                           verificationRate:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalNewUsers:
 *                           type: integer
 *                         averagePerDay:
 *                           type: number
 *                         peakDay:
 *                           type: object
 *       403:
 *         description: Insufficient permissions
 */
router.get('/analytics/user-growth',
  authenticateAdmin,
  requirePermission('analytics.view'),
  validate(adminValidators.getUserGrowthMetrics, 'query'),
  adminController.getUserGrowthMetrics
);

/**
 * @swagger
 * /api/v1/admin/analytics/geographic:
 *   get:
 *     summary: Get geographic analytics
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: Geographic distribution data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     usersByState:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           state:
 *                             type: string
 *                           userCount:
 *                             type: integer
 *                           verifiedUsers:
 *                             type: integer
 *                           verificationRate:
 *                             type: number
 *                     locationsByState:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           state:
 *                             type: string
 *                           locationCount:
 *                             type: integer
 *                           verifiedLocations:
 *                             type: integer
 *                           verificationRate:
 *                             type: number
 *                     topCities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           userCount:
 *                             type: integer
 *       403:
 *         description: Insufficient permissions
 */
router.get('/analytics/geographic',
  authenticateAdmin,
  requirePermission('analytics.view'),
  adminController.getGeographicAnalytics
);

/**
 * @swagger
 * /api/v1/admin/system/health:
 *   get:
 *     summary: Get system health metrics
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy]
 *                         latency:
 *                           type: number
 *                         size:
 *                           type: string
 *                         active_connections:
 *                           type: integer
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy, not_configured]
 *                     system:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memoryUsage:
 *                           type: object
 *                         cpuUsage:
 *                           type: object
 *                         nodeVersion:
 *                           type: string
 *                         environment:
 *                           type: string
 *       403:
 *         description: Insufficient permissions
 */
router.get('/system/health',
  authenticateAdmin,
  requirePermission('system.health'),
  adminController.getSystemHealth
);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by admin ID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           action:
 *                             type: string
 *                           resource:
 *                             type: string
 *                           resourceId:
 *                             type: string
 *                             format: uuid
 *                           changes:
 *                             type: object
 *                           ipAddress:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           admin:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       403:
 *         description: Insufficient permissions
 */
router.get('/audit-logs',
  authenticateAdmin,
  requirePermission('system.logs'),
  validate(adminValidators.getAuditLogs, 'query'),
  adminController.getAuditLogs
);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get user management data
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, firstName, lastName, email, reputationScore]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: User management data
 *       403:
 *         description: Insufficient permissions
 */
router.get('/users',
  authenticateAdmin,
  requirePermission('users.view'),
  validate(adminValidators.getUserManagement, 'query'),
  adminController.getUserManagement
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/status:
 *   put:
 *     summary: Update user status
 *     tags: [Admin]
 *     security:
 *       - AdminBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for the status change
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
router.put('/users/:userId/status',
  authenticateAdmin,
  requirePermission('users.edit'),
  validate(adminValidators.updateUserStatus),
  adminController.updateUserStatus
);

module.exports = router;