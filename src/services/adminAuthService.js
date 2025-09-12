const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Redis = require('ioredis');

// Redis client for session storage (fallback to memory if not available)
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    logger.info('Redis connected for session storage');
  }
} catch (error) {
  logger.warn('Redis not available, using in-memory session storage');
}

// Generate JWT access token for admin
const generateAdminAccessToken = (admin) => {
  const payload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    type: 'admin',
    tokenId: crypto.randomUUID()
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'avigate-admin',
    audience: 'avigate-admin-panel'
  });
};

// Generate JWT refresh token for admin - Fixed with tokenId
const generateAdminRefreshToken = (admin) => {
  const tokenId = crypto.randomUUID();
  const payload = {
    adminId: admin.id,
    email: admin.email,
    type: 'admin_refresh',
    tokenId
  };

  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'avigate-admin',
    audience: 'avigate-admin-panel'
  });

  return { token, tokenId };
};

// Generate both access and refresh tokens for admin - Fixed
const generateAdminTokens = (admin) => {
  const accessToken = generateAdminAccessToken(admin);
  const refreshTokenData = generateAdminRefreshToken(admin);
  
  // Extract tokenId from access token for consistency
  const accessPayload = jwt.decode(accessToken);
  
  return {
    accessToken,
    refreshToken: refreshTokenData.token,
    tokenId: accessPayload.tokenId // Return tokenId for session management
  };
};

// Verify admin access token
const verifyAdminAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'avigate-admin',
      audience: 'avigate-admin-panel'
    });
    
    if (decoded.type !== 'admin') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Admin access token verification failed:', error.message);
    return null;
  }
};

// Verify admin refresh token
const verifyAdminRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'avigate-admin',
      audience: 'avigate-admin-panel'
    });
    
    if (decoded.type !== 'admin_refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Admin refresh token verification failed:', error.message);
    return null;
  }
};

// Enhanced Blacklist management with Redis support
class TokenBlacklistManager {
  constructor() {
    this.memoryBlacklist = new Set();
    this.maxMemoryTokens = 5000;
  }

  async blacklistToken(tokenId, expiresIn = '15m') {
    const ttl = this.getExpirySeconds(expiresIn);
    
    try {
      if (redisClient) {
        await redisClient.setex(`blacklist:${tokenId}`, ttl, '1');
      } else {
        this.memoryBlacklist.add(tokenId);
        this.cleanupMemoryBlacklist();
      }
      logger.debug(`Token blacklisted: ${tokenId}`);
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      // Fallback to memory
      this.memoryBlacklist.add(tokenId);
      this.cleanupMemoryBlacklist();
    }
  }

  async isTokenBlacklisted(tokenId) {
    try {
      if (redisClient) {
        const result = await redisClient.get(`blacklist:${tokenId}`);
        return result === '1';
      } else {
        return this.memoryBlacklist.has(tokenId);
      }
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      return this.memoryBlacklist.has(tokenId);
    }
  }

  cleanupMemoryBlacklist() {
    if (this.memoryBlacklist.size > this.maxMemoryTokens) {
      const tokensArray = Array.from(this.memoryBlacklist);
      this.memoryBlacklist.clear();
      tokensArray.slice(-2500).forEach(token => this.memoryBlacklist.add(token));
    }
  }

  getExpirySeconds(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }
}

const tokenBlacklistManager = new TokenBlacklistManager();

// Wrapper functions for backward compatibility
const blacklistAdminToken = async (tokenId, expiresIn) => {
  return tokenBlacklistManager.blacklistToken(tokenId, expiresIn);
};

const isAdminTokenBlacklisted = async (tokenId) => {
  return tokenBlacklistManager.isTokenBlacklisted(tokenId);
};

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
    permissions: admin.permissions
  };
};

// Extract admin token information
const extractAdminTokenInfo = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return null;
    
    return {
      adminId: decoded.adminId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      type: decoded.type,
      tokenId: decoded.tokenId,
      iat: decoded.iat,
      exp: decoded.exp,
      issuer: decoded.iss,
      audience: decoded.aud,
      isExpired: decoded.exp < Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    return null;
  }
};

// Generate secure admin invite token
const generateAdminInviteToken = (email, role, invitedBy) => {
  const payload = {
    email,
    role,
    invitedBy,
    type: 'admin_invite',
    inviteId: crypto.randomUUID()
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d', // Invite expires in 7 days
    issuer: 'avigate-admin',
    audience: 'avigate-admin-invite'
  });
};

// Verify admin invite token
const verifyAdminInviteToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'avigate-admin',
      audience: 'avigate-admin-invite'
    });
    
    if (decoded.type !== 'admin_invite') {
      throw new Error('Invalid invite token type');
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Admin invite token verification failed:', error.message);
    return null;
  }
};

// Generate password reset token for admin
const generateAdminPasswordResetToken = (admin) => {
  const payload = {
    adminId: admin.id,
    email: admin.email,
    type: 'admin_password_reset',
    resetId: crypto.randomUUID()
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h', // Password reset expires in 1 hour
    issuer: 'avigate-admin',
    audience: 'avigate-admin-reset'
  });
};

// Verify admin password reset token
const verifyAdminPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'avigate-admin',
      audience: 'avigate-admin-reset'
    });
    
    if (decoded.type !== 'admin_password_reset') {
      throw new Error('Invalid password reset token type');
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Admin password reset token verification failed:', error.message);
    return null;
  }
};

// Generate API key for admin operations
const generateAdminAPIKey = (admin, name, permissions = [], expiresIn = '30d') => {
  const payload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    keyName: name,
    permissions,
    type: 'admin_api_key',
    keyId: crypto.randomUUID()
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'avigate-admin',
    audience: 'avigate-api'
  });

  // Create a prefixed API key
  const apiKey = `avgt_admin_${Buffer.from(token).toString('base64url')}`;
  
  return {
    apiKey,
    keyId: payload.keyId,
    name,
    permissions,
    expiresAt: new Date(Date.now() + getExpiryMilliseconds(expiresIn))
  };
};

// Verify admin API key
const verifyAdminAPIKey = (apiKey) => {
  try {
    if (!apiKey.startsWith('avgt_admin_')) {
      throw new Error('Invalid API key format');
    }
    
    const token = Buffer.from(apiKey.replace('avgt_admin_', ''), 'base64url').toString();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'avigate-admin',
      audience: 'avigate-api'
    });
    
    if (decoded.type !== 'admin_api_key') {
      throw new Error('Invalid API key type');
    }
    
    return decoded;
  } catch (error) {
    logger.debug('Admin API key verification failed:', error.message);
    return null;
  }
};

// Convert expiry string to milliseconds
const getExpiryMilliseconds = (expiresIn) => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
};

// Enhanced Admin session management with Redis support
class AdminSessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessions = 5; // Maximum concurrent sessions per admin
  }

  async createSession(admin, tokenId, req) {
    const sessionData = createAdminSessionData(admin, tokenId, req);
    const sessionKey = `${admin.id}:${tokenId}`;
    
    try {
      // Get existing sessions for this admin
      const adminSessions = await this.getAdminSessions(admin.id);
      
      // If max sessions reached, remove oldest
      if (adminSessions.length >= this.maxSessions) {
        const oldestSession = adminSessions.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        )[0];
        
        await this.removeSession(admin.id, oldestSession.tokenId);
      }
      
      // Store session
      if (redisClient) {
        await redisClient.setex(
          `admin_session:${sessionKey}`, 
          24 * 60 * 60, // 24 hours TTL
          JSON.stringify(sessionData)
        );
      } else {
        this.sessions.set(sessionKey, sessionData);
      }
      
      return sessionData;
    } catch (error) {
      logger.error('Failed to create admin session:', error);
      // Fallback to memory storage
      this.sessions.set(sessionKey, sessionData);
      return sessionData;
    }
  }

  async getSession(adminId, tokenId) {
    const sessionKey = `${adminId}:${tokenId}`;
    
    try {
      if (redisClient) {
        const sessionData = await redisClient.get(`admin_session:${sessionKey}`);
        return sessionData ? JSON.parse(sessionData) : null;
      } else {
        return this.sessions.get(sessionKey);
      }
    } catch (error) {
      logger.error('Failed to get admin session:', error);
      return this.sessions.get(sessionKey);
    }
  }

  async updateSessionActivity(adminId, tokenId) {
    const sessionKey = `${adminId}:${tokenId}`;
    
    try {
      const session = await this.getSession(adminId, tokenId);
      if (session) {
        session.lastActivity = new Date().toISOString();
        
        if (redisClient) {
          await redisClient.setex(
            `admin_session:${sessionKey}`,
            24 * 60 * 60,
            JSON.stringify(session)
          );
        } else {
          this.sessions.set(sessionKey, session);
        }
      }
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  async removeSession(adminId, tokenId) {
    const sessionKey = `${adminId}:${tokenId}`;
    
    try {
      if (redisClient) {
        await redisClient.del(`admin_session:${sessionKey}`);
      }
      return this.sessions.delete(sessionKey);
    } catch (error) {
      logger.error('Failed to remove admin session:', error);
      return this.sessions.delete(sessionKey);
    }
  }

  async getAdminSessions(adminId) {
    const sessions = [];
    
    try {
      if (redisClient) {
        const keys = await redisClient.keys(`admin_session:${adminId}:*`);
        for (const key of keys) {
          const sessionData = await redisClient.get(key);
          if (sessionData) {
            sessions.push(JSON.parse(sessionData));
          }
        }
      } else {
        for (const [key, session] of this.sessions) {
          if (session.adminId === adminId) {
            sessions.push(session);
          }
        }
      }
      
      return sessions;
    } catch (error) {
      logger.error('Failed to get admin sessions:', error);
      // Fallback to memory
      const memorySessions = [];
      for (const [key, session] of this.sessions) {
        if (session.adminId === adminId) {
          memorySessions.push(session);
        }
      }
      return memorySessions;
    }
  }

  async removeAllAdminSessions(adminId) {
    try {
      const sessions = await this.getAdminSessions(adminId);
      
      if (redisClient) {
        const keys = await redisClient.keys(`admin_session:${adminId}:*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
      
      // Also clean memory sessions
      for (const [key, session] of this.sessions) {
        if (session.adminId === adminId) {
          this.sessions.delete(key);
        }
      }
      
      return sessions.length;
    } catch (error) {
      logger.error('Failed to remove all admin sessions:', error);
      return 0;
    }
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    let expiredCount = 0;
    
    try {
      if (redisClient) {
        // Redis TTL handles expiration automatically
        // Just clean up memory sessions
        const expiredSessions = [];
        
        for (const [key, session] of this.sessions) {
          const lastActivity = new Date(session.lastActivity);
          const inactiveHours = (now - lastActivity) / (1000 * 60 * 60);
          
          if (inactiveHours > 24) {
            expiredSessions.push(key);
          }
        }
        
        expiredSessions.forEach(key => this.sessions.delete(key));
        expiredCount = expiredSessions.length;
      } else {
        // Memory-only cleanup
        const expiredSessions = [];
        
        for (const [key, session] of this.sessions) {
          const lastActivity = new Date(session.lastActivity);
          const inactiveHours = (now - lastActivity) / (1000 * 60 * 60);
          
          if (inactiveHours > 24) {
            expiredSessions.push(key);
          }
        }
        
        expiredSessions.forEach(key => this.sessions.delete(key));
        expiredCount = expiredSessions.length;
      }
      
      return expiredCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}

// Create singleton instance
const adminSessionManager = new AdminSessionManager();

// Cleanup expired sessions every hour
setInterval(async () => {
  try {
    const cleaned = await adminSessionManager.cleanupExpiredSessions();
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired admin sessions`);
    }
  } catch (error) {
    logger.error('Session cleanup failed:', error);
  }
}, 60 * 60 * 1000);

// Validate admin JWT configuration
const validateAdminJWTConfig = () => {
  const errors = [];
  
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required for admin authentication');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }
  
  if (!process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_REFRESH_SECRET is required');
  } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET should be at least 32 characters long');
  }
  
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
  
  return errors;
};

// Enhanced admin security utilities
const adminSecurityUtils = {
  // Check if password meets admin requirements
  validateAdminPassword: (password) => {
    const errors = [];
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password123', 'admin123456', 'avigate123', 'qwerty123456'
    ];
    
    if (commonPasswords.some(common => 
      password.toLowerCase().includes(common.toLowerCase())
    )) {
      errors.push('Password contains common patterns that are not secure');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate secure admin password
  generateSecurePassword: (length = 16) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  // Check for suspicious admin activity
  detectSuspiciousActivity: (admin, req) => {
    const suspicious = [];
    
    // Check for unusual IP
    if (admin.lastLoginIP && admin.lastLoginIP !== req.ip) {
      suspicious.push('login_from_new_ip');
    }
    
    // Check for rapid requests
    const now = Date.now();
    const lastActivity = admin.lastLoginAt ? new Date(admin.lastLoginAt).getTime() : 0;
    if (now - lastActivity < 60000) { // Less than 1 minute
      suspicious.push('rapid_activity');
    }
    
    // Check user agent changes
    const currentUA = req.get('User-Agent');
    if (admin.lastUserAgent && admin.lastUserAgent !== currentUA) {
      suspicious.push('user_agent_change');
    }
    
    // Check for non-business hours access (if configured)
    const hour = new Date().getHours();
    if (process.env.BUSINESS_HOURS_ONLY === 'true') {
      if (hour < 6 || hour > 22) { // Outside 6 AM - 10 PM
        suspicious.push('non_business_hours');
      }
    }
    
    return suspicious;
  },

  // Rate limiting for sensitive operations
  createOperationLimiter: () => {
    const limits = new Map();
    
    return {
      checkLimit: (adminId, operation, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
        const key = `${adminId}:${operation}`;
        const now = Date.now();
        
        if (!limits.has(key)) {
          limits.set(key, { count: 1, firstAttempt: now });
          return { allowed: true, remaining: maxAttempts - 1 };
        }
        
        const record = limits.get(key);
        
        // Reset window if expired
        if (now - record.firstAttempt > windowMs) {
          limits.set(key, { count: 1, firstAttempt: now });
          return { allowed: true, remaining: maxAttempts - 1 };
        }
        
        // Check if limit exceeded
        if (record.count >= maxAttempts) {
          return { 
            allowed: false, 
            remaining: 0,
            resetTime: new Date(record.firstAttempt + windowMs)
          };
        }
        
        // Increment count
        record.count++;
        return { 
          allowed: true, 
          remaining: maxAttempts - record.count 
        };
      }
    };
  }
};

module.exports = {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokens,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
  createAdminSessionData,
  blacklistAdminToken,
  isAdminTokenBlacklisted,
  extractAdminTokenInfo,
  generateAdminInviteToken,
  verifyAdminInviteToken,
  generateAdminPasswordResetToken,
  verifyAdminPasswordResetToken,
  generateAdminAPIKey,
  verifyAdminAPIKey,
  adminSessionManager,
  validateAdminJWTConfig,
  adminSecurityUtils,
  tokenBlacklistManager
};