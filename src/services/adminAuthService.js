const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate JWT access token for admin
const generateAdminAccessToken = (admin) => {
  const payload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    type: 'admin'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'avigate-admin',
    audience: 'avigate-admin-panel'
  });
};

// Generate JWT refresh token for admin
const generateAdminRefreshToken = (admin) => {
  const payload = {
    adminId: admin.id,
    email: admin.email,
    type: 'admin_refresh',
    tokenId: crypto.randomUUID()
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'avigate-admin',
    audience: 'avigate-admin-panel'
  });
};

// Generate both access and refresh tokens for admin
const generateAdminTokens = (admin) => {
  return {
    accessToken: generateAdminAccessToken(admin),
    refreshToken: generateAdminRefreshToken(admin)
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

// Blacklist management for admin tokens
const adminBlacklistedTokens = new Set();

const blacklistAdminToken = (tokenId) => {
  adminBlacklistedTokens.add(tokenId);
  
  // Clean up old tokens periodically
  if (adminBlacklistedTokens.size > 5000) {
    const tokensArray = Array.from(adminBlacklistedTokens);
    adminBlacklistedTokens.clear();
    // Keep only the most recent 2500 tokens
    tokensArray.slice(-2500).forEach(token => adminBlacklistedTokens.add(token));
  }
};

const isAdminTokenBlacklisted = (tokenId) => {
  return adminBlacklistedTokens.has(tokenId);
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

// Admin session management
class AdminSessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessions = 5; // Maximum concurrent sessions per admin
  }

  createSession(admin, tokenId, req) {
    const sessionData = createAdminSessionData(admin, tokenId, req);
    const sessionKey = `${admin.id}:${tokenId}`;
    
    // Get existing sessions for this admin
    const adminSessions = this.getAdminSessions(admin.id);
    
    // If max sessions reached, remove oldest
    if (adminSessions.length >= this.maxSessions) {
      const oldestSession = adminSessions.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )[0];
      
      this.removeSession(admin.id, oldestSession.tokenId);
    }
    
    this.sessions.set(sessionKey, sessionData);
    return sessionData;
  }

  getSession(adminId, tokenId) {
    return this.sessions.get(`${adminId}:${tokenId}`);
  }

  updateSessionActivity(adminId, tokenId) {
    const sessionKey = `${adminId}:${tokenId}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.sessions.set(sessionKey, session);
    }
  }

  removeSession(adminId, tokenId) {
    const sessionKey = `${adminId}:${tokenId}`;
    return this.sessions.delete(sessionKey);
  }

  getAdminSessions(adminId) {
    const sessions = [];
    for (const [key, session] of this.sessions) {
      if (session.adminId === adminId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  removeAllAdminSessions(adminId) {
    const sessions = this.getAdminSessions(adminId);
    sessions.forEach(session => {
      this.removeSession(adminId, session.tokenId);
    });
    return sessions.length;
  }

  cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];
    
    for (const [key, session] of this.sessions) {
      const lastActivity = new Date(session.lastActivity);
      const inactiveHours = (now - lastActivity) / (1000 * 60 * 60);
      
      // Remove sessions inactive for more than 24 hours
      if (inactiveHours > 24) {
        expiredSessions.push(key);
      }
    }
    
    expiredSessions.forEach(key => this.sessions.delete(key));
    return expiredSessions.length;
  }
}

// Create singleton instance
const adminSessionManager = new AdminSessionManager();

// Cleanup expired sessions every hour
setInterval(() => {
  const cleaned = adminSessionManager.cleanupExpiredSessions();
  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired admin sessions`);
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
  }
  
  return errors;
};

// Admin security utilities
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
    
    return suspicious;
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
  adminSecurityUtils
};