// routes/api/fares.js
const express = require('express')
const router = express.Router()
const fareController = require('../../controllers/user/fareController')
const { authenticate } = require('../../middleware/user/auth')
const { validationMiddleware } = require('../../middleware/user/validation')
const rateLimiter = require('../../middleware/rateLimiter')

// Submit fare feedback
router.post(
    '/feedback',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateFareFeedback,
    fareController.submitFareFeedback
)

// Get route fare information
router.get(
    '/routes/:routeId',
    rateLimiter.general,
    fareController.getRouteFareInfo
)

// Compare fares between routes
router.post(
    '/compare',
    rateLimiter.general,
    validationMiddleware.validateFareComparison,
    fareController.compareFares
)

// Get user's fare feedback history
router.get(
    '/user/history',
    authenticate,
    rateLimiter.general,
    fareController.getUserFareFeedback
)

// Dispute fare feedback
router.post(
    '/feedback/:feedbackId/dispute',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateDisputeFare,
    fareController.disputeFareFeedback
)

module.exports = router