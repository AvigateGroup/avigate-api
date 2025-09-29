// routes/user/directions.js
const express = require('express')
const router = express.Router()
const directionsController = require('../../controllers/user/directionsController')
const { authenticate } = require('../../middleware/user/auth')
const { validationMiddleware } = require('../../middleware/user/validation')
const rateLimiter = require('../../middleware/rateLimiter')

// Create direction share
router.post(
    '/',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateCreateDirectionShare,
    directionsController.createDirectionShare
)

// Get direction share by share ID (public endpoint)
router.get(
    '/:shareId',
    rateLimiter.general,
    directionsController.getDirectionShare
)

// Get user's direction shares
router.get(
    '/user/shares',
    authenticate,
    rateLimiter.general,
    directionsController.getUserDirectionShares
)

// Update direction share
router.put(
    '/:shareId',
    authenticate,
    rateLimiter.general,
    validationMiddleware.validateUpdateDirectionShare,
    directionsController.updateDirectionShare
)

// Delete direction share
router.delete(
    '/:shareId',
    authenticate,
    rateLimiter.general,
    directionsController.deleteDirectionShare
)

// Get public direction shares
router.get(
    '/public/shares',
    rateLimiter.general,
    directionsController.getPublicDirectionShares
)

// Generate QR code for direction share
router.post(
    '/:shareId/qr-code',
    authenticate,
    rateLimiter.general,
    directionsController.generateQRCode
)

module.exports = router