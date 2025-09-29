// services/external/googleMapsService.js
const axios = require('axios')
const { logger } = require('../../utils/logger')

class GoogleMapsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY
        this.baseUrl = 'https://maps.googleapis.com/maps/api'
        
        if (!this.apiKey) {
            logger.warn('Google Maps API key not configured')
        }
    }

    // Geocoding - Convert address to coordinates
    async geocode(address, components = null, bounds = null) {
        try {
            const params = {
                address,
                key: this.apiKey,
                region: 'ng', // Nigeria region bias
            }

            // Add component filtering (e.g., country:NG)
            if (components) {
                params.components = components
            }

            // Add bounds for biasing (Nigeria bounds)
            if (bounds) {
                params.bounds = bounds
            } else {
                // Default Nigeria bounds
                params.bounds = '4.0,2.5|14.0,15.0'
            }

            const response = await axios.get(`${this.baseUrl}/geocode/json`, { params })
            
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                return {
                    success: true,
                    results: response.data.results.map(result => ({
                        formatted_address: result.formatted_address,
                        place_id: result.place_id,
                        location: result.geometry.location,
                        types: result.types,
                        address_components: result.address_components,
                        partial_match: result.partial_match || false,
                    })),
                }
            }

            return {
                success: false,
                error: 'No results found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Geocoding error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Reverse Geocoding - Convert coordinates to address
    async reverseGeocode(lat, lng, result_type = null) {
        try {
            const params = {
                latlng: `${lat},${lng}`,
                key: this.apiKey,
                region: 'ng',
            }

            if (result_type) {
                params.result_type = result_type
            }

            const response = await axios.get(`${this.baseUrl}/geocode/json`, { params })
            
            if (response.data.status === 'OK' && response.data.results.length > 0) {
                return {
                    success: true,
                    results: response.data.results.map(result => ({
                        formatted_address: result.formatted_address,
                        place_id: result.place_id,
                        types: result.types,
                        address_components: result.address_components,
                    })),
                }
            }

            return {
                success: false,
                error: 'No results found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Reverse geocoding error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Places Search - Find places by text query
    async searchPlaces(query, location = null, radius = 5000, type = null) {
        try {
            const params = {
                query,
                key: this.apiKey,
                region: 'ng',
            }

            // Add location bias if provided
            if (location) {
                params.location = `${location.lat},${location.lng}`
                params.radius = radius
            }

            // Add place type filter
            if (type) {
                params.type = type
            }

            const response = await axios.get(`${this.baseUrl}/place/textsearch/json`, { params })
            
            if (response.data.status === 'OK') {
                return {
                    success: true,
                    results: response.data.results.map(place => ({
                        place_id: place.place_id,
                        name: place.name,
                        formatted_address: place.formatted_address,
                        location: place.geometry.location,
                        types: place.types,
                        rating: place.rating,
                        user_ratings_total: place.user_ratings_total,
                        price_level: place.price_level,
                        opening_hours: place.opening_hours,
                        photos: place.photos,
                    })),
                    next_page_token: response.data.next_page_token,
                }
            }

            return {
                success: false,
                error: 'No results found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Places search error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Place Details - Get detailed information about a place
    async getPlaceDetails(placeId, fields = null) {
        try {
            const params = {
                place_id: placeId,
                key: this.apiKey,
            }

            // Specify which fields to return
            if (fields) {
                params.fields = fields.join(',')
            } else {
                params.fields = 'place_id,name,formatted_address,geometry,types,rating,opening_hours,formatted_phone_number,website'
            }

            const response = await axios.get(`${this.baseUrl}/place/details/json`, { params })
            
            if (response.data.status === 'OK') {
                return {
                    success: true,
                    result: response.data.result,
                }
            }

            return {
                success: false,
                error: 'Place not found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Place details error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Directions - Get directions between two points
    async getDirections(origin, destination, mode = 'transit', alternatives = true, options = {}) {
        try {
            const params = {
                origin: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
                destination: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
                mode, // driving, walking, bicycling, transit
                key: this.apiKey,
                region: 'ng',
                alternatives: alternatives,
                ...options,
            }

            // Add transit specific options
            if (mode === 'transit') {
                params.transit_mode = options.transit_mode || 'bus|rail'
                params.transit_routing_preference = options.transit_routing_preference || 'less_walking'
                
                if (options.departure_time) {
                    params.departure_time = options.departure_time
                } else {
                    params.departure_time = 'now'
                }
            }

            const response = await axios.get(`${this.baseUrl}/directions/json`, { params })
            
            if (response.data.status === 'OK' && response.data.routes.length > 0) {
                return {
                    success: true,
                    routes: response.data.routes.map(route => ({
                        summary: route.summary,
                        legs: route.legs.map(leg => ({
                            distance: leg.distance,
                            duration: leg.duration,
                            duration_in_traffic: leg.duration_in_traffic,
                            start_address: leg.start_address,
                            end_address: leg.end_address,
                            start_location: leg.start_location,
                            end_location: leg.end_location,
                            steps: leg.steps.map(step => ({
                                distance: step.distance,
                                duration: step.duration,
                                start_location: step.start_location,
                                end_location: step.end_location,
                                html_instructions: step.html_instructions,
                                travel_mode: step.travel_mode,
                                transit_details: step.transit_details,
                                polyline: step.polyline,
                            })),
                        })),
                        overview_polyline: route.overview_polyline,
                        warnings: route.warnings,
                        waypoint_order: route.waypoint_order,
                        fare: route.fare,
                    })),
                }
            }

            return {
                success: false,
                error: 'No routes found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Directions error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Distance Matrix - Get distances and travel times
    async getDistanceMatrix(origins, destinations, mode = 'driving', options = {}) {
        try {
            const params = {
                origins: Array.isArray(origins) ? origins.join('|') : origins,
                destinations: Array.isArray(destinations) ? destinations.join('|') : destinations,
                mode,
                key: this.apiKey,
                region: 'ng',
                units: 'metric',
                ...options,
            }

            // Add transit specific options
            if (mode === 'transit') {
                if (options.departure_time) {
                    params.departure_time = options.departure_time
                } else {
                    params.departure_time = 'now'
                }
            }

            const response = await axios.get(`${this.baseUrl}/distancematrix/json`, { params })
            
            if (response.data.status === 'OK') {
                return {
                    success: true,
                    origin_addresses: response.data.origin_addresses,
                    destination_addresses: response.data.destination_addresses,
                    rows: response.data.rows,
                }
            }

            return {
                success: false,
                error: 'Distance matrix calculation failed',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Distance matrix error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Nearby Search - Find places nearby
    async nearbySearch(location, radius = 5000, type = null, keyword = null) {
        try {
            const params = {
                location: `${location.lat},${location.lng}`,
                radius,
                key: this.apiKey,
            }

            if (type) {
                params.type = type
            }

            if (keyword) {
                params.keyword = keyword
            }

            const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, { params })
            
            if (response.data.status === 'OK') {
                return {
                    success: true,
                    results: response.data.results.map(place => ({
                        place_id: place.place_id,
                        name: place.name,
                        location: place.geometry.location,
                        types: place.types,
                        rating: place.rating,
                        user_ratings_total: place.user_ratings_total,
                        price_level: place.price_level,
                        vicinity: place.vicinity,
                        opening_hours: place.opening_hours,
                    })),
                    next_page_token: response.data.next_page_token,
                }
            }

            return {
                success: false,
                error: 'No places found',
                status: response.data.status,
            }
        } catch (error) {
            logger.error('Nearby search error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Static Map URL generator
    generateStaticMapUrl(center, zoom = 13, size = '400x400', markers = [], paths = []) {
        const params = new URLSearchParams({
            center: typeof center === 'string' ? center : `${center.lat},${center.lng}`,
            zoom,
            size,
            key: this.apiKey,
        })

        // Add markers
        markers.forEach(marker => {
            const markerStr = [
                marker.color ? `color:${marker.color}` : '',
                marker.label ? `label:${marker.label}` : '',
                marker.size ? `size:${marker.size}` : '',
                marker.location,
            ].filter(Boolean).join('|')
            
            params.append('markers', markerStr)
        })

        // Add paths
        paths.forEach(path => {
            const pathStr = [
                path.color ? `color:${path.color}` : '',
                path.weight ? `weight:${path.weight}` : '',
                path.geodesic ? 'geodesic:true' : '',
                ...path.points,
            ].filter(Boolean).join('|')
            
            params.append('path', pathStr)
        })

        return `${this.baseUrl}/staticmap?${params.toString()}`
    }

    // Utility method to check if coordinates are in Nigeria
    isInNigeria(lat, lng) {
        const nigeriaBounds = {
            north: 14.0,
            south: 4.0,
            east: 15.0,
            west: 2.5,
        }

        return lat >= nigeriaBounds.south && 
               lat <= nigeriaBounds.north && 
               lng >= nigeriaBounds.west && 
               lng <= nigeriaBounds.east
    }

    // Calculate distance between two coordinates (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371 // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1)
        const dLng = this.toRadians(lng2 - lng1)
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c // Distance in kilometers
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180)
    }
}

module.exports = new GoogleMapsService()