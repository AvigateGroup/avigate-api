const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../../utils/logger');

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

// Generate JWT refresh token for admin
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

// Generate both access and refresh tokens for admin
const generateAdminTokens = (admin) => {
  const accessToken = generateAdminAccessToken(admin);
  const refreshTokenData = generateAdminRefreshToken(admin);
  
  // Extract tokenId from access token for consistency
  const accessPayload = jwt.decode(accessToken);
  
  return {
    accessToken,
    refreshToken: refreshTokenData.token,
    tokenId: accessPayload.tokenId
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

module.exports = {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokens,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
  extractAdminTokenInfo,
  validateAdminJWTConfig
};