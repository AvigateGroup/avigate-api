const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../../utils/logger');

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

module.exports = {
  generateAdminInviteToken,
  verifyAdminInviteToken,
  generateAdminPasswordResetToken,
  verifyAdminPasswordResetToken,
  generateAdminAPIKey,
  verifyAdminAPIKey,
  getExpiryMilliseconds
};