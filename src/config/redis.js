const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

// Redis configuration options
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis server refused connection');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts reached');
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  },
  connect_timeout: 60000,
  lazyConnect: true
};

// Initialize Redis client
const initializeRedis = async () => {
  try {
    if (process.env.NODE_ENV === 'test') {
      logger.info('Skipping Redis initialization in test environment');
      return null;
    }

    redisClient = redis.createClient(redisConfig);

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis connection established successfully');
    
    return redisClient;
  } catch (error) {
    logger.warn('Redis connection failed, continuing without caching:', error.message);
    return null;
  }
};

// Get Redis client instance
const getRedisClient = () => {
  return redisClient;
};

// Check if Redis is available
const isRedisAvailable = () => {
  return redisClient && redisClient.isReady;
};

// Cache helper functions
const cache = {
  // Set a value with optional expiration
  set: async (key, value, ttl = 3600) => {
    if (!isRedisAvailable()) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await redisClient.setEx(key, ttl, serializedValue);
      } else {
        await redisClient.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  },

  // Get a value
  get: async (key) => {
    if (!isRedisAvailable()) return null;
    
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  // Delete a key
  del: async (key) => {
    if (!isRedisAvailable()) return false;
    
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    if (!isRedisAvailable()) return false;
    
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  },

  // Set expiration on existing key
  expire: async (key, ttl) => {
    if (!isRedisAvailable()) return false;
    
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  },

  // Increment a counter
  incr: async (key) => {
    if (!isRedisAvailable()) return null;
    
    try {
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', error);
      return null;
    }
  },

  // Add to a set
  sadd: async (key, ...members) => {
    if (!isRedisAvailable()) return false;
    
    try {
      await redisClient.sAdd(key, members);
      return true;
    } catch (error) {
      logger.error('Redis sadd error:', error);
      return false;
    }
  },

  // Check if member exists in set
  sismember: async (key, member) => {
    if (!isRedisAvailable()) return false;
    
    try {
      return await redisClient.sIsMember(key, member);
    } catch (error) {
      logger.error('Redis sismember error:', error);
      return false;
    }
  },

  // Get all members of a set
  smembers: async (key) => {
    if (!isRedisAvailable()) return [];
    
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      logger.error('Redis smembers error:', error);
      return [];
    }
  },

  // Add to hash
  hset: async (key, field, value) => {
    if (!isRedisAvailable()) return false;
    
    try {
      await redisClient.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis hset error:', error);
      return false;
    }
  },

  // Get from hash
  hget: async (key, field) => {
    if (!isRedisAvailable()) return null;
    
    try {
      const value = await redisClient.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis hget error:', error);
      return null;
    }
  },

  // Get all hash fields and values
  hgetall: async (key) => {
    if (!isRedisAvailable()) return {};
    
    try {
      const hash = await redisClient.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      logger.error('Redis hgetall error:', error);
      return {};
    }
  }
};

// Session store for user sessions
const sessionStore = {
  // Store user session
  setSession: async (userId, sessionData, ttl = 86400) => {
    const key = `session:${userId}`;
    return await cache.set(key, sessionData, ttl);
  },

  // Get user session
  getSession: async (userId) => {
    const key = `session:${userId}`;
    return await cache.get(key);
  },

  // Delete user session
  deleteSession: async (userId) => {
    const key = `session:${userId}`;
    return await cache.del(key);
  },

  // Update session activity
  updateActivity: async (userId) => {
    const key = `session:${userId}`;
    if (await cache.exists(key)) {
      return await cache.expire(key, 86400); // Extend for 24 hours
    }
    return false;
  }
};

// Rate limiting store
const rateLimitStore = {
  // Increment request count for IP/user
  increment: async (key, windowMs) => {
    if (!isRedisAvailable()) return { count: 1, resetTime: Date.now() + windowMs };
    
    try {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }
      const ttl = await redisClient.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return { count: current, resetTime };
    } catch (error) {
      logger.error('Rate limit increment error:', error);
      return { count: 1, resetTime: Date.now() + windowMs };
    }
  },

  // Get current count
  get: async (key) => {
    if (!isRedisAvailable()) return 0;
    
    try {
      const count = await redisClient.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      logger.error('Rate limit get error:', error);
      return 0;
    }
  }
};

// Cache middleware for Express routes
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (!isRedisAvailable()) {
      return next();
    }

    // Generate cache key based on route and query params
    const key = `cache:${req.method}:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cache.get(key);
      
      if (cachedResponse) {
        logger.debug(`Cache hit for ${key}`);
        return res.json(cachedResponse);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          cache.set(key, data, ttl).catch(err => {
            logger.error('Cache set error:', err);
          });
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Graceful shutdown
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisAvailable,
  cache,
  sessionStore,
  rateLimitStore,
  cacheMiddleware,
  closeRedis
};