const { AuditLog } = require('../../models')
const { logger } = require('../../utils/logger')

// Request logging middleware for audit trail
const auditRequest = (req, res, next) => {
    // Log sensitive operations
    const sensitiveEndpoints = [
        '/admins',
        '/auth',
        '/totp',
        '/users/:userId/status',
    ]

    const isSensitive = sensitiveEndpoints.some((endpoint) =>
        req.path.includes(endpoint.split(':')[0])
    )

    if (isSensitive && req.admin) {
        // This will be logged after the request completes
        req.shouldAudit = true
        req.auditData = {
            adminId: req.admin.id,
            action: `${req.method.toLowerCase()}_${req.path.replace(/^\/api\/admin\//, '').replace(/\//g, '_')}`,
            resource: 'admin_api',
            metadata: {
                path: req.path,
                method: req.method,
                query: req.query,
                // Don't log sensitive body data like passwords
                bodyKeys: Object.keys(req.body || {}).filter(
                    (key) =>
                        ![
                            'password',
                            'newPassword',
                            'currentPassword',
                            'totpToken',
                        ].includes(key)
                ),
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            severity: 'low',
        }
    }

    next()
}

// Response audit logging
const auditResponse = (req, res, next) => {
    if (req.shouldAudit) {
        // Override res.json to capture response
        const originalJson = res.json
        res.json = function (data) {
            // Log the request after response
            setImmediate(async () => {
                try {
                    await AuditLog.create({
                        ...req.auditData,
                        metadata: {
                            ...req.auditData.metadata,
                            statusCode: res.statusCode,
                            success: data?.success,
                        },
                    })
                } catch (error) {
                    logger.error('Audit log creation failed:', error)
                }
            })

            return originalJson.call(this, data)
        }
    }

    next()
}

module.exports = {
    auditRequest,
    auditResponse,
}
