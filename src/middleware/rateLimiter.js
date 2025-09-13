const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const {logger} = require('../utils/logger');

// Try to import Redis store, but make it optional
let store;

try {
  const redis = require('redis');
  const { RedisStore } = require('rate-limit-redis');
  
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  // Connect to Redis
  redisClient.connect().then(() => {
    logger.info('Redis connected for rate limiting');
    
    // Create Redis store for rate limiter
    store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  }).catch((error) => {
    logger.warn('Redis connection failed, using memory store for rate limiting:', error.message);
    store = undefined;
  });
  
} catch (error) {
  logger.warn('Redis or rate-limit-redis not available, using memory store for rate limiting:', error.message);
  store = undefined;
}

// General rate limiter
const generalLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `user:${req.user.id}` : req.ip;
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => `auth:${req.ip}`
});

// Search rate limiter (more generous)
const searchLimiter = rateLimit({
  store,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req) => {
    // Dynamic limit based on user reputation
    if (req.user) {
      const reputation = req.user.reputationScore || 0;
      if (reputation >= 500) return 100;
      if (reputation >= 200) return 50;
      if (reputation >= 100) return 30;
      return 20;
    }
    return 10; // Anonymous users
  },
  message: {
    success: false,
    message: 'Search rate limit exceeded, please try again later',
    retryAfter: '1 minute'
  },
  keyGenerator: (req) => {
    return req.user ? `search:user:${req.user.id}` : `search:ip:${req.ip}`;
  }
});

// Create route limiter (for user-generated content)
const createLimiter = rateLimit({
  store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    if (req.user) {
      const reputation = req.user.reputationScore || 0;
      if (reputation >= 500) return 50;
      if (reputation >= 200) return 20;
      if (reputation >= 100) return 10;
      return 5;
    }
    return 2; // Anonymous users (very limited)
  },
  message: {
    success: false,
    message: 'Content creation rate limit exceeded',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    return req.user ? `create:user:${req.user.id}` : `create:ip:${req.ip}`;
  }
});

// Slow down middleware for expensive operations
const expensiveOpSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per window at full speed
  delayMs: () => 500, // Fixed delay of 500ms (new syntax)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.user ? `slow:user:${req.user.id}` : `slow:ip:${req.ip}`;
  }
});

// Crowdsourcing rate limiter (to prevent spam)
const crowdsourceLimiter = rateLimit({
  store,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: (req) => {
    if (req.user) {
      const reputation = req.user.reputationScore || 0;
      if (reputation >= 500) return 20;
      if (reputation >= 200) return 10;
      if (reputation >= 100) return 5;
      return 3;
    }
    return 1; // Anonymous users (very limited)
  },
  message: {
    success: false,
    message: 'Crowdsource contribution limit exceeded',
    retryAfter: '5 minutes'
  },
  keyGenerator: (req) => {
    return req.user ? `crowd:user:${req.user.id}` : `crowd:ip:${req.ip}`;
  }
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'File upload rate limit exceeded',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    return req.user ? `upload:user:${req.user.id}` : `upload:ip:${req.ip}`;
  }
});

// Admin endpoints rate limiter
const adminLimiter = rateLimit({
  store,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for admin operations
  message: {
    success: false,
    message: 'Admin operation rate limit exceeded'
  },
  keyGenerator: (req) => `admin:user:${req.user.id}`
});

// Custom rate limiter for specific endpoints
const customLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = 'Rate limit exceeded',
    keyPrefix = 'custom'
  } = options;

  return rateLimit({
    store,
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: `${Math.floor(windowMs / 60000)} minutes`
    },
    keyGenerator: (req) => {
      return req.user 
        ? `${keyPrefix}:user:${req.user.id}` 
        : `${keyPrefix}:ip:${req.ip}`;
    }
  });
};

// Error handler for rate limiting
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err && err.status === 429) {
    logger.warn(`Rate limit exceeded for ${req.ip}`, {
      ip: req.ip,
      user: req.user?.id,
      endpoint: req.path,
      method: req.method
    });
  }
  next(err);
};

// Middleware to log rate limit info
const logRateLimit = (req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (res.statusCode === 429) {
      logger.warn('Rate limit hit', {
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
    }
    originalSend.call(this, body);
  };
  next();
};

module.exports = {
  general: generalLimiter,
  auth: authLimiter,
  search: searchLimiter,
  create: createLimiter,
  crowdsource: crowdsourceLimiter,
  upload: uploadLimiter,
  admin: adminLimiter,
  expensiveOp: expensiveOpSlowDown,
  custom: customLimiter,
  errorHandler: rateLimitErrorHandler,
  logRateLimit
};