// services/community/directionSharingService.js
const { DirectionShare } = require('../../models')
const { generateSecureRandomString } = require('../user/authService')
const { logger } = require('../../utils/logger')

class DirectionSharingService {
    async createShare(userId, shareData) {
        try {
            let shareId
            let attempts = 0
            
            do {
                shareId = generateSecureRandomString(12)
                const existing = await DirectionShare.findOne({ where: { shareId } })
                if (!existing) break
                attempts++
            } while (attempts < 10)

            if (attempts >= 10) {
                throw new Error('Failed to generate unique share ID')
            }

            const share = await DirectionShare.create({
                ...shareData,
                shareId,
                createdBy: userId,
            })

            return { success: true, share }
        } catch (error) {
            logger.error('Create direction share error:', error)
            return { success: false, error: error.message }
        }
    }

    async validateAccess(shareId, userId = null) {
        try {
            const share = await DirectionShare.findByShareId(shareId)
            
            if (!share) {
                return { canAccess: false, reason: 'Share not found' }
            }

            if (!share.canAccess(userId)) {
                return { canAccess: false, reason: 'Access denied', share }
            }

            return { canAccess: true, share }
        } catch (error) {
            logger.error('Validate share access error:', error)
            return { canAccess: false, reason: 'Validation error' }
        }
    }
}

module.exports = new DirectionSharingService()