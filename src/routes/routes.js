const express = require('express')
const router = express.Router()
const routeController = require('../controllers/routeController')
const {
    routeValidators,
    queryValidators,
    validate,
} = require('../utils/validators')
const { authenticate, optionalAuth } = require('../middleware/user/auth')
const rateLimiter = require('../middleware/rateLimiter')

// Search routes
router.get(
    '/search',
    rateLimiter.search,
    optionalAuth,
    validate(routeValidators.search, 'query'),
    routeController.search
)

// Get popular routes
router.get('/popular', routeController.getPopular)

// Get route statistics
router.get('/stats', routeController.getStats)

// Get user's routes
router.get('/my-routes', authenticate, routeController.getMyRoutes)

// Create a new route
router.post(
    '/',
    authenticate,
    rateLimiter.create,
    validate(routeValidators.create),
    routeController.create
)

// Get route by ID
router.get(
    '/:id',
    validate(queryValidators.id, 'params'),
    routeController.getById
)

// Update route
router.put(
    '/:id',
    authenticate,
    validate(queryValidators.id, 'params'),
    validate(routeValidators.update),
    routeController.update
)

// Delete route
router.delete(
    '/:id',
    authenticate,
    validate(queryValidators.id, 'params'),
    routeController.delete
)

// Submit feedback for a route
router.post(
    '/:id/feedback',
    authenticate,
    validate(queryValidators.id, 'params'),
    validate(routeValidators.feedback),
    routeController.submitFeedback
)

module.exports = router
