// controllers/admin/fareController.js
const {
    FareFeedback,
    Route,
    RouteStep,
    Location,
    User,
    AuditLog,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const fareController = {
    // Get all fare feedbacks with filters
    getAllFareFeedback: async (req, res) => {
        try {
            const admin = req.admin
            const {
                routeId,
                routeStepId,
                fareType,
                vehicleType,
                isVerified,
                isDisputed,
                minAmount,
                maxAmount,
                startDate,
                endDate,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            // Build where conditions
            const where = {}
            if (routeId) where.routeId = routeId
            if (routeStepId) where.routeStepId = routeStepId
            if (fareType) where.fareType = fareType
            if (vehicleType) where.vehicleType = vehicleType
            if (isVerified !== undefined) where.isVerified = isVerified === 'true'
            if (isDisputed !== undefined) where.isDisputed = isDisputed === 'true'
            
            if (minAmount) {
                where.amountPaid = { ...where.amountPaid, [Op.gte]: parseFloat(minAmount) }
            }
            if (maxAmount) {
                where.amountPaid = { ...where.amountPaid, [Op.lte]: parseFloat(maxAmount) }
            }

            if (startDate) {
                where.tripDate = { ...where.tripDate, [Op.gte]: new Date(startDate) }
            }
            if (endDate) {
                where.tripDate = { ...where.tripDate, [Op.lte]: new Date(endDate) }
            }

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: fareFeedbacks } = await FareFeedback.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'reputationScore'],
                    },
                    {
                        model: Route,
                        as: 'route',
                        include: [
                            { model: Location, as: 'startLocation' },
                            { model: Location, as: 'endLocation' },
                        ],
                    },
                    {
                        model: RouteStep,
                        as: 'routeStep',
                        include: [
                            { model: Location, as: 'fromLocation' },
                            { model: Location, as: 'toLocation' },
                        ],
                    },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_fare_feedbacks',
                resource: 'fare_feedback',
                metadata: { 
                    filters: { routeId, fareType, vehicleType, isVerified, isDisputed },
                    count: fareFeedbacks.length 
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    fareFeedbacks,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { routeId, fareType, vehicleType, isVerified, isDisputed },
                },
            })
        } catch (error) {
            logger.error('Admin get fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get fare feedback',
                error: error.message,
            })
        }
    },

    // Verify fare feedback
    verifyFareFeedback: async (req, res) => {
        try {
            const { feedbackId } = req.params
            const { verificationScore, notes } = req.body
            const admin = req.admin

            const fareFeedback = await FareFeedback.findByPk(feedbackId)

            if (!fareFeedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare feedback not found',
                })
            }

            const oldValues = fareFeedback.toJSON()

            fareFeedback.isVerified = true
            fareFeedback.verificationScore = verificationScore || 8.0
            if (notes) {
                fareFeedback.metadata = {
                    ...fareFeedback.metadata,
                    adminVerificationNotes: notes,
                    verifiedBy: admin.id,
                    verifiedAt: new Date(),
                }
            }
            await fareFeedback.save()

            // Update user reputation
            if (fareFeedback.userId) {
                const user = await User.findByPk(fareFeedback.userId)
                if (user) {
                    await user.updateReputation(5) // +5 for verified fare feedback
                }
            }

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'verify_fare_feedback',
                resource: 'fare_feedback',
                resourceId: feedbackId,
                oldValues,
                newValues: fareFeedback.toJSON(),
                metadata: { verificationScore, notes },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Fare feedback verified successfully',
                data: { fareFeedback },
            })
        } catch (error) {
            logger.error('Admin verify fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify fare feedback',
                error: error.message,
            })
        }
    },

    // Resolve disputed fare feedback
    resolveDispute: async (req, res) => {
        try {
            const { feedbackId } = req.params
            const { resolution, isValid } = req.body
            const admin = req.admin

            if (!resolution) {
                return res.status(400).json({
                    success: false,
                    message: 'Resolution notes are required',
                })
            }

            const fareFeedback = await FareFeedback.findByPk(feedbackId)

            if (!fareFeedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare feedback not found',
                })
            }

            if (!fareFeedback.isDisputed) {
                return res.status(400).json({
                    success: false,
                    message: 'This fare feedback is not disputed',
                })
            }

            const oldValues = fareFeedback.toJSON()

            fareFeedback.isDisputed = false
            fareFeedback.isVerified = isValid
            fareFeedback.verificationScore = isValid ? 7.0 : 3.0
            fareFeedback.metadata = {
                ...fareFeedback.metadata,
                disputeResolution: {
                    resolvedBy: admin.id,
                    resolvedAt: new Date(),
                    resolution,
                    isValid,
                },
            }
            await fareFeedback.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'resolve_fare_dispute',
                resource: 'fare_feedback',
                resourceId: feedbackId,
                oldValues,
                newValues: fareFeedback.toJSON(),
                metadata: { resolution, isValid },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Fare dispute resolved successfully',
                data: { fareFeedback },
            })
        } catch (error) {
            logger.error('Admin resolve fare dispute error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to resolve fare dispute',
                error: error.message,
            })
        }
    },

    // Get fare statistics
    getFareStatistics: async (req, res) => {
        try {
            const admin = req.admin
            const {
                routeId,
                vehicleType,
                city,
                startDate,
                endDate,
                groupBy = 'day',
            } = req.query

            const where = { isVerified: true, isDisputed: false }

            if (routeId) where.routeId = routeId
            if (vehicleType) where.vehicleType = vehicleType

            if (startDate) {
                where.tripDate = { ...where.tripDate, [Op.gte]: new Date(startDate) }
            }
            if (endDate) {
                where.tripDate = { ...where.tripDate, [Op.lte]: new Date(endDate) }
            }

            // Overall statistics
            const overallStats = await FareFeedback.findOne({
                where,
                attributes: [
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'totalFeedbacks'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                    [FareFeedback.sequelize.fn('MIN', FareFeedback.sequelize.col('amountPaid')), 'minFare'],
                    [FareFeedback.sequelize.fn('MAX', FareFeedback.sequelize.col('amountPaid')), 'maxFare'],
                    [FareFeedback.sequelize.fn('SUM', FareFeedback.sequelize.col('amountPaid')), 'totalFares'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('overallExperience')), 'averageExperience'],
                ],
                raw: true,
            })

            // Fare trends by time period
            let dateFormat
            switch (groupBy) {
                case 'hour':
                    dateFormat = '%Y-%m-%d %H:00:00'
                    break
                case 'week':
                    dateFormat = '%Y-%W'
                    break
                case 'month':
                    dateFormat = '%Y-%m'
                    break
                default:
                    dateFormat = '%Y-%m-%d'
            }

            const fareTrends = await FareFeedback.findAll({
                where,
                attributes: [
                    [FareFeedback.sequelize.fn('DATE_TRUNC', groupBy, FareFeedback.sequelize.col('tripDate')), 'period'],
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'feedbackCount'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                    [FareFeedback.sequelize.fn('MIN', FareFeedback.sequelize.col('amountPaid')), 'minFare'],
                    [FareFeedback.sequelize.fn('MAX', FareFeedback.sequelize.col('amountPaid')), 'maxFare'],
                ],
                group: [FareFeedback.sequelize.fn('DATE_TRUNC', groupBy, FareFeedback.sequelize.col('tripDate'))],
                order: [[FareFeedback.sequelize.fn('DATE_TRUNC', groupBy, FareFeedback.sequelize.col('tripDate')), 'ASC']],
                raw: true,
            })

            // Fare distribution by vehicle type
            const fareByVehicleType = await FareFeedback.findAll({
                where,
                attributes: [
                    'vehicleType',
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'feedbackCount'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                ],
                group: ['vehicleType'],
                raw: true,
            })

            // Fare distribution by time of day
            const fareByTimeOfDay = await FareFeedback.findAll({
                where,
                attributes: [
                    'timeOfDay',
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'feedbackCount'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                ],
                group: ['timeOfDay'],
                raw: true,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_fare_statistics',
                resource: 'fare_feedback',
                metadata: { filters: { routeId, vehicleType, city, groupBy } },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    overallStatistics: overallStats,
                    fareTrends,
                    fareByVehicleType,
                    fareByTimeOfDay,
                    filters: { routeId, vehicleType, city, startDate, endDate, groupBy },
                },
            })
        } catch (error) {
            logger.error('Admin get fare statistics error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get fare statistics',
                error: error.message,
            })
        }
    },

    // Bulk verify fare feedbacks
    bulkVerifyFares: async (req, res) => {
        try {
            const { feedbackIds, verificationScore = 7.0 } = req.body
            const admin = req.admin

            if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Feedback IDs array is required',
                })
            }

            const updateResult = await FareFeedback.update(
                {
                    isVerified: true,
                    verificationScore,
                },
                {
                    where: {
                        id: { [Op.in]: feedbackIds },
                    },
                }
            )

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'bulk_verify_fares',
                resource: 'fare_feedback',
                metadata: { feedbackIds, updatedCount: updateResult[0], verificationScore },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: `${updateResult[0]} fare feedbacks verified successfully`,
                data: { updatedCount: updateResult[0] },
            })
        } catch (error) {
            logger.error('Admin bulk verify fares error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify fare feedbacks',
                error: error.message,
            })
        }
    },

    // Delete fare feedback
    deleteFareFeedback: async (req, res) => {
        try {
            const { feedbackId } = req.params
            const { reason } = req.body
            const admin = req.admin

            const fareFeedback = await FareFeedback.findByPk(feedbackId)

            if (!fareFeedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare feedback not found',
                })
            }

            const oldValues = fareFeedback.toJSON()

            await fareFeedback.destroy()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'delete_fare_feedback',
                resource: 'fare_feedback',
                resourceId: feedbackId,
                oldValues,
                metadata: { reason },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            res.json({
                success: true,
                message: 'Fare feedback deleted successfully',
            })
        } catch (error) {
            logger.error('Admin delete fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to delete fare feedback',
                error: error.message,
            })
        }
    },
}

module.exports = fareController
