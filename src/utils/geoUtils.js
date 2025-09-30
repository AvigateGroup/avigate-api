// utils/geoUtils.js
/**
 * Geographic and geospatial utility functions for Nigerian transportation
 */

const NIGERIA_BOUNDS = {
    north: 14.0,
    south: 4.0,
    east: 15.0,
    west: 2.5,
}

const EARTH_RADIUS_KM = 6371
const EARTH_RADIUS_MILES = 3959

class GeoUtils {
    /**
     * Check if coordinates are within Nigeria bounds
     */
    static isInNigeria(lat, lng) {
        return (
            lat >= NIGERIA_BOUNDS.south &&
            lat <= NIGERIA_BOUNDS.north &&
            lng >= NIGERIA_BOUNDS.west &&
            lng <= NIGERIA_BOUNDS.east
        )
    }

    /**
     * Get Nigeria center coordinates
     */
    static getNigeriaCenter() {
        return {
            lat: (NIGERIA_BOUNDS.north + NIGERIA_BOUNDS.south) / 2,
            lng: (NIGERIA_BOUNDS.east + NIGERIA_BOUNDS.west) / 2,
        }
    }

    /**
     * Convert degrees to radians
     */
    static toRadians(degrees) {
        return degrees * (Math.PI / 180)
    }

    /**
     * Convert radians to degrees
     */
    static toDegrees(radians) {
        return radians * (180 / Math.PI)
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in kilometers
     */
    static calculateDistance(lat1, lng1, lat2, lng2) {
        const dLat = this.toRadians(lat2 - lat1)
        const dLng = this.toRadians(lng2 - lng1)

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
                Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return EARTH_RADIUS_KM * c
    }

    /**
     * Calculate bearing between two coordinates
     * Returns bearing in degrees (0-360)
     */
    static calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = this.toRadians(lng2 - lng1)
        const lat1Rad = this.toRadians(lat1)
        const lat2Rad = this.toRadians(lat2)

        const y = Math.sin(dLng) * Math.cos(lat2Rad)
        const x =
            Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)

        const bearing = this.toDegrees(Math.atan2(y, x))
        return (bearing + 360) % 360
    }

    /**
     * Get compass direction from bearing
     */
    static getCompassDirection(bearing) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        const index = Math.round(bearing / 45) % 8
        return directions[index]
    }

    /**
     * Calculate destination point given distance and bearing
     */
    static calculateDestinationPoint(lat, lng, distanceKm, bearingDegrees) {
        const bearingRad = this.toRadians(bearingDegrees)
        const latRad = this.toRadians(lat)
        const lngRad = this.toRadians(lng)
        const angularDistance = distanceKm / EARTH_RADIUS_KM

        const destLatRad = Math.asin(
            Math.sin(latRad) * Math.cos(angularDistance) +
                Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
        )

        const destLngRad =
            lngRad +
            Math.atan2(
                Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
                Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
            )

        return {
            lat: this.toDegrees(destLatRad),
            lng: this.toDegrees(destLngRad),
        }
    }

    /**
     * Check if point is within radius of center point
     */
    static isWithinRadius(lat, lng, centerLat, centerLng, radiusKm) {
        const distance = this.calculateDistance(lat, lng, centerLat, centerLng)
        return distance <= radiusKm
    }

    /**
     * Get bounding box around a point
     */
    static getBoundingBox(lat, lng, radiusKm) {
        const latDelta = radiusKm / 111.32 // 1 degree latitude ≈ 111.32 km
        const lngDelta = radiusKm / (111.32 * Math.cos(this.toRadians(lat)))

        return {
            north: lat + latDelta,
            south: lat - latDelta,
            east: lng + lngDelta,
            west: lng - lngDelta,
        }
    }

    /**
     * Check if point is inside polygon (Ray casting algorithm)
     */
    static isPointInPolygon(lat, lng, polygon) {
        let inside = false
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng
            const yi = polygon[i].lat
            const xj = polygon[j].lng
            const yj = polygon[j].lat

            const intersect =
                yi > lat !== yj > lat &&
                lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

            if (intersect) inside = !inside
        }
        return inside
    }

    /**
     * Calculate area of polygon in square kilometers
     */
    static calculatePolygonArea(polygon) {
        if (polygon.length < 3) return 0

        let area = 0
        const radius = EARTH_RADIUS_KM

        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i]
            const p2 = polygon[(i + 1) % polygon.length]

            area +=
                this.toRadians(p2.lng - p1.lng) *
                (2 + Math.sin(this.toRadians(p1.lat)) + Math.sin(this.toRadians(p2.lat)))
        }

        area = (area * radius * radius) / 2
        return Math.abs(area)
    }

    /**
     * Find center point (centroid) of polygon
     */
    static getPolygonCenter(polygon) {
        let latSum = 0
        let lngSum = 0

        polygon.forEach((point) => {
            latSum += point.lat
            lngSum += point.lng
        })

        return {
            lat: latSum / polygon.length,
            lng: lngSum / polygon.length,
        }
    }

    /**
     * Simplify polyline using Douglas-Peucker algorithm
     */
    static simplifyPolyline(points, tolerance = 0.0001) {
        if (points.length <= 2) return points

        const pointLineDistance = (point, lineStart, lineEnd) => {
            const { lat: x, lng: y } = point
            const { lat: x1, lng: y1 } = lineStart
            const { lat: x2, lng: y2 } = lineEnd

            const A = x - x1
            const B = y - y1
            const C = x2 - x1
            const D = y2 - y1

            const dot = A * C + B * D
            const lenSq = C * C + D * D
            let param = -1

            if (lenSq !== 0) param = dot / lenSq

            let xx, yy

            if (param < 0) {
                xx = x1
                yy = y1
            } else if (param > 1) {
                xx = x2
                yy = y2
            } else {
                xx = x1 + param * C
                yy = y1 + param * D
            }

            const dx = x - xx
            const dy = y - yy
            return Math.sqrt(dx * dx + dy * dy)
        }

        const douglasPeucker = (points, start, end, tolerance, result) => {
            let maxDistance = 0
            let index = 0

            for (let i = start + 1; i < end; i++) {
                const distance = pointLineDistance(points[i], points[start], points[end])
                if (distance > maxDistance) {
                    index = i
                    maxDistance = distance
                }
            }

            if (maxDistance > tolerance) {
                douglasPeucker(points, start, index, tolerance, result)
                result.push(points[index])
                douglasPeucker(points, index, end, tolerance, result)
            }
        }

        const result = [points[0]]
        douglasPeucker(points, 0, points.length - 1, tolerance, result)
        result.push(points[points.length - 1])

        return result
    }

    /**
     * Format coordinates for display
     */
    static formatCoordinates(lat, lng, precision = 6) {
        return {
            lat: parseFloat(lat.toFixed(precision)),
            lng: parseFloat(lng.toFixed(precision)),
            formatted: `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`,
        }
    }

    /**
     * Parse coordinates from various string formats
     */
    static parseCoordinates(coordString) {
        if (typeof coordString !== 'string') return null

        // Remove all whitespace
        coordString = coordString.trim()

        // Try different formats
        const patterns = [
            /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/, // "lat, lng" or "lat lng"
            /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/, // Same as above
        ]

        for (const pattern of patterns) {
            const match = coordString.match(pattern)
            if (match) {
                const lat = parseFloat(match[1])
                const lng = parseFloat(match[2])

                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    return { lat, lng }
                }
            }
        }

        return null
    }

    /**
     * Get major Nigerian cities with their coordinates
     */
    static getNigerianCities() {
        return {
            Lagos: { lat: 6.5244, lng: 3.3792, state: 'Lagos' },
            Abuja: { lat: 9.0765, lng: 7.3986, state: 'FCT' },
            'Port Harcourt': { lat: 4.8156, lng: 7.0498, state: 'Rivers' },
            Kano: { lat: 12.0022, lng: 8.592, state: 'Kano' },
            Ibadan: { lat: 7.3775, lng: 3.947, state: 'Oyo' },
            Kaduna: { lat: 10.5105, lng: 7.4165, state: 'Kaduna' },
            Benin: { lat: 6.3176, lng: 5.6145, state: 'Edo' },
            Enugu: { lat: 6.4541, lng: 7.5111, state: 'Enugu' },
            Jos: { lat: 9.8965, lng: 8.8583, state: 'Plateau' },
            Ilorin: { lat: 8.4799, lng: 4.5418, state: 'Kwara' },
            Calabar: { lat: 4.9517, lng: 8.322, state: 'Cross River' },
            Owerri: { lat: 5.4844, lng: 7.0351, state: 'Imo' },
            Abeokuta: { lat: 7.1475, lng: 3.3619, state: 'Ogun' },
            Akure: { lat: 7.2571, lng: 5.2058, state: 'Ondo' },
            Warri: { lat: 5.5167, lng: 5.7667, state: 'Delta' },
        }
    }

    /**
     * Find nearest city to coordinates
     */
    static findNearestCity(lat, lng) {
        const cities = this.getNigerianCities()
        let nearestCity = null
        let minDistance = Infinity

        for (const [cityName, cityCoords] of Object.entries(cities)) {
            const distance = this.calculateDistance(lat, lng, cityCoords.lat, cityCoords.lng)
            if (distance < minDistance) {
                minDistance = distance
                nearestCity = { name: cityName, ...cityCoords, distance }
            }
        }

        return nearestCity
    }
}

module.exports = GeoUtils