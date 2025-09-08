const { DataTypes, Op } = require('sequelize');

// User Analytics Model
const UserAnalytics = (sequelize, DataTypes) => {
  const UserAnalytics = sequelize.define('UserAnalytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // User metrics
    totalUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    newUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    activeUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    verifiedUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Engagement metrics
    dailyActiveUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    weeklyActiveUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    monthlyActiveUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Retention metrics
    dayOneRetention: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      allowNull: false
    },
    daySevenRetention: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      allowNull: false
    },
    dayThirtyRetention: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      allowNull: false
    },
    // User behavior
    avgSessionDuration: {
      type: DataTypes.INTEGER, // in minutes
      defaultValue: 0,
      allowNull: false
    },
    avgSearchesPerUser: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
      allowNull: false
    },
    avgRoutesPerUser: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
      allowNull: false
    }
  }, {
    tableName: 'user_analytics',
    timestamps: true,
    indexes: [
      { fields: ['date'] },
      { unique: true, fields: ['date'] }
    ]
  });

  return UserAnalytics;
};

// App Usage Analytics Model
const AppUsageAnalytics = (sequelize, DataTypes) => {
  const AppUsageAnalytics = sequelize.define('AppUsageAnalytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // API usage
    totalApiRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    searchRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    routeRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    authRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Feature usage
    locationSearches: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    routeCreations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    directionShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    crowdsourceContributions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Performance metrics
    avgResponseTime: {
      type: DataTypes.INTEGER, // in milliseconds
      defaultValue: 0,
      allowNull: false
    },
    errorRate: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      allowNull: false
    },
    uptime: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 1,
      allowNull: false
    }
  }, {
    tableName: 'app_usage_analytics',
    timestamps: true,
    indexes: [
      { fields: ['date'] },
      { unique: true, fields: ['date'] }
    ]
  });

  return AppUsageAnalytics;
};

// Geographic Analytics Model
const GeographicAnalytics = (sequelize, DataTypes) => {
  const GeographicAnalytics = sequelize.define('GeographicAnalytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // User metrics by location
    activeUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    newUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Usage metrics by location
    searchCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    routeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Popular vehicle types by location
    busUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    taxiUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    kekeUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    okadaUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    trainUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    tableName: 'geographic_analytics',
    timestamps: true,
    indexes: [
      { fields: ['date'] },
      { fields: ['state'] },
      { fields: ['city'] },
      { fields: ['date', 'state'] }
    ]
  });

  return GeographicAnalytics;
};

// System Metrics Model
const SystemMetrics = (sequelize, DataTypes) => {
  const SystemMetrics = sequelize.define('SystemMetrics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Database metrics
    dbConnections: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dbQueryTime: {
      type: DataTypes.INTEGER, // in milliseconds
      allowNull: false
    },
    dbSize: {
      type: DataTypes.BIGINT, // in bytes
      allowNull: false
    },
    // Redis metrics
    redisMemoryUsage: {
      type: DataTypes.BIGINT, // in bytes
      allowNull: true
    },
    redisConnections: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Server metrics
    cpuUsage: {
      type: DataTypes.DECIMAL(5, 2), // percentage
      allowNull: false
    },
    memoryUsage: {
      type: DataTypes.BIGINT, // in bytes
      allowNull: false
    },
    diskUsage: {
      type: DataTypes.BIGINT, // in bytes
      allowNull: false
    },
    // Application metrics
    activeConnections: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    requestsPerMinute: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    errorsPerMinute: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'system_metrics',
    timestamps: true,
    indexes: [
      { fields: ['timestamp'] }
    ]
  });

  return SystemMetrics;
};

// Audit Log Model
const AuditLog = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Who performed the action
    adminId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // What action was performed
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    // Action details
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Request context
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    method: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low',
      allowNull: false
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      { fields: ['adminId'] },
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['resource'] },
      { fields: ['createdAt'] },
      { fields: ['severity'] }
    ]
  });

  return AuditLog;
};

module.exports = {
  UserAnalytics,
  AppUsageAnalytics,
  GeographicAnalytics,
  SystemMetrics,
  AuditLog
};