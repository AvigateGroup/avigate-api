const adminPermissionMethods = {
  // Permission checking
  hasPermission: function(permission) {
    if (this.role === 'super_admin') return true;
    return this.permissions.includes(permission);
  },

  hasAnyPermission: function(permissions) {
    if (this.role === 'super_admin') return true;
    return permissions.some(permission => this.permissions.includes(permission));
  },

  addPermission: function(permission) {
    const validPermissions = this.constructor.getPermissionsList();
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
    
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  },

  removePermission: function(permission) {
    const index = this.permissions.indexOf(permission);
    if (index > -1) {
      this.permissions.splice(index, 1);
    }
  },

  getFullName: function() {
    return `${this.firstName} ${this.lastName}`;
  }
};

const adminStaticMethods = {
  // Find methods
  findByEmail: function(email) {
    return this.findOne({ 
      where: { 
        email: email.toLowerCase(), 
        isActive: true 
      } 
    });
  },

  findActiveAdmins: function(options = {}) {
    return this.findAll({
      where: { isActive: true },
      include: [
        {
          model: this,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      ...options
    });
  },

  // Enhanced permissions system
  getPermissionsList: function() {
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
  },

  getRolePermissions: function(role) {
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
      super_admin: this.getPermissionsList()
    };
    
    return permissions[role] || [];
  },

  getRoleHierarchy: function() {
    return {
      super_admin: 4,
      admin: 3,
      moderator: 2,
      analyst: 1
    };
  },

  canManageRole: function(managerRole, targetRole) {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[managerRole] > hierarchy[targetRole];
  },

  // Security and validation methods
  validateRole: function(role) {
    const validRoles = ['super_admin', 'admin', 'moderator', 'analyst'];
    return validRoles.includes(role);
  },

  getActiveAdminCount: async function() {
    return this.count({ where: { isActive: true } });
  },

  getSuperAdminCount: async function() {
    return this.count({ 
      where: { 
        role: 'super_admin', 
        isActive: true 
      } 
    });
  },

  // Ensure at least one super admin exists
  ensureSuperAdminExists: async function() {
    const superAdminCount = await this.getSuperAdminCount();
    if (superAdminCount === 0) {
      throw new Error('Cannot remove the last super administrator');
    }
  }
};

// Define associations
const adminAssociations = (models) => {
  return {
    // Self-referencing associations for creator tracking
    creator: {
      association: models.Admin.belongsTo(models.Admin, { 
        foreignKey: 'createdBy', 
        as: 'creator',
        constraints: false 
      })
    },
    lastModifier: {
      association: models.Admin.belongsTo(models.Admin, { 
        foreignKey: 'lastModifiedBy', 
        as: 'lastModifier',
        constraints: false 
      })
    },
    auditLogs: {
      association: models.Admin.hasMany(models.AuditLog, {
        foreignKey: 'adminId',
        as: 'auditLogs'
      })
    }
  };
};

module.exports = {
  adminPermissionMethods,
  adminStaticMethods,
  adminAssociations
};