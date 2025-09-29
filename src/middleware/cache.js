// middleware/cache.js
const redisService = require('../services/cache/redisService')
const { logger } = require('../utils/logger')

// Cache middleware factory
const cache = (options = {}) => {
    const {
        ttl = 300, // 5 minutes default
        keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
        skipCache = () => false,
        skipOnError = true,
    } = options

    return async (req, res, next) => {
        try {
            // Skip cache if condition is met
            if (skipCache(req)) {
                return next()
            }

            const cacheKey = keyGenerator(req)
            
            // Try to get cached data
            const cachedData = await redisService.get(cacheKey)
            
            if (cachedData) {
                logger.debug(`Cache hit for key: ${cacheKey}`)
                return res.json(cachedData)
            }

            // Store original json method
            const originalJson = res.json.bind(res)

            // Override json method to cache response
            res.json = function(data) {
                // Only cache successful responses
                if (data.success !== false && res.statusCode < 400) {
                    redisService.set(cacheKey, data, ttl).catch(error => {
                        logger.error('Cache set error:', error)
                    })
                }
                
                return originalJson(data)
            }

            next()
        } catch (error) {
            logger.error('Cache middleware error:', error)
            
            if (skipOnError) {
                next()
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Cache error',
                })
            }
        }
    }
}

// Specific cache middleware for different endpoints
const cacheMiddleware = {
    // Cache route planning results
    routePlanning: cache({
        ttl: 1800, // 30 minutes
        keyGenerator: (req) => {
            const { startLocation, endLocation, transportModes } = req.body
            return `route:${JSON.stringify({ startLocation, endLocation, transportModes })}`
        },
        skipCache: (req) => req.body.includeRealTime === true,
    }),

    // Cache location search results
    locationSearch: cache({
        ttl: 600, // 10 minutes
        keyGenerator: (req) => `location_search:${req.query.query || ''}:${req.query.lat || ''}:${req.query.lng || ''}`,
    }),

    // Cache popular routes
    popularRoutes: cache({
        ttl: 3600, // 1 hour
        keyGenerator: (req) => `popular_routes:${req.query.city || ''}:${req.query.transportMode || ''}`,
    }),

    // Cache fare information
    fareInfo: cache({
        ttl: 1800, // 30 minutes
        keyGenerator: (req) => `fare:${req.params.routeId}:${req.query.vehicleType || ''}:${req.query.days || '30'}`,
    }),

    // Cache community feed
    communityFeed: cache({
        ttl: 300, // 5 minutes
        keyGenerator: (req) => `community_feed:${JSON.stringify(req.query)}`,
    }),
}

module.exports = {
    cache,
    cacheMiddleware,
}