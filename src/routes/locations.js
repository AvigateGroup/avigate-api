const express = require('express')
const router = express.Router()
const locationController = require('../controllers/locationController')
const {
    locationValidators,
    queryValidators,
    validate,
} = require('../utils/validators')
const {
    authenticate,
    optionalAuth,
    requireMinReputation,
} = require('../middleware/user/auth')
const rateLimiter = require('../middleware/rateLimiter')

router.get(
    '/search',
    rateLimiter.search,
    optionalAuth,
    validate(locationValidators.search, 'query'),
    locationController.search // Changed from searchLocations
)

router.get(
    '/nearby',
    rateLimiter.search,
    optionalAuth,
    validate(locationValidators.nearby, 'query'),
    locationController.findNearby // Changed from findNearbyLocations
)

router.get(
    '/popular',
    locationController.getPopular // Changed from getPopularLocations
)

router.get(
    '/states/:state',
    locationController.getByState // Changed from getLocationsByState
)

router.post(
    '/',
    authenticate,
    rateLimiter.create,
    validate(locationValidators.create),
    locationController.create // Changed from createLocation
)

router.get(
    '/:id',
    validate(queryValidators.id, 'params'),
    locationController.getById // Changed from getLocationById
)

router.put(
    '/:id',
    authenticate,
    requireMinReputation(100),
    validate(queryValidators.id, 'params'),
    validate(locationValidators.update),
    locationController.update // Changed from updateLocation
)

module.exports = router
