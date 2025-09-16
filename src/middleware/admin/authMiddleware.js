const {
    verifyAdminAccessToken,
    adminSessionManager,
    isAdminTokenBlacklisted,
    adminSecurityUtils,
} = require('../../services/admin')
const { Admin, AuditLog } = require('../../models')
const { logger } = require('../../utils/logger')

// Enhanced admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
            })
        }

        const token = authHeader.substring(7)

        // Verify token structure and signature
        const decoded = verifyAdminAccessToken(token)
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token',
            })
        }

        logger.debug('Token decoded successfully:', {
            adminId: decoded.adminId,
            tokenId: decoded.tokenId,
            role: decoded.role,
            type: decoded.type
        })

        // Check if token is blacklisted
        const isBlacklisted = await isAdminTokenBlacklisted(decoded.tokenId)
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked',
            })
        }

        // Verify admin still exists and is active
        const admin = await Admin.findByPk(decoded.adminId)
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Admin account not found or inactive',
            })
        }

        // Check if admin account is locked
        if (admin.isLocked()) {
            return res.status(423).json({
                success: false,
                message: 'Admin account is temporarily locked',
            })
        }

        logger.debug('Checking session for tokenId:', decoded.tokenId)

        // Verify session exists and is valid
        let session
        try {
            session = await adminSessionManager.getSession(
                decoded.adminId,
                decoded.tokenId
            )
            
            logger.debug('Session retrieval result:', { 
                sessionExists: !!session,
                sessionType: typeof session,
                sessionKeys: session && typeof session === 'object' ? Object.keys(session) : 'not an object'
            })
        } catch (sessionError) {
            logger.error('Session retrieval error:', sessionError)
            return res.status(500).json({
                success: false,
                message: 'Session service error',
            })
        }

        if (!session) {
            logger.warn('No session found for:', {
                adminId: decoded.adminId,
                tokenId: decoded.tokenId
            })
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid',
            })
        }

        // Check for suspicious activity
        const suspiciousActivity = adminSecurityUtils.detectSuspiciousActivity(
            admin,
            req
        )
        if (suspiciousActivity.length > 0) {
            logger.warn('Suspicious admin activity detected:', {
                adminId: admin.id,
                email: admin.email,
                suspiciousActivity,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            })

            // Log security alert
            await AuditLog.create({
                adminId: admin.id,
                action: 'security_alert',
                resource: 'admin',
                metadata: { suspiciousActivity },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            // For high-risk activities, require re-authentication
            const highRiskActivities = [
                'login_from_new_ip',
                'user_agent_change',
            ]
            const hasHighRisk = suspiciousActivity.some((activity) =>
                highRiskActivities.includes(activity)
            )

            if (hasHighRisk) {
                return res.status(401).json({
                    success: false,
                    message:
                        'Re-authentication required due to security concerns',
                    requiresReauth: true,
                })
            }
        }

        // Check if password change is required
        if (admin.requiresPasswordChange()) {
            // Allow only profile update and logout endpoints
            const allowedPaths = [
                '/api/admin/profile',
                '/api/admin/auth/logout',
            ]
            if (!allowedPaths.some((path) => req.path.startsWith(path))) {
                return res.status(403).json({
                    success: false,
                    message: 'Password change required',
                    requiresPasswordChange: true,
                })
            }
        }

        // Check if password is expired (hard block)
        if (admin.isPasswordExpired()) {
            return res.status(403).json({
                success: false,
                message:
                    'Password has expired. Please contact system administrator.',
                passwordExpired: true,
            })
        }

        // Update session activity
        try {
            await adminSessionManager.updateSessionActivity(
                decoded.adminId,
                decoded.tokenId
            )
        } catch (sessionUpdateError) {
            logger.warn('Failed to update session activity:', sessionUpdateError)
            // Don't fail the request if session update fails
        }

        // Attach admin and token info to request
        req.admin = admin
        req.tokenId = decoded.tokenId
        req.sessionData = session

        logger.debug('Authentication successful for admin:', admin.email)
        next()
    } catch (error) {
        logger.error('Admin authentication error:', error)
        res.status(500).json({
            success: false,
            message: 'Authentication service error',
        })
    }
}

module.exports = {
    authenticateAdmin,
}