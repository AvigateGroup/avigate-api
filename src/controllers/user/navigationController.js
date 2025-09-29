// controllers/user/navigationController.js
const routePlanningService = require('../../services/navigation/routePlanningService')
const googleMapsService = require('../../services/external/googleMapsService')
const { Location, Route, RouteStep, SearchLog, UserInteraction } = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const navigationController = {
    // Plan route between two locations
    planRoute: async (req, res) => {
        try {
            const user = req.user
            const {
                startLocation,
                endLocation,
                transportModes,
                preferences = {},
                maxAlternatives = 3,
                includeRealTime = true,
            } = req.body

            // Validate input
            if (!startLocation || !endLocation) {
                return res.status(400).json({
                    success: false,
                    message: 'Start and end locations are required',
                })
            }

            // Log user interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'route_planning',
                resourceType: 'route',
                interactionData: {
                    startLocation,
                    endLocation,
                    transportModes,
                    preferences,
                },
                userLat: startLocation.latitude,
                userLng: startLocation.longitude,
                ipAddress: req.ip,
                deviceInfo: req.get('User-Agent'),
            })

            // Plan the route
            const routeResult = await routePlanningService.planRoute(
                startLocation,
                endLocation,
                {
                    transportModes,
                    maxAlternatives,
                    includeRealTime,
                    userPreferences: preferences,
                }
            )

            if (!routeResult.success) {
                return res.status(404).json({
                    success: false,
                    message: routeResult.error || 'No routes found',
                })
            }

            // Log successful search
            await SearchLog.create({
                userId: user?.id,
                sessionId: req.sessionID,
                searchQuery: `${startLocation.name || startLocation.address} to ${endLocation.name || endLocation.address}`,
                searchType: 'route_planning',
                searchFilters: { transportModes, preferences },
                userLat: startLocation.latitude,
                userLng: startLocation.longitude,
                resultsCount: routeResult.routes.length,
                resultIds: routeResult.routes.map(r => r.id),
                wasSuccessful: true,
                responseTimeMs: Date.now() - req.startTime,
                ipAddress: req.ip,
            })

            // Update location popularity if they exist in database
            if (routeResult.startLocation?.id) {
                await routeResult.startLocation.incrementPopularity()
            }
            if (routeResult.endLocation?.id) {
                await routeResult.endLocation.incrementPopularity()
            }

            res.json({
                success: true,
                message: 'Routes found successfully',
                data: {
                    routes: routeResult.routes,
                    startLocation: routeResult.startLocation,
                    endLocation: routeResult.endLocation,
                    searchMetadata: routeResult.metadata,
                },
            })
        } catch (error) {
            logger.error('Route planning error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to plan route',
                error: error.message,
            })
        }
    },

    // Get detailed route information
    getRouteDetails: async (req, res) => {
        try {
            const { routeId } = req.params
            const user = req.user

            const route = await Route.findByPk(routeId, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                    {
                        model: RouteStep,
                        as: 'steps',
                        include: [
                            { model: Location, as: 'fromLocation' },
                            { model: Location, as: 'toLocation' },
                        ],
                        order: [['stepNumber', 'ASC']],
                    },
                ],
            })

            if (!route || !route.isActive) {
                return res.status(404).json({
                    success: false,
                    message: 'Route not found',
                })
            }

            // Log route view
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'route_view',
                resourceId: routeId,
                resourceType: 'route',
                ipAddress: req.ip,
            })

            // Update route last used and popularity
            await route.updateLastUsed()

            res.json({
                success: true,
                data: {
                    route: route.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Get route details error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get route details',
                error: error.message,
            })
        }
    },

    // Search for locations
    searchLocations: async (req, res) => {
        try {
            const user = req.user
            const {
                query,
                lat,
                lng,
                radius = 10000,
                type,
                limit = 20,
            } = req.query

            if (!query && !lat && !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query or coordinates are required',
                })
            }

            let locations = []

            // Log search
            await SearchLog.create({
                userId: user?.id,
                sessionId: req.sessionID,
                searchQuery: query || `${lat},${lng}`,
                searchType: 'location_search',
                searchFilters: { type, radius, limit },
                userLat: lat ? parseFloat(lat) : null,
                userLng: lng ? parseFloat(lng) : null,
                wasSuccessful: true,
                ipAddress: req.ip,
            })

            if (query) {
                // Text-based search
                locations = await Location.searchByName(query, parseInt(limit))

                // If no local results, try Google Places
                if (locations.length === 0 && googleMapsService.apiKey) {
                    const googleResult = await googleMapsService.searchPlaces(
                        query,
                        lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
                        parseInt(radius)
                    )

                    if (googleResult.success) {
                        locations = googleResult.results.map(place => ({
                            id: null,
                            name: place.name,
                            displayName: place.name,
                            address: place.formatted_address,
                            latitude: place.location.lat,
                            longitude: place.location.lng,
                            type: 'landmark',
                            googlePlaceId: place.place_id,
                            source: 'google_places',
                            rating: place.rating,
                        }))
                    }
                }
            } else if (lat && lng) {
                // Location-based search
                locations = await Location.findByCoordinates(
                    parseFloat(lat),
                    parseFloat(lng),
                    parseInt(radius) / 1000 // Convert to km
                )

                if (type) {
                    locations = locations.filter(loc => loc.type === type)
                }

                locations = locations.slice(0, parseInt(limit))
            }

            // Update search log with results
            await SearchLog.update(
                {
                    resultsCount: locations.length,
                    resultIds: locations.filter(l => l.id).map(l => l.id),
                },
                {
                    where: {
                        userId: user?.id,
                        sessionId: req.sessionID,
                        createdAt: {
                            [Op.gte]: new Date(Date.now() - 5000), // Last 5 seconds
                        },
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1,
                }
            )

            res.json({
                success: true,
                data: {
                    locations,
                    searchQuery: query,
                    searchCenter: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
                    radius: parseInt(radius),
                },
            })
        } catch (error) {
            logger.error('Location search error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to search locations',
                error: error.message,
            })
        }
    },

    // Get nearby locations
    getNearbyLocations: async (req, res) => {
        try {
            const user = req.user
            const {
                lat,
                lng,
                radius = 5000,
                type,
                limit = 20,
            } = req.query

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required',
                })
            }

            const latitude = parseFloat(lat)
            const longitude = parseFloat(lng)
            const radiusKm = parseInt(radius) / 1000

            // Find nearby locations in database
            let locations = await Location.findByCoordinates(latitude, longitude, radiusKm)

            // Filter by type if specified
            if (type) {
                locations = locations.filter(loc => loc.type === type)
            }

            // Limit results
            locations = locations.slice(0, parseInt(limit))

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'location_search',
                resourceType: 'location',
                interactionData: { type, radius },
                userLat: latitude,
                userLng: longitude,
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    locations,
                    center: { latitude, longitude },
                    radiusMeters: parseInt(radius),
                    total: locations.length,
                },
            })
        } catch (error) {
            logger.error('Get nearby locations error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get nearby locations',
                error: error.message,
            })
        }
    },

    // Get popular routes
    getPopularRoutes: async (req, res) => {
        try {
            const user = req.user
            const {
                city,
                transportMode,
                limit = 10,
            } = req.query

            const routes = await Route.getPopularRoutes(parseInt(limit), city)

            // Filter by transport mode if specified
            let filteredRoutes = routes
            if (transportMode) {
                filteredRoutes = routes.filter(route => route.transportMode === transportMode)
            }

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'popular_routes_view',
                resourceType: 'route',
                interactionData: { city, transportMode, limit },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    routes: filteredRoutes,
                    filters: { city, transportMode },
                    total: filteredRoutes.length,
                },
            })
        } catch (error) {
            logger.error('Get popular routes error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get popular routes',
                error: error.message,
            })
        }
    },

    // Geocode address
    geocodeAddress: async (req, res) => {
        try {
            const { address } = req.body
            const user = req.user

            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'Address is required',
                })
            }

            // Try local database first
            const localResults = await Location.searchByName(address, 5)
            
            let results = localResults.map(loc => ({
                formatted_address: loc.getFullAddress(),
                location: {
                    lat: parseFloat(loc.latitude),
                    lng: parseFloat(loc.longitude),
                },
                place_id: loc.googlePlaceId,
                source: 'database',
                name: loc.name,
                type: loc.type,
            }))

            // If no local results, use Google Geocoding
            if (results.length === 0 && googleMapsService.apiKey) {
                const geocodeResult = await googleMapsService.geocode(address, 'country:NG')
                
                if (geocodeResult.success) {
                    results = geocodeResult.results.map(result => ({
                        formatted_address: result.formatted_address,
                        location: result.location,
                        place_id: result.place_id,
                        source: 'google_maps',
                        types: result.types,
                        partial_match: result.partial_match,
                    }))
                }
            }

            // Log geocoding request
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'geocoding',
                resourceType: 'address',
                interactionData: { address, resultsCount: results.length },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    results,
                    query: address,
                    total: results.length,
                },
            })
        } catch (error) {
            logger.error('Geocoding error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to geocode address',
                error: error.message,
            })
        }
    },

    // Reverse geocode coordinates
    reverseGeocode: async (req, res) => {
        try {
            const { lat, lng } = req.query
            const user = req.user

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required',
                })
            }

            const latitude = parseFloat(lat)
            const longitude = parseFloat(lng)

            // Try to find nearby locations in database first
            const nearbyLocations = await Location.findByCoordinates(latitude, longitude, 0.1)
            
            let results = []

            if (nearbyLocations.length > 0) {
                const closest = nearbyLocations[0]
                results.push({
                    formatted_address: closest.getFullAddress(),
                    location: { lat: latitude, lng: longitude },
                    place_id: closest.googlePlaceId,
                    source: 'database',
                    name: closest.name,
                    type: closest.type,
                })
            }

            // Use Google reverse geocoding for more detailed address
            if (googleMapsService.apiKey) {
                const reverseResult = await googleMapsService.reverseGeocode(latitude, longitude)
                
                if (reverseResult.success) {
                    const googleResults = reverseResult.results.map(result => ({
                        formatted_address: result.formatted_address,
                        location: { lat: latitude, lng: longitude },
                        place_id: result.place_id,
                        source: 'google_maps',
                        types: result.types,
                        address_components: result.address_components,
                    }))
                    
                    results = results.concat(googleResults)
                }
            }

            // Log reverse geocoding request
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'reverse_geocoding',
                resourceType: 'coordinates',
                userLat: latitude,
                userLng: longitude,
                interactionData: { resultsCount: results.length },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    results,
                    coordinates: { latitude, longitude },
                    total: results.length,
                },
            })
        } catch (error) {
            logger.error('Reverse geocoding error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to reverse geocode coordinates',
                error: error.message,
            })
        }
    },

    // Get route alternatives
    getRouteAlternatives: async (req, res) => {
        try {
            const { routeId } = req.params
            const user = req.user

            const originalRoute = await Route.findByPk(routeId, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                ],
            })

            if (!originalRoute) {
                return res.status(404).json({
                    success: false,
                    message: 'Original route not found',
                })
            }

            // Find alternative routes
            const alternatives = await Route.findAlternativeRoutes(
                originalRoute.startLocationId,
                originalRoute.endLocationId,
                routeId
            )

            // Generate new alternatives if needed
            const routeResult = await routePlanningService.planRoute(
                originalRoute.startLocation,
                originalRoute.endLocation,
                {
                    transportModes: ['bus', 'taxi', 'keke_napep', 'walking'],
                    maxAlternatives: 5,
                    includeRealTime: true,
                }
            )

            let allAlternatives = alternatives
            if (routeResult.success) {
                allAlternatives = allAlternatives.concat(
                    routeResult.routes.filter(r => r.id !== routeId)
                )
            }

            // Remove duplicates and limit results
            const uniqueAlternatives = allAlternatives
                .filter((route, index, self) => 
                    index === self.findIndex(r => r.id === route.id || 
                        (r.transportMode === route.transportMode && 
                         r.startLocationId === route.startLocationId &&
                         r.endLocationId === route.endLocationId)
                    )
                )
                .slice(0, 5)

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'route_alternatives',
                resourceId: routeId,
                resourceType: 'route',
                interactionData: { alternativesFound: uniqueAlternatives.length },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    originalRoute: originalRoute.toJSON(),
                    alternatives: uniqueAlternatives,
                    total: uniqueAlternatives.length,
                },
            })
        } catch (error) {
            logger.error('Get route alternatives error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get route alternatives',
                error: error.message,
            })
        }
    },
}

module.exports = navigationController