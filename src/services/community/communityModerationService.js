// services/community/communityModerationService.js
const { CommunityPost } = require('../../models')
const { logger } = require('../../utils/logger')

class CommunityModerationService {
    constructor() {
        this.autoModerateThreshold = {
            reportCount: 5,
            downvoteRatio: 0.7,
        }
    }

    async checkContentForModeration(content, type = 'post') {
        const flags = []

        // Check for spam patterns
        if (this.containsSpam(content)) {
            flags.push({ type: 'spam', severity: 'high' })
        }

        // Check for inappropriate language
        if (this.containsInappropriateLanguage(content)) {
            flags.push({ type: 'inappropriate_language', severity: 'medium' })
        }

        return { needsModeration: flags.length > 0, flags }
    }

    containsSpam(text) {
        const spamPatterns = [
            /win.{0,20}prize/i,
            /click.{0,20}here/i,
            /whatsapp.{0,20}\d{10}/i,
        ]
        return spamPatterns.some(pattern => pattern.test(text))
    }

    containsInappropriateLanguage(text) {
        // Implement inappropriate language detection
        return false
    }

    async autoModeratePost(postId) {
        try {
            const post = await CommunityPost.findByPk(postId)
            
            if (!post) return false

            const downvoteRatio = post.downvotes / (post.upvotes + post.downvotes + 1)

            if (post.reportCount >= this.autoModerateThreshold.reportCount ||
                downvoteRatio >= this.autoModerateThreshold.downvoteRatio) {
                post.isActive = false
                await post.save()
                logger.info(`Post ${postId} auto-moderated`)
                return true
            }

            return false
        } catch (error) {
            logger.error('Auto moderate post error:', error)
            return false
        }
    }
}

module.exports = new CommunityModerationService()
