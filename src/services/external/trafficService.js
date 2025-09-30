// services/external/trafficService.js
const googleMapsService = require('./googleMapsService')
const { logger } = require('../../utils/logger')

class TrafficService {
    async getTrafficConditions(origin, destination) {
        try {
            const result = await googleMapsService.getDirections(
                origin,
                destination,
                'driving',
                false,
                { departure_time: 'now' }
            )

            if (!result.success || result.routes.length === 0) {
                return { level: 'unknown' }
            }

            const route = result.routes[0]
            const leg = route.legs[0]
            
            if (leg.duration_in_traffic) {
                const normalDuration = leg.duration.value
                const trafficDuration = leg.duration_in_traffic.value
                const delay = (trafficDuration - normalDuration) / normalDuration

                let level = 'light'
                if (delay > 0.5) level = 'heavy'
                else if (delay > 0.25) level = 'moderate'

                return {
                    level,
                    normalDuration: Math.ceil(normalDuration / 60),
                    currentDuration: Math.ceil(trafficDuration / 60),
                    delayMinutes: Math.ceil((trafficDuration - normalDuration) / 60),
                }
            }

            return { level: 'unknown' }
        } catch (error) {
            logger.error('Get traffic conditions error:', error)
            return { level: 'unknown' }
        }
    }
}

module.exports = new TrafficService()