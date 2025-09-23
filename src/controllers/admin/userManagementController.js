// controllers/admin/userManagementController.js
const { User, UserDevice, UserOTP, AuditLog: AuditLogModel } = require('../../models') // ✅ Fixed import
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const userManagementController = {
    getAllUsers: async (req, res) => {
        try {
            logger.info('=== getAllUsers START ===')
            logger.info('getAllUsers called with query:', req.query)
            logger.info('Admin info:', { 
                id: req.admin?.id, 
                email: req.admin?.email,
                role: req.admin?.role,
                hasPermissionMethod: typeof req.admin?.hasPermission
            })

            // Test database connection first
            try {
                await User.sequelize.authenticate()
                logger.info('Database connection successful')
            } catch (dbError) {
                logger.error('Database connection failed:', dbError)
                return res.status(503).json({
                    success: false,
                    message: 'Database connection error',
                })
            }

            const {
                page = 1,
                limit = 20,
                search,
                isVerified,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                dateFrom,
                dateTo,
            } = req.query

            logger.info('Parsed query parameters:', { 
                page, limit, search, isVerified, isActive, sortBy, sortOrder 
            })

            const offset = (page - 1) * limit
            const where = {}

            // Apply filters
            if (search) {
                where[Op.or] = [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { sex: { [Op.iLike]: `%${search}%` } }, // ✅ Fixed: was 'query'
                    { phoneNumber: { [Op.iLike]: `%${search}%` } },
                ]
            }

            if (isVerified !== undefined) {
                where.isVerified = isVerified === 'true'
            }

            if (isActive !== undefined) {
                where.isActive = isActive === 'true'
            }

            if (dateFrom) {
                where.createdAt = { [Op.gte]: new Date(dateFrom) }
            }

            if (dateTo) {
                where.createdAt = {
                    ...where.createdAt,
                    [Op.lte]: new Date(dateTo),
                }
            }

            logger.info('Built where clause:', JSON.stringify(where, null, 2))

            // Get users with pagination
            logger.info('Executing database query...')
            const { count, rows: users } = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[sortBy, sortOrder.toUpperCase()]],
                attributes: { exclude: ['passwordHash', 'refreshToken'] },
            })

            logger.info(`Query successful: found ${count} users, returning ${users.length}`)

            // Create audit log with all required fields
            logger.info('Creating audit log...')
            try {
                await AuditLogModel.create({
                    adminId: req.admin.id,
                    action: 'view_users',
                    resource: 'user',
                    method: req.method, // ✅ Added missing field
                    endpoint: req.path, // ✅ Added missing field
                    metadata: {
                        filters: { search, isVerified, isActive, dateFrom, dateTo },
                        pagination: { page, limit },
                        totalUsers: count,
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    severity: 'low',
                })
                logger.info('Audit log created successfully')
            } catch (auditError) {
                // Don't fail the request if audit logging fails
                logger.error('Audit log creation failed:', auditError)
            }

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        pages: Math.ceil(count / limit),
                    },
                },
            })

            logger.info('Response sent successfully')
            logger.info('=== getAllUsers END ===')

        } catch (error) {
            logger.error('=== getAllUsers ERROR ===')
            logger.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code,
            })

            // Determine error type and respond accordingly
            let statusCode = 500
            let message = 'Failed to fetch users'

            if (error.name === 'SequelizeConnectionError') {
                statusCode = 503
                message = 'Database connection error'
            } else if (error.name === 'SequelizeValidationError') {
                statusCode = 400
                message = 'Invalid query parameters'
            } else if (error.name === 'SequelizeDatabaseError') {
                statusCode = 500
                message = 'Database error'
            }

            res.status(statusCode).json({
                success: false,
                message,
                error: {
                    message: error.message,
                    name: error.name,
                }
            })

            logger.error('=== getAllUsers ERROR END ===')
        }
    },
    
    // Get single user details
    getUserDetails: async (req, res) => {
        try {
            const { userId } = req.params

            const user = await User.findByPk(userId, {
                attributes: { exclude: ['passwordHash', 'refreshToken'] },
                include: [
                    {
                        model: UserDevice,
                        as: 'devices',
                        attributes: { exclude: ['fcmToken'] },
                    },
                ],
            })

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            // Get user statistics
            const stats = {
                totalDevices: await UserDevice.count({ where: { userId } }),
                activeDevices: await UserDevice.count({
                    where: { userId, isActive: true },
                }),
                totalOTPs: await UserOTP.count({ where: { userId } }),
                usedOTPs: await UserOTP.count({
                    where: { userId, isUsed: true },
                }),
            }

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'view_user_details',
                resource: 'user',
                resourceId: userId,
                metadata: { userEmail: user.email },
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    user,
                    stats,
                },
            })
        } catch (error) {
            logger.error('Get user details error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user details',
                error: error.message,
            })
        }
    },

    // Update user status (verify, activate/deactivate)
    updateUserStatus: async (req, res) => {
        try {
            const { userId } = req.params
            const { isVerified, isActive, reason } = req.body

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            const originalStatus = {
                isVerified: user.isVerified,
                isActive: user.isActive,
            }

            // Update user status
            const updates = {}
            if (isVerified !== undefined) updates.isVerified = isVerified
            if (isActive !== undefined) updates.isActive = isActive

            await user.update(updates)

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'update_user_status',
                resource: 'user',
                resourceId: userId,
                metadata: {
                    userEmail: user.email,
                    originalStatus,
                    newStatus: { isVerified, isActive },
                    reason,
                },
                severity: 'medium',
            })

            logger.info(`User status updated by admin`, {
                adminId: req.admin.id,
                userId,
                userEmail: user.email,
                updates,
                reason,
            })

            res.json({
                success: true,
                message: 'User status updated successfully',
                data: {
                    user: user.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Update user status error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update user status',
                error: error.message,
            })
        }
    },

    // Reset user password (admin action)
    resetUserPassword: async (req, res) => {
        try {
            const { userId } = req.params
            const { newPassword, reason, notifyUser = true } = req.body

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            // Update password
            user.passwordHash = newPassword // Will be hashed by model hook
            await user.save()

            // Invalidate all refresh tokens
            await user.update({
                refreshToken: null,
                refreshTokenExpiresAt: null,
            })

            // Deactivate all user devices to force re-login
            await UserDevice.update(
                { isActive: false },
                { where: { userId } }
            )

            // Send notification email if requested
            if (notifyUser) {
                const { sendPasswordChangeConfirmation } = require('../../services/email/userZeptomailService')
                await sendPasswordChangeConfirmation(
                    user.email,
                    user.firstName,
                    `${new Date().toLocaleString()} (Admin Reset)`
                )
            }

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'reset_user_password',
                resource: 'user',
                resourceId: userId,
                metadata: {
                    userEmail: user.email,
                    reason,
                    notifyUser,
                },
                severity: 'high',
            })

            logger.info(`User password reset by admin`, {
                adminId: req.admin.id,
                userId,
                userEmail: user.email,
                reason,
            })

            res.json({
                success: true,
                message: 'User password reset successfully',
            })
        } catch (error) {
            logger.error('Reset user password error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to reset user password',
                error: error.message,
            })
        }
    },

    // Delete user account (admin action)
    deleteUserAccount: async (req, res) => {
        try {
            const { userId } = req.params
            const { reason, sendNotification = true } = req.body

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            const userEmail = user.email
            const userFirstName = user.firstName

            // Delete related data first
            await UserDevice.destroy({ where: { userId } })
            await UserOTP.destroy({ where: { userId } })

            // Send notification email before deletion if requested
            if (sendNotification) {
                const { sendAccountDeletionConfirmation } = require('../../services/email/userZeptomailService')
                await sendAccountDeletionConfirmation(
                    userEmail,
                    userFirstName,
                    `${new Date().toLocaleString()} (Admin Action)`
                )
            }

            // Log admin action before deletion
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'delete_user_account',
                resource: 'user',
                resourceId: userId,
                metadata: {
                    userEmail,
                    userFirstName,
                    reason,
                    sendNotification,
                },
                severity: 'high',
            })

            // Delete user account
            await user.destroy()

            logger.info(`User account deleted by admin`, {
                adminId: req.admin.id,
                userId,
                userEmail,
                reason,
            })

            res.json({
                success: true,
                message: 'User account deleted successfully',
            })
        } catch (error) {
            logger.error('Delete user account error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to delete user account',
                error: error.message,
            })
        }
    },

    // Get user devices
    getUserDevices: async (req, res) => {
        try {
            const { userId } = req.params

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            const devices = await UserDevice.findAll({
                where: { userId },
                attributes: { exclude: ['fcmToken'] },
                order: [['lastActiveAt', 'DESC']],
            })

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'view_user_devices',
                resource: 'user',
                resourceId: userId,
                metadata: {
                    userEmail: user.email,
                    deviceCount: devices.length,
                },
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    devices,
                },
            })
        } catch (error) {
            logger.error('Get user devices error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user devices',
                error: error.message,
            })
        }
    },

    // Deactivate user device
    deactivateUserDevice: async (req, res) => {
        try {
            const { userId, deviceId } = req.params
            const { reason } = req.body

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            const device = await UserDevice.findOne({
                where: { id: deviceId, userId },
            })

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                })
            }

            await device.update({ isActive: false })

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'deactivate_user_device',
                resource: 'user_device',
                resourceId: deviceId,
                metadata: {
                    userId,
                    userEmail: user.email,
                    deviceInfo: device.deviceInfo,
                    reason,
                },
                severity: 'medium',
            })

            logger.info(`User device deactivated by admin`, {
                adminId: req.admin.id,
                userId,
                deviceId,
                reason,
            })

            res.json({
                success: true,
                message: 'Device deactivated successfully',
            })
        } catch (error) {
            logger.error('Deactivate user device error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to deactivate device',
                error: error.message,
            })
        }
    },

    // Get user OTP history
    getUserOTPHistory: async (req, res) => {
        try {
            const { userId } = req.params
            const { page = 1, limit = 20 } = req.query

            const user = await User.findByPk(userId)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            const offset = (page - 1) * limit

            const { count, rows: otps } = await UserOTP.findAndCountAll({
                where: { userId },
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']],
                attributes: { exclude: ['otpCode'] }, // Don't expose actual OTP codes
            })

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'view_user_otp_history',
                resource: 'user',
                resourceId: userId,
                metadata: {
                    userEmail: user.email,
                    otpCount: count,
                },
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    otps,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        pages: Math.ceil(count / limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Get user OTP history error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch OTP history',
                error: error.message,
            })
        }
    },

    // Get user statistics dashboard
    getUserStats: async (req, res) => {
        try {
            const { dateFrom, dateTo } = req.query
            const where = {}

            if (dateFrom) {
                where.createdAt = { [Op.gte]: new Date(dateFrom) }
            }

            if (dateTo) {
                where.createdAt = {
                    ...where.createdAt,
                    [Op.lte]: new Date(dateTo),
                }
            }

            const stats = {
                totalUsers: await User.count({ where }),
                verifiedUsers: await User.count({ where: { ...where, isVerified: true } }),
                activeUsers: await User.count({ where: { ...where, isActive: true } }),
                googleUsers: await User.count({ where: { ...where, googleId: { [Op.ne]: null } } }),
                totalDevices: await UserDevice.count(),
                activeDevices: await UserDevice.count({ where: { isActive: true } }),
                totalOTPs: await UserOTP.count(),
                usedOTPs: await UserOTP.count({ where: { isUsed: true } }),
            }

            // Calculate percentages
            stats.verificationRate = stats.totalUsers > 0 ? 
                Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0
            stats.googleSignupRate = stats.totalUsers > 0 ? 
                Math.round((stats.googleUsers / stats.totalUsers) * 100) : 0

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'view_user_stats',
                resource: 'user_stats',
                metadata: {
                    dateRange: { dateFrom, dateTo },
                    totalUsers: stats.totalUsers,
                },
                severity: 'low',
            })

            res.json({
                success: true,
                data: stats,
            })
        } catch (error) {
            logger.error('Get user stats error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user statistics',
                error: error.message,
            })
        }
    },

    // Search users with advanced filters
    searchUsers: async (req, res) => {
        try {
            const {
                query,
                page = 1,
                limit = 20,
                filters = {},
            } = req.body

            const offset = (page - 1) * limit
            const where = {}

            // Basic search across multiple fields
            if (query) {
                where[Op.or] = [
                    { firstName: { [Op.iLike]: `%${query}%` } },
                    { lastName: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } },
                    { sex: { [Op.iLike]: `%${query}%` } },
                    { phoneNumber: { [Op.iLike]: `%${query}%` } },
                ]
            }

            // Apply advanced filters
            if (filters.isVerified !== undefined) {
                where.isVerified = filters.isVerified
            }

            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive
            }

            if (filters.hasGoogleId !== undefined) {
                where.googleId = filters.hasGoogleId ? { [Op.ne]: null } : { [Op.is]: null }
            }

            if (filters.reputationMin !== undefined) {
                where.reputationScore = { [Op.gte]: filters.reputationMin }
            }

            if (filters.reputationMax !== undefined) {
                where.reputationScore = {
                    ...where.reputationScore,
                    [Op.lte]: filters.reputationMax,
                }
            }

            const { count, rows: users } = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']],
                attributes: { exclude: ['passwordHash', 'refreshToken'] },
            })

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'search_users',
                resource: 'user',
                metadata: {
                    query,
                    filters,
                    resultsCount: count,
                },
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        pages: Math.ceil(count / limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Search users error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to search users',
                error: error.message,
            })
        }
    },
}

module.exports = userManagementController