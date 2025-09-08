const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        }
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 50],
          msg: 'First name must be between 2 and 50 characters'
        }
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 50],
          msg: 'Last name must be between 2 and 50 characters'
        }
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8, 128],
          msg: 'Password must be between 8 and 128 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'moderator', 'analyst'),
      defaultValue: 'admin',
      allowNull: false
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    // TOTP Configuration
    totpSecret: {
      type: DataTypes.STRING,
      allowNull: true // Will be set when TOTP is enabled
    },
    totpEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    totpBackupCodes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    // Security tracking
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLoginIP: {
      type: DataTypes.STRING,
      allowNull: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Session management
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    refreshTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    // Audit trail
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id'
      }
    }
  }, {
    tableName: 'admins',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['totpEnabled']
      }
    ],
    hooks: {
      beforeCreate: async (admin) => {
        if (admin.passwordHash) {
          const salt = await bcrypt.genSalt(12);
          admin.passwordHash = await bcrypt.hash(admin.passwordHash, salt);
        }
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('passwordHash') && admin.passwordHash) {
          const salt = await bcrypt.genSalt(12);
          admin.passwordHash = await bcrypt.hash(admin.passwordHash, salt);
        }
      }
    }
  });

  // Instance methods
  Admin.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  Admin.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  // TOTP Methods
  Admin.prototype.generateTOTPSecret = function() {
    const secret = speakeasy.generateSecret({
      name: `Avigate Admin (${this.email})`,
      issuer: 'Avigate'
    });
    
    this.totpSecret = secret.base32;
    return secret;
  };

  Admin.prototype.generateQRCode = async function() {
    if (!this.totpSecret) {
      throw new Error('TOTP secret not generated');
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: this.totpSecret,
      label: `Avigate Admin (${this.email})`,
      issuer: 'Avigate',
      encoding: 'base32'
    });

    return qrcode.toDataURL(otpauthUrl);
  };

  Admin.prototype.verifyTOTP = function(token) {
    if (!this.totpSecret || !this.totpEnabled) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: this.totpSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after current
    });
  };

  Admin.prototype.enableTOTP = async function(token) {
    if (!this.totpSecret) {
      throw new Error('TOTP secret not generated');
    }

    const isValid = speakeasy.totp.verify({
      secret: this.totpSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValid) {
      throw new Error('Invalid TOTP token');
    }

    this.totpEnabled = true;
    this.totpBackupCodes = this.generateBackupCodes();
    await this.save();

    return this.totpBackupCodes;
  };

  Admin.prototype.disableTOTP = function() {
    this.totpEnabled = false;
    this.totpSecret = null;
    this.totpBackupCodes = [];
  };

  Admin.prototype.generateBackupCodes = function() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  };

  Admin.prototype.useBackupCode = async function(code) {
    const index = this.totpBackupCodes.indexOf(code);
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    this.totpBackupCodes.splice(index, 1);
    await this.save();
    return true;
  };

  // Security methods
  Admin.prototype.incrementFailedAttempts = async function() {
    this.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    await this.save();
  };

  Admin.prototype.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  };

  Admin.prototype.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
  };

  Admin.prototype.updateLastLogin = async function(ip) {
    this.lastLoginAt = new Date();
    this.lastLoginIP = ip;
    await this.resetFailedAttempts();
  };

  // Permission methods
  Admin.prototype.hasPermission = function(permission) {
    if (this.role === 'super_admin') return true;
    return this.permissions.includes(permission);
  };

  Admin.prototype.hasAnyPermission = function(permissions) {
    if (this.role === 'super_admin') return true;
    return permissions.some(permission => this.permissions.includes(permission));
  };

  Admin.prototype.addPermission = function(permission) {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  };

  Admin.prototype.removePermission = function(permission) {
    const index = this.permissions.indexOf(permission);
    if (index > -1) {
      this.permissions.splice(index, 1);
    }
  };

  // JSON serialization
  Admin.prototype.toJSON = function() {
    const admin = { ...this.get() };
    delete admin.passwordHash;
    delete admin.totpSecret;
    delete admin.totpBackupCodes;
    delete admin.refreshToken;
    return admin;
  };

  // Class methods
  Admin.findByEmail = function(email) {
    return Admin.findOne({ where: { email, isActive: true } });
  };

  Admin.getPermissionsList = function() {
    return [
      // User management
      'users.view',
      'users.edit',
      'users.delete',
      'users.export',
      
      // Location management
      'locations.view',
      'locations.create',
      'locations.edit',
      'locations.delete',
      'locations.verify',
      
      // Route management
      'routes.view',
      'routes.create',
      'routes.edit',
      'routes.delete',
      'routes.verify',
      
      // Analytics
      'analytics.view',
      'analytics.export',
      
      // System management
      'system.settings',
      'system.maintenance',
      'system.logs',
      
      // Admin management
      'admins.view',
      'admins.create',
      'admins.edit',
      'admins.delete',
      
      // Content moderation
      'content.moderate',
      'content.reports',
      
      // API management
      'api.keys',
      'api.rate_limits'
    ];
  };

  Admin.getRolePermissions = function(role) {
    const permissions = {
      analyst: [
        'users.view', 'locations.view', 'routes.view', 'analytics.view', 'analytics.export'
      ],
      moderator: [
        'users.view', 'users.edit', 'locations.view', 'locations.verify', 
        'routes.view', 'routes.verify', 'content.moderate', 'content.reports'
      ],
      admin: [
        'users.view', 'users.edit', 'users.delete', 'users.export',
        'locations.view', 'locations.create', 'locations.edit', 'locations.verify',
        'routes.view', 'routes.create', 'routes.edit', 'routes.verify',
        'analytics.view', 'analytics.export', 'content.moderate', 'content.reports'
      ],
      super_admin: Admin.getPermissionsList()
    };
    
    return permissions[role] || [];
  };

  return Admin;
};