const { Admin, AuditLog } = require('../../models')
const { adminSecurityUtils } = require('../../services/admin')
const { logger } = require('../../utils/logger')

// Rate limiting middleware for sensitive operations
const sensitiveOperationLimiter = (
    operation,
    maxAttempts = 3,
    windowMs = 60000
) => {
    const limiter = adminSecurityUtils.createOperationLimiter()

    return async (req, res, next) => {
        try {
            const adminId = req.admin?.id
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                })
            }

            const result = limiter.checkLimit(
                adminId,
                operation,
                maxAttempts,
                windowMs
            )

            if (!result.allowed) {
                // Log rate limit violation
                await AuditLog.create({
                    adminId,
                    action: 'rate_limit_exceeded',
                    resource: 'admin',
                    metadata: {
                        operation,
                        maxAttempts,
                        resetTime: result.resetTime,
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    severity: 'medium',
                })

                return res.status(429).json({
                    success: false,
                    message: `Too many ${operation} attempts. Please try again later.`,
                    resetTime: result.resetTime,
                })
            }

            // Add remaining attempts to response headers
            res.set('X-RateLimit-Remaining', result.remaining.toString())

            next()
        } catch (error) {
            logger.error('Rate limiter error:', error)
            next() // Continue on limiter error
        }
    }
}

// Middleware to validate domain email in requests
const validateEmailDomain = (req, res, next) => {
    const { email } = req.body

    if (email && !email.toLowerCase().endsWith('@avigate.co')) {
        return res.status(400).json({
            success: false,
            message: 'Email must be from @avigate.co domain',
        })
    }

    next()
}

// Middleware to ensure at least one super admin exists before deactivation
const ensureSuperAdminExists = async (req, res, next) => {
    try {
        const { adminId } = req.params
        const { isActive } = req.body

        // Only check if deactivating an admin
        if (isActive !== false) {
            return next()
        }

        const targetAdmin = await Admin.findByPk(adminId)
        if (!targetAdmin || targetAdmin.role !== 'super_admin') {
            return next()
        }

        // Check if this would leave no active super admins
        await Admin.ensureSuperAdminExists()

        next()
    } catch (error) {
        if (error.message === 'Cannot remove the last super administrator') {
            return res.status(400).json({
                success: false,
                message: error.message,
            })
        }

        logger.error('Super admin check error:', error)
        res.status(500).json({
            success: false,
            message: 'System validation error',
        })
    }
}

// Security headers middleware for admin panel
const securityHeaders = (req, res, next) => {
    // Strict security headers for admin panel
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy':
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    })

    next()
}

module.exports = {
    sensitiveOperationLimiter,
    validateEmailDomain,
    ensureSuperAdminExists,
    securityHeaders,
}
