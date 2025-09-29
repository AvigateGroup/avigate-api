// services/navigation/routePlanningService.js
const googleMapsService = require('../external/googleMapsService')
const { Location, Route, RouteStep, Vehicle, VehicleAvailability } = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

class RoutePlanningService {
    constructor() {
        this.maxWalkingDistance = 2.0 // km
        this.maxSearchRadius = 10.0 // km
        this.defaultModes = ['bus', 'taxi', 'keke_napep', 'walking']
    }

    // Main route planning method
    async planRoute(startLocation, endLocation, options = {}) {
        try {
            const {
                transportModes = this.defaultModes,
                maxAlternatives = 3,
                preferVerified = true,
                includeRealTime = true,
                userPreferences = {},
            } = options

            logger.info(`Planning route from ${JSON.stringify(startLocation)} to ${JSON.stringify(endLocation)}`)

            // 1. Find or create locations
            const startLoc = await this.findOrCreateLocation(startLocation)
            const endLoc = await this.findOrCreateLocation(endLocation)

            if (!startLoc || !endLoc) {
                throw new Error('Could not resolve start or end location')
            }

            // 2. Find existing routes
            const existingRoutes = await this.findExistingRoutes(startLoc.id, endLoc.id, transportModes)

            // 3. Generate new route options using Google Maps
            const googleRoutes = await this.generateGoogleMapsRoutes(startLoc, endLoc, transportModes)

            // 4. Combine and rank routes
            const allRoutes = await this.combineAndRankRoutes(existingRoutes, googleRoutes, userPreferences)

            // 5. Add real-time information
            let enhancedRoutes = allRoutes
            if (includeRealTime) {
                enhancedRoutes = await this.addRealTimeInfo(allRoutes)
            }

            // 6. Limit to max alternatives
            const finalRoutes = enhancedRoutes.slice(0, maxAlternatives)

            return {
                success: true,
                routes: finalRoutes,
                startLocation: startLoc,
                endLocation: endLoc,
                metadata: {
                    searchRadius: this.maxSearchRadius,
                    transportModes,
                    totalOptions: allRoutes.length,
                    includesRealTime: includeRealTime,
                },
            }
        } catch (error) {
            logger.error('Route planning error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Find or create location from input
    async findOrCreateLocation(locationInput) {
        try {
            // If it's already a location object with ID
            if (locationInput.id) {
                return await Location.findByPk(locationInput.id)
            }

            // If it has coordinates, search nearby first
            if (locationInput.latitude && locationInput.longitude) {
                const nearbyLocations = await Location.findByCoordinates(
                    locationInput.latitude,
                    locationInput.longitude,
                    0.1 // 100m radius
                )

                if (nearbyLocations.length > 0) {
                    return nearbyLocations[0]
                }

                // If no nearby location found, create new one
                return await this.createLocationFromCoordinates(
                    locationInput.latitude,
                    locationInput.longitude,
                    locationInput.name || locationInput.address
                )
            }

            // If it's an address string, geocode it
            if (typeof locationInput === 'string' || locationInput.address) {
                const address = typeof locationInput === 'string' ? locationInput : locationInput.address
                return await this.createLocationFromAddress(address)
            }

            throw new Error('Invalid location input format')
        } catch (error) {
            logger.error('Location resolution error:', error)
            return null
        }
    }

    // Create location from coordinates
    async createLocationFromCoordinates(lat, lng, name = null) {
        try {
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
                city: addressComponents.city,
                state: addressComponents.state,
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
            logger.error('Error creating location from coordinates:', error)
            throw error
        }
    }

    // Create location from address
    async createLocationFromAddress(address) {
        try {
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
                city: addressComponents.city,
                state: addressComponents.state,
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
            logger.error('Error creating location from address:', error)
            throw error
        }
    }

    // Find existing routes in database
    async findExistingRoutes(startLocationId, endLocationId, transportModes) {
        try {
            const routes = await Route.findAll({
                where: {
                    [Op.or]: [
                        { startLocationId, endLocationId },
                        { startLocationId: endLocationId, endLocationId: startLocationId }, // Reverse direction
                    ],
                    transportMode: { [Op.in]: transportModes },
                    isActive: true,
                },
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
                    },
                ],
                order: [
                    ['isVerified', 'DESC'],
                    ['popularityScore', 'DESC'],
                    ['safetyRating', 'DESC'],
                    [{ model: RouteStep, as: 'steps' }, 'stepNumber', 'ASC'],
                ],
            })

            // Convert to standardized format
            return routes.map(route => this.formatRouteResponse(route))
        } catch (error) {
            logger.error('Error finding existing routes:', error)
            return []
        }
    }

    // Generate routes using Google Maps
    async generateGoogleMapsRoutes(startLocation, endLocation, transportModes) {
        try {
            const routes = []

            // Generate routes for each transport mode
            for (const mode of transportModes) {
                if (mode === 'walking') {
                    // Check if walking distance is reasonable
                    const distance = googleMapsService.calculateDistance(
                        startLocation.latitude,
                        startLocation.longitude,
                        endLocation.latitude,
                        endLocation.longitude
                    )

                    if (distance <= this.maxWalkingDistance) {
                        const walkingRoute = await this.generateWalkingRoute(startLocation, endLocation)
                        if (walkingRoute) routes.push(walkingRoute)
                    }
                } else if (mode === 'bus') {
                    const transitRoute = await this.generateTransitRoute(startLocation, endLocation)
                    if (transitRoute) routes.push(transitRoute)
                } else {
                    const drivingRoute = await this.generateDrivingRoute(startLocation, endLocation, mode)
                    if (drivingRoute) routes.push(drivingRoute)
                }
            }

            return routes
        } catch (error) {
            logger.error('Error generating Google Maps routes:', error)
            return []
        }
    }

    // Generate walking route
    async generateWalkingRoute(startLocation, endLocation) {
        try {
            const directionsResult = await googleMapsService.getDirections(
                { lat: startLocation.latitude, lng: startLocation.longitude },
                { lat: endLocation.latitude, lng: endLocation.longitude },
                'walking'
            )

            if (!directionsResult.success || directionsResult.routes.length === 0) {
                return null
            }

            const route = directionsResult.routes[0]
            const leg = route.legs[0]

            return {
                id: `walking_${Date.now()}`,
                type: 'generated',
                transportMode: 'walking',
                name: `Walking from ${startLocation.name} to ${endLocation.name}`,
                startLocation,
                endLocation,
                distanceKm: leg.distance.value / 1000,
                estimatedDuration: Math.ceil(leg.duration.value / 60),
                safetyRating: 7.0,
                difficultyLevel: 2,
                fareInfo: { min: 0, max: 0, currency: 'NGN' },
                steps: this.convertGoogleStepsToRouteSteps(leg.steps, 'walking'),
                source: 'google_maps',
                isVerified: false,
                metadata: {
                    googleRoute: route,
                },
            }
        } catch (error) {
            logger.error('Error generating walking route:', error)
            return null
        }
    }

    // Generate transit route (bus)
    async generateTransitRoute(startLocation, endLocation) {
        try {
            const directionsResult = await googleMapsService.getDirections(
                { lat: startLocation.latitude, lng: startLocation.longitude },
                { lat: endLocation.latitude, lng: endLocation.longitude },
                'transit',
                true,
                {
                    transit_mode: 'bus',
                    transit_routing_preference: 'less_walking',
                }
            )

            if (!directionsResult.success || directionsResult.routes.length === 0) {
                return null
            }

            const route = directionsResult.routes[0]
            const leg = route.legs[0]

            return {
                id: `transit_${Date.now()}`,
                type: 'generated',
                transportMode: 'bus',
                name: `Transit from ${startLocation.name} to ${endLocation.name}`,
                startLocation,
                endLocation,
                distanceKm: leg.distance.value / 1000,
                estimatedDuration: Math.ceil(leg.duration.value / 60),
                safetyRating: 6.0,
                difficultyLevel: 3,
                fareInfo: route.fare ? {
                    min: route.fare.value * 0.8,
                    max: route.fare.value * 1.2,
                    currency: route.fare.currency,
                } : { min: 100, max: 500, currency: 'NGN' },
                steps: this.convertGoogleStepsToRouteSteps(leg.steps, 'bus'),
                source: 'google_maps',
                isVerified: false,
                metadata: {
                    googleRoute: route,
                },
            }
        } catch (error) {
            logger.error('Error generating transit route:', error)
            return null
        }
    }

    // Generate driving route (for taxi, keke, etc.)
    async generateDrivingRoute(startLocation, endLocation, mode) {
        try {
            const directionsResult = await googleMapsService.getDirections(
                { lat: startLocation.latitude, lng: startLocation.longitude },
                { lat: endLocation.latitude, lng: endLocation.longitude },
                'driving'
            )

            if (!directionsResult.success || directionsResult.routes.length === 0) {
                return null
            }

            const route = directionsResult.routes[0]
            const leg = route.legs[0]
            const distance = leg.distance.value / 1000

            // Estimate fare based on mode and distance
            const fareEstimate = this.estimateFare(mode, distance)

            return {
                id: `${mode}_${Date.now()}`,
                type: 'generated',
                transportMode: mode,
                name: `${mode.replace('_', ' ')} from ${startLocation.name} to ${endLocation.name}`,
                startLocation,
                endLocation,
                distanceKm: distance,
                estimatedDuration: Math.ceil(leg.duration.value / 60),
                safetyRating: this.getSafetyRatingForMode(mode),
                difficultyLevel: 2,
                fareInfo: fareEstimate,
                steps: this.convertGoogleStepsToRouteSteps(leg.steps, mode),
                source: 'google_maps',
                isVerified: false,
                metadata: {
                    googleRoute: route,
                },
            }
        } catch (error) {
            logger.error(`Error generating ${mode} route:`, error)
            return null
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
        // Try to extract a meaningful name from the geocode result
        const components = geocodeResult.address_components
        
        // Look for establishment, point_of_interest, or premise
        for (const component of components) {
            if (component.types.includes('establishment') || 
                component.types.includes('point_of_interest') ||
                component.types.includes('premise')) {
                return component.long_name
            }
        }

        // Fallback to route or sublocality
        for (const component of components) {
            if (component.types.includes('route') || 
                component.types.includes('sublocality')) {
                return component.long_name
            }
        }

        // Final fallback to formatted address
        return geocodeResult.formatted_address.split(',')[0]
    }

    determineLocationType(types) {
        const typeMapping = {
            'bus_station': 'bus_stop',
            'transit_station': 'transport_hub',
            'establishment': 'commercial',
            'point_of_interest': 'landmark',
            'airport': 'airport',
            'hospital': 'commercial',
            'school': 'commercial',
            'university': 'commercial',
            'shopping_mall': 'commercial',
            'government': 'government',
        }

        for (const type of types) {
            if (typeMapping[type]) {
                return typeMapping[type]
            }
        }

        return 'residential' // default
    }

    determineTransportModes(types) {
        const modes = []
        
        if (types.includes('bus_station') || types.includes('transit_station')) {
            modes.push('bus')
        }
        
        // Most locations support walking and taxi
        modes.push('walking', 'taxi')
        
        // Commercial areas often have keke napep
        if (types.includes('establishment') || types.includes('commercial')) {
            modes.push('keke_napep')
        }

        return modes.length > 0 ? modes : ['walking', 'taxi']
    }

    estimateFare(mode, distanceKm) {
        const fareRates = {
            taxi: { base: 200, perKm: 100 },
            keke_napep: { base: 100, perKm: 50 },
            okada: { base: 100, perKm: 30 },
            car: { base: 300, perKm: 120 },
        }

        const rates = fareRates[mode] || fareRates.taxi
        const baseFare = rates.base + (distanceKm * rates.perKm)

        return {
            min: Math.round(baseFare * 0.8),
            max: Math.round(baseFare * 1.3),
            currency: 'NGN',
            type: 'negotiable',
        }
    }

    getSafetyRatingForMode(mode) {
        const ratings = {
            bus: 7.0,
            taxi: 6.5,
            keke_napep: 6.0,
            okada: 5.5,
            walking: 7.0,
            car: 8.0,
        }

        return ratings[mode] || 6.0
    }

    convertGoogleStepsToRouteSteps(steps, transportMode) {
        return steps.map((step, index) => ({
            stepNumber: index + 1,
            transportMode: step.travel_mode?.toLowerCase() || transportMode,
            instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || `Continue ${transportMode}`,
            distanceKm: step.distance.value / 1000,
            estimatedDuration: Math.ceil(step.duration.value / 60),
            fromLocation: {
                latitude: step.start_location.lat,
                longitude: step.start_location.lng,
            },
            toLocation: {
                latitude: step.end_location.lat,
                longitude: step.end_location.lng,
            },
            metadata: {
                googleStep: step,
            },
        }))
    }

    formatRouteResponse(route) {
        return {
            id: route.id,
            type: 'existing',
            transportMode: route.transportMode,
            name: route.name,
            description: route.description,
            startLocation: route.startLocation,
            endLocation: route.endLocation,
            distanceKm: parseFloat(route.distanceKm),
            estimatedDuration: route.estimatedDuration,
            safetyRating: parseFloat(route.safetyRating),
            difficultyLevel: route.difficultyLevel,
            popularityScore: route.popularityScore,
            fareInfo: route.fareInfo,
            isVerified: route.isVerified,
            steps: route.steps || [],
            source: 'database',
            lastUsed: route.lastUsed,
        }
    }

    combineAndRankRoutes(existingRoutes, googleRoutes, userPreferences = {}) {
        const allRoutes = [...existingRoutes, ...googleRoutes]
        
        // Score routes based on various factors
        return allRoutes
            .map(route => ({
                ...route,
                score: this.calculateRouteScore(route, userPreferences),
            }))
            .sort((a, b) => b.score - a.score)
    }

    calculateRouteScore(route, userPreferences) {
        let score = 50 // Base score

        // Verified routes get higher score
        if (route.isVerified) score += 20

        // Popularity bonus
        if (route.popularityScore) {
            score += Math.min(route.popularityScore / 10, 15)
        }

        // Safety rating bonus
        if (route.safetyRating) {
            score += (route.safetyRating - 5) * 3
        }

        // Duration penalty (prefer shorter routes)
        if (route.estimatedDuration) {
            score -= Math.min(route.estimatedDuration / 10, 20)
        }

        // User preferences
        if (userPreferences.preferredModes && userPreferences.preferredModes.includes(route.transportMode)) {
            score += 10
        }

        if (userPreferences.maxFare && route.fareInfo?.max && route.fareInfo.max > userPreferences.maxFare) {
            score -= 15
        }

        return Math.max(0, score)
    }

    async addRealTimeInfo(routes) {
        // Add real-time vehicle availability info
        for (const route of routes) {
            try {
                // Find available vehicles for this route
                const availableVehicles = await VehicleAvailability.findAll({
                    where: {
                        isActive: true,
                        expiresAt: { [Op.gt]: new Date() },
                    },
                    include: [
                        {
                            model: Vehicle,
                            as: 'vehicle',
                            where: {
                                vehicleType: route.transportMode,
                                status: 'active',
                            },
                        },
                        {
                            model: Location,
                            as: 'location',
                        },
                    ],
                })

                route.realTimeInfo = {
                    availableVehicles: availableVehicles.length,
                    nearbyVehicles: availableVehicles.slice(0, 3), // Top 3 closest
                    lastUpdated: new Date(),
                }
            } catch (error) {
                logger.error(`Error adding real-time info for route ${route.id}:`, error)
                route.realTimeInfo = {
                    availableVehicles: 0,
                    nearbyVehicles: [],
                    lastUpdated: new Date(),
                    error: 'Real-time data unavailable',
                }
            }
        }

        return routes
    }
}

module.exports = new RoutePlanningService()