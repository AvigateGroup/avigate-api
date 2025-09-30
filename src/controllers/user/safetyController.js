// controllers/user/safetyController.js
const {
    SafetyReport,
    Location,
    Route,
    User,
    DirectionShare,
    UserInteraction,
} = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

const safetyController = {
    // Get safety information for a location
    getLocationSafety: async (req, res) => {
        try {
            const { locationId } = req.params
            const user = req.user
            const { radius = 1000 } = req.query // Default 1km radius

            const location = await Location.findByPk(locationId)

            if (!location) {
                return res.status(404).json({
                    success: false,
                    message: 'Location not found',
                })
            }

            // Get safety reports for this location
            const safetyReports = await SafetyReport.findAll({
                where: {
                    locationId,
                    isResolved: false,
                },
                include: [
                    {
                        model: User,
                        as: 'reporter',
                        attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                    },
                ],
                order: [['severity', 'DESC'], ['createdAt', 'DESC']],
                limit: 10,
            })

            // Get nearby safety reports
            const nearbyReports = await SafetyReport.findInArea(
                parseFloat(location.latitude),
                parseFloat(location.longitude),
                parseInt(radius) / 1000
            )

            // Calculate safety score
            const safetyScore = this._calculateSafetyScore(safetyReports, nearbyReports)

            // Get safety recommendations
            const recommendations = this._generateSafetyRecommendations(
                safetyReports,
                nearbyReports
            )

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'safety_info_view',
                resourceId: locationId,
                resourceType: 'location',
                interactionData: { radius },
                userLat: parseFloat(location.latitude),
                userLng: parseFloat(location.longitude),
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    location: {
                        id: location.id,
                        name: location.name,
                        address: location.getFullAddress(),
                        coordinates: location.getCoordinates(),
                    },
                    safetyScore,
                    activeReports: safetyReports.length,
                    nearbyReports: nearbyReports.length,
                    recentIncidents: safetyReports,
                    recommendations,
                    lastUpdated: safetyReports.length > 0 
                        ? safetyReports[0].createdAt 
                        : null,
                },
            })
        } catch (error) {
            logger.error('Get location safety error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get safety information',
                error: error.message,
            })
        }
    },

    // Get safety information for a route
    getRouteSafety: async (req, res) => {
        try {
            const { routeId } = req.params
            const user = req.user

            const route = await Route.findByPk(routeId, {
                include: [
                    { model: Location, as: 'startLocation' },
                    { model: Location, as: 'endLocation' },
                ],
            })

            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: 'Route not found',
                })
            }

            // Get safety reports for this route
            const safetyReports = await SafetyReport.findAll({
                where: {
                    routeId,
                    isResolved: false,
                },
                include: [
                    {
                        model: User,
                        as: 'reporter',
                        attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                    },
                ],
                order: [['severity', 'DESC'], ['createdAt', 'DESC']],
            })

            // Calculate route safety score
            const safetyScore = this._calculateRouteSafetyScore(route, safetyReports)

            // Get safety by time of day
            const safetyByTime = this._analyzeSafetyByTime(safetyReports)

            // Get recommended safety measures
            const safetyMeasures = this._getRouteSafetyMeasures(route, safetyReports)

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'route_safety_view',
                resourceId: routeId,
                resourceType: 'route',
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    route: {
                        id: route.id,
                        name: route.name,
                        transportMode: route.transportMode,
                        safetyRating: route.safetyRating,
                    },
                    safetyScore,
                    activeReports: safetyReports.length,
                    recentIncidents: safetyReports.slice(0, 5),
                    safetyByTime,
                    safetyMeasures,
                    lastUpdated: safetyReports.length > 0 
                        ? safetyReports[0].createdAt 
                        : null,
                },
            })
        } catch (error) {
            logger.error('Get route safety error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get route safety information',
                error: error.message,
            })
        }
    },

    // Get safety alerts for area
    getSafetyAlerts: async (req, res) => {
        try {
            const { lat, lng, radius = 5000 } = req.query
            const user = req.user

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required',
                })
            }

            const latitude = parseFloat(lat)
            const longitude = parseFloat(lng)

            // Get high severity safety reports in area
            const alerts = await SafetyReport.findAll({
                where: {
                    severity: { [Op.gte]: 4 }, // High severity (4-5)
                    isResolved: false,
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    },
                },
                include: [
                    { model: Location, as: 'location' },
                    { model: Route, as: 'route' },
                ],
                order: [['severity', 'DESC'], ['createdAt', 'DESC']],
            })

            // Filter by distance
            const nearbyAlerts = alerts.filter(alert => {
                if (!alert.latitude || !alert.longitude) return false
                
                const distance = this._calculateDistance(
                    latitude,
                    longitude,
                    parseFloat(alert.latitude),
                    parseFloat(alert.longitude)
                )
                
                return distance <= parseInt(radius) / 1000
            })

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'safety_alerts_view',
                resourceType: 'safety_report',
                userLat: latitude,
                userLng: longitude,
                interactionData: { radius, alertsCount: nearbyAlerts.length },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    alerts: nearbyAlerts,
                    center: { latitude, longitude },
                    radiusMeters: parseInt(radius),
                    total: nearbyAlerts.length,
                    lastUpdated: nearbyAlerts.length > 0 
                        ? nearbyAlerts[0].createdAt 
                        : null,
                },
            })
        } catch (error) {
            logger.error('Get safety alerts error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get safety alerts',
                error: error.message,
            })
        }
    },

    // Share location with trusted contacts (emergency feature)
    shareLocationWithContacts: async (req, res) => {
        try {
            const user = req.user
            const {
                latitude,
                longitude,
                message,
                contacts, // Array of phone numbers or user IDs
                duration = 60, // Duration in minutes
            } = req.body

            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required',
                })
            }

            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one contact is required',
                })
            }

            // Create a direction share for emergency tracking
            const emergencyShare = await DirectionShare.create({
                shareId: require('crypto').randomBytes(16).toString('hex'),
                createdBy: user.id,
                title: 'Emergency Location Share',
                description: message || 'Sharing my location for safety',
                startLat: latitude,
                startLng: longitude,
                customInstructions: `Emergency contact: ${user.phoneNumber}`,
                isPublic: false,
                allowedUsers: contacts,
                expiresAt: new Date(Date.now() + duration * 60 * 1000),
                status: 'active',
                metadata: {
                    isEmergencyShare: true,
                    sharedAt: new Date(),
                },
            })

            // For now, we'll just create the share

            // Log interaction
            await UserInteraction.create({
                userId: user.id,
                sessionId: req.sessionID,
                interactionType: 'emergency_location_share',
                resourceId: emergencyShare.id,
                resourceType: 'direction_share',
                userLat: latitude,
                userLng: longitude,
                interactionData: {
                    contactsCount: contacts.length,
                    duration,
                },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                message: 'Location shared successfully with trusted contacts',
                data: {
                    shareId: emergencyShare.shareId,
                    shareUrl: emergencyShare.getShareUrl(req.protocol + '://' + req.get('host')),
                    expiresAt: emergencyShare.expiresAt,
                    sharedWith: contacts.length,
                },
            })
        } catch (error) {
            logger.error('Share location with contacts error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to share location',
                error: error.message,
            })
        }
    },

    // Get safe routes between locations
    getSafeRoutes: async (req, res) => {
        try {
            const {
                startLat,
                startLng,
                endLat,
                endLng,
                timeOfDay = 'any',
            } = req.query
            const user = req.user

            if (!startLat || !startLng || !endLat || !endLng) {
                return res.status(400).json({
                    success: false,
                    message: 'Start and end coordinates are required',
                })
            }

            const routePlanningService = require('../../services/navigation/routePlanningService')

            // Plan routes
            const routeResult = await routePlanningService.planRoute(
                {
                    latitude: parseFloat(startLat),
                    longitude: parseFloat(startLng),
                },
                {
                    latitude: parseFloat(endLat),
                    longitude: parseFloat(endLng),
                },
                {
                    transportModes: ['bus', 'taxi', 'keke_napep', 'walking'],
                    maxAlternatives: 5,
                    includeRealTime: true,
                }
            )

            if (!routeResult.success) {
                return res.status(404).json({
                    success: false,
                    message: 'No routes found',
                })
            }

            // Enhance routes with safety information
            const safeRoutes = await Promise.all(
                routeResult.routes.map(async route => {
                    const safetyInfo = await this._getRouteSafetyInfo(route, timeOfDay)
                    return {
                        ...route,
                        safetyInfo,
                    }
                })
            )

            // Sort by safety score (highest first)
            safeRoutes.sort((a, b) => 
                b.safetyInfo.safetyScore - a.safetyInfo.safetyScore
            )

            // Log interaction
            await UserInteraction.create({
                userId: user?.id,
                sessionId: req.sessionID,
                interactionType: 'safe_routes_search',
                resourceType: 'route',
                userLat: parseFloat(startLat),
                userLng: parseFloat(startLng),
                interactionData: {
                    timeOfDay,
                    routesFound: safeRoutes.length,
                },
                ipAddress: req.ip,
            })

            res.json({
                success: true,
                data: {
                    routes: safeRoutes,
                    total: safeRoutes.length,
                    filters: { timeOfDay },
                },
            })
        } catch (error) {
            logger.error('Get safe routes error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get safe routes',
                error: error.message,
            })
        }
    },

    // Helper methods
    _calculateSafetyScore(reports, nearbyReports) {
        let score = 100 // Start with perfect score

        // Deduct points for active reports
        score -= reports.length * 5

        // Deduct more for high severity reports
        const highSeverityCount = reports.filter(r => r.severity >= 4).length
        score -= highSeverityCount * 10

        // Deduct points for nearby reports
        score -= Math.min(nearbyReports.length * 2, 20)

        // Ensure score is between 0 and 100
        return Math.max(0, Math.min(100, score))
    },

    _calculateRouteSafetyScore(route, reports) {
        let score = route.safetyRating ? parseFloat(route.safetyRating) * 10 : 70

        // Adjust based on reports
        if (reports.length > 0) {
            score -= reports.length * 5
            
            const avgSeverity = reports.reduce((sum, r) => sum + r.severity, 0) / reports.length
            score -= avgSeverity * 5
        }

        return Math.max(0, Math.min(100, score))
    },

    _analyzeSafetyByTime(reports) {
        const timeCategories = {
            morning: { count: 0, incidents: [] },
            afternoon: { count: 0, incidents: [] },
            evening: { count: 0, incidents: [] },
            night: { count: 0, incidents: [] },
        }

        reports.forEach(report => {
            if (!report.timeOfIncident) return

            const hour = new Date(report.timeOfIncident).getHours()
            let category

            if (hour >= 6 && hour < 12) category = 'morning'
            else if (hour >= 12 && hour < 17) category = 'afternoon'
            else if (hour >= 17 && hour < 21) category = 'evening'
            else category = 'night'

            timeCategories[category].count++
            timeCategories[category].incidents.push({
                type: report.incidentType,
                severity: report.severity,
            })
        })

        return timeCategories
    },

    _generateSafetyRecommendations(reports, nearbyReports) {
        const recommendations = []

        if (reports.length === 0 && nearbyReports.length === 0) {
            recommendations.push({
                type: 'positive',
                message: 'No recent safety incidents reported in this area',
                priority: 'low',
            })
        }

        if (reports.some(r => r.severity >= 4)) {
            recommendations.push({
                type: 'warning',
                message: 'High severity incidents reported recently. Exercise extra caution',
                priority: 'high',
            })
        }

        if (reports.some(r => r.incidentType === 'poor_lighting')) {
            recommendations.push({
                type: 'tip',
                message: 'Area has poor lighting. Avoid traveling at night if possible',
                priority: 'medium',
            })
        }

        if (reports.length > 5) {
            recommendations.push({
                type: 'warning',
                message: 'Multiple incidents reported. Consider alternative locations',
                priority: 'high',
            })
        }

        return recommendations
    },

    _getRouteSafetyMeasures(route, reports) {
        const measures = []

        // Always recommend basic safety measures
        measures.push({
            measure: 'Share your trip details with a trusted contact',
            importance: 'high',
        })

        if (route.transportMode === 'okada' || route.transportMode === 'keke_napep') {
            measures.push({
                measure: 'Verify vehicle identification before boarding',
                importance: 'high',
            })
        }

        if (reports.some(r => r.affectsTransport)) {
            measures.push({
                measure: 'Check for recent updates before starting your journey',
                importance: 'high',
            })
        }

        measures.push({
            measure: 'Keep your phone charged and accessible',
            importance: 'medium',
        })

        measures.push({
            measure: 'Stay in well-lit and populated areas',
            importance: 'medium',
        })

        return measures
    },

    async _getRouteSafetyInfo(route, timeOfDay) {
        // Get safety reports for route
        let safetyReports = []
        
        if (route.id) {
            safetyReports = await SafetyReport.findAll({
                where: {
                    routeId: route.id,
                    isResolved: false,
                },
            })
        }

        const safetyScore = this._calculateRouteSafetyScore(route, safetyReports)
        
        return {
            safetyScore,
            incidentCount: safetyReports.length,
            safetyLevel: safetyScore >= 80 ? 'safe' : 
                        safetyScore >= 60 ? 'moderate' : 'caution_advised',
            recommendations: this._generateSafetyRecommendations(safetyReports, []),
        }
    },

    _calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371 // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLng = (lng2 - lng1) * Math.PI / 180
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2)
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
    },
}

module.exports = safetyController