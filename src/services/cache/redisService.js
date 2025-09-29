// services/cache/redisService.js
const redis = require('redis')
const { logger } = require('../../utils/logger')

class RedisService {
    constructor() {
        this.client = null
        this.isConnected = false
        this.initialize()
    }

    async initialize() {
        try {
            if (!process.env.REDIS_URL) {
                logger.warn('Redis URL not configured, caching disabled')
                return
            }

            this.client = redis.createClient({
                url: process.env.REDIS_URL,
                retry_strategy: (times) => {
                    const delay = Math.min(times * 50, 2000)
                    return delay
                },
            })

            this.client.on('error', (error) => {
                logger.error('Redis error:', error)
                this.isConnected = false
            })

            this.client.on('connect', () => {
                logger.info('Redis connected')
                this.isConnected = true
            })

            this.client.on('ready', () => {
                logger.info('Redis ready')
                this.isConnected = true
            })

            this.client.on('end', () => {
                logger.info('Redis connection ended')
                this.isConnected = false
            })

            await this.client.connect()
        } catch (error) {
            logger.error('Failed to initialize Redis:', error)
        }
    }

    // Get value from cache
    async get(key) {
        try {
            if (!this.isConnected) return null

            const value = await this.client.get(key)
            return value ? JSON.parse(value) : null
        } catch (error) {
            logger.error('Redis get error:', error)
            return null
        }
    }

    // Set value in cache
    async set(key, value, ttlSeconds = 3600) {
        try {
            if (!this.isConnected) return false

            await this.client.setEx(key, ttlSeconds, JSON.stringify(value))
            return true
        } catch (error) {
            logger.error('Redis set error:', error)
            return false
        }
    }

    // Delete key from cache
    async del(key) {
        try {
            if (!this.isConnected) return false

            await this.client.del(key)
            return true
        } catch (error) {
            logger.error('Redis delete error:', error)
            return false
        }
    }

    // Check if key exists
    async exists(key) {
        try {
            if (!this.isConnected) return false

            const result = await this.client.exists(key)
            return result === 1
        } catch (error) {
            logger.error('Redis exists error:', error)
            return false
        }
    }

    // Set hash
    async hset(hash, field, value) {
        try {
            if (!this.isConnected) return false

            await this.client.hSet(hash, field, JSON.stringify(value))
            return true
        } catch (error) {
            logger.error('Redis hset error:', error)
            return false
        }
    }

    // Get hash field
    async hget(hash, field) {
        try {
            if (!this.isConnected) return null

            const value = await this.client.hGet(hash, field)
            return value ? JSON.parse(value) : null
        } catch (error) {
            logger.error('Redis hget error:', error)
            return null
        }
    }

    // Get all hash fields
    async hgetall(hash) {
        try {
            if (!this.isConnected) return {}

            const fields = await this.client.hGetAll(hash)
            const result = {}
            
            for (const [field, value] of Object.entries(fields)) {
                result[field] = JSON.parse(value)
            }
            
            return result
        } catch (error) {
            logger.error('Redis hgetall error:', error)
            return {}
        }
    }

    // Add to set
    async sadd(set, member) {
        try {
            if (!this.isConnected) return false

            await this.client.sAdd(set, JSON.stringify(member))
            return true
        } catch (error) {
            logger.error('Redis sadd error:', error)
            return false
        }
    }

    // Check if member exists in set
    async sismember(set, member) {
        try {
            if (!this.isConnected) return false

            const result = await this.client.sIsMember(set, JSON.stringify(member))
            return result
        } catch (error) {
            logger.error('Redis sismember error:', error)
            return false
        }
    }

    // Get set members
    async smembers(set) {
        try {
            if (!this.isConnected) return []

            const members = await this.client.sMembers(set)
            return members.map(member => JSON.parse(member))
        } catch (error) {
            logger.error('Redis smembers error:', error)
            return []
        }
    }

    // Set expiration
    async expire(key, seconds) {
        try {
            if (!this.isConnected) return false

            await this.client.expire(key, seconds)
            return true
        } catch (error) {
            logger.error('Redis expire error:', error)
            return false
        }
    }

    // Cache route data
    async cacheRoute(routeId, routeData, ttl = 3600) {
        return await this.set(`route:${routeId}`, routeData, ttl)
    }

    // Get cached route
    async getCachedRoute(routeId) {
        return await this.get(`route:${routeId}`)
    }

    // Cache search results
    async cacheSearchResults(searchKey, results, ttl = 300) {
        return await this.set(`search:${searchKey}`, results, ttl)
    }

    // Get cached search results
    async getCachedSearchResults(searchKey) {
        return await this.get(`search:${searchKey}`)
    }

    // Cache user session
    async cacheUserSession(userId, sessionData, ttl = 3600) {
        return await this.set(`session:${userId}`, sessionData, ttl)
    }

    // Get cached user session
    async getCachedUserSession(userId) {
        return await this.get(`session:${userId}`)
    }

    // Close connection
    async close() {
        if (this.client) {
            await this.client.quit()
        }
    }
}

module.exports = new RedisService()