// services/navigation/locationService.js
const { Location, Landmark, GeographicBoundary } = require('../../models')
const googleMapsService = require('../external/googleMapsService')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

class LocationService {
    constructor() {
        this.cacheTimeout = 5 * 60 * 1000 // 5 minutes cache
        this.locationCache = new Map()
    }

    // Find or create location from various input formats
    async resolveLocation(locationInput) {
        try {
            // If it's a location ID
            if (typeof locationInput === 'string' && locationInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                return await this.getLocationById(locationInput)
            }

            // If it's a location object with ID
            if (locationInput.id) {
                return await this.getLocationById(locationInput.id)
            }

            // If it has coordinates
            if (locationInput.latitude && locationInput.longitude) {
                return await this.findOrCreateByCoordinates(
                    locationInput.latitude,
                    locationInput.longitude,
                    locationInput.name || locationInput.address
                )
            }

            // If it's an address string
            if (typeof locationInput === 'string') {
                return await this.findOrCreateByAddress(locationInput)
            }

            // If it's an object with address
            if (locationInput.address) {
                return await this.findOrCreateByAddress(locationInput.address)
            }

            throw new Error('Invalid location input format')
        } catch (error) {
            logger.error('Location resolution error:', error)
            return null
        }
    }

    // Get location by ID with caching
    async getLocationById(locationId) {
        try {
            // Check cache first
            const cacheKey = `location:${locationId}`
            if (this.locationCache.has(cacheKey)) {
                const cached = this.locationCache.get(cacheKey)
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.location
                }
            }

            const location = await Location.findByPk(locationId, {
                include: [
                    { model: Landmark, as: 'landmarks' },
                ],
            })

            if (location) {
                this.locationCache.set(cacheKey, {
                    location,
                    timestamp: Date.now(),
                })
            }

            return location
        } catch (error) {
            logger.error('Get location by ID error:', error)
            return null
        }
    }

    // Find nearby locations
    async findNearbyLocations(lat, lng, radiusKm = 1, options = {}) {
        try {
            const {
                type = null,
                isVerified = null,
                limit = 20,
                includeInactive = false,
            } = options

            const locations = await Location.findByCoordinates(lat, lng, radiusKm)

            // Apply filters
            let filteredLocations = locations

            if (type) {
                filteredLocations = filteredLocations.filter(loc => loc.type === type)
            }

            if (isVerified !== null) {
                filteredLocations = filteredLocations.filter(loc => loc.isVerified === isVerified)
            }

            if (!includeInactive) {
                filteredLocations = filteredLocations.filter(loc => loc.isActive)
            }

            return filteredLocations.slice(0, limit)
        } catch (error) {
            logger.error('Find nearby locations error:', error)
            return []
        }
    }

    // Search locations by name or address
    async searchLocations(query, options = {}) {
        try {
            const {
                city = null,
                state = null,
                type = null,
                limit = 20,
                includeGoogle = true,
            } = options

            // Search in database first
            let locations = await Location.searchByName(query, limit)

            // Apply filters
            if (city) {
                locations = locations.filter(loc => loc.city === city)
            }

            if (state) {
                locations = locations.filter(loc => loc.state === state)
            }

            if (type) {
                locations = locations.filter(loc => loc.type === type)
            }

            // If no results and Google is enabled, try Google Places
            if (locations.length === 0 && includeGoogle && googleMapsService.apiKey) {
                const googleResults = await googleMapsService.searchPlaces(query, null, 50000)
                
                if (googleResults.success) {
                    // Convert Google results to location format
                    locations = googleResults.results.map(place => ({
                        id: null,
                        name: place.name,
                        displayName: place.name,
                        address: place.formatted_address,
                        latitude: place.location.lat,
                        longitude: place.location.lng,
                        type: 'landmark',
                        googlePlaceId: place.place_id,
                        source: 'google',
                        isVerified: false,
                    }))
                }
            }

            return locations.slice(0, limit)
        } catch (error) {
            logger.error('Search locations error:', error)
            return []
        }
    }

    // Find or create location by coordinates
    async findOrCreateByCoordinates(lat, lng, name = null) {
        try {
            // Check for existing location nearby (within 100m)
            const nearbyLocations = await Location.findByCoordinates(lat, lng, 0.1)
            
            if (nearbyLocations.length > 0) {
                return nearbyLocations[0]
            }

            // Get address from Google Maps
            const geocodeResult = await googleMapsService.reverseGeocode(lat, lng)
            
            if (!geocodeResult.success || geocodeResult.results.length === 0) {
                throw new Error('Could not reverse geocode coordinates')
            }

            const result = geocodeResult.results[0]
            const addressComponents = this.parseAddressComponents(result.address_components)

            const location = await Location.create({
                name: name || this.extractLocationName(result),
                displayName: name || result.formatted_address,
                address: result.formatted_address,
                city: addressComponents.city || 'Unknown',
                state: addressComponents.state || 'Unknown',
                country: addressComponents.country || 'Nigeria',
                latitude: lat,
                longitude: lng,
                type: this.determineLocationType(result.types),
                googlePlaceId: result.place_id,
                isVerified: false,
                transportModes: this.determineTransportModes(result.types),
            })

            return location
        } catch (error) {
            logger.error('Find or create by coordinates error:', error)
            return null
        }
    }

    // Find or create location by address
    async findOrCreateByAddress(address) {
        try {
            // Search existing locations first
            const existingLocations = await Location.searchByName(address, 1)
            
            if (existingLocations.length > 0) {
                return existingLocations[0]
            }

            // Geocode the address
            const geocodeResult = await googleMapsService.geocode(address, 'country:NG')
            
            if (!geocodeResult.success || geocodeResult.results.length === 0) {
                throw new Error('Could not geocode address')
            }

            const result = geocodeResult.results[0]
            const location = result.geometry.location
            const addressComponents = this.parseAddressComponents(result.address_components)

            const newLocation = await Location.create({
                name: this.extractLocationName(result),
                displayName: result.formatted_address,
                address: result.formatted_address,
                city: addressComponents.city || 'Unknown',
                state: addressComponents.state || 'Unknown',
                country: addressComponents.country || 'Nigeria',
                latitude: location.lat,
                longitude: location.lng,
                type: this.determineLocationType(result.types),
                googlePlaceId: result.place_id,
                isVerified: false,
                transportModes: this.determineTransportModes(result.types),
            })

            return newLocation
        } catch (error) {
            logger.error('Find or create by address error:', error)
            return null
        }
    }

    // Get location with landmarks
    async getLocationWithLandmarks(locationId) {
        try {
            const location = await Location.findByPk(locationId, {
                include: [
                    {
                        model: Landmark,
                        as: 'landmarks',
                        where: { isActive: true },
                        required: false,
                    },
                ],
            })

            return location
        } catch (error) {
            logger.error('Get location with landmarks error:', error)
            return null
        }
    }

    // Get prominent landmarks near location
    async getNearbyLandmarks(lat, lng, radiusKm = 1) {
        try {
            const nearbyLocations = await this.findNearbyLocations(lat, lng, radiusKm, {
                type: 'landmark',
                limit: 50,
            })

            const locationIds = nearbyLocations.map(loc => loc.id)

            const landmarks = await Landmark.findAll({
                where: {
                    locationId: { [Op.in]: locationIds },
                    isActive: true,
                },
                order: [
                    ['isProminent', 'DESC'],
                    ['safetyRating', 'DESC'],
                ],
                limit: 10,
            })

            return landmarks
        } catch (error) {
            logger.error('Get nearby landmarks error:', error)
            return []
        }
    }

    // Helper methods
    parseAddressComponents(components) {
        const result = {
            city: null,
            state: null,
            country: null,
        }

        components.forEach(component => {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                result.city = component.long_name
            } else if (component.types.includes('administrative_area_level_1')) {
                result.state = component.long_name
            } else if (component.types.includes('country')) {
                result.country = component.long_name
            }
        })

        return result
    }

    extractLocationName(geocodeResult) {
        const components = geocodeResult.address_components
        
        for (const component of components) {
            if (component.types.includes('establishment') || 
                component.types.includes('point_of_interest') ||
                component.types.includes('premise')) {
                return component.long_name
            }
        }

        for (const component of components) {
            if (component.types.includes('route') || 
                component.types.includes('sublocality')) {
                return component.long_name
            }
        }

        return geocodeResult.formatted_address.split(',')[0]
    }

    determineLocationType(types) {
        const typeMapping = {
            'bus_station': 'bus_stop',
            'transit_station': 'transport_hub',
            'establishment': 'commercial',
            'point_of_interest': 'landmark',
            'airport': 'airport',
            'government': 'government',
        }

        for (const type of types) {
            if (typeMapping[type]) {
                return typeMapping[type]
            }
        }

        return 'residential'
    }

    determineTransportModes(types) {
        const modes = []
        
        if (types.includes('bus_station') || types.includes('transit_station')) {
            modes.push('bus')
        }
        
        modes.push('walking', 'taxi')
        
        if (types.includes('establishment') || types.includes('commercial')) {
            modes.push('keke_napep')
        }

        return modes.length > 0 ? modes : ['walking', 'taxi']
    }

    // Clear cache
    clearCache() {
        this.locationCache.clear()
    }
}

module.exports = new LocationService()