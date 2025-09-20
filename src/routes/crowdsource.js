const express = require('express')
const router = express.Router()
const crowdsourceController = require('../controllers/crowdsourceController')
const {
    crowdsourceValidators,
    validate,
    queryValidators,
} = require('../utils/validators')
const {
    authenticate,
    requireVerified,
    requireMinReputation,
} = require('../middleware/user/auth')
const rateLimiter = require('../middleware/rateLimiter')
const { asyncHandler } = require('../middleware/errorHandler')

// Submit route update
router.post(
    '/route-update',
    authenticate,
    requireVerified,
    requireMinReputation(10),
    rateLimiter.crowdsource,
    validate(crowdsourceValidators.routeUpdate),
    asyncHandler(crowdsourceController.submitRouteUpdate)
)

// Submit fare report
router.post(
    '/fare-report',
    authenticate,
    requireVerified,
    rateLimiter.crowdsource,
    validate(crowdsourceValidators.fareReport),
    asyncHandler(crowdsourceController.submitFareReport)
)

// Submit new route suggestion
router.post(
    '/new-route',
    authenticate,
    requireVerified,
    requireMinReputation(50),
    rateLimiter.crowdsource,
    validate(crowdsourceValidators.newRoute),
    asyncHandler(crowdsourceController.submitNewRoute)
)

// Get user's contributions
router.get(
    '/contributions',
    authenticate,
    validate(queryValidators.pagination, 'query'),
    asyncHandler(crowdsourceController.getMyContributions)
)

// Get crowdsourcing statistics
router.get('/stats', asyncHandler(crowdsourceController.getStats))

// Get pending suggestions (admin only)
router.get(
    '/pending-suggestions',
    authenticate,
    requireMinReputation(500),
    validate(queryValidators.pagination, 'query'),
    asyncHandler(crowdsourceController.getPendingSuggestions)
)

// Review suggestion (admin only)
router.post(
    '/suggestions/:id/review',
    authenticate,
    requireMinReputation(500),
    validate(queryValidators.id, 'params'),
    validate({
        action: require('joi').string().valid('approve', 'reject').required(),
        comments: require('joi').string().max(500).optional(),
    }),
    asyncHandler(crowdsourceController.reviewSuggestion)
)

module.exports = router
