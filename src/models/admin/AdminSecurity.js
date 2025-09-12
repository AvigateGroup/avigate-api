const bcrypt = require('bcryptjs');

const adminSecurityMethods = {
  // Password comparison
  comparePassword: async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  },

  // Security tracking
  incrementFailedAttempts: async function() {
    this.failedLoginAttempts += 1;
    
    // Progressive lockout: 5 attempts = 30 min, 10 attempts = 2 hours, 15+ = 24 hours
    let lockDuration = 30 * 60 * 1000; // 30 minutes default
    
    if (this.failedLoginAttempts >= 15) {
      lockDuration = 24 * 60 * 60 * 1000; // 24 hours
    } else if (this.failedLoginAttempts >= 10) {
      lockDuration = 2 * 60 * 60 * 1000; // 2 hours
    }
    
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + lockDuration);
    }
    
    await this.save();
  },

  resetFailedAttempts: async function() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  },

  isLocked: function() {
    return this.lockedUntil && this.lockedUntil > new Date();
  },

  updateLastLogin: async function(ip, userAgent) {
    this.lastLoginAt = new Date();
    this.lastLoginIP = ip;
    this.lastUserAgent = userAgent;
    await this.resetFailedAttempts();
  },

  // Security checks
  requiresPasswordChange: function() {
    if (this.mustChangePassword) return true;
    
    // Require password change every 90 days
    if (this.passwordChangedAt) {
      const daysSinceChange = (Date.now() - new Date(this.passwordChangedAt)) / (1000 * 60 * 60 * 24);
      return daysSinceChange > 90;
    }
    
    return false;
  },

  isPasswordExpired: function() {
    // Force password change every 180 days (hard limit)
    if (this.passwordChangedAt) {
      const daysSinceChange = (Date.now() - new Date(this.passwordChangedAt)) / (1000 * 60 * 60 * 24);
      return daysSinceChange > 180;
    }
    
    return true; // No password change date means expired
  },

  // JSON serialization
  toJSON: function() {
    const admin = { ...this.get() };
    delete admin.passwordHash;
    delete admin.totpSecret;
    delete admin.totpBackupCodes;
    delete admin.refreshToken;
    delete admin.passwordHistory;
    return admin;
  }
};

// Add security fields to the model
const securityFields = {
  // Security tracking
  lastLoginAt: {
    type: require('sequelize').DataTypes.DATE,
    allowNull: true
  },
  lastLoginIP: {
    type: require('sequelize').DataTypes.STRING,
    allowNull: true,
    validate: {
      isIP: {
        msg: 'Invalid IP address format'
      }
    }
  },
  lastUserAgent: {
    type: require('sequelize').DataTypes.TEXT,
    allowNull: true
  },
  failedLoginAttempts: {
    type: require('sequelize').DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  lockedUntil: {
    type: require('sequelize').DataTypes.DATE,
    allowNull: true
  },
  // Session management
  refreshToken: {
    type: require('sequelize').DataTypes.TEXT,
    allowNull: true
  },
  refreshTokenExpiresAt: {
    type: require('sequelize').DataTypes.DATE,
    allowNull: true
  }
};

module.exports = {
  adminSecurityMethods,
  securityFields
};