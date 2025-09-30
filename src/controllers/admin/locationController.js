// controllers/admin/locationController.js
const {
    Location,
    Landmark,
    Route,
    User,
    AuditLog,
} = require('../../models')
const { logger } = require('../../utils/logger')
const googleMapsService = require('../../services/external/googleMapsService')
const { Op } = require('sequelize')

const locationController = {
    // Get all locations with filters
    getAllLocations: async (req, res) => {
        try {
            const admin = req.admin
            const {
                search,
                city,
                state,
                type,
                isVerified,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'DESC',
                page = 1,
                limit = 50,
            } = req.query

            // Build where conditions
            const where = {}
            if (city) where.city = city
            if (state) where.state = state
            if (type) where.type = type
            if (isVerified !== undefined) where.isVerified = isVerified === 'true'
            if (isActive !== undefined) where.isActive = isActive === 'true'

            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { displayName: { [Op.iLike]: `%${search}%` } },
                    { address: { [Op.iLike]: `%${search}%` } },
                ]
            }

            const offset = (parseInt(page) - 1) * parseInt(limit)

            const { count, rows: locations } = await Location.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                    { model: User, as: 'verifier', attributes: ['id', 'firstName', 'lastName'] },
                    { model: Landmark, as: 'landmarks' },
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'view_locations',
                resource: 'location',
                metadata: { filters: { search, city, state, type, isVerified, isActive } },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            res.json({
                success: true,
                data: {
                    locations,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        totalPages: Math.ceil(count / parseInt(limit)),
                    },
                    filters: { search, city, state, type, isVerified, isActive },
                },
            })
        } catch (error) {
            logger.error('Admin get all locations error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get locations',
                error: error.message,
            })
        }
    },

    // Create new location
    createLocation: async (req, res) => {
        try {
            const admin = req.admin
            const {
                name,
                displayName,
                description,
                type,
                address,
                city,
                state,
                country = 'Nigeria',
                latitude,
                longitude,
                googlePlaceId,
                isVerified = false,
                transportModes = [],
                accessibilityInfo = {},
                operatingHours = {},
            } = req.body

            // Check if location already exists nearby
            if (latitude && longitude) {
                const nearbyLocations = await Location.findByCoordinates(latitude, longitude, 0.1)
                if (nearbyLocations.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'A location already exists very close to these coordinates',
                        existingLocation: nearbyLocations[0],
                    })
                }
            }

            // Create location
            const location = await Location.create({
                name,
                displayName: displayName || name,
                description,
                type,
                address,
                city,
                state,
                country,
                latitude,
                longitude,
                googlePlaceId,
                isVerified,
                transportModes,
                accessibilityInfo,
                operatingHours,
                createdBy: null, // Admin created
                verifiedBy: isVerified ? admin.id : null,
                verifiedAt: isVerified ? new Date() : null,
            })

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'create_location',
                resource: 'location',
                resourceId: location.id,
                newValues: location.toJSON(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.status(201).json({
                success: true,
                message: 'Location created successfully',
                data: { location },
            })
        } catch (error) {
            logger.error('Admin create location error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create location',
                error: error.message,
            })
        }
    },

    // Update location
    updateLocation: async (req, res) => {
        try {
            const { locationId } = req.params
            const admin = req.admin
            const updates = req.body

            const location = await Location.findByPk(locationId)

            if (!location) {
                return res.status(404).json({
                    success: false,
                    message: 'Location not found',
                })
            }

            const oldValues = location.toJSON()

            // Update allowed fields
            const allowedUpdates = [
                'name', 'displayName', 'description', 'type', 'address',
                'city', 'state', 'country', 'latitude', 'longitude',
                'googlePlaceId', 'isVerified', 'isActive', 'transportModes',
                'accessibilityInfo', 'operatingHours'
            ]

            for (const field of allowedUpdates) {
                if (updates[field] !== undefined) {
                    location[field] = updates[field]
                }
            }

            // Set verification info if verifying
            if (updates.isVerified && !location.isVerified) {
                location.verifiedBy = admin.id
                location.verifiedAt = new Date()
            }

            location.lastModifiedBy = admin.id
            await location.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'update_location',
                resource: 'location',
                resourceId: location.id,
                oldValues,
                newValues: location.toJSON(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: 'Location updated successfully',
                data: { location },
            })
        } catch (error) {
            logger.error('Admin update location error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update location',
                error: error.message,
            })
        }
    },

    // Delete location
    deleteLocation: async (req, res) => {
        try {
            const { locationId } = req.params
            const admin = req.admin

            const location = await Location.findByPk(locationId)

            if (!location) {
                return res.status(404).json({
                    success: false,
                    message: 'Location not found',
                })
            }

            // Check if location is used in routes
            const routeCount = await Route.count({
                where: {
                    [Op.or]: [
                        { startLocationId: locationId },
                        { endLocationId: locationId },
                    ],
                },
            })

            if (routeCount > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot delete location: it is used in ${routeCount} route(s)`,
                })
            }

            const oldValues = location.toJSON()

            // Soft delete by setting isActive to false
            location.isActive = false
            location.lastModifiedBy = admin.id
            await location.save()

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'delete_location',
                resource: 'location',
                resourceId: location.id,
                oldValues,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            res.json({
                success: true,
                message: 'Location deleted successfully',
            })
        } catch (error) {
            logger.error('Admin delete location error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to delete location',
                error: error.message,
            })
        }
    },

    // Bulk verify locations
    bulkVerifyLocations: async (req, res) => {
        try {
            const { locationIds } = req.body
            const admin = req.admin

            if (!Array.isArray(locationIds) || locationIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Location IDs array is required',
                })
            }

            const updateResult = await Location.update(
                {
                    isVerified: true,
                    verifiedBy: admin.id,
                    verifiedAt: new Date(),
                    lastModifiedBy: admin.id,
                },
                {
                    where: {
                        id: { [Op.in]: locationIds },
                        isActive: true,
                    },
                }
            )

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'bulk_verify_locations',
                resource: 'location',
                metadata: { locationIds, updatedCount: updateResult[0] },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: `${updateResult[0]} locations verified successfully`,
                data: { updatedCount: updateResult[0] },
            })
        } catch (error) {
            logger.error('Admin bulk verify locations error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify locations',
                error: error.message,
            })
        }
    },

    // Import locations from Google Places
    importFromGooglePlaces: async (req, res) => {
        try {
            const { query, city, radius = 5000 } = req.body
            const admin = req.admin

            if (!query || !city) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query and city are required',
                })
            }

            // Get city center coordinates (you might want to store this in database)
            const cityCoords = await googleMapsService.geocode(`${city}, Nigeria`)
            
            if (!cityCoords.success || cityCoords.results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Could not find city coordinates',
                })
            }

            const centerLocation = cityCoords.results[0].location

            // Search Google Places
            const placesResult = await googleMapsService.searchPlaces(
                query,
                centerLocation,
                parseInt(radius)
            )

            if (!placesResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Google Places search failed',
                    error: placesResult.error,
                })
            }

            const importedLocations = []
            const errors = []

            // Import each place
            for (const place of placesResult.results) {
                try {
                    // Check if location already exists
                    const existing = await Location.findOne({
                        where: {
                            [Op.or]: [
                                { googlePlaceId: place.place_id },
                                {
                                    [Op.and]: [
                                        { name: place.name },
                                        { city },
                                    ],
                                },
                            ],
                        },
                    })

                    if (existing) {
                        continue // Skip existing locations
                    }

                    const location = await Location.create({
                        name: place.name,
                        displayName: place.name,
                        address: place.formatted_address,
                        city,
                        state: 'Nigeria', // You might want to extract this properly
                        country: 'Nigeria',
                        latitude: place.location.lat,
                        longitude: place.location.lng,
                        type: 'landmark', // Default type
                        googlePlaceId: place.place_id,
                        isVerified: true, // Auto-verify Google imports
                        verifiedBy: admin.id,
                        verifiedAt: new Date(),
                        metadata: {
                            googleRating: place.rating,
                            googleTypes: place.types,
                            importedBy: admin.id,
                            importedAt: new Date(),
                        },
                    })

                    importedLocations.push(location)
                } catch (error) {
                    errors.push({
                        place: place.name,
                        error: error.message,
                    })
                }
            }

            // Log admin action
            await AuditLog.create({
                adminId: admin.id,
                action: 'import_google_places',
                resource: 'location',
                metadata: {
                    query,
                    city,
                    radius,
                    importedCount: importedLocations.length,
                    errorCount: errors.length,
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            res.json({
                success: true,
                message: `Imported ${importedLocations.length} locations successfully`,
                data: {
                    importedLocations,
                    importedCount: importedLocations.length,
                    errors,
                    errorCount: errors.length,
                },
            })
        } catch (error) {
            logger.error('Admin import Google Places error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to import from Google Places',
                error: error.message,
            })
        }
    },
}

module.exports = locationController
