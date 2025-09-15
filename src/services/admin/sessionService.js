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

// Create admin session data
const createAdminSessionData = (admin, tokenId, req) => {
    return {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        tokenId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: req?.get('User-Agent') || null,
        ip: req?.ip || null,
        permissions: admin.permissions,
    }
}

// Enhanced Admin session management with Redis support
class AdminSessionManager {
    constructor() {
        this.sessions = new Map()
        this.maxSessions = 5 // Maximum concurrent sessions per admin
    }

    async createSession(admin, tokenId, req) {
        const sessionData = createAdminSessionData(admin, tokenId, req)
        const sessionKey = `${admin.id}:${tokenId}`

        try {
            // Get existing sessions for this admin
            const adminSessions = await this.getAdminSessions(admin.id)

            // If max sessions reached, remove oldest
            if (adminSessions.length >= this.maxSessions) {
                const oldestSession = adminSessions.sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                )[0]

                await this.removeSession(admin.id, oldestSession.tokenId)
            }

            // Store session
            if (redisClient) {
                await redisClient.setex(
                    `admin_session:${sessionKey}`,
                    24 * 60 * 60, // 24 hours TTL
                    JSON.stringify(sessionData)
                )
            } else {
                this.sessions.set(sessionKey, sessionData)
            }

            return sessionData
        } catch (error) {
            logger.error('Failed to create admin session:', error)
            // Fallback to memory storage
            this.sessions.set(sessionKey, sessionData)
            return sessionData
        }
    }

    async getSession(adminId, tokenId) {
        const sessionKey = `${adminId}:${tokenId}`

        try {
            if (redisClient) {
                const sessionData = await redisClient.get(
                    `admin_session:${sessionKey}`
                )
                return sessionData ? JSON.parse(sessionData) : null
            } else {
                return this.sessions.get(sessionKey)
            }
        } catch (error) {
            logger.error('Failed to get admin session:', error)
            return this.sessions.get(sessionKey)
        }
    }

    async updateSessionActivity(adminId, tokenId) {
        const sessionKey = `${adminId}:${tokenId}`

        try {
            const session = await this.getSession(adminId, tokenId)
            if (session) {
                session.lastActivity = new Date().toISOString()

                if (redisClient) {
                    await redisClient.setex(
                        `admin_session:${sessionKey}`,
                        24 * 60 * 60,
                        JSON.stringify(session)
                    )
                } else {
                    this.sessions.set(sessionKey, session)
                }
            }
        } catch (error) {
            logger.error('Failed to update session activity:', error)
        }
    }

    async removeSession(adminId, tokenId) {
        const sessionKey = `${adminId}:${tokenId}`

        try {
            if (redisClient) {
                await redisClient.del(`admin_session:${sessionKey}`)
            }
            return this.sessions.delete(sessionKey)
        } catch (error) {
            logger.error('Failed to remove admin session:', error)
            return this.sessions.delete(sessionKey)
        }
    }

    async getAdminSessions(adminId) {
        const sessions = []

        try {
            if (redisClient) {
                const keys = await redisClient.keys(
                    `admin_session:${adminId}:*`
                )
                for (const key of keys) {
                    const sessionData = await redisClient.get(key)
                    if (sessionData) {
                        sessions.push(JSON.parse(sessionData))
                    }
                }
            } else {
                for (const [key, session] of this.sessions) {
                    if (session.adminId === adminId) {
                        sessions.push(session)
                    }
                }
            }

            return sessions
        } catch (error) {
            logger.error('Failed to get admin sessions:', error)
            // Fallback to memory
            const memorySessions = []
            for (const [key, session] of this.sessions) {
                if (session.adminId === adminId) {
                    memorySessions.push(session)
                }
            }
            return memorySessions
        }
    }

    async removeAllAdminSessions(adminId) {
        try {
            const sessions = await this.getAdminSessions(adminId)

            if (redisClient) {
                const keys = await redisClient.keys(
                    `admin_session:${adminId}:*`
                )
                if (keys.length > 0) {
                    await redisClient.del(...keys)
                }
            }

            // Also clean memory sessions
            for (const [key, session] of this.sessions) {
                if (session.adminId === adminId) {
                    this.sessions.delete(key)
                }
            }

            return sessions.length
        } catch (error) {
            logger.error('Failed to remove all admin sessions:', error)
            return 0
        }
    }

    async cleanupExpiredSessions() {
        const now = new Date()
        let expiredCount = 0

        try {
            if (redisClient) {
                // Redis TTL handles expiration automatically
                // Just clean up memory sessions
                const expiredSessions = []

                for (const [key, session] of this.sessions) {
                    const lastActivity = new Date(session.lastActivity)
                    const inactiveHours =
                        (now - lastActivity) / (1000 * 60 * 60)

                    if (inactiveHours > 24) {
                        expiredSessions.push(key)
                    }
                }

                expiredSessions.forEach((key) => this.sessions.delete(key))
                expiredCount = expiredSessions.length
            } else {
                // Memory-only cleanup
                const expiredSessions = []

                for (const [key, session] of this.sessions) {
                    const lastActivity = new Date(session.lastActivity)
                    const inactiveHours =
                        (now - lastActivity) / (1000 * 60 * 60)

                    if (inactiveHours > 24) {
                        expiredSessions.push(key)
                    }
                }

                expiredSessions.forEach((key) => this.sessions.delete(key))
                expiredCount = expiredSessions.length
            }

            return expiredCount
        } catch (error) {
            logger.error('Failed to cleanup expired sessions:', error)
            return 0
        }
    }
}

// Create singleton instance
const adminSessionManager = new AdminSessionManager()

// Cleanup expired sessions every hour
setInterval(
    async () => {
        try {
            const cleaned = await adminSessionManager.cleanupExpiredSessions()
            if (cleaned > 0) {
                logger.info(`Cleaned up ${cleaned} expired admin sessions`)
            }
        } catch (error) {
            logger.error('Session cleanup failed:', error)
        }
    },
    60 * 60 * 1000
)

module.exports = {
    adminSessionManager,
    createAdminSessionData,
}
