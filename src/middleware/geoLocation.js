// middleware/geoLocation.js
const { logger } = require('../utils/logger')

// Middleware to extract and validate location information
const geoLocationMiddleware = (req, res, next) => {
    try {
        // Extract location from various sources
        let userLocation = null

        // 1. From request body
        if (req.body.userLocation) {
            userLocation = req.body.userLocation
        }
        
        // 2. From query parameters
        else if (req.query.lat && req.query.lng) {
            userLocation = {
                latitude: parseFloat(req.query.lat),
                longitude: parseFloat(req.query.lng),
            }
        }
        
        // 3. From headers (if mobile app sends location)
        else if (req.headers['x-user-latitude'] && req.headers['x-user-longitude']) {
            userLocation = {
                latitude: parseFloat(req.headers['x-user-latitude']),
                longitude: parseFloat(req.headers['x-user-longitude']),
            }
        }

        // Validate location if provided
        if (userLocation) {
            const { latitude, longitude } = userLocation

            // Basic validation
            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid location coordinates',
                })
            }

            // Check if coordinates are within valid ranges
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                return res.status(400).json({
                    success: false,
                    message: 'Location coordinates out of valid range',
                })
            }

            // Check if coordinates are within Nigeria (optional)
            const nigeriaBounds = {
                north: 14.0,
                south: 4.0,
                east: 15.0,
                west: 2.5,
            }

            const isInNigeria = latitude >= nigeriaBounds.south && 
                              latitude <= nigeriaBounds.north && 
                              longitude >= nigeriaBounds.west && 
                              longitude <= nigeriaBounds.east

            req.userLocation = {
                latitude,
                longitude,
                isInNigeria,
                accuracy: req.headers['x-location-accuracy'] ? 
                         parseFloat(req.headers['x-location-accuracy']) : null,
                timestamp: new Date(),
            }
        }

        next()
    } catch (error) {
        logger.error('GeoLocation middleware error:', error)
        next() // Continue without location data
    }
}

module.exports = geoLocationMiddleware