const { User, UserDevice, UserOTP, AuditLog, sequelize } = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const userManagementController = {
    getAllUsers: async (req, res) => {
        console.log('=== GET ALL USERS START ===')
        console.log('Request URL:', req.url)
        console.log('Request method:', req.method)
        console.log('Request query:', JSON.stringify(req.query, null, 2))
        console.log('Request headers:', {
            'content-type': req.get('Content-Type'),
            'user-agent': req.get('User-Agent'),
            'authorization': req.get('Authorization') ? '[PRESENT]' : '[MISSING]'
        })
        console.log('Admin present:', !!req.admin)
        if (req.admin) {
            console.log('Admin details:', {
                id: req.admin.id,
                email: req.admin.email,
                role: req.admin.role,
                hasPermissionMethod: typeof req.admin.hasPermission
            })
        }

        try {
            logger.info('getAllUsers called with query:', req.query)
            logger.info('Admin info:', { 
                id: req.admin?.id, 
                email: req.admin?.email,
                role: req.admin?.role,
                hasPermissionMethod: typeof req.admin?.hasPermission
            })

            // Test database connection first
            console.log('Testing database connection...')
            try {
                await User.sequelize.authenticate()
                console.log('✅ Database connection successful')
                logger.info('Database connection successful')
            } catch (dbError) {
                console.error('❌ Database connection failed:', dbError)
                logger.error('Database connection failed:', dbError)
                return res.status(503).json({
                    success: false,
                    message: 'Database connection error',
                    error: dbError.message
                })
            }

            // Parse and validate query parameters
            console.log('Parsing query parameters...')
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

            console.log('Parsed parameters:', { 
                page: parseInt(page), 
                limit: parseInt(limit), 
                search, 
                isVerified, 
                isActive, 
                sortBy, 
                sortOrder,
                dateFrom,
                dateTo
            })

            // Validate parameters
            if (isNaN(parseInt(page)) || parseInt(page) < 1) {
                console.log('❌ Invalid page parameter')
                return res.status(400).json({
                    success: false,
                    message: 'Page must be a positive integer'
                })
            }

            if (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100) {
                console.log('❌ Invalid limit parameter')
                return res.status(400).json({
                    success: false,
                    message: 'Limit must be between 1 and 100'
                })
            }

            const offset = (parseInt(page) - 1) * parseInt(limit)
            console.log('Calculated offset:', offset)

            // Build where clause
            console.log('Building where clause...')
            const where = {}

            // Apply filters
            if (search) {
                where[Op.or] = [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    // Cast enum to text for ILIKE search
                    sequelize.where(
                        sequelize.cast(sequelize.col('sex'), 'TEXT'),
                        { [Op.iLike]: `%${search}%` }
                    ),
                    { phoneNumber: { [Op.iLike]: `%${search}%` } },
                ]
            }

            if (isVerified !== undefined) {
                console.log('Adding isVerified filter:', isVerified)
                where.isVerified = isVerified === 'true'
            }

            if (isActive !== undefined) {
                console.log('Adding isActive filter:', isActive)
                where.isActive = isActive === 'true'
            }

            if (dateFrom) {
                console.log('Adding dateFrom filter:', dateFrom)
                try {
                    const fromDate = new Date(dateFrom)
                    if (isNaN(fromDate.getTime())) {
                        throw new Error('Invalid dateFrom format')
                    }
                    where.createdAt = { [Op.gte]: fromDate }
                } catch (dateError) {
                    console.log('❌ Invalid dateFrom:', dateError.message)
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid dateFrom format. Use YYYY-MM-DD or ISO format'
                    })
                }
            }

            if (dateTo) {
                console.log('Adding dateTo filter:', dateTo)
                try {
                    const toDate = new Date(dateTo)
                    if (isNaN(toDate.getTime())) {
                        throw new Error('Invalid dateTo format')
                    }
                    where.createdAt = {
                        ...where.createdAt,
                        [Op.lte]: toDate,
                    }
                } catch (dateError) {
                    console.log('❌ Invalid dateTo:', dateError.message)
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid dateTo format. Use YYYY-MM-DD or ISO format'
                    })
                }
            }

            console.log('Final where clause:', JSON.stringify(where, null, 2))
            logger.info('Built where clause:', JSON.stringify(where, null, 2))

            // Validate sortBy field
            const allowedSortFields = ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'reputationScore', 'lastLoginAt']
            if (!allowedSortFields.includes(sortBy)) {
                console.log('❌ Invalid sortBy field:', sortBy)
                return res.status(400).json({
                    success: false,
                    message: `Invalid sortBy field. Allowed values: ${allowedSortFields.join(', ')}`
                })
            }

            // Validate sortOrder
            if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
                console.log('❌ Invalid sortOrder:', sortOrder)
                return res.status(400).json({
                    success: false,
                    message: 'sortOrder must be either "asc" or "desc"'
                })
            }

            // Get users with pagination
            console.log('Executing database query...')
            console.log('Query parameters:', {
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[sortBy, sortOrder.toUpperCase()]],
                attributes: { exclude: ['passwordHash', 'refreshToken'] }
            })
            
            logger.info('Executing database query...')
            const { count, rows: users } = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [[sortBy, sortOrder.toUpperCase()]],
                attributes: { exclude: ['passwordHash', 'refreshToken'] },
            })

            console.log(`✅ Query successful: found ${count} total users, returning ${users.length} users`)
            logger.info(`Query successful: found ${count} users, returning ${users.length}`)

            // Sample first user for debugging (without sensitive data)
            if (users.length > 0) {
                console.log('Sample user (first result):', {
                    id: users[0].id,
                    email: users[0].email,
                    firstName: users[0].firstName,
                    lastName: users[0].lastName,
                    isVerified: users[0].isVerified,
                    isActive: users[0].isActive
                })
            }

            // Create audit log with all required fields
            console.log('Creating audit log...')
            logger.info('Creating audit log...')
            try {
                const auditLogData = {
                    adminId: req.admin.id,
                    action: 'view_users',
                    resource: 'user',
                    method: req.method,
                    endpoint: req.path, 
                    metadata: {
                        filters: { search, isVerified, isActive, dateFrom, dateTo },
                        pagination: { page: parseInt(page), limit: parseInt(limit) },
                        totalUsers: count,
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    severity: 'low',
                }
                
                console.log('Audit log data:', JSON.stringify(auditLogData, null, 2))
                
                await AuditLog.create(auditLogData)
                console.log('✅ Audit log created successfully')
                logger.info('Audit log created successfully')
            } catch (auditError) {
                // Don't fail the request if audit logging fails
                console.error('❌ Audit log creation failed:', auditError)
                logger.error('Audit log creation failed:', auditError)
            }

            const responseData = {
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        pages: Math.ceil(count / parseInt(limit)),
                        hasNextPage: (parseInt(page) * parseInt(limit)) < count,
                        hasPreviousPage: parseInt(page) > 1
                    },
                },
            }

            console.log('Response summary:', {
                success: true,
                userCount: users.length,
                totalUsers: count,
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit))
            })

            res.json(responseData)

            console.log('✅ Response sent successfully')
            console.log('=== GET ALL USERS END ===')
            logger.info('Response sent successfully')
            logger.info('=== getAllUsers END ===')

        } catch (error) {
            console.error('=== GET ALL USERS ERROR ===')
            console.error('Error type:', error.constructor.name)
            console.error('Error name:', error.name)
            console.error('Error message:', error.message)
            console.error('Error code:', error.code)
            console.error('Error stack:', error.stack)
            
            // Log Sequelize specific error details
            if (error.sql) {
                console.error('SQL Query:', error.sql)
                console.error('SQL Parameters:', error.parameters)
            }
            
            if (error.original) {
                console.error('Original error:', error.original)
            }
            
            console.error('Request details:', {
                url: req.url,
                method: req.method,
                query: req.query,
                adminId: req.admin?.id
            })
            console.error('=========================')

            logger.error('getAllUsers ERROR:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code,
                sql: error.sql,
                parameters: error.parameters,
                original: error.original
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

            const errorResponse = {
                success: false,
                message,
                error: {
                    message: error.message,
                    name: error.name,
                    code: error.code
                }
            }

            // Add debug info in development
            if (process.env.NODE_ENV === 'development') {
                errorResponse.debug = {
                    stack: error.stack,
                    sql: error.sql,
                    parameters: error.parameters,
                    original: error.original
                }
            }

            res.status(statusCode).json(errorResponse)

            logger.error('=== getAllUsers ERROR END ===')
        }
    },
    
    // Get single user details
    getUserDetails: async (req, res) => {
        console.log('=== GET USER DETAILS START ===')
        console.log('User ID param:', req.params.userId)
        
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
                console.log('❌ User not found')
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            console.log('✅ User found:', user.email)

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

            console.log('User stats:', stats)

            // Log admin action
            await AuditLog.create({
                adminId: req.admin.id,
                action: 'view_user_details',
                resource: 'user',
                resourceId: userId,
                metadata: { userEmail: user.email },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    user,
                    stats,
                },
            })
            
            console.log('✅ User details response sent')
        } catch (error) {
            console.error('=== GET USER DETAILS ERROR ===')
            console.error('Error:', error)
            
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
                oldValues: originalStatus,
                newValues: { isVerified, isActive },
                metadata: {
                    userEmail: user.email,
                    reason,
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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
                    // Cast enum to text for ILIKE search
                    sequelize.where(
                        sequelize.cast(sequelize.col('sex'), 'TEXT'),
                        { [Op.iLike]: `%${query}%` }
                    ),
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
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
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