const { logger } = require('../../utils/logger')
const Redis = require('ioredis')

// Redis client for session storage (fallback to memory if not available)
let redisClient = null
try {
    if (process.env.REDIS_URL) {
        redisClient = new Redis(process.env.REDIS_URL)
        logger.info('Redis connected for session storage')
    }
} catch (error) {
    logger.warn('Redis not available, using in-memory session storage')
}

// Enhanced Blacklist management with Redis support
class TokenBlacklistManager {
    constructor() {
        this.memoryBlacklist = new Set()
        this.maxMemoryTokens = 5000
    }

    async blacklistToken(tokenId, expiresIn = '15m') {
        const ttl = this.getExpirySeconds(expiresIn)

        try {
            if (redisClient) {
                await redisClient.setex(`blacklist:${tokenId}`, ttl, '1')
            } else {
                this.memoryBlacklist.add(tokenId)
                this.cleanupMemoryBlacklist()
            }
            logger.debug(`Token blacklisted: ${tokenId}`)
        } catch (error) {
            logger.error('Failed to blacklist token:', error)
            // Fallback to memory
            this.memoryBlacklist.add(tokenId)
            this.cleanupMemoryBlacklist()
        }
    }

    async isTokenBlacklisted(tokenId) {
        try {
            if (redisClient) {
                const result = await redisClient.get(`blacklist:${tokenId}`)
                return result === '1'
            } else {
                return this.memoryBlacklist.has(tokenId)
            }
        } catch (error) {
            logger.error('Failed to check token blacklist:', error)
            return this.memoryBlacklist.has(tokenId)
        }
    }

    cleanupMemoryBlacklist() {
        if (this.memoryBlacklist.size > this.maxMemoryTokens) {
            const tokensArray = Array.from(this.memoryBlacklist)
            this.memoryBlacklist.clear()
            tokensArray
                .slice(-2500)
                .forEach((token) => this.memoryBlacklist.add(token))
        }
    }

    getExpirySeconds(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/)
        if (!match) return 900 // Default 15 minutes

        const value = parseInt(match[1])
        const unit = match[2]

        switch (unit) {
            case 's':
                return value
            case 'm':
                return value * 60
            case 'h':
                return value * 60 * 60
            case 'd':
                return value * 24 * 60 * 60
            default:
                return 900
        }
    }
}

const tokenBlacklistManager = new TokenBlacklistManager()

// Wrapper functions for backward compatibility
const blacklistAdminToken = async (tokenId, expiresIn) => {
    return tokenBlacklistManager.blacklistToken(tokenId, expiresIn)
}

const isAdminTokenBlacklisted = async (tokenId) => {
    return tokenBlacklistManager.isTokenBlacklisted(tokenId)
}

module.exports = {
    tokenBlacklistManager,
    blacklistAdminToken,
    isAdminTokenBlacklisted,
}
