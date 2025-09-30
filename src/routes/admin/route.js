// routes/admin/routes.js
const express = require('express')
const router = express.Router()
const routeController = require('../../controllers/admin/routeController')
const { authenticateAdmin, requirePermission } = require('../../middleware/admin')
const { validate } = require('../../utils/validators')
const rateLimiter = require('../../middleware/rateLimiter')
const Joi = require('joi')

// Validation schemas
const routeValidators = {
    createRoute: Joi.object({
        name: Joi.string().min(3).max(255).required(),
        description: Joi.string().max(1000).optional(),
        startLocationId: Joi.string().uuid().required(),
        endLocationId: Joi.string().uuid().required(),
        transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').required(),
        distanceKm: Joi.number().min(0.001).max(1000).optional(),
        estimatedDuration: Joi.number().integer().min(1).max(1440).optional(),
        operatingHours: Joi.object().optional(),
        fareInfo: Joi.object({
            min: Joi.number().min(0).optional(),
            max: Joi.number().min(0).optional(),
            currency: Joi.string().default('NGN').optional(),
            type: Joi.string().valid('fixed', 'negotiable', 'metered', 'distance_based').optional(),
        }).optional(),
        difficultyLevel: Joi.number().integer().min(1).max(5).default(1),
        safetyRating: Joi.number().min(0).max(10).default(5.0),
        isVerified: Joi.boolean().default(false),
        isActive: Joi.boolean().default(true),
        verificationNotes: Joi.string().max(1000).optional(),
    }),

    updateRoute: Joi.object({
        name: Joi.string().min(3).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        startLocationId: Joi.string().uuid().optional(),
        endLocationId: Joi.string().uuid().optional(),
        transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').optional(),
        distanceKm: Joi.number().min(0.001).max(1000).optional(),
        estimatedDuration: Joi.number().integer().min(1).max(1440).optional(),
        operatingHours: Joi.object().optional(),
        fareInfo: Joi.object().optional(),
        difficultyLevel: Joi.number().integer().min(1).max(5).optional(),
        safetyRating: Joi.number().min(0).max(10).optional(),
        isVerified: Joi.boolean().optional(),
        isActive: Joi.boolean().optional(),
        verificationNotes: Joi.string().max(1000).optional(),
    }),

    verifyRoute: Joi.object({
        verificationNotes: Joi.string().max(1000).optional(),
    }),

    bulkVerify: Joi.object({
        routeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
        verificationNotes: Joi.string().max(1000).optional(),
    }),

    createRouteStep: Joi.object({
        stepNumber: Joi.number().integer().min(1).required(),
        fromLocationId: Joi.string().uuid().required(),
        toLocationId: Joi.string().uuid().required(),
        transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').required(),
        instruction: Joi.string().min(10).max(1000).required(),
        distanceKm: Joi.number().min(0.001).optional(),
        estimatedDuration: Joi.number().integer().min(1).optional(),
        fareRange: Joi.object({
            min: Joi.number().min(0).optional(),
            max: Joi.number().min(0).optional(),
            currency: Joi.string().default('NGN').optional(),
        }).optional(),
        waitingTime: Joi.number().integer().min(0).default(0),
        safetyNotes: Joi.string().max(500).optional(),
        accessibilityNotes: Joi.string().max(500).optional(),
        landmarks: Joi.array().items(Joi.string()).optional(),
    }),

    updateRouteStep: Joi.object({
        stepNumber: Joi.number().integer().min(1).optional(),
        fromLocationId: Joi.string().uuid().optional(),
        toLocationId: Joi.string().uuid().optional(),
        transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').optional(),
        instruction: Joi.string().min(10).max(1000).optional(),
        distanceKm: Joi.number().min(0.001).optional(),
        estimatedDuration: Joi.number().integer().min(1).optional(),
        fareRange: Joi.object().optional(),
        waitingTime: Joi.number().integer().min(0).optional(),
        safetyNotes: Joi.string().max(500).optional(),
        accessibilityNotes: Joi.string().max(500).optional(),
        landmarks: Joi.array().items(Joi.string()).optional(),
        isActive: Joi.boolean().optional(),
    }),

    updateFareRules: Joi.object({
        fareType: Joi.string().valid('fixed', 'negotiable', 'metered', 'distance_based').required(),
        baseRate: Joi.number().min(0).required(),
        perKmRate: Joi.number().min(0).optional(),
        peakHourMultiplier: Joi.number().min(1).max(3).default(1.0),
        minFare: Joi.number().min(0).optional(),
        maxFare: Joi.number().min(0).optional(),
        currency: Joi.string().default('NGN'),
        effectiveFrom: Joi.date().optional(),
        effectiveTo: Joi.date().optional(),
    }),

    bulkUpdateFares: Joi.object({
        routeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
        adjustmentType: Joi.string().valid('percentage', 'fixed').required(),
        adjustmentValue: Joi.number().required(),
        reason: Joi.string().max(500).optional(),
    }),
}

// ==================== ROUTE MANAGEMENT ====================

// Get all routes with filters and pagination
router.get(
    '/',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getAllRoutes
)

// Get single route details with steps
router.get(
    '/:routeId',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getRouteDetails
)

// Create new route
router.post(
    '/',
    authenticateAdmin,
    requirePermission('routes.create'),
    rateLimiter.admin,
    validate(routeValidators.createRoute),
    routeController.createRoute
)

// Update route
router.put(
    '/:routeId',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    validate(routeValidators.updateRoute),
    routeController.updateRoute
)

// Delete route (soft delete)
router.delete(
    '/:routeId',
    authenticateAdmin,
    requirePermission('routes.delete'),
    rateLimiter.admin,
    routeController.deleteRoute
)

// ==================== ROUTE VERIFICATION ====================

// Verify single route
router.post(
    '/:routeId/verify',
    authenticateAdmin,
    requirePermission('routes.verify'),
    rateLimiter.admin,
    validate(routeValidators.verifyRoute),
    routeController.verifyRoute
)

// Bulk verify routes
router.post(
    '/bulk-verify',
    authenticateAdmin,
    requirePermission('routes.verify'),
    rateLimiter.admin,
    validate(routeValidators.bulkVerify),
    routeController.bulkVerifyRoutes
)

// Unverify route
router.post(
    '/:routeId/unverify',
    authenticateAdmin,
    requirePermission('routes.verify'),
    rateLimiter.admin,
    routeController.unverifyRoute
)

// ==================== ROUTE STEPS MANAGEMENT ====================

// Get all steps for a route
router.get(
    '/:routeId/steps',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getRouteSteps
)

// Add step to route
router.post(
    '/:routeId/steps',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    validate(routeValidators.createRouteStep),
    routeController.addRouteStep
)

// Update route step
router.put(
    '/:routeId/steps/:stepId',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    validate(routeValidators.updateRouteStep),
    routeController.updateRouteStep
)

// Delete route step
router.delete(
    '/:routeId/steps/:stepId',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.deleteRouteStep
)

// Reorder route steps
router.put(
    '/:routeId/steps/reorder',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.reorderRouteSteps
)

// ==================== ANALYTICS & INSIGHTS ====================

// Get route analytics
router.get(
    '/:routeId/analytics',
    authenticateAdmin,
    requirePermission('analytics.view'),
    rateLimiter.admin,
    routeController.getRouteAnalytics
)

// Get route usage statistics
router.get(
    '/:routeId/usage-stats',
    authenticateAdmin,
    requirePermission('analytics.view'),
    rateLimiter.admin,
    routeController.getRouteUsageStats
)

// Get fare statistics for route
router.get(
    '/:routeId/fare-stats',
    authenticateAdmin,
    requirePermission('analytics.view'),
    rateLimiter.admin,
    routeController.getRouteFareStats
)

// Get route safety reports
router.get(
    '/:routeId/safety-reports',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getRouteSafetyReports
)

// ==================== FARE MANAGEMENT ====================

// Update fare rules for route
router.put(
    '/:routeId/fare-rules',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    validate(routeValidators.updateFareRules),
    routeController.updateRouteFareRules
)

// Bulk update fares across multiple routes
router.post(
    '/bulk-update-fares',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    validate(routeValidators.bulkUpdateFares),
    routeController.bulkUpdateFares
)

// Get fare adjustment history for route
router.get(
    '/:routeId/fare-history',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getFareHistory
)

// ==================== ROUTE OPTIMIZATION ====================

// Optimize route (recalculate distances, durations)
router.post(
    '/:routeId/optimize',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.optimizeRoute
)

// Merge duplicate routes
router.post(
    '/merge-duplicates',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.mergeDuplicateRoutes
)

// ==================== EXPORT & IMPORT ====================

// Export routes to CSV/JSON
router.get(
    '/export',
    authenticateAdmin,
    requirePermission('routes.export'),
    rateLimiter.admin,
    routeController.exportRoutes
)

// Import routes from CSV/JSON
router.post(
    '/import',
    authenticateAdmin,
    requirePermission('routes.create'),
    rateLimiter.admin,
    routeController.importRoutes
)

// Generate route from Google Directions
router.post(
    '/generate-from-google',
    authenticateAdmin,
    requirePermission('routes.create'),
    rateLimiter.admin,
    routeController.generateRouteFromGoogle
)

// ==================== BATCH OPERATIONS ====================

// Bulk activate/deactivate routes
router.post(
    '/bulk-toggle-status',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.bulkToggleStatus
)

// Bulk delete routes
router.post(
    '/bulk-delete',
    authenticateAdmin,
    requirePermission('routes.delete'),
    rateLimiter.admin,
    routeController.bulkDeleteRoutes
)

// ==================== ROUTE HEALTH & QUALITY ====================

// Get routes needing attention (outdated, low ratings, etc.)
router.get(
    '/health/needs-attention',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getRoutesNeedingAttention
)

// Get route quality metrics
router.get(
    '/:routeId/quality-metrics',
    authenticateAdmin,
    requirePermission('routes.view'),
    rateLimiter.admin,
    routeController.getRouteQualityMetrics
)

// Update route quality score
router.post(
    '/:routeId/recalculate-quality',
    authenticateAdmin,
    requirePermission('routes.edit'),
    rateLimiter.admin,
    routeController.recalculateRouteQuality
)

module.exports = router