// controllers/user/fareController.js
const {
    FareFeedback,
    Route,
    RouteStep,
    Location,
    UserInteraction,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const fareController = {
    // Submit fare feedback
    submitFareFeedback: async (req, res) => {
        try {
            const user = req.user
            const {
                routeStepId,
                routeId,
                fareType,
                amountPaid,
                suggestedAmount,
                currency = 'NGN',
                paymentMethod,
                tripDate,
                timeOfDay,
                passengerCount = 1,
                vehicleType,
                routeConditions = {},
                driverRating,
                overallExperience,
                notes,
            } = req.body

            // Validate required fields
            if (!fareType || !amountPaid || !tripDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Fare type, amount paid, and trip date are required',
                })
            }

            // Validate that either routeStepId or routeId is provided
            if (!routeStepId && !routeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Either route step ID or route ID is required',
                })
            }

            // Validate route/step exists
            if (routeStepId) {
                const routeStep = await RouteStep.findByPk(routeStepId)
                if (!routeStep) {
                    return res.status(404).json({
                        success: false,
                        message: 'Route step not found',
                    })
                }
            }

            if (routeId) {
                const route = await Route.findByPk(routeId)
                if (!route) {
                    return res.status(404).json({
                        success: false,
                        message: 'Route not found',
                    })
                }
            }

            // Create fare feedback
            const fareFeedback = await FareFeedback.create({
                userId: user.id,
                routeStepId,
                routeId,
                fareType,
                amountPaid: parseFloat(amountPaid),
                suggestedAmount: suggestedAmount ? parseFloat(suggestedAmount) : null,
                currency,
                paymentMethod,
                tripDate: new Date(tripDate),
                timeOfDay,
                passengerCount: parseInt(passengerCount),
                vehicleType,
                routeConditions,
                driverRating: driverRating ? parseFloat(driverRating) : null,
                overallExperience: overallExperience ? parseFloat(overallExperience) : null,
                notes,
                isVerified: user.reputationScore > 200, // Auto-verify trusted users
                verificationScore: Math.min(user.reputationScore / 20, 10),
                ipAddress: req.ip,
            })

            // Update user reputation
            await user.updateReputation(3) // +3 for fare feedback

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'fare_feedback_submit',
                resourceId: fareFeedback.id,
                resourceType: 'fare_feedback',
                interactionData: {
                    fareType,
                    amountPaid,
                    vehicleType,
                    passengerCount,
                },
                ipAddress: req.ip,
            })

            res.status(201).json({
                success: true,
                message: 'Fare feedback submitted successfully',
                data: {
                    fareFeedback: fareFeedback.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Submit fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to submit fare feedback',
                error: error.message,
            })
        }
    },

    // Get fare information for a route
    getRouteFareInfo: async (req, res) => {
        try {
            const { routeId } = req.params
            const { vehicleType, days = 30 } = req.query
            const user = req.user

            const route = await Route.findByPk(routeId)

            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: 'Route not found',
                })
            }

            // Get fare statistics
            const fareStats = await FareFeedback.getAverageFare(
                routeId,
                vehicleType,
                parseInt(days)
            )

            // Get fare trends
            const fareTrends = await FareFeedback.getFareTrends(
                routeId,
                vehicleType,
                90 // 90 days of trends
            )

            // Get recent fare feedback
            const recentFeedback = await FareFeedback.findByRoute(
                routeId,
                vehicleType,
                10
            )

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'fare_info_view',
                resourceId: routeId,
                resourceType: 'route',
                interactionData: { vehicleType, days },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    route: {
                        id: route.id,
                        name: route.name,
                        transportMode: route.transportMode,
                    },
                    fareStatistics: {
                        averageFare: fareStats.averageFare ? parseFloat(fareStats.averageFare) : null,
                        minFare: fareStats.minFare ? parseFloat(fareStats.minFare) : null,
                        maxFare: fareStats.maxFare ? parseFloat(fareStats.maxFare) : null,
                        feedbackCount: parseInt(fareStats.feedbackCount) || 0,
                        currency: 'NGN',
                    },
                    fareTrends,
                    recentFeedback,
                    filters: { vehicleType, days: parseInt(days) },
                },
            })
        } catch (error) {
            logger.error('Get route fare info error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get fare information',
                error: error.message,
            })
        }
    },

    // Get fare comparison between routes
    compareFares: async (req, res) => {
        try {
            const { routeIds } = req.body // Array of route IDs
            const { vehicleType, days = 30 } = req.query
            const user = req.user

            if (!Array.isArray(routeIds) || routeIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'At least 2 route IDs are required for comparison',
                })
            }

            const fareComparisons = []

            for (const routeId of routeIds) {
                const route = await Route.findByPk(routeId, {
                    include: [
                        { model: Location, as: 'startLocation' },
                        { model: Location, as: 'endLocation' },
                    ],
                })

                if (route) {
                    const fareStats = await FareFeedback.getAverageFare(
                        routeId,
                        vehicleType,
                        parseInt(days)
                    )

                    fareComparisons.push({
                        route: {
                            id: route.id,
                            name: route.name,
                            transportMode: route.transportMode,
                            startLocation: route.startLocation?.name,
                            endLocation: route.endLocation?.name,
                            distanceKm: route.distanceKm,
                            estimatedDuration: route.estimatedDuration,
                        },
                        fareData: {
                            averageFare: fareStats.averageFare ? parseFloat(fareStats.averageFare) : null,
                            minFare: fareStats.minFare ? parseFloat(fareStats.minFare) : null,
                            maxFare: fareStats.maxFare ? parseFloat(fareStats.maxFare) : null,
                            feedbackCount: parseInt(fareStats.feedbackCount) || 0,
                            farePerKm: fareStats.averageFare && route.distanceKm 
                                ? parseFloat(fareStats.averageFare) / parseFloat(route.distanceKm)
                                : null,
                        },
                    })
                }
            }

            // Sort by average fare
            fareComparisons.sort((a, b) => {
                const fareA = a.fareData.averageFare || 0
                const fareB = b.fareData.averageFare || 0
                return fareA - fareB
            })

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'fare_comparison',
                resourceType: 'route',
                interactionData: {
                    routeIds,
                    vehicleType,
                    comparisonCount: fareComparisons.length,
                },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    fareComparisons,
                    filters: { vehicleType, days: parseInt(days) },
                    currency: 'NGN',
                },
            })
        } catch (error) {
            logger.error('Compare fares error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to compare fares',
                error: error.message,
            })
        }
    },

    // Get user's fare feedback history
    getUserFareFeedback: async (req, res) => {
        try {
            const user = req.user
            const {
                vehicleType,
                disputed,
                verified,
                limit = 20,
                offset = 0,
            } = req.query

            const where = { userId: user.id }

            if (vehicleType) where.vehicleType = vehicleType
            if (disputed !== undefined) where.isDisputed = disputed === 'true'
            if (verified !== undefined) where.isVerified = verified === 'true'

            const fareFeedbacks = await FareFeedback.findAll({
                where,
                include: [
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
                order: [['tripDate', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
            })

            // Calculate user's fare statistics
            const userStats = await FareFeedback.findAll({
                where: { userId: user.id },
                attributes: [
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'totalFeedbacks'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageAmountPaid'],
                    [FareFeedback.sequelize.fn('SUM', FareFeedback.sequelize.col('amountPaid')), 'totalAmountPaid'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('overallExperience')), 'averageExperience'],
                ],
                raw: true,
            })

            res.json({
                success: true,
                data: {
                    fareFeedbacks,
                    userStatistics: userStats[0],
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: fareFeedbacks.length === parseInt(limit),
                    },
                    filters: { vehicleType, disputed, verified },
                },
            })
        } catch (error) {
            logger.error('Get user fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get fare feedback history',
                error: error.message,
            })
        }
    },

    // Dispute a fare feedback
    disputeFareFeedback: async (req, res) => {
        try {
            const { feedbackId } = req.params
            const { reason } = req.body
            const user = req.user

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Dispute reason is required',
                })
            }

            const fareFeedback = await FareFeedback.findByPk(feedbackId)

            if (!fareFeedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare feedback not found',
                })
            }

            // Check if user can dispute (either the submitter or within dispute period)
            const disputePeriod = 7 * 24 * 60 * 60 * 1000 // 7 days
            const canDispute = fareFeedback.userId === user.id || 
                              (Date.now() - fareFeedback.createdAt.getTime()) < disputePeriod

            if (!canDispute) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot dispute this fare feedback',
                })
            }

            // Mark as disputed
            await fareFeedback.markDisputed(reason)

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'fare_feedback_dispute',
                resourceId: feedbackId,
                resourceType: 'fare_feedback',
                interactionData: { reason },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: 'Fare feedback disputed successfully',
                data: {
                    isDisputed: fareFeedback.isDisputed,
                    disputeReason: fareFeedback.disputeReason,
                    verificationScore: fareFeedback.verificationScore,
                },
            })
        } catch (error) {
            logger.error('Dispute fare feedback error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to dispute fare feedback',
                error: error.message,
            })
        }
    },
}

module.exports = fareController