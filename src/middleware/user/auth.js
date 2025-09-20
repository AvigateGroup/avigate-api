const jwt = require('jsonwebtoken')
const { User } = require('../../models')
const { logger } = require('../../utils/logger')

// Authenticate JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
            })
        }

        const token = authHeader.split(' ')[1] // Bearer <token>

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
            })
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Find user
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['passwordHash', 'refreshToken'] },
        })

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            })
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated',
            })
        }

        // Add user to request object
        req.user = user
        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token',
            })
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token has expired',
            })
        }

        logger.error('Authentication error:', error)
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
        })
    }
}

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader) {
            return next()
        }

        const token = authHeader.split(' ')[1]

        if (!token) {
            return next()
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Find user
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['passwordHash', 'refreshToken'] },
        })

        if (user && user.isActive) {
            req.user = user
        }

        next()
    } catch (error) {
        // Silently ignore token errors for optional auth
        next()
    }
}

// Check if user is verified
const requireVerified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        })
    }

    if (!req.user.isVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required',
        })
    }

    next()
}

// Check user reputation for certain actions
const requireMinReputation = (minScore = 50) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            })
        }

        if (req.user.reputationScore < minScore) {
            return res.status(403).json({
                success: false,
                message: `Minimum reputation score of ${minScore} required for this action`,
            })
        }

        next()
    }
}

// Admin role check (you can extend this based on your role system)
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        })
    }

    // You can implement admin role logic here
    // For now, we'll check if user has very high reputation
    if (req.user.reputationScore < 1000) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required',
        })
    }

    next()
}

// Rate limiting based on user reputation
const reputationBasedLimit = (req, res, next) => {
    if (!req.user) {
        return next()
    }

    // Higher reputation users get higher limits
    const userReputation = req.user.reputationScore
    let maxRequests = 10 // Base limit for new users

    if (userReputation >= 500) {
        maxRequests = 50
    } else if (userReputation >= 200) {
        maxRequests = 30
    } else if (userReputation >= 100) {
        maxRequests = 20
    }

    // Store the limit for use by rate limiter
    req.userRateLimit = maxRequests
    next()
}

module.exports = {
    authenticate,
    optionalAuth,
    requireVerified,
    requireMinReputation,
    requireAdmin,
    reputationBasedLimit,
}
