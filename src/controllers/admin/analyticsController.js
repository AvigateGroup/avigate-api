// controllers/admin/analyticsController.js
const {
    User,
    Location,
    Route,
    FareFeedback,
    CommunityPost,
    SafetyReport,
    DirectionShare,
    TripLog,
    SearchLog,
    UserInteraction,
    AuditLog,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const analyticsController = {
    // Get dashboard overview
    getDashboardOverview: async (req, res) => {
        try {
            const admin = req.admin
            const { period = 30 } = req.query // days

            const periodStart = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)

            // User statistics
            const totalUsers = await User.count({ where: { isActive: true } })
            const newUsers = await User.count({
                where: {
                    createdAt: { [Op.gte]: periodStart },
                    isActive: true,
                },
            })
            const verifiedUsers = await User.count({
                where: { isVerified: true, isActive: true },
            })

            // Location statistics
            const totalLocations = await Location.count({ where: { isActive: true } })
            const verifiedLocations = await Location.count({
                where: { isVerified: true, isActive: true },
            })

            // Route statistics
            const totalRoutes = await Route.count({ where: { isActive: true } })
            const verifiedRoutes = await Route.count({
                where: { isVerified: true, isActive: true },
            })

            // Fare feedback statistics
            const totalFareFeedback = await FareFeedback.count({
                where: { createdAt: { [Op.gte]: periodStart } },
            })
            const verifiedFareFeedback = await FareFeedback.count({
                where: {
                    createdAt: { [Op.gte]: periodStart },
                    isVerified: true,
                },
            })

            // Community statistics
            const totalCommunityPosts = await CommunityPost.count({
                where: {
                    createdAt: { [Op.gte]: periodStart },
                    isActive: true,
                },
            })
            const totalSafetyReports = await SafetyReport.count({
                where: { createdAt: { [Op.gte]: periodStart } },
            })

            // Direction shares statistics
            const totalDirectionShares = await DirectionShare.count({
                where: { createdAt: { [Op.gte]: periodStart } },
            })
            const activeDirectionShares = await DirectionShare.count({
                where: { status: 'active' },
            })

            // User engagement statistics
            const totalSearches = await SearchLog.count({
                where: { createdAt: { [Op.gte]: periodStart } },
            })
            const totalInteractions = await UserInteraction.count({
                where: { createdAt: { [Op.gte]: periodStart } },
            })

            // Trip statistics
            const totalTrips = await TripLog.count({
                where: { tripStartedAt: { [Op.gte]: periodStart } },
            })
            const successfulTrips = await TripLog.count({
                where: {
                    tripStartedAt: { [Op.gte]: periodStart },
                    wasSuccessful: true,
                },
            })

            // Daily active users trend
            const dailyActiveUsers = await UserInteraction.findAll({
                where: { createdAt: { [Op.gte]: periodStart } },
                attributes: [
                    [UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt')), 'date'],
                    [UserInteraction.sequelize.fn('COUNT', UserInteraction.sequelize.fn('DISTINCT', UserInteraction.sequelize.col('userId'))), 'activeUsers'],
                ],
                group: [UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt'))],
                order: [[UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt')), 'ASC']],
                raw: true,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_dashboard',
                resource: 'analytics',
                metadata: { period },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    users: {
                        total: totalUsers,
                        new: newUsers,
                        verified: verifiedUsers,
                        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,
                    },
                    locations: {
                        total: totalLocations,
                        verified: verifiedLocations,
                        verificationRate: totalLocations > 0 ? (verifiedLocations / totalLocations * 100).toFixed(2) : 0,
                    },
                    routes: {
                        total: totalRoutes,
                        verified: verifiedRoutes,
                        verificationRate: totalRoutes > 0 ? (verifiedRoutes / totalRoutes * 100).toFixed(2) : 0,
                    },
                    fareFeedback: {
                        total: totalFareFeedback,
                        verified: verifiedFareFeedback,
                        verificationRate: totalFareFeedback > 0 ? (verifiedFareFeedback / totalFareFeedback * 100).toFixed(2) : 0,
                    },
                    community: {
                        posts: totalCommunityPosts,
                        safetyReports: totalSafetyReports,
                    },
                    directionShares: {
                        total: totalDirectionShares,
                        active: activeDirectionShares,
                    },
                    engagement: {
                        searches: totalSearches,
                        interactions: totalInteractions,
                        trips: totalTrips,
                        successfulTrips,
                        successRate: totalTrips > 0 ? (successfulTrips / totalTrips * 100).toFixed(2) : 0,
                    },
                    trends: {
                        dailyActiveUsers,
                    },
                    period: `${period} days`,
                },
            })
        } catch (error) {
            logger.error('Admin get dashboard overview error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard overview',
                error: error.message,
            })
        }
    },

    // Get user growth metrics
    getUserGrowthMetrics: async (req, res) => {
        try {
            const admin = req.admin
            const { period = 90, interval = 'daily' } = req.query

            const periodStart = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)

            let dateFormat
            switch (interval) {
                case 'hourly':
                    dateFormat = '%Y-%m-%d %H:00:00'
                    break
                case 'weekly':
                    dateFormat = '%Y-%W'
                    break
                case 'monthly':
                    dateFormat = '%Y-%m'
                    break
                default:
                    dateFormat = '%Y-%m-%d'
            }

            // User registration trends
            const registrationTrends = await User.findAll({
                where: { createdAt: { [Op.gte]: periodStart } },
                attributes: [
                    [User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'date'],
                    [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'newUsers'],
                ],
                group: [User.sequelize.fn('DATE', User.sequelize.col('createdAt'))],
                order: [[User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'ASC']],
                raw: true,
            })

            // User verification trends
            const verificationTrends = await User.findAll({
                where: {
                    createdAt: { [Op.gte]: periodStart },
                    isVerified: true,
                },
                attributes: [
                    [User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'date'],
                    [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'verifiedUsers'],
                ],
                group: [User.sequelize.fn('DATE', User.sequelize.col('createdAt'))],
                order: [[User.sequelize.fn('DATE', User.sequelize.col('createdAt')), 'ASC']],
                raw: true,
            })

            // User activity trends
            const activityTrends = await UserInteraction.findAll({
                where: { createdAt: { [Op.gte]: periodStart } },
                attributes: [
                    [UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt')), 'date'],
                    [UserInteraction.sequelize.fn('COUNT', UserInteraction.sequelize.fn('DISTINCT', UserInteraction.sequelize.col('userId'))), 'activeUsers'],
                    [UserInteraction.sequelize.fn('COUNT', UserInteraction.sequelize.col('id')), 'totalInteractions'],
                ],
                group: [UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt'))],
                order: [[UserInteraction.sequelize.fn('DATE', UserInteraction.sequelize.col('createdAt')), 'ASC']],
                raw: true,
            })

            // User retention (users who came back after 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

            const usersRegisteredSevenDaysAgo = await User.count({
                where: {
                    createdAt: { [Op.between]: [thirtyDaysAgo, sevenDaysAgo] },
                },
            })

            const usersActiveInLastSevenDays = await UserInteraction.count({
                where: {
                    createdAt: { [Op.gte]: sevenDaysAgo },
                    userId: {
                        [Op.in]: User.sequelize.literal(`
                            (SELECT id FROM users WHERE "createdAt" BETWEEN '${thirtyDaysAgo.toISOString()}' AND '${sevenDaysAgo.toISOString()}')
                        `),
                    },
                },
                distinct: true,
                col: 'userId',
            })

            const retentionRate = usersRegisteredSevenDaysAgo > 0 
                ? (usersActiveInLastSevenDays / usersRegisteredSevenDaysAgo * 100).toFixed(2)
                : 0

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_user_growth_metrics',
                resource: 'analytics',
                metadata: { period, interval },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    registrationTrends,
                    verificationTrends,
                    activityTrends,
                    retentionMetrics: {
                        usersRegistered: usersRegisteredSevenDaysAgo,
                        usersRetained: usersActiveInLastSevenDays,
                        retentionRate: `${retentionRate}%`,
                    },
                    period: `${period} days`,
                    interval,
                },
            })
        } catch (error) {
            logger.error('Admin get user growth metrics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get user growth metrics',
                error: error.message,
            })
        }
    },

    // Get geographic analytics
    getGeographicAnalytics: async (req, res) => {
        try {
            const admin = req.admin
            const { period = 30 } = req.query

            const periodStart = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)

            // Users by city
            const usersByCity = await Location.findAll({
                attributes: [
                    'city',
                    [Location.sequelize.fn('COUNT', Location.sequelize.fn('DISTINCT', Location.sequelize.col('id'))), 'locationCount'],
                ],
                where: { isActive: true },
                group: ['city'],
                order: [[Location.sequelize.fn('COUNT', Location.sequelize.fn('DISTINCT', Location.sequelize.col('id'))), 'DESC']],
                limit: 20,
                raw: true,
            })

            // Routes by city
            const routesByCity = await Route.findAll({
                attributes: [
                    [Route.sequelize.literal('"startLocation"."city"'), 'city'],
                    [Route.sequelize.fn('COUNT', Route.sequelize.col('Route.id')), 'routeCount'],
                ],
                include: [
                    {
                        model: Location,
                        as: 'startLocation',
                        attributes: [],
                    },
                ],
                where: { isActive: true },
                group: [Route.sequelize.literal('"startLocation"."city"')],
                order: [[Route.sequelize.fn('COUNT', Route.sequelize.col('Route.id')), 'DESC']],
                limit: 20,
                raw: true,
            })

            // Most popular locations
            const popularLocations = await Location.findAll({
                where: { isActive: true },
                order: [['popularityScore', 'DESC']],
                limit: 20,
                attributes: ['id', 'name', 'city', 'state', 'popularityScore', 'type'],
            })

            // Most popular routes
            const popularRoutes = await Route.findAll({
                where: { isActive: true },
                include: [
                    { model: Location, as: 'startLocation', attributes: ['name', 'city'] },
                    { model: Location, as: 'endLocation', attributes: ['name', 'city'] },
                ],
                order: [['popularityScore', 'DESC']],
                limit: 20,
            })

            // Search activity by city
            const searchesByCity = await SearchLog.findAll({
                where: {
                    createdAt: { [Op.gte]: periodStart },
                    userLat: { [Op.ne]: null },
                    userLng: { [Op.ne]: null },
                },
                limit: 1000, // Sample for performance
                raw: true,
            })

            // You would typically reverse geocode to get cities, for now we'll just count
            const searchCount = searchesByCity.length

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_geographic_analytics',
                resource: 'analytics',
                metadata: { period },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    usersByCity,
                    routesByCity,
                    popularLocations,
                    popularRoutes,
                    searchActivity: {
                        totalSearches: searchCount,
                        period: `${period} days`,
                    },
                    period: `${period} days`,
                },
            })
        } catch (error) {
            logger.error('Admin get geographic analytics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get geographic analytics',
                error: error.message,
            })
        }
    },

    // Export analytics data
    exportAnalytics: async (req, res) => {
        try {
            const admin = req.admin
            const { type, startDate, endDate, format = 'json' } = req.body

            if (!type || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Type, start date, and end date are required',
                })
            }

            const where = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)],
                },
            }

            let data
            switch (type) {
                case 'users':
                    data = await User.findAll({ where })
                    break
                case 'routes':
                    data = await Route.findAll({ where })
                    break
                case 'fare_feedback':
                    data = await FareFeedback.findAll({ where })
                    break
                case 'searches':
                    data = await SearchLog.findAll({ where })
                    break
                case 'interactions':
                    data = await UserInteraction.findAll({ where })
                    break
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid export type',
                    })
            }

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'export_analytics',
                resource: 'analytics',
                metadata: { type, startDate, endDate, format, recordCount: data.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            // Format based on request
            if (format === 'csv') {
                // Convert to CSV (simplified)
                const csv = data.map(row => JSON.stringify(row)).join('\n')
                res.setHeader('Content-Type', 'text/csv')
                res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`)
                return res.send(csv)
            }

            res.json({
                success: true,
                data: {
                    type,
                    startDate,
                    endDate,
                    recordCount: data.length,
                    records: data,
                },
            })
        } catch (error) {
            logger.error('Admin export analytics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to export analytics',
                error: error.message,
            })
        }
    },
}

module.exports = analyticsController
