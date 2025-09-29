// routes/admin/locations.js
const express = require('express')
const router = express.Router()
const locationController = require('../../controllers/admin/locationController')
const { authenticateAdmin, requirePermission } = require('../../middleware/admin')
const { validate } = require('../../utils/validators')
const rateLimiter = require('../../middleware/rateLimiter')
const Joi = require('joi')

// Validation schemas
const locationValidators = {
    createLocation: Joi.object({
        name: Joi.string().min(2).max(255).required(),
        displayName: Joi.string().min(2).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        type: Joi.string().valid(
            'bus_stop', 'taxi_stand', 'keke_station', 'okada_point',
            'landmark', 'residential', 'commercial', 'government',
            'transport_hub', 'airport', 'junction', 'roundabout'
        ).required(),
        address: Joi.string().max(500).optional(),
        city: Joi.string().min(2).max(100).required(),
        state: Joi.string().min(2).max(100).required(),
        country: Joi.string().min(2).max(100).default('Nigeria'),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        googlePlaceId: Joi.string().max(255).optional(),
        isVerified: Joi.boolean().default(false),
        transportModes: Joi.array().items(Joi.string()).optional(),
        accessibilityInfo: Joi.object().optional(),
        operatingHours: Joi.object().optional(),
    }),

    updateLocation: Joi.object({
        name: Joi.string().min(2).max(255).optional(),
        displayName: Joi.string().min(2).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        type: Joi.string().valid(
            'bus_stop', 'taxi_stand', 'keke_station', 'okada_point',
            'landmark', 'residential', 'commercial', 'government',
            'transport_hub', 'airport', 'junction', 'roundabout'
        ).optional(),
        address: Joi.string().max(500).optional(),
        city: Joi.string().min(2).max(100).optional(),
        state: Joi.string().min(2).max(100).optional(),
        country: Joi.string().min(2).max(100).optional(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        googlePlaceId: Joi.string().max(255).optional(),
        isVerified: Joi.boolean().optional(),
        isActive: Joi.boolean().optional(),
        transportModes: Joi.array().items(Joi.string()).optional(),
        accessibilityInfo: Joi.object().optional(),
        operatingHours: Joi.object().optional(),
    }),

    bulkVerify: Joi.object({
        locationIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    }),

    importGooglePlaces: Joi.object({
        query: Joi.string().min(3).max(255).required(),
        city: Joi.string().min(2).max(100).required(),
        radius: Joi.number().min(1000).max(50000).default(5000),
    }),
}

// Get all locations
router.get(
    '/',
    authenticateAdmin,
    requirePermission('locations.view'),
    rateLimiter.admin,
    locationController.getAllLocations
)

// Create location
router.post(
    '/',
    authenticateAdmin,
    requirePermission('locations.create'),
    rateLimiter.admin,
    validate(locationValidators.createLocation),
    locationController.createLocation
)

// Update location
router.put(
    '/:locationId',
    authenticateAdmin,
    requirePermission('locations.edit'),
    rateLimiter.admin,
    validate(locationValidators.updateLocation),
    locationController.updateLocation
)

// Delete location
router.delete(
    '/:locationId',
    authenticateAdmin,
    requirePermission('locations.delete'),
    rateLimiter.admin,
    locationController.deleteLocation
)

// Bulk verify locations
router.post(
    '/bulk-verify',
    authenticateAdmin,
    requirePermission('locations.verify'),
    rateLimiter.admin,
    validate(locationValidators.bulkVerify),
    locationController.bulkVerifyLocations
)

// Import from Google Places
router.post(
    '/import/google-places',
    authenticateAdmin,
    requirePermission('locations.create'),
    rateLimiter.admin,
    validate(locationValidators.importGooglePlaces),
    locationController.importFromGooglePlaces
)

module.exports = router