const { Location, User } = require('../models')
const { Op } = require('sequelize')
const { logger } = require('../utils/logger')
const {
    NotFoundError,
    ValidationError,
    ConflictError,
} = require('../middleware/errorHandler')

const locationController = {
    // Create a new location
    create: async (req, res) => {
        try {
            const {
                name,
                latitude,
                longitude,
                address,
                city,
                state,
                landmarks,
                locationType,
            } = req.body
            const userId = req.user ? req.user.id : null

            // Check if location already exists at these coordinates
            const existingLocation = await Location.findByCoordinates(
                latitude,
                longitude,
                0.0001
            )
            if (existingLocation) {
                throw new ConflictError(
                    'A location already exists at these coordinates'
                )
            }

            // Check for duplicate names in the same city
            const duplicateName = await Location.findOne({
                where: {
                    name: { [Op.iLike]: name },
                    city: { [Op.iLike]: city },
                    state,
                    isActive: true,
                },
            })

            if (duplicateName) {
                throw new ConflictError(
                    `Location "${name}" already exists in ${city}, ${state}`
                )
            }

            // Create the location
            const location = await Location.create({
                name,
                latitude,
                longitude,
                address,
                city,
                state,
                landmarks: landmarks || [],
                locationType: locationType || 'other',
                createdBy: userId,
                isVerified: req.user ? req.user.reputationScore >= 500 : false, // Auto-verify for high-rep users
            })

            // Update user reputation if authenticated
            if (req.user) {
                await req.user.updateReputation(10) // +10 for creating a location
            }

            logger.info(`Location created: ${name} in ${city}, ${state}`, {
                locationId: location.id,
                userId,
                coordinates: `${latitude}, ${longitude}`,
            })

            res.status(201).json({
                success: true,
                message: 'Location created successfully',
                data: {
                    location: location.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Location creation error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create location',
                error: error.message,
            })
        }
    },

    // Search locations
    search: async (req, res) => {
        try {
            const {
                q,
                city,
                state,
                locationType,
                limit = 20,
                offset = 0,
            } = req.query

            if (!q || q.length < 2) {
                throw new ValidationError(
                    'Search query must be at least 2 characters long'
                )
            }

            const options = {
                city,
                state,
                locationType,
                limit: Math.min(parseInt(limit), 50),
                offset: parseInt(offset),
            }

            const result = await Location.searchByText(q, options)

            // Increment search count for found locations
            if (result.rows.length > 0) {
                await Promise.all(
                    result.rows
                        .slice(0, 5)
                        .map((location) => location.incrementSearchCount())
                )
            }

            res.json({
                success: true,
                message: 'Search completed successfully',
                data: {
                    locations: result.rows,
                    pagination: {
                        total: result.count,
                        limit: options.limit,
                        offset: options.offset,
                        hasMore: result.count > options.offset + options.limit,
                    },
                },
            })
        } catch (error) {
            logger.error('Location search error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Search failed',
                error: error.message,
            })
        }
    },

    // Find nearby locations
    findNearby: async (req, res) => {
        try {
            const {
                lat,
                lng,
                radius = 10,
                limit = 20,
                locationType,
            } = req.query

            if (!lat || !lng) {
                throw new ValidationError('Latitude and longitude are required')
            }

            const latitude = parseFloat(lat)
            const longitude = parseFloat(lng)
            const radiusKm = Math.min(parseFloat(radius), 50) // Max 50km
            const maxLimit = Math.min(parseInt(limit), 50)

            // Validate coordinates are within Nigeria
            if (
                latitude < 4.0 ||
                latitude > 14.0 ||
                longitude < 2.5 ||
                longitude > 15.0
            ) {
                throw new ValidationError(
                    'Coordinates must be within Nigeria boundaries'
                )
            }

            let locations = await Location.findNearby(
                latitude,
                longitude,
                radiusKm,
                maxLimit
            )

            // Filter by location type if specified
            if (locationType) {
                locations = locations.filter(
                    (loc) => loc.locationType === locationType
                )
            }

            res.json({
                success: true,
                message: 'Nearby locations found successfully',
                data: {
                    locations,
                    center: { latitude, longitude },
                    radius: radiusKm,
                    count: locations.length,
                },
            })
        } catch (error) {
            logger.error('Nearby locations error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to find nearby locations',
                error: error.message,
            })
        }
    },

    // Get location by ID
    getById: async (req, res) => {
        try {
            const { id } = req.params

            const location = await Location.findOne({
                where: { id, isActive: true },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: [
                            'firstName',
                            'lastName',
                            'reputationScore',
                        ],
                        required: false,
                    },
                ],
            })

            if (!location) {
                throw new NotFoundError('Location')
            }

            // Increment search count
            await location.incrementSearchCount()

            res.json({
                success: true,
                message: 'Location retrieved successfully',
                data: {
                    location,
                },
            })
        } catch (error) {
            logger.error('Get location error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get location',
                error: error.message,
            })
        }
    },

    // Update location
    update: async (req, res) => {
        try {
            const { id } = req.params
            const {
                name,
                address,
                city,
                state,
                landmarks,
                locationType,
                isActive,
            } = req.body

            const location = await Location.findOne({
                where: { id, isActive: true },
            })

            if (!location) {
                throw new NotFoundError('Location')
            }

            // Check permissions (only creator or high-reputation users can edit)
            const canEdit =
                !req.user ||
                location.createdBy === req.user.id ||
                req.user.reputationScore >= 200

            if (!canEdit) {
                throw new AuthorizationError(
                    'Insufficient permissions to edit this location'
                )
            }

            // Check for duplicate names if name is being changed
            if (name && name !== location.name) {
                const duplicateName = await Location.findOne({
                    where: {
                        name: { [Op.iLike]: name },
                        city: { [Op.iLike]: city || location.city },
                        state: state || location.state,
                        id: { [Op.ne]: id },
                        isActive: true,
                    },
                })

                if (duplicateName) {
                    throw new ConflictError(
                        `Location "${name}" already exists in this city`
                    )
                }
            }

            // Update fields
            const updates = {}
            if (name) updates.name = name
            if (address) updates.address = address
            if (city) updates.city = city
            if (state) updates.state = state
            if (landmarks) updates.landmarks = landmarks
            if (locationType) updates.locationType = locationType
            if (
                typeof isActive === 'boolean' &&
                req.user?.reputationScore >= 500
            ) {
                updates.isActive = isActive
            }

            await location.update(updates)

            // Update user reputation if authenticated and not their own location
            if (req.user && location.createdBy !== req.user.id) {
                await req.user.updateReputation(5) // +5 for improving a location
            }

            logger.info(`Location updated: ${location.name}`, {
                locationId: id,
                userId: req.user?.id,
                updates: Object.keys(updates),
            })

            res.json({
                success: true,
                message: 'Location updated successfully',
                data: {
                    location: location.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Location update error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update location',
                error: error.message,
            })
        }
    },

    // Get popular locations
    getPopular: async (req, res) => {
        try {
            const { limit = 10, state, city } = req.query
            const maxLimit = Math.min(parseInt(limit), 50)

            let whereClause = { isActive: true, isVerified: true }

            if (state) {
                whereClause.state = state
            }

            if (city) {
                whereClause.city = { [Op.iLike]: `%${city}%` }
            }

            const locations = await Location.findAll({
                where: whereClause,
                order: [
                    ['searchCount', 'DESC'],
                    ['routeCount', 'DESC'],
                    ['name', 'ASC'],
                ],
                limit: maxLimit,
                attributes: [
                    'id',
                    'name',
                    'latitude',
                    'longitude',
                    'address',
                    'city',
                    'state',
                    'locationType',
                    'searchCount',
                    'routeCount',
                ],
            })

            res.json({
                success: true,
                message: 'Popular locations retrieved successfully',
                data: {
                    locations,
                    count: locations.length,
                },
            })
        } catch (error) {
            logger.error('Get popular locations error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get popular locations',
                error: error.message,
            })
        }
    },

    // Get locations by state
    getByState: async (req, res) => {
        try {
            const { state } = req.params
            const { limit = 50 } = req.query

            // Validate state
            const validStates = [
                'Abia',
                'Adamawa',
                'Akwa Ibom',
                'Anambra',
                'Bauchi',
                'Bayelsa',
                'Benue',
                'Borno',
                'Cross River',
                'Delta',
                'Ebonyi',
                'Edo',
                'Ekiti',
                'Enugu',
                'FCT',
                'Gombe',
                'Imo',
                'Jigawa',
                'Kaduna',
                'Kano',
                'Katsina',
                'Kebbi',
                'Kogi',
                'Kwara',
                'Lagos',
                'Nasarawa',
                'Niger',
                'Ogun',
                'Ondo',
                'Osun',
                'Oyo',
                'Plateau',
                'Rivers',
                'Sokoto',
                'Taraba',
                'Yobe',
                'Zamfara',
            ]

            if (!validStates.includes(state)) {
                throw new ValidationError('Invalid Nigerian state')
            }

            const locations = await Location.getByState(
                state,
                Math.min(parseInt(limit), 100)
            )

            res.json({
                success: true,
                message: `Locations in ${state} retrieved successfully`,
                data: {
                    state,
                    locations,
                    count: locations.length,
                },
            })
        } catch (error) {
            logger.error('Get locations by state error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get locations by state',
                error: error.message,
            })
        }
    },

    // Get locations by city
    getByCity: async (req, res) => {
        try {
            const { city } = req.params
            const { state, limit = 50 } = req.query

            if (!city || city.length < 2) {
                throw new ValidationError(
                    'City name must be at least 2 characters long'
                )
            }

            const locations = await Location.getByCity(
                city,
                state,
                Math.min(parseInt(limit), 100)
            )

            res.json({
                success: true,
                message: `Locations in ${city} retrieved successfully`,
                data: {
                    city,
                    state: state || 'all states',
                    locations,
                    count: locations.length,
                },
            })
        } catch (error) {
            logger.error('Get locations by city error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get locations by city',
                error: error.message,
            })
        }
    },

    // Delete location (soft delete)
    delete: async (req, res) => {
        try {
            const { id } = req.params

            const location = await Location.findOne({
                where: { id, isActive: true },
            })

            if (!location) {
                throw new NotFoundError('Location')
            }

            // Check permissions (only creator or admin can delete)
            const canDelete =
                !req.user ||
                location.createdBy === req.user.id ||
                req.user.reputationScore >= 1000

            if (!canDelete) {
                throw new AuthorizationError(
                    'Insufficient permissions to delete this location'
                )
            }

            // Soft delete
            await location.update({ isActive: false })

            logger.info(`Location deleted: ${location.name}`, {
                locationId: id,
                userId: req.user?.id,
            })

            res.json({
                success: true,
                message: 'Location deleted successfully',
            })
        } catch (error) {
            logger.error('Location deletion error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to delete location',
                error: error.message,
            })
        }
    },

    // Get location statistics
    getStats: async (req, res) => {
        try {
            const stats = await Location.findAll({
                attributes: [
                    'state',
                    [
                        Location.sequelize.fn(
                            'COUNT',
                            Location.sequelize.col('id')
                        ),
                        'count',
                    ],
                    [
                        Location.sequelize.fn(
                            'AVG',
                            Location.sequelize.col('searchCount')
                        ),
                        'avgSearches',
                    ],
                ],
                where: { isActive: true },
                group: ['state'],
                order: [
                    [
                        Location.sequelize.fn(
                            'COUNT',
                            Location.sequelize.col('id')
                        ),
                        'DESC',
                    ],
                ],
            })

            const totalLocations = await Location.count({
                where: { isActive: true },
            })
            const verifiedLocations = await Location.count({
                where: { isActive: true, isVerified: true },
            })

            res.json({
                success: true,
                message: 'Location statistics retrieved successfully',
                data: {
                    totalLocations,
                    verifiedLocations,
                    verificationRate:
                        totalLocations > 0
                            ? (
                                  (verifiedLocations / totalLocations) *
                                  100
                              ).toFixed(2) + '%'
                            : '0%',
                    byState: stats.map((stat) => ({
                        state: stat.state,
                        count: parseInt(stat.dataValues.count),
                        avgSearches: parseFloat(
                            stat.dataValues.avgSearches || 0
                        ).toFixed(2),
                    })),
                },
            })
        } catch (error) {
            logger.error('Location stats error:', error)
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to get location statistics',
                error: error.message,
            })
        }
    },
}

module.exports = locationController
