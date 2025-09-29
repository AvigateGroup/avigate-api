// routes/user/navigation.js
const express = require('express')
const router = express.Router()
const navigationController = require('../../controllers/user/navigationController')
const { authenticate } = require('../../middleware/user/auth')
const { validationMiddleware } = require('../../middleware/user/validation')
const rateLimiter = require('../../middleware/rateLimiter')

// Route planning
router.post(
    '/plan-route',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validatePlanRoute,
    navigationController.planRoute
)

// Get route details
router.get(
    '/routes/:routeId',
    authenticate,
    rateLimiter.general,
    navigationController.getRouteDetails
)

// Get route alternatives
router.get(
    '/routes/:routeId/alternatives',
    authenticate,
    rateLimiter.general,
    navigationController.getRouteAlternatives
)

// Search locations
router.get(
    '/locations/search',
    authenticate,
    rateLimiter.general,
    navigationController.searchLocations
)

// Get nearby locations
router.get(
    '/locations/nearby',
    authenticate,
    rateLimiter.general,
    navigationController.getNearbyLocations
)

// Get popular routes
router.get(
    '/routes/popular',
    authenticate,
    rateLimiter.general,
    navigationController.getPopularRoutes
)

// Geocoding
router.post(
    '/geocode',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateGeocode,
    navigationController.geocodeAddress
)

// Reverse geocoding
router.get(
    '/reverse-geocode',
    authenticate,
    rateLimiter.general,
    navigationController.reverseGeocode
)

module.exports = router