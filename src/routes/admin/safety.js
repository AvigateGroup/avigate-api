// routes/user/safety.js
const express = require('express')
const router = express.Router()
const safetyController = require('../../controllers/user/safetyController')
const { authenticate } = require('../../middleware/user/auth')
const { validationMiddleware } = require('../../middleware/user/validation')
const rateLimiter = require('../../middleware/rateLimiter')

// Get location safety information
router.get(
    '/locations/:locationId',
    rateLimiter.general,
    safetyController.getLocationSafety
)

// Get route safety information
router.get(
    '/routes/:routeId',
    rateLimiter.general,
    safetyController.getRouteSafety
)

// Get safety alerts for area
router.get(
    '/alerts',
    rateLimiter.general,
    safetyController.getSafetyAlerts
)

// Share location with trusted contacts (emergency)
router.post(
    '/share-location',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateShareLocation,
    safetyController.shareLocationWithContacts
)

// Get safe routes
router.get(
    '/safe-routes',
    rateLimiter.general,
    safetyController.getSafeRoutes
)

module.exports = router