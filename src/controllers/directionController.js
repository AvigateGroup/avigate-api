const { UserDirection, Location, User } = require('../models')
const { Op } = require('sequelize')
const { logger } = require('../utils/logger')
const { generateSecureRandomString } = require('../services/user/authService')
const {
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    AuthorizationError,
    AuthenticationError,
} = require('../middleware/errorHandler')

const directionController = {
    // Create a shareable direction
    create: async (req, res) => {
        try {
            const {
                title,
                description,
                startLocationId,
                endLocationId,
                routeData,
                totalEstimatedFare,
                totalEstimatedDuration,
                isPublic = false,
            } = req.body

            if (!req.user) {
                throw new AuthenticationError(
                    'Authentication required to create directions'
                )
            }

            // Validate locations exist
            const startLocation = await Location.findByPk(startLocationId)
            const endLocation = await Location.findByPk(endLocationId)

            if (!startLocation || !endLocation) {
                throw new NotFoundError('Start or end location not found')
            }

            if (startLocationId === endLocationId) {
                throw new ValidationError(
                    'Start and end locations cannot be the same'
                )
            }

            // Validate route data structure
            if (
                !routeData ||
                !routeData.steps ||
                !Array.isArray(routeData.steps)
            ) {
                throw new ValidationError(
                    'Route data must contain a valid steps array'
                )
            }

            // Generate unique share code
            let shareCode
            let attempts = 0
            do {
                shareCode = generateSecureRandomString(8)
                const existing = await UserDirection.findOne({
                    where: { shareCode },
                })
                if (!existing) break
                attempts++
            } while (attempts < 10)

            if (attempts >= 10) {
                throw new AppError('Failed to generate unique share code', 500)
            }

            // Create the direction
            const direction = await UserDirection.create({
                createdBy: req.user.id,
                title,
                description,
                startLocationId,
                endLocationId,
                routeData,
                totalEstimatedFare,
                totalEstimatedDuration,
                shareCode,
                isPublic,
                usageCount: 0,
            })

            // Update user reputation
            await req.user.updateReputation(5) // +5 for sharing directions

            logger.info(`Direction created: ${title}`, {
                directionId: direction.id,
                shareCode,
                userId: req.user.id,
                isPublic,
            })

            // Fetch complete direction with associations
            const completeDirection = await UserDirection.findByPk(
                direction.id,
                {
                    include: [
                        { model: Location, as: 'startLocation' },
                        { model: Location, as: 'endLocation' },
                        {
                            model: User,
                            as: 'creator',
                            attributes: [
                                'firstName',
                                'lastName',
                                'reputationScore',
                            ],
                        },
                    ],
                }
            )

            res.status(201).json({
                success: true,
                message: 'Direction created successfully',
                data: {
                    direction: completeDirection,
                    shareUrl: `${process.env.CLIENT_URL}/directions/${shareCode}`,
                },
            })
        } catch (error) {
            logger.error('Direction creation error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create direction',
                error: error.message,
            })
        }
    },

    // Get direction by share code
    getByShareCode: async (req, res) => {
        try {
            const { shareCode } = req.params

            if (!shareCode || shareCode.length !== 8) {
                throw new ValidationError('Invalid share code format')
            }

            const direction = await UserDirection.findOne({
                where: { shareCode },
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                    {
                        model: User,
                        as: 'creator',
                        attributes: [
                            'firstName',
                            'lastName',
                            'reputationScore',
                        ],
                    },
                ],
            })

            if (!direction) {
                throw new NotFoundError('Direction not found')
            }

            // Check if user can access this direction
            const canAccess =
                direction.isPublic ||
                (req.user && direction.createdBy === req.user.id)

            if (!canAccess) {
                throw new AuthorizationError('This direction is private')
            }

            // Increment usage count
            await direction.increment('usageCount')

            // Update creator reputation if used by someone else
            if (req.user && direction.createdBy !== req.user.id) {
                const creator = await User.findByPk(direction.createdBy)
                if (creator) {
                    await creator.updateReputation(1) // +1 for direction being used
                }
            }

            logger.info(`Direction accessed: ${shareCode}`, {
                directionId: direction.id,
                accessedBy: req.user?.id || 'anonymous',
                usageCount: direction.usageCount + 1,
            })

            res.json({
                success: true,
                message: 'Direction retrieved successfully',
                data: {
                    direction,
                },
            })
        } catch (error) {
            logger.error('Get direction error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get direction',
                error: error.message,
            })
        }
    },

    // Get user's directions
    getMyDirections: async (req, res) => {
        try {
            const { limit = 20, offset = 0, isPublic } = req.query

            if (!req.user) {
                throw new AuthenticationError('Authentication required')
            }

            let whereClause = { createdBy: req.user.id }

            if (typeof isPublic === 'boolean') {
                whereClause.isPublic = isPublic
            }

            const directions = await UserDirection.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Location,
                        as: 'startLocation',
                        attributes: ['id', 'name', 'city', 'state'],
                    },
                    {
                        model: Location,
                        as: 'endLocation',
                        attributes: ['id', 'name', 'city', 'state'],
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: Math.min(parseInt(limit), 50),
                offset: parseInt(offset),
            })

            res.json({
                success: true,
                message: 'Your directions retrieved successfully',
                data: {
                    directions: directions.rows,
                    pagination: {
                        total: directions.count,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore:
                            directions.count >
                            parseInt(offset) + parseInt(limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Get my directions error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get your directions',
                error: error.message,
            })
        }
    },

    // Update direction
    update: async (req, res) => {
        try {
            const { id } = req.params
            const {
                title,
                description,
                routeData,
                totalEstimatedFare,
                totalEstimatedDuration,
                isPublic,
            } = req.body

            if (!req.user) {
                throw new AuthenticationError('Authentication required')
            }

            const direction = await UserDirection.findByPk(id)

            if (!direction) {
                throw new NotFoundError('Direction')
            }

            // Check permissions
            if (direction.createdBy !== req.user.id) {
                throw new AuthorizationError(
                    'You can only edit your own directions'
                )
            }

            // Update fields
            const updates = {}
            if (title) updates.title = title
            if (description !== undefined) updates.description = description
            if (routeData) updates.routeData = routeData
            if (totalEstimatedFare)
                updates.totalEstimatedFare = totalEstimatedFare
            if (totalEstimatedDuration)
                updates.totalEstimatedDuration = totalEstimatedDuration
            if (typeof isPublic === 'boolean') updates.isPublic = isPublic

            await direction.update(updates)

            logger.info(`Direction updated: ${id}`, {
                directionId: id,
                userId: req.user.id,
                updates: Object.keys(updates),
            })

            // Fetch updated direction with associations
            const updatedDirection = await UserDirection.findByPk(id, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                ],
            })

            res.json({
                success: true,
                message: 'Direction updated successfully',
                data: {
                    direction: updatedDirection,
                },
            })
        } catch (error) {
            logger.error('Direction update error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update direction',
                error: error.message,
            })
        }
    },

    // Delete direction
    delete: async (req, res) => {
        try {
            const { id } = req.params

            if (!req.user) {
                throw new AuthenticationError('Authentication required')
            }

            const direction = await UserDirection.findByPk(id)

            if (!direction) {
                throw new NotFoundError('Direction')
            }

            // Check permissions
            if (direction.createdBy !== req.user.id) {
                throw new AuthorizationError(
                    'You can only delete your own directions'
                )
            }

            await direction.destroy()

            logger.info(`Direction deleted: ${id}`, {
                directionId: id,
                userId: req.user.id,
                shareCode: direction.shareCode,
            })

            res.json({
                success: true,
                message: 'Direction deleted successfully',
            })
        } catch (error) {
            logger.error('Direction deletion error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete direction',
                error: error.message,
            })
        }
    },

    // Record direction usage (for analytics)
    recordUsage: async (req, res) => {
        try {
            const { id } = req.params
            const { usageType = 'view' } = req.body

            if (!['view', 'follow', 'share'].includes(usageType)) {
                throw new ValidationError('Invalid usage type')
            }

            const direction = await UserDirection.findByPk(id)

            if (!direction) {
                throw new NotFoundError('Direction')
            }

            // Check if user can access this direction
            const canAccess =
                direction.isPublic ||
                (req.user && direction.createdBy === req.user.id)

            if (!canAccess) {
                throw new AuthorizationError('This direction is private')
            }

            // Increment usage count
            await direction.increment('usageCount')

            // Log usage for analytics
            logger.info(`Direction usage recorded: ${usageType}`, {
                directionId: id,
                usageType,
                userId: req.user?.id || 'anonymous',
                shareCode: direction.shareCode,
            })

            res.json({
                success: true,
                message: 'Usage recorded successfully',
            })
        } catch (error) {
            logger.error('Direction usage recording error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to record usage',
                error: error.message,
            })
        }
    },

    // Get popular public directions
    getPopular: async (req, res) => {
        try {
            const { limit = 10, state, city } = req.query
            const maxLimit = Math.min(parseInt(limit), 20)

            let locationFilter = {}
            if (state || city) {
                if (state) locationFilter.state = state
                if (city) locationFilter.city = { [Op.iLike]: `%${city}%` }
            }

            const directions = await UserDirection.findAll({
                where: {
                    isPublic: true,
                    usageCount: { [Op.gt]: 0 },
                },
                include: [
                    {
                        model: Location,
                        as: 'startLocation',
                        where:
                            Object.keys(locationFilter).length > 0
                                ? locationFilter
                                : undefined,
                        attributes: ['id', 'name', 'city', 'state'],
                    },
                    {
                        model: Location,
                        as: 'endLocation',
                        attributes: ['id', 'name', 'city', 'state'],
                    },
                    {
                        model: User,
                        as: 'creator',
                        attributes: [
                            'firstName',
                            'lastName',
                            'reputationScore',
                        ],
                    },
                ],
                order: [
                    ['usageCount', 'DESC'],
                    ['createdAt', 'DESC'],
                ],
                limit: maxLimit,
            })

            res.json({
                success: true,
                message: 'Popular directions retrieved successfully',
                data: {
                    directions,
                    count: directions.length,
                },
            })
        } catch (error) {
            logger.error('Get popular directions error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get popular directions',
                error: error.message,
            })
        }
    },

    // Get direction statistics
    getStats: async (req, res) => {
        try {
            const totalDirections = await UserDirection.count()
            const publicDirections = await UserDirection.count({
                where: { isPublic: true },
            })
            const totalUsage = await UserDirection.sum('usageCount')

            const topCreators = await UserDirection.findAll({
                attributes: [
                    'createdBy',
                    [
                        UserDirection.sequelize.fn(
                            'COUNT',
                            UserDirection.sequelize.col('id')
                        ),
                        'directionCount',
                    ],
                    [
                        UserDirection.sequelize.fn(
                            'SUM',
                            UserDirection.sequelize.col('usageCount')
                        ),
                        'totalUsage',
                    ],
                ],
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: [
                            'firstName',
                            'lastName',
                            'reputationScore',
                        ],
                    },
                ],
                group: ['createdBy', 'creator.id'],
                order: [
                    [
                        UserDirection.sequelize.fn(
                            'COUNT',
                            UserDirection.sequelize.col('id')
                        ),
                        'DESC',
                    ],
                ],
                limit: 5,
            })

            const avgUsage =
                totalDirections > 0
                    ? (totalUsage / totalDirections).toFixed(2)
                    : 0

            res.json({
                success: true,
                message: 'Direction statistics retrieved successfully',
                data: {
                    totalDirections,
                    publicDirections,
                    privateDirections: totalDirections - publicDirections,
                    totalUsage,
                    averageUsagePerDirection: avgUsage,
                    publicPercentage:
                        totalDirections > 0
                            ? (
                                  (publicDirections / totalDirections) *
                                  100
                              ).toFixed(1) + '%'
                            : '0%',
                    topCreators: topCreators.map((creator) => ({
                        user: creator.creator,
                        directionCount: parseInt(
                            creator.dataValues.directionCount
                        ),
                        totalUsage: parseInt(
                            creator.dataValues.totalUsage || 0
                        ),
                    })),
                },
            })
        } catch (error) {
            logger.error('Direction stats error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get direction statistics',
                error: error.message,
            })
        }
    },
}

module.exports = directionController
