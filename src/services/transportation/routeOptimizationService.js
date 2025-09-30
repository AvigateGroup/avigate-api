// services/transportation/routeOptimizationService.js
const { Route, RouteStep, Location } = require('../../models')
const distanceCalculationService = require('../navigation/distanceCalculationService')
const { logger } = require('../../utils/logger')

class RouteOptimizationService {
    constructor() {
        this.optimizationFactors = {
            distance: 0.4,
            duration: 0.3,
            safety: 0.2,
            popularity: 0.1,
        }
    }

    // Optimize route selection based on multiple factors
    async optimizeRouteSelection(routes, userPreferences = {}) {
        try {
            const scoredRoutes = routes.map(route => ({
                ...route,
                optimizationScore: this.calculateOptimizationScore(route, userPreferences),
            }))

            return scoredRoutes.sort((a, b) => b.optimizationScore - a.optimizationScore)
        } catch (error) {
            logger.error('Route optimization error:', error)
            return routes
        }
    }

    // Calculate optimization score for a route
    calculateOptimizationScore(route, userPreferences = {}) {
        let score = 0

        // Distance factor (shorter is better)
        if (route.distanceKm) {
            const distanceScore = Math.max(0, 100 - (route.distanceKm * 2))
            score += distanceScore * (userPreferences.distanceWeight || this.optimizationFactors.distance)
        }

        // Duration factor (faster is better)
        if (route.estimatedDuration) {
            const durationScore = Math.max(0, 100 - (route.estimatedDuration / 2))
            score += durationScore * (userPreferences.durationWeight || this.optimizationFactors.duration)
        }

        // Safety factor
        if (route.safetyRating) {
            const safetyScore = (parseFloat(route.safetyRating) / 10) * 100
            score += safetyScore * (userPreferences.safetyWeight || this.optimizationFactors.safety)
        }

        // Popularity factor
        if (route.popularityScore) {
            const popularityScore = Math.min(route.popularityScore, 100)
            score += popularityScore * (userPreferences.popularityWeight || this.optimizationFactors.popularity)
        }

        // Verification bonus
        if (route.isVerified) {
            score += 10
        }

        // Difficulty penalty
        if (route.difficultyLevel) {
            score -= (route.difficultyLevel - 1) * 5
        }

        return Math.max(0, score)
    }

    // Suggest route improvements
    async suggestRouteImprovements(routeId) {
        try {
            const route = await Route.findByPk(routeId, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                    { model: RouteStep, as: 'steps' },
                ],
            })

            if (!route) {
                throw new Error('Route not found')
            }

            const improvements = []

            // Check if direct route is possible
            const directDistance = distanceCalculationService.calculateHaversineDistance(
                route.startLocation.latitude,
                route.startLocation.longitude,
                route.endLocation.latitude,
                route.endLocation.longitude
            )

            if (route.distanceKm > directDistance * 1.5) {
                improvements.push({
                    type: 'route_efficiency',
                    message: 'Route is significantly longer than direct distance',
                    potentialSaving: `${(route.distanceKm - directDistance).toFixed(2)} km`,
                })
            }

            // Check for excessive waiting time
            const totalWaitingTime = route.steps.reduce((sum, step) => sum + step.waitingTime, 0)
            if (totalWaitingTime > 30) {
                improvements.push({
                    type: 'waiting_time',
                    message: 'High total waiting time between steps',
                    waitingTime: `${totalWaitingTime} minutes`,
                })
            }

            // Check if alternative transport modes might be faster
            if (route.transportMode !== 'walking' && directDistance < 2) {
                improvements.push({
                    type: 'transport_mode',
                    message: 'Consider walking for this short distance',
                    alternativeMode: 'walking',
                })
            }

            return improvements
        } catch (error) {
            logger.error('Suggest route improvements error:', error)
            return []
        }
    }

    // Merge similar route steps
    async mergeRouteSteps(routeId) {
        try {
            const route = await Route.findByPk(routeId, {
                include: [{ model: RouteStep, as: 'steps' }],
            })

            if (!route || !route.steps) {
                throw new Error('Route or steps not found')
            }

            const mergedSteps = []
            let currentStep = null

            for (const step of route.steps) {
                if (!currentStep) {
                    currentStep = { ...step.toJSON() }
                    continue
                }

                // Merge if same transport mode and no significant waiting
                if (currentStep.transportMode === step.transportMode && step.waitingTime < 5) {
                    currentStep.distanceKm += step.distanceKm
                    currentStep.estimatedDuration += step.estimatedDuration
                    currentStep.toLocationId = step.toLocationId
                    currentStep.instruction += ` Then ${step.instruction}`
                } else {
                    mergedSteps.push(currentStep)
                    currentStep = { ...step.toJSON() }
                }
            }

            if (currentStep) {
                mergedSteps.push(currentStep)
            }

            return mergedSteps
        } catch (error) {
            logger.error('Merge route steps error:', error)
            return []
        }
    }
}

module.exports = new RouteOptimizationService()