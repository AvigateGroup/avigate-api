const { Admin, AuditLog } = require('../../models')
const { logger } = require('../../utils/logger')

// Permission-based authorization middleware
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const admin = req.admin

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                })
            }

            // Check if admin has the hasPermission method
            if (!admin.hasPermission) {
                logger.error('Admin instance missing hasPermission method', { adminId: admin.id })
                return res.status(500).json({
                    success: false,
                    message: 'Authorization service error - missing methods',
                })
            }

            if (!admin.hasPermission(requiredPermission)) {
                // Log unauthorized access attempt
                try {
                    await AuditLog.create({
                        adminId: admin.id,
                        action: 'unauthorized_access_attempt',
                        resource: 'admin',
                        metadata: {
                            requiredPermission,
                            userPermissions: admin.permissions,
                            attemptedPath: req.path,
                            method: req.method,
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        severity: 'medium',
                    })
                } catch (auditError) {
                    logger.error('Failed to create audit log:', auditError)
                    // Don't fail the request if audit logging fails
                }

                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    requiredPermission,
                })
            }

            next()
        } catch (error) {
            logger.error('Permission check error:', error)
            res.status(500).json({
                success: false,
                message: 'Authorization service error',
            })
        }
    }
}

// Multiple permission authorization (require ANY of the permissions)
const requireAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const admin = req.admin

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                })
            }

            // Check if admin has the hasAnyPermission method
            if (!admin.hasAnyPermission) {
                logger.error('Admin instance missing hasAnyPermission method', { adminId: admin.id })
                return res.status(500).json({
                    success: false,
                    message: 'Authorization service error - missing methods',
                })
            }

            if (!admin.hasAnyPermission(requiredPermissions)) {
                try {
                    await AuditLog.create({
                        adminId: admin.id,
                        action: 'unauthorized_access_attempt',
                        resource: 'admin',
                        metadata: {
                            requiredPermissions,
                            userPermissions: admin.permissions,
                            attemptedPath: req.path,
                            method: req.method,
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        severity: 'medium',
                    })
                } catch (auditError) {
                    logger.error('Failed to create audit log:', auditError)
                }

                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    requiredPermissions,
                })
            }

            next()
        } catch (error) {
            logger.error('Permission check error:', error)
            res.status(500).json({
                success: false,
                message: 'Authorization service error',
            })
        }
    }
}

// Role-based authorization middleware
const requireRole = (requiredRoles) => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

    return async (req, res, next) => {
        try {
            const admin = req.admin

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                })
            }

            if (!roles.includes(admin.role)) {
                try {
                    await AuditLog.create({
                        adminId: admin.id,
                        action: 'role_access_attempt',
                        resource: 'admin',
                        metadata: {
                            requiredRoles,
                            userRole: admin.role,
                            attemptedPath: req.path,
                            method: req.method,
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        severity: 'medium',
                    })
                } catch (auditError) {
                    logger.error('Failed to create audit log:', auditError)
                }

                return res.status(403).json({
                    success: false,
                    message: 'Insufficient role permissions',
                    requiredRoles,
                })
            }

            next()
        } catch (error) {
            logger.error('Role check error:', error)
            res.status(500).json({
                success: false,
                message: 'Authorization service error',
            })
        }
    }
}

// Super admin only middleware
const requireSuperAdmin = async (req, res, next) => {
    try {
        const admin = req.admin

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            })
        }

        if (admin.role !== 'super_admin') {
            // Log super admin access attempt
            try {
                await AuditLog.create({
                    adminId: admin.id,
                    action: 'super_admin_access_attempt',
                    resource: 'admin',
                    metadata: {
                        userRole: admin.role,
                        attemptedPath: req.path,
                        method: req.method,
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    severity: 'high',
                })
            } catch (auditError) {
                logger.error('Failed to create audit log:', auditError)
            }

            return res.status(403).json({
                success: false,
                message: 'Super administrator access required',
            })
        }

        next()
    } catch (error) {
        logger.error('Super admin check error:', error)
        res.status(500).json({
            success: false,
            message: 'Authorization service error',
        })
    }
}

// Middleware to check if admin can manage target admin
const canManageAdmin = async (req, res, next) => {
    try {
        const currentAdmin = req.admin
        const { adminId } = req.params

        if (!currentAdmin) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            })
        }

        // Super admins can manage anyone except preventing self-deactivation
        if (currentAdmin.role === 'super_admin') {
            // Prevent super admin from deactivating themselves
            if (currentAdmin.id === adminId && req.body.isActive === false) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot deactivate your own account',
                })
            }
            return next()
        }

        // Find target admin
        const targetAdmin = await Admin.findByPk(adminId)
        if (!targetAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found',
            })
        }

        // Check role hierarchy - use static method
        if (!Admin.canManageRole || !Admin.canManageRole(currentAdmin.role, targetAdmin.role)) {
            return res.status(403).json({
                success: false,
                message: 'Cannot manage admin with equal or higher role',
            })
        }

        next()
    } catch (error) {
        logger.error('Admin management check error:', error)
        res.status(500).json({
            success: false,
            message: 'Authorization service error',
        })
    }
}

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireRole,
    requireSuperAdmin,
    canManageAdmin,
}