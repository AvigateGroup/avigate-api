const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const { logger } = require('../utils/logger')

// Try to import Redis store, but make it optional
let store

try {
    const redis = require('redis')
    const { RedisStore } = require('rate-limit-redis')

    const redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    })

    // Connect to Redis
    redisClient
        .connect()
        .then(() => {
            logger.info('Redis connected for rate limiting')

            // Create Redis store for rate limiter
            store = new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
            })
        })
        .catch((error) => {
            logger.warn(
                'Redis connection failed, using memory store for rate limiting:',
                error.message
            )
            store = undefined
        })
} catch (error) {
    logger.warn(
        'Redis or rate-limit-redis not available, using memory store for rate limiting:',
        error.message
    )
    store = undefined
}

// Safe key generator helper function
const safeKeyGenerator = (req, prefix = 'general') => {
    // For admin endpoints, try req.admin first
    if (req.admin && req.admin.id) {
        return `${prefix}:admin:${req.admin.id}`
    }
    
    // For user endpoints, try req.user
    if (req.user && req.user.id) {
        return `${prefix}:user:${req.user.id}`
    }
    
    // Fallback to IP address
    return `${prefix}:ip:${req.ip}`
}

// General rate limiter
const generalLimiter = rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health'
    },
    keyGenerator: (req) => {
        console.log('General rate limiter - keyGenerator called')
        console.log('req.user present:', !!req.user)
        console.log('req.admin present:', !!req.admin)
        return safeKeyGenerator(req, 'general')
    },
})

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req) => {
        console.log('Auth rate limiter - using IP:', req.ip)
        return `auth:${req.ip}`
    },
})

// Search rate limiter (more generous)
const searchLimiter = rateLimit({
    store,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: (req) => {
        // Dynamic limit based on user reputation
        if (req.user) {
            const reputation = req.user.reputationScore || 0
            if (reputation >= 500) return 100
            if (reputation >= 200) return 50
            if (reputation >= 100) return 30
            return 20
        }
        return 10 // Anonymous users
    },
    message: {
        success: false,
        message: 'Search rate limit exceeded, please try again later',
        retryAfter: '1 minute',
    },
    keyGenerator: (req) => {
        console.log('Search rate limiter - keyGenerator called')
        return safeKeyGenerator(req, 'search')
    },
})

// Create route limiter (for user-generated content)
const createLimiter = rateLimit({
    store,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req) => {
        if (req.user) {
            const reputation = req.user.reputationScore || 0
            if (reputation >= 500) return 50
            if (reputation >= 200) return 20
            if (reputation >= 100) return 10
            return 5
        }
        return 2 // Anonymous users (very limited)
    },
    message: {
        success: false,
        message: 'Content creation rate limit exceeded',
        retryAfter: '1 hour',
    },
    keyGenerator: (req) => {
        console.log('Create rate limiter - keyGenerator called')
        return safeKeyGenerator(req, 'create')
    },
})

// Slow down middleware for expensive operations
const expensiveOpSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Allow 2 requests per window at full speed
    delayMs: () => 500, // Fixed delay of 500ms (new syntax)
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        console.log('Slow down middleware - keyGenerator called')
        return safeKeyGenerator(req, 'slow')
    },
})

// Crowdsourcing rate limiter (to prevent spam)
const crowdsourceLimiter = rateLimit({
    store,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: (req) => {
        if (req.user) {
            const reputation = req.user.reputationScore || 0
            if (reputation >= 500) return 20
            if (reputation >= 200) return 10
            if (reputation >= 100) return 5
            return 3
        }
        return 1 // Anonymous users (very limited)
    },
    message: {
        success: false,
        message: 'Crowdsource contribution limit exceeded',
        retryAfter: '5 minutes',
    },
    keyGenerator: (req) => {
        console.log('Crowdsource rate limiter - keyGenerator called')
        return safeKeyGenerator(req, 'crowd')
    },
})

// File upload rate limiter
const uploadLimiter = rateLimit({
    store,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
        success: false,
        message: 'File upload rate limit exceeded',
        retryAfter: '1 hour',
    },
    keyGenerator: (req) => {
        console.log('Upload rate limiter - keyGenerator called')
        return safeKeyGenerator(req, 'upload')
    },
})

// Admin endpoints rate limiter - FIXED!
const adminLimiter = rateLimit({
    store,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute for admin operations
    message: {
        success: false,
        message: 'Admin operation rate limit exceeded',
    },
    keyGenerator: (req) => {
        console.log('Admin rate limiter - keyGenerator called')
        console.log('req.admin present:', !!req.admin)
        console.log('req.admin.id:', req.admin?.id)
        console.log('req.user present:', !!req.user)
        console.log('Fallback IP:', req.ip)
        
        // FIXED: Use req.admin.id instead of req.user.id, with fallback
        if (req.admin && req.admin.id) {
            console.log('Using admin ID for rate limiting')
            return `admin:user:${req.admin.id}`
        } else {
            console.log('Admin not available, falling back to IP')
            return `admin:ip:${req.ip}`
        }
    },
})

// Custom rate limiter for specific endpoints
const customLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 10,
        message = 'Rate limit exceeded',
        keyPrefix = 'custom',
    } = options

    return rateLimit({
        store,
        windowMs,
        max,
        message: {
            success: false,
            message,
            retryAfter: `${Math.floor(windowMs / 60000)} minutes`,
        },
        keyGenerator: (req) => {
            console.log(`Custom rate limiter (${keyPrefix}) - keyGenerator called`)
            return safeKeyGenerator(req, keyPrefix)
        },
    })
}

// Error handler for rate limiting
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err && err.status === 429) {
        console.log('Rate limit error handler triggered')
        console.log('IP:', req.ip)
        console.log('User ID:', req.user?.id)
        console.log('Admin ID:', req.admin?.id)
        console.log('Endpoint:', req.path)
        
        logger.warn(`Rate limit exceeded for ${req.ip}`, {
            ip: req.ip,
            userId: req.user?.id,
            adminId: req.admin?.id,
            endpoint: req.path,
            method: req.method,
        })
    }
    next(err)
}

// Middleware to log rate limit info
const logRateLimit = (req, res, next) => {
    const originalSend = res.send
    res.send = function (body) {
        if (res.statusCode === 429) {
            console.log('Rate limit hit - logging details')
            console.log('Status Code:', res.statusCode)
            console.log('IP:', req.ip)
            console.log('User ID:', req.user?.id)
            console.log('Admin ID:', req.admin?.id)
            console.log('Endpoint:', req.originalUrl)
            
            logger.warn('Rate limit hit', {
                ip: req.ip,
                userId: req.user?.id,
                adminId: req.admin?.id,
                endpoint: req.originalUrl,
                userAgent: req.get('User-Agent'),
            })
        }
        originalSend.call(this, body)
    }
    next()
}

module.exports = {
    general: generalLimiter,
    auth: authLimiter,
    search: searchLimiter,
    create: createLimiter,
    crowdsource: crowdsourceLimiter,
    upload: uploadLimiter,
    admin: adminLimiter,
    expensiveOp: expensiveOpSlowDown,
    custom: customLimiter,
    errorHandler: rateLimitErrorHandler,
    logRateLimit,
}