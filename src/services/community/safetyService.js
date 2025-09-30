// services/community/safetyService.js
const { SafetyReport, Location } = require('../../models')
const { Op } = require('sequelize')
const { logger } = require('../../utils/logger')

class SafetyService {
    async getSafetyScoreForLocation(locationId) {
        try {
            const recentReports = await SafetyReport.findAll({
                where: {
                    locationId,
                    createdAt: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            })

            if (recentReports.length === 0) {
                return { score: 7.0, level: 'moderate', reportCount: 0 }
            }

            const avgSeverity = recentReports.reduce((sum, r) => sum + r.severity, 0) / recentReports.length
            const score = Math.max(0, 10 - avgSeverity * 2)

            let level = 'safe'
            if (score < 4) level = 'unsafe'
            else if (score < 6) level = 'moderate'
            else if (score < 8) level = 'safe'
            else level = 'very_safe'

            return { score, level, reportCount: recentReports.length }
        } catch (error) {
            logger.error('Get safety score error:', error)
            return { score: 5.0, level: 'unknown', reportCount: 0 }
        }
    }

    async getAreaSafetyAlerts(lat, lng, radiusKm = 5) {
        try {
            const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

            const alerts = await SafetyReport.findAll({
                where: {
                    createdAt: { [Op.gte]: cutoffDate },
                    severity: { [Op.gte]: 3 },
                    isResolved: false,
                },
                order: [['severity', 'DESC']],
                limit: 10,
            })

            return alerts
        } catch (error) {
            logger.error('Get area safety alerts error:', error)
            return []
        }
    }
}

module.exports = new SafetyService()