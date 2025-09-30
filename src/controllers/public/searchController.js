// controllers/public/searchController.js
const {
    Location,
    Route,
    Landmark,
    SearchLog,
} = require('../../models')
const googleMapsService = require('../../services/external/googleMapsService')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const searchController = {
    // Universal search endpoint
    search: async (req, res) => {
        try {
            const {
                query,
                type, // 'location', 'route', 'landmark', 'all'
                lat,
                lng,
                radius = 10000,
                limit = 20,
            } = req.query

            if (!query || query.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters',
                })
            }

            const searchType = type || 'all'
            const results = {
                locations: [],
                routes: [],
                landmarks: [],
                query,
            }

            // Search locations
            if (searchType === 'all' || searchType === 'location') {
                results.locations = await Location.searchByName(query, parseInt(limit))
                
                // If no local results and lat/lng provided, search Google Places
                if (results.locations.length === 0 && lat && lng && googleMapsService.apiKey) {
                    const googleResult = await googleMapsService.searchPlaces(
                        query,
                        { lat: parseFloat(lat), lng: parseFloat(lng) },
                        parseInt(radius)
                    )
                    
                    if (googleResult.success) {
                        results.locations = googleResult.results.map(place => ({
                            id: null,
                            name: place.name,
                            displayName: place.name,
                            address: place.formatted_address,
                            latitude: place.location.lat,
                            longitude: place.location.lng,
                            type: 'landmark',
                            source: 'google_places',
                            googlePlaceId: place.place_id,
                        }))
                    }
                }
            }

            // Search routes
            if (searchType === 'all' || searchType === 'route') {
                results.routes = await Route.searchRoutes(query, parseInt(limit))
            }

            // Search landmarks
            if (searchType === 'all' || searchType === 'landmark') {
                results.landmarks = await Landmark.searchByName(query, parseInt(limit))
            }

            // Calculate total results
            const totalResults = 
                results.locations.length + 
                results.routes.length + 
                results.landmarks.length

            // Log search
            await SearchLog.create({
                userId: null, // Public search
                sessionId: req.sessionID,
                searchQuery: query,
                searchType: 'universal_search',
                searchFilters: { type: searchType, radius },
                userLat: lat ? parseFloat(lat) : null,
                userLng: lng ? parseFloat(lng) : null,
                resultsCount: totalResults,
                wasSuccessful: totalResults > 0,
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    ...results,
                    totalResults,
                    searchType,
                },
            })
        } catch (error) {
            logger.error('Universal search error:', error)
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message,
            })
        }
    },

    // Autocomplete search
    autocomplete: async (req, res) => {
        try {
            const { query, lat, lng } = req.query

            if (!query || query.length < 2) {
                return res.json({
                    success: true,
                    data: { suggestions: [] },
                })
            }

            const suggestions = []

            // Get location suggestions from database
            const locations = await Location.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: `${query}%` } },
                        { displayName: { [Op.iLike]: `${query}%` } },
                    ],
                    isActive: true,
                },
                order: [['popularityScore', 'DESC']],
                limit: 5,
                attributes: ['id', 'name', 'displayName', 'address', 'type', 'city'],
            })

            suggestions.push(...locations.map(loc => ({
                id: loc.id,
                text: loc.displayName || loc.name,
                description: `${loc.city} - ${loc.type}`,
                type: 'location',
                source: 'database',
            })))

            // Get Google Places autocomplete if available and not enough results
            if (suggestions.length < 5 && lat && lng && googleMapsService.apiKey) {
                const placesResult = await googleMapsService.searchPlaces(
                    query,
                    { lat: parseFloat(lat), lng: parseFloat(lng) },
                    5000
                )
                
                if (placesResult.success) {
                    const googleSuggestions = placesResult.results
                        .slice(0, 5 - suggestions.length)
                        .map(place => ({
                            id: null,
                            text: place.name,
                            description: place.formatted_address,
                            type: 'location',
                            source: 'google_places',
                            googlePlaceId: place.place_id,
                        }))
                    
                    suggestions.push(...googleSuggestions)
                }
            }

            res.json({
                success: true,
                data: {
                    suggestions,
                    query,
                },
            })
        } catch (error) {
            logger.error('Autocomplete search error:', error)
            res.status(500).json({
                success: false,
                message: 'Autocomplete failed',
                error: error.message,
            })
        }
    },

    // Get popular searches
    getPopularSearches: async (req, res) => {
        try {
            const { city, limit = 10 } = req.query

            // Get most popular searches from the last 30 days
            const popularSearches = await SearchLog.findAll({
                where: {
                    wasSuccessful: true,
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
                attributes: [
                    'searchQuery',
                    [SearchLog.sequelize.fn('COUNT', SearchLog.sequelize.col('id')), 'searchCount'],
                ],
                group: ['searchQuery'],
                order: [[SearchLog.sequelize.fn('COUNT', SearchLog.sequelize.col('id')), 'DESC']],
                limit: parseInt(limit),
                raw: true,
            })

            res.json({
                success: true,
                data: {
                    popularSearches,
                    filters: { city },
                },
            })
        } catch (error) {
            logger.error('Get popular searches error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get popular searches',
                error: error.message,
            })
        }
    },
}

module.exports = searchController