// services/fare/fareCalculationService.js
const { FareFeedback, Route, RouteStep } = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

class FareCalculationService {
    constructor() {
        this.baseRates = {
            bus: { base: 50, perKm: 25 },
            taxi: { base: 200, perKm: 100 },
            keke_napep: { base: 100, perKm: 50 },
            okada: { base: 100, perKm: 30 },
            walking: { base: 0, perKm: 0 },
            car: { base: 300, perKm: 120 },
        }

        this.priceMultipliers = {
            peak_hours: 1.5,
            bad_weather: 1.3,
            weekend: 1.2,
            holiday: 1.4,
            night: 1.3,
        }

        this.cityMultipliers = {
            'Lagos': 1.3,
            'Abuja': 1.2,
            'Port Harcourt': 1.1,
            'Kano': 1.0,
            'Ibadan': 1.0,
            'Kaduna': 0.9,
        }
    }

    // Calculate estimated fare for a route
    async calculateEstimatedFare(routeId, transportMode, options = {}) {
        try {
            const {
                distanceKm,
                duration,
                timeOfDay,
                weatherCondition,
                isWeekend = false,
                isHoliday = false,
                city,
                passengerCount = 1,
            } = options

            // Get route information
            const route = await Route.findByPk(routeId, {
                include: [
                    { model: RouteStep, as: 'steps' },
                ],
            })

            if (!route) {
                throw new Error('Route not found')
            }

            const distance = distanceKm || parseFloat(route.distanceKm) || 0

            // Get historical fare data for this route
            const historicalFares = await this.getHistoricalFareData(routeId, transportMode)
            
            // Base calculation
            let estimatedFare = this.calculateBaseFare(transportMode, distance)

            // Apply historical data adjustment
            if (historicalFares.averageFare) {
                const historicalBaseFare = parseFloat(historicalFares.averageFare)
                const confidenceWeight = Math.min(historicalFares.feedbackCount / 10, 1)
                estimatedFare = (estimatedFare * (1 - confidenceWeight)) + (historicalBaseFare * confidenceWeight)
            }

            // Apply multipliers
            estimatedFare = this.applyMultipliers(estimatedFare, {
                timeOfDay,
                weatherCondition,
                isWeekend,
                isHoliday,
                city,
            })

            // Adjust for passenger count (some modes charge per person)
            if (['bus', 'keke_napep'].includes(transportMode) && passengerCount > 1) {
                estimatedFare *= passengerCount
            }

            // Calculate fare range
            const minFare = Math.round(estimatedFare * 0.8)
            const maxFare = Math.round(estimatedFare * 1.3)

            return {
                success: true,
                estimatedFare: Math.round(estimatedFare),
                fareRange: {
                    min: minFare,
                    max: maxFare,
                    currency: 'NGN',
                },
                confidence: this.calculateConfidence(historicalFares),
                factors: {
                    baseRate: this.baseRates[transportMode],
                    distance,
                    historicalData: !!historicalFares.averageFare,
                    feedbackCount: historicalFares.feedbackCount,
                },
            }
        } catch (error) {
            logger.error('Fare calculation error:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Calculate base fare using transport mode and distance
    calculateBaseFare(transportMode, distanceKm) {
        const rates = this.baseRates[transportMode] || this.baseRates.taxi
        return rates.base + (distanceKm * rates.perKm)
    }

    // Apply various multipliers to the base fare
    applyMultipliers(baseFare, factors) {
        let adjustedFare = baseFare

        // Time of day multiplier
        if (this.isPeakHours(factors.timeOfDay)) {
            adjustedFare *= this.priceMultipliers.peak_hours
        }

        if (this.isNightTime(factors.timeOfDay)) {
            adjustedFare *= this.priceMultipliers.night
        }

        // Weather multiplier
        if (factors.weatherCondition === 'rain' || factors.weatherCondition === 'storm') {
            adjustedFare *= this.priceMultipliers.bad_weather
        }

        // Weekend multiplier
        if (factors.isWeekend) {
            adjustedFare *= this.priceMultipliers.weekend
        }

        // Holiday multiplier
        if (factors.isHoliday) {
            adjustedFare *= this.priceMultipliers.holiday
        }

        // City multiplier
        if (factors.city && this.cityMultipliers[factors.city]) {
            adjustedFare *= this.cityMultipliers[factors.city]
        }

        return adjustedFare
    }

    // Get historical fare data for a route
    async getHistoricalFareData(routeId, transportMode, days = 30) {
        try {
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

            const result = await FareFeedback.findOne({
                where: {
                    routeId,
                    vehicleType: transportMode,
                    isVerified: true,
                    isDisputed: false,
                    tripDate: { [Op.gte]: cutoffDate },
                },
                attributes: [
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'feedbackCount'],
                    [FareFeedback.sequelize.fn('MIN', FareFeedback.sequelize.col('amountPaid')), 'minFare'],
                    [FareFeedback.sequelize.fn('MAX', FareFeedback.sequelize.col('amountPaid')), 'maxFare'],
                    [FareFeedback.sequelize.fn('STDDEV', FareFeedback.sequelize.col('amountPaid')), 'standardDeviation'],
                ],
                raw: true,
            })

            return result || { feedbackCount: 0 }
        } catch (error) {
            logger.error('Error getting historical fare data:', error)
            return { feedbackCount: 0 }
        }
    }

    // Calculate confidence level based on historical data
    calculateConfidence(historicalData) {
        if (!historicalData.feedbackCount || historicalData.feedbackCount === 0) {
            return 'low'
        }

        if (historicalData.feedbackCount < 5) {
            return 'low'
        } else if (historicalData.feedbackCount < 20) {
            return 'medium'
        } else {
            return 'high'
        }
    }

    // Utility methods
    isPeakHours(timeOfDay) {
        if (!timeOfDay) return false
        const hour = parseInt(timeOfDay.split(':')[0])
        return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    }

    isNightTime(timeOfDay) {
        if (!timeOfDay) return false
        const hour = parseInt(timeOfDay.split(':')[0])
        return hour >= 22 || hour <= 5
    }

    // Get fare trends for analytics
    async getFareTrends(routeId, transportMode, days = 90) {
        try {
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

            const trends = await FareFeedback.findAll({
                where: {
                    routeId,
                    vehicleType: transportMode,
                    isVerified: true,
                    isDisputed: false,
                    tripDate: { [Op.gte]: cutoffDate },
                },
                attributes: [
                    [FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate')), 'date'],
                    [FareFeedback.sequelize.fn('AVG', FareFeedback.sequelize.col('amountPaid')), 'averageFare'],
                    [FareFeedback.sequelize.fn('COUNT', FareFeedback.sequelize.col('id')), 'tripCount'],
                    [FareFeedback.sequelize.fn('MIN', FareFeedback.sequelize.col('amountPaid')), 'minFare'],
                    [FareFeedback.sequelize.fn('MAX', FareFeedback.sequelize.col('amountPaid')), 'maxFare'],
                ],
                group: [FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate'))],
                order: [[FareFeedback.sequelize.fn('DATE', FareFeedback.sequelize.col('tripDate')), 'ASC']],
                raw: true,
            })

            return {
                success: true,
                trends,
                period: `${days} days`,
            }
        } catch (error) {
            logger.error('Error getting fare trends:', error)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    // Validate fare feedback for reasonableness
    validateFareFeedback(fareData) {
        const { amountPaid, transportMode, distanceKm, city } = fareData

        // Calculate reasonable range
        const estimatedFare = this.calculateBaseFare(transportMode, distanceKm)
        const cityMultiplier = this.cityMultipliers[city] || 1
        const adjustedEstimate = estimatedFare * cityMultiplier

        const reasonableMin = adjustedEstimate * 0.5
        const reasonableMax = adjustedEstimate * 2.5

        const isReasonable = amountPaid >= reasonableMin && amountPaid <= reasonableMax

        return {
            isReasonable,
            estimatedFare: adjustedEstimate,
            reasonableRange: {
                min: reasonableMin,
                max: reasonableMax,
            },
            variance: Math.abs(amountPaid - adjustedEstimate) / adjustedEstimate,
        }
    }
}

module.exports = new FareCalculationService()