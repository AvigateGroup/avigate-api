// services/navigation/distanceCalculationService.js
const googleMapsService = require('../external/googleMapsService')
const { logger } = require('../../utils/logger')

class DistanceCalculationService {
    constructor() {
        this.EARTH_RADIUS_KM = 6371
    }

    // Calculate distance using Haversine formula
    calculateHaversineDistance(lat1, lng1, lat2, lng2) {
        try {
            const dLat = this.toRadians(lat2 - lat1)
            const dLng = this.toRadians(lng2 - lng1)
            
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return this.EARTH_RADIUS_KM * c
        } catch (error) {
            logger.error('Haversine distance calculation error:', error)
            return 0
        }
    }

    // Calculate route distance using Google Maps
    async calculateRouteDistance(origin, destination, mode = 'driving') {
        try {
            const originCoords = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
            const destCoords = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`

            const result = await googleMapsService.getDirections(
                originCoords,
                destCoords,
                mode,
                false
            )

            if (result.success && result.routes.length > 0) {
                const route = result.routes[0]
                const leg = route.legs[0]
                
                return {
                    distanceKm: leg.distance.value / 1000,
                    distanceText: leg.distance.text,
                    durationMinutes: Math.ceil(leg.duration.value / 60),
                    durationText: leg.duration.text,
                }
            }

            // Fallback to Haversine if Google fails
            if (typeof origin !== 'string' && typeof destination !== 'string') {
                const distance = this.calculateHaversineDistance(
                    origin.lat,
                    origin.lng,
                    destination.lat,
                    destination.lng
                )
                
                return {
                    distanceKm: distance,
                    distanceText: `${distance.toFixed(2)} km`,
                    durationMinutes: null,
                    durationText: 'Unknown',
                    fallback: true,
                }
            }

            throw new Error('Could not calculate route distance')
        } catch (error) {
            logger.error('Route distance calculation error:', error)
            return null
        }
    }

    // Calculate distance matrix for multiple origins/destinations
    async calculateDistanceMatrix(origins, destinations, mode = 'driving') {
        try {
            const result = await googleMapsService.getDistanceMatrix(
                origins,
                destinations,
                mode
            )

            if (!result.success) {
                throw new Error('Distance matrix calculation failed')
            }

            const matrix = []
            
            result.rows.forEach((row, originIndex) => {
                row.elements.forEach((element, destIndex) => {
                    if (element.status === 'OK') {
                        matrix.push({
                            originIndex,
                            destinationIndex: destIndex,
                            origin: result.origin_addresses[originIndex],
                            destination: result.destination_addresses[destIndex],
                            distanceKm: element.distance.value / 1000,
                            distanceText: element.distance.text,
                            durationMinutes: Math.ceil(element.duration.value / 60),
                            durationText: element.duration.text,
                        })
                    }
                })
            })

            return matrix
        } catch (error) {
            logger.error('Distance matrix calculation error:', error)
            return []
        }
    }

    // Estimate walking time
    estimateWalkingTime(distanceKm) {
        // Average walking speed: 5 km/h
        const walkingSpeedKmh = 5
        const hours = distanceKm / walkingSpeedKmh
        return Math.ceil(hours * 60) // Return minutes
    }

    // Estimate driving time
    estimateDrivingTime(distanceKm, trafficMultiplier = 1.3) {
        // Average city driving speed: 30 km/h (accounting for traffic)
        const drivingSpeedKmh = 30
        const hours = distanceKm / drivingSpeedKmh
        return Math.ceil(hours * 60 * trafficMultiplier) // Return minutes with traffic
    }

    // Check if location is within bounds
    isWithinBounds(lat, lng, bounds) {
        return lat >= bounds.south && 
               lat <= bounds.north && 
               lng >= bounds.west && 
               lng <= bounds.east
    }

    // Check if location is within Nigeria
    isWithinNigeria(lat, lng) {
        const nigeriaBounds = {
            north: 14.0,
            south: 4.0,
            east: 15.0,
            west: 2.5,
        }
        return this.isWithinBounds(lat, lng, nigeriaBounds)
    }

    // Calculate bounding box around a point
    calculateBoundingBox(lat, lng, radiusKm) {
        const latDelta = radiusKm / 111.32 // 1 degree latitude ≈ 111.32 km
        const lngDelta = radiusKm / (111.32 * Math.cos(this.toRadians(lat)))

        return {
            north: lat + latDelta,
            south: lat - latDelta,
            east: lng + lngDelta,
            west: lng - lngDelta,
        }
    }

    // Calculate bearing between two points
    calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = this.toRadians(lng2 - lng1)
        const y = Math.sin(dLng) * Math.cos(this.toRadians(lat2))
        const x = Math.cos(this.toRadians(lat1)) * Math.sin(this.toRadians(lat2)) -
                Math.sin(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.cos(dLng)
        const bearing = Math.atan2(y, x)
        return (this.toDegrees(bearing) + 360) % 360
    }

    // Get cardinal direction from bearing
    getCardinalDirection(bearing) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        const index = Math.round(bearing / 45) % 8
        return directions[index]
    }

    // Helper methods
    toRadians(degrees) {
        return degrees * (Math.PI / 180)
    }

    toDegrees(radians) {
        return radians * (180 / Math.PI)
    }

    // Format distance for display
    formatDistance(distanceKm) {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)} m`
        }
        return `${distanceKm.toFixed(1)} km`
    }

    // Format duration for display
    formatDuration(durationMinutes) {
        if (durationMinutes < 60) {
            return `${durationMinutes} min`
        }
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60
        return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`
    }
}

module.exports = new DistanceCalculationService()