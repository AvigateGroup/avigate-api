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
        },
        isAuthorizedDomain(value) {
          if (!value.toLowerCase().endsWith('@avigate.co')) {
            throw new Error('Email must be from @avigate.co domain');
          }
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
        },
        notEmpty: {
          msg: 'First name cannot be empty'
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
        },
        notEmpty: {
          msg: 'Last name cannot be empty'
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
      allowNull: false,
      validate: {
        isIn: {
          args: [['super_admin', 'admin', 'moderator', 'analyst']],
          msg: 'Invalid role specified'
        }
      }
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidPermissions(value) {
          if (!Array.isArray(value)) {
            throw new Error('Permissions must be an array');
          }
          const validPermissions = Admin.getPermissionsList();
          const invalidPerms = value.filter(p => !validPermissions.includes(p));
          if (invalidPerms.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}`);
          }
        }
      }
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
      allowNull: true,
      validate: {
        isIP: {
          msg: 'Invalid IP address format'
        }
      }
    },
    lastUserAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0
      }
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
    // Password history for security
    passwordHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    // Force password change
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true
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
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['lastLoginAt']
      }
    ],
    hooks: {
      beforeCreate: async (admin) => {
        if (admin.passwordHash) {
          // Check password history (for new admins, just validate strength)
          const { adminSecurityUtils } = require('../services/adminAuthService');
          const validation = adminSecurityUtils.validateAdminPassword(admin.passwordHash);
          if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
          }
          
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(admin.passwordHash, salt);
          
          // Store in password history
          admin.passwordHistory = [hashedPassword];
          admin.passwordHash = hashedPassword;
          admin.passwordChangedAt = new Date();
        }
        
        // Set default permissions based on role
        if (!admin.permissions || admin.permissions.length === 0) {
          admin.permissions = Admin.getRolePermissions(admin.role);
        }
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('passwordHash') && admin.passwordHash) {
          // Validate password strength
          const { adminSecurityUtils } = require('../services/adminAuthService');
          const validation = adminSecurityUtils.validateAdminPassword(admin.passwordHash);
          if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
          }
          
          // Check against password history (prevent reuse of last 5 passwords)
          const passwordHistory = admin.passwordHistory || [];
          for (const oldHash of passwordHistory) {
            const isReused = await bcrypt.compare(admin.passwordHash, oldHash);
            if (isReused) {
              throw new Error('Cannot reuse a previous password');
            }
          }
          
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(admin.passwordHash, salt);
          
          // Update password history (keep last 5)
          const updatedHistory = [hashedPassword, ...passwordHistory].slice(0, 5);
          admin.passwordHistory = updatedHistory;
          admin.passwordHash = hashedPassword;
          admin.passwordChangedAt = new Date();
          admin.mustChangePassword = false;
        }
        
        // Update permissions when role changes
        if (admin.changed('role')) {
          admin.permissions = Admin.getRolePermissions(admin.role);
        }
      }
    }
  });

  // Define associations
  Admin.associate = function(models) {
    // Self-referencing associations for creator tracking
    Admin.belongsTo(models.Admin, { 
      foreignKey: 'createdBy', 
      as: 'creator',
      constraints: false 
    });
    Admin.belongsTo(models.Admin, { 
      foreignKey: 'lastModifiedBy', 
      as: 'lastModifier',
      constraints: false 
    });
    
    // Admin can have many audit logs
    Admin.hasMany(models.AuditLog, {
      foreignKey: 'adminId',
      as: 'auditLogs'
    });
  };

  // Instance methods
  Admin.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  Admin.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  // Enhanced TOTP Methods
  Admin.prototype.generateTOTPSecret = function() {
    const secret = speakeasy.generateSecret({
      name: `Avigate Admin (${this.email})`,
      issuer: 'Avigate',
      length: 32 // Increased length for better security
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

  Admin.prototype.verifyTOTP = function(token, allowReplay = false) {
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
      // Generate more secure backup codes
      codes.push(
        Math.random().toString(36).substr(2, 4).toUpperCase() + 
        Math.random().toString(36).substr(2, 4).toUpperCase()
      );
    }
    return codes;
  };

  Admin.prototype.useBackupCode = async function(code) {
    const upperCode = code.toUpperCase();
    const index = this.totpBackupCodes.indexOf(upperCode);
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    this.totpBackupCodes.splice(index, 1);
    await this.save();
    return true;
  };

  // Enhanced security methods
  Admin.prototype.incrementFailedAttempts = async function() {
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
  };

  Admin.prototype.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  };

  Admin.prototype.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
  };

  Admin.prototype.updateLastLogin = async function(ip, userAgent) {
    this.lastLoginAt = new Date();
    this.lastLoginIP = ip;
    this.lastUserAgent = userAgent;
    await this.resetFailedAttempts();
  };

  // Enhanced permission methods
  Admin.prototype.hasPermission = function(permission) {
    if (this.role === 'super_admin') return true;
    return this.permissions.includes(permission);
  };

  Admin.prototype.hasAnyPermission = function(permissions) {
    if (this.role === 'super_admin') return true;
    return permissions.some(permission => this.permissions.includes(permission));
  };

  Admin.prototype.addPermission = function(permission) {
    const validPermissions = Admin.getPermissionsList();
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
    
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

  // Security checks
  Admin.prototype.requiresPasswordChange = function() {
    if (this.mustChangePassword) return true;
    
    // Require password change every 90 days
    if (this.passwordChangedAt) {
      const daysSinceChange = (Date.now() - new Date(this.passwordChangedAt)) / (1000 * 60 * 60 * 24);
      return daysSinceChange > 90;
    }
    
    return false;
  };

  Admin.prototype.isPasswordExpired = function() {
    // Force password change every 180 days (hard limit)
    if (this.passwordChangedAt) {
      const daysSinceChange = (Date.now() - new Date(this.passwordChangedAt)) / (1000 * 60 * 60 * 24);
      return daysSinceChange > 180;
    }
    
    return true; // No password change date means expired
  };

  // JSON serialization
  Admin.prototype.toJSON = function() {
    const admin = { ...this.get() };
    delete admin.passwordHash;
    delete admin.totpSecret;
    delete admin.totpBackupCodes;
    delete admin.refreshToken;
    delete admin.passwordHistory;
    return admin;
  };

  // Enhanced class methods
  Admin.findByEmail = function(email) {
    return Admin.findOne({ 
      where: { 
        email: email.toLowerCase(), 
        isActive: true 
      } 
    });
  };

  Admin.findActiveAdmins = function(options = {}) {
    return Admin.findAll({
      where: { isActive: true },
      include: [
        {
          model: Admin,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      ...options
    });
  };

  // Enhanced permissions system
  Admin.getPermissionsList = function() {
    return [
      // User management
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'users.export',
      'users.impersonate',
      
      // Location management
      'locations.view',
      'locations.create',
      'locations.edit',
      'locations.delete',
      'locations.verify',
      'locations.export',
      
      // Route management
      'routes.view',
      'routes.create',
      'routes.edit',
      'routes.delete',
      'routes.verify',
      'routes.export',
      
      // Analytics and reporting
      'analytics.view',
      'analytics.export',
      'analytics.advanced',
      'reports.generate',
      'reports.schedule',
      
      // System management
      'system.settings',
      'system.maintenance',
      'system.logs',
      'system.health',
      'system.backup',
      'system.restore',
      
      // Admin management (super admin only)
      'admins.view',
      'admins.create',
      'admins.edit',
      'admins.delete',
      'admins.roles',
      
      // Content moderation
      'content.moderate',
      'content.reports',
      'content.appeals',
      
      // API management
      'api.keys',
      'api.rate_limits',
      'api.webhooks',
      
      // Security and audit
      'security.audit',
      'security.sessions',
      'security.alerts',
      
      // Billing and payments (if applicable)
      'billing.view',
      'billing.manage',
      
      // Communications
      'communications.send',
      'communications.templates'
    ];
  };

  Admin.getRolePermissions = function(role) {
    const permissions = {
      analyst: [
        'users.view', 'locations.view', 'routes.view', 
        'analytics.view', 'analytics.export', 'reports.generate'
      ],
      moderator: [
        'users.view', 'users.edit', 'locations.view', 'locations.edit', 'locations.verify', 
        'routes.view', 'routes.edit', 'routes.verify', 'content.moderate', 'content.reports',
        'analytics.view', 'reports.generate'
      ],
      admin: [
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.export',
        'locations.view', 'locations.create', 'locations.edit', 'locations.delete', 'locations.verify', 'locations.export',
        'routes.view', 'routes.create', 'routes.edit', 'routes.delete', 'routes.verify', 'routes.export',
        'analytics.view', 'analytics.export', 'analytics.advanced', 'reports.generate', 'reports.schedule',
        'content.moderate', 'content.reports', 'content.appeals',
        'system.logs', 'system.health',
        'communications.send', 'communications.templates'
      ],
      super_admin: Admin.getPermissionsList()
    };
    
    return permissions[role] || [];
  };

  Admin.getRoleHierarchy = function() {
    return {
      super_admin: 4,
      admin: 3,
      moderator: 2,
      analyst: 1
    };
  };

  Admin.canManageRole = function(managerRole, targetRole) {
    const hierarchy = Admin.getRoleHierarchy();
    return hierarchy[managerRole] > hierarchy[targetRole];
  };

  // Security and validation methods
  Admin.validateRole = function(role) {
    const validRoles = ['super_admin', 'admin', 'moderator', 'analyst'];
    return validRoles.includes(role);
  };

  Admin.getActiveAdminCount = async function() {
    return Admin.count({ where: { isActive: true } });
  };

  Admin.getSuperAdminCount = async function() {
    return Admin.count({ 
      where: { 
        role: 'super_admin', 
        isActive: true 
      } 
    });
  };

  // Ensure at least one super admin exists
  Admin.ensureSuperAdminExists = async function() {
    const superAdminCount = await Admin.getSuperAdminCount();
    if (superAdminCount === 0) {
      throw new Error('Cannot remove the last super administrator');
    }
  };

  return Admin;
};