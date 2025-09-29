// controllers/admin/routeController.js
const {
    Route,
    RouteStep,
    Location,
    FareFeedback,
    User,
    AuditLog,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const routeController = {
    // Get all routes with filters
    getAllRoutes: async (req, res) => {
        try {
            const admin = req.admin
            const {
                search,
                transportMode,
                isVerified,
                isActive,
                city,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            // Build where conditions
            const where = {}
            if (transportMode) where.transportMode = transportMode
            if (isVerified !== undefined) where.isVerified = isVerified === 'true'
            if (isActive !== undefined) where.isActive = isActive === 'true'

            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } },
                ]
            }

            const include = [
                { model: Location, as: 'startLocation' },
                { model: Location, as: 'endLocation' },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'verifier', attributes: ['id', 'firstName', 'lastName'] },
                { model: RouteStep, as: 'steps' },
            ]

            // Add city filter
            if (city) {
                include[0].where = { city }
                include[0].required = true
            }

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: routes } = await Route.findAndCountAll({
                where,
                include,
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_routes',
                resource: 'route',
                metadata: { filters: { search, transportMode, isVerified, isActive, city } },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    routes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { search, transportMode, isVerified, isActive, city },
                },
            })
        } catch (error) {
            logger.error('Admin get all routes error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get routes',
                error: error.message,
            })
        }
    },

    // Verify route
    verifyRoute: async (req, res) => {
        try {
            const { routeId } = req.params
            const { verificationNotes } = req.body
            const admin = req.admin

            const route = await Route.findByPk(routeId)

            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: 'Route not found',
                })
            }

            const oldValues = route.toJSON()

            route.isVerified = true
            route.verifiedBy = admin.id
            route.verifiedAt = new Date()
            route.verificationNotes = verificationNotes
            await route.save()

            // Update creator's reputation if route was user-created
            if (route.createdBy) {
                const creator = await User.findByPk(route.createdBy)
                if (creator) {
                    await creator.updateReputation(20) // +20 for verified route
                }
            }

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'verify_route',
                resource: 'route',
                resourceId: route.id,
                oldValues,
                newValues: route.toJSON(),
                metadata: { verificationNotes },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Route verified successfully',
                data: { route },
            })
        } catch (error) {
            logger.error('Admin verify route error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify route',
                error: error.message,
            })
        }
    },

    // Get route analytics
    getRouteAnalytics: async (req, res) => {
        try {
            const admin = req.admin
            const { routeId } = req.params
            const { days = 30 } = req.query

            const route = await Route.findByPk(routeId, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                    { model: RouteStep, as: 'steps' },
                ],
            })

            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: 'Route not found',
                })
            }

            const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)

            // Get fare feedback statistics
            const fareStats = await FareFeedback.findOne({
                where: {
                    routeId,
                    createdAt: { [Op.gte]: daysAgo },
                    isVerified: true,
                    isDisputed: false,
                },
                attributes: [
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'totalFeedbacks'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                    [FareFeedback.sequelize.fn('MIN', FareFeedback.sequelize.col('amountPaid')), 'minFare'],
                    [FareFeedback.sequelize.fn('MAX', FareFeedback.sequelize.col('amountPaid')), 'maxFare'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('overallExperience')), 'averageExperience'],
                ],
                raw: true,
            })

            // Get usage trends
            const usageTrends = await FareFeedback.findAll({
                where: {
                    routeId,
                    createdAt: { [Op.gte]: daysAgo },
                },
                attributes: [
                    [FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate')), 'date'],
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'usageCount'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                ],
                group: [FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate'))],
                order: [[FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate')), 'ASC']],
                raw: true,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_route_analytics',
                resource: 'route',
                resourceId: routeId,
                metadata: { days },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    route,
                    analytics: {
                        fareStatistics: fareStats,
                        usageTrends,
                        period: `${days} days`,
                    },
                },
            })
        } catch (error) {
            logger.error('Admin get route analytics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get route analytics',
                error: error.message,
            })
        }
    },
}

module.exports = routeController