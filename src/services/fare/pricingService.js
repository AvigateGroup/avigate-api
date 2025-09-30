// services/fare/pricingService.js
const fareCalculationService = require('./fareCalculationService')
const { logger } = require('../../utils/logger')

class PricingService {
    constructor() {
        this.seasonalFactors = {
            festive: 1.5, // Christmas, New Year, etc.
            rainy: 1.2,
            normal: 1.0,
        }

        this.fuelPriceIndex = 1.0 // Base multiplier for fuel prices
    }

    // Get dynamic pricing for current conditions
    async getDynamicPricing(transportMode, distanceKm, conditions = {}) {
        try {
            const {
                weather = 'normal',
                traffic = 'normal',
                timeOfDay = 'normal',
                season = 'normal',
                fuelPriceChange = 0,
            } = conditions

            // Calculate base fare
            let baseFare = fareCalculationService.calculateBaseFare(transportMode, distanceKm)

            // Apply dynamic factors
            let multiplier = 1.0

            // Weather factor
            if (weather === 'rainy' || weather === 'stormy') {
                multiplier *= 1.2
            }

            // Traffic factor
            if (traffic === 'heavy') {
                multiplier *= 1.3
            } else if (traffic === 'moderate') {
                multiplier *= 1.1
            }

            // Time of day factor
            if (timeOfDay === 'peak') {
                multiplier *= 1.3
            } else if (timeOfDay === 'night') {
                multiplier *= 1.5
            }

            // Seasonal factor
            if (this.seasonalFactors[season]) {
                multiplier *= this.seasonalFactors[season]
            }

            // Fuel price adjustment
            if (fuelPriceChange !== 0) {
                multiplier *= (1 + (fuelPriceChange / 100))
            }

            return {
                min: Math.round(baseFare.min * multiplier),
                max: Math.round(baseFare.max * multiplier),
                average: Math.round(baseFare.average * multiplier),
                currency: 'NGN',
                factors: {
                    weather,
                    traffic,
                    timeOfDay,
                    season,
                    multiplier: multiplier.toFixed(2),
                },
            }
        } catch (error) {
            logger.error('Get dynamic pricing error:', error)
            return null
        }
    }

    // Update fuel price index (admin function)
    updateFuelPriceIndex(newIndex) {
        this.fuelPriceIndex = newIndex
        logger.info(`Fuel price index updated to ${newIndex}`)
    }

    // Get surge pricing multiplier
    getSurgePricingMultiplier(demand, supply) {
        if (supply === 0) return 2.0 // Maximum surge

        const demandSupplyRatio = demand / supply

        if (demandSupplyRatio > 3) return 2.0
        if (demandSupplyRatio > 2) return 1.8
        if (demandSupplyRatio > 1.5) return 1.5
        if (demandSupplyRatio > 1) return 1.3
        
        return 1.0 // No surge
    }
}

module.exports = new PricingService()