const { Admin, User, Location, Route, AuditLog, sequelize } = require('../models');
const { generateAdminTokens, adminSessionManager } = require('../services/adminAuthService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const adminController = {
  // Admin Authentication
  login: async (req, res) => {
    try {
      const { email, password, totpToken, backupCode } = req.body;

      // Find admin
      const admin = await Admin.findByEmail(email);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (admin.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed attempts'
        });
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        await admin.incrementFailedAttempts();
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check TOTP if enabled
      if (admin.totpEnabled) {
        let totpValid = false;

        if (totpToken) {
          totpValid = admin.verifyTOTP(totpToken);
        } else if (backupCode) {
          totpValid = await admin.useBackupCode(backupCode);
        }

        if (!totpValid) {
          return res.status(401).json({
            success: false,
            message: 'Invalid TOTP token or backup code',
            requiresTOTP: true
          });
        }
      }

      // Generate tokens
      const tokens = generateAdminTokens(admin);

      // Update login info and create session
      await admin.updateLastLogin(req.ip);
      adminSessionManager.createSession(admin, tokens.tokenId, req);

      // Log successful login
      await AuditLog.create({
        adminId: admin.id,
        action: 'login',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      logger.info(`Admin logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: admin.toJSON(),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });

    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  },

  // Setup TOTP
  setupTOTP: async (req, res) => {
    try {
      const admin = req.admin;

      if (admin.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is already enabled'
        });
      }

      // Generate TOTP secret
      const secret = admin.generateTOTPSecret();
      await admin.save();

      // Generate QR code
      const qrCodeUrl = await admin.generateQRCode();

      res.json({
        success: true,
        message: 'TOTP setup initiated',
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32
        }
      });

    } catch (error) {
      logger.error('TOTP setup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup TOTP'
      });
    }
  },

  // Enable TOTP
  enableTOTP: async (req, res) => {
    try {
      const admin = req.admin;
      const { token } = req.body;

      if (admin.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is already enabled'
        });
      }

      // Enable TOTP and get backup codes
      const backupCodes = await admin.enableTOTP(token);

      // Log TOTP enablement
      await AuditLog.create({
        adminId: admin.id,
        action: 'enable_totp',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'TOTP enabled successfully',
        data: {
          backupCodes
        }
      });

    } catch (error) {
      logger.error('TOTP enable error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to enable TOTP'
      });
    }
  },

  // Disable TOTP
  disableTOTP: async (req, res) => {
    try {
      const admin = req.admin;
      const { currentPassword, totpToken } = req.body;

      // Verify current password
      const isPasswordValid = await admin.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Verify TOTP token
      if (!admin.verifyTOTP(totpToken)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid TOTP token'
        });
      }

      // Disable TOTP
      admin.disableTOTP();
      await admin.save();

      // Log TOTP disablement
      await AuditLog.create({
        adminId: admin.id,
        action: 'disable_totp',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'TOTP disabled successfully'
      });

    } catch (error) {
      logger.error('TOTP disable error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable TOTP'
      });
    }
  },

  // Generate new backup codes
  generateBackupCodes: async (req, res) => {
    try {
      const admin = req.admin;
      const { totpToken } = req.body;

      if (!admin.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is not enabled'
        });
      }

      // Verify TOTP token
      if (!admin.verifyTOTP(totpToken)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid TOTP token'
        });
      }

      // Generate new backup codes
      admin.totpBackupCodes = admin.generateBackupCodes();
      await admin.save();

      // Log backup codes generation
      await AuditLog.create({
        adminId: admin.id,
        action: 'generate_backup_codes',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'New backup codes generated',
        data: {
          backupCodes: admin.totpBackupCodes
        }
      });

    } catch (error) {
      logger.error('Backup codes generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate backup codes'
      });
    }
  },

  // Get dashboard overview
  getDashboardOverview: async (req, res) => {
    try {
      const admin = req.admin;

      // Check permissions
      if (!admin.hasPermission('analytics.view')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastMonth = new Date(todayStart);
      lastMonth.setDate(lastMonth.getDate() - 30);

      // Get user statistics
      const totalUsers = await User.count({ where: { isActive: true } });
      const newUsersToday = await User.count({
        where: {
          createdAt: {
            [Op.gte]: todayStart
          }
        }
      });
      const verifiedUsers = await User.count({
        where: { isVerified: true, isActive: true }
      });
      const activeUsersLastMonth = await User.count({
        where: {
          lastLoginAt: {
            [Op.gte]: lastMonth
          },
          isActive: true
        }
      });

      // Get location statistics
      const totalLocations = await Location.count({ where: { isActive: true } });
      const verifiedLocations = await Location.count({
        where: { isVerified: true, isActive: true }
      });
      const newLocationsToday = await Location.count({
        where: {
          createdAt: {
            [Op.gte]: todayStart
          }
        }
      });

      // Get route statistics
      const totalRoutes = await Route.count({ where: { isActive: true } });
      const newRoutesToday = await Route.count({
        where: {
          createdAt: {
            [Op.gte]: todayStart
          }
        }
      });

      // Get top states by user count
      const topStates = await sequelize.query(`
        SELECT state, COUNT(*) as "userCount"
        FROM users 
        WHERE "isActive" = true AND state IS NOT NULL
        GROUP BY state
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Calculate growth rates
      const usersYesterday = await User.count({
        where: {
          createdAt: {
            [Op.lt]: todayStart
          },
          isActive: true
        }
      });
      const userGrowthRate = usersYesterday > 0 ? 
        ((totalUsers - usersYesterday) / usersYesterday * 100) : 0;

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            newUsersToday,
            verifiedUsers,
            activeUsersLastMonth,
            userGrowthRate: parseFloat(userGrowthRate.toFixed(2)),
            totalLocations,
            verifiedLocations,
            newLocationsToday,
            totalRoutes,
            newRoutesToday
          },
          topStates,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard overview'
      });
    }
  },

  // Get user growth metrics
  getUserGrowthMetrics: async (req, res) => {
    try {
      const admin = req.admin;
      const { period = '30', interval = 'daily' } = req.query;

      if (!admin.hasPermission('analytics.view')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const days = parseInt(period);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let dateFormat, groupBy;
      if (interval === 'hourly') {
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        groupBy = `DATE_TRUNC('hour', "createdAt")`;
      } else if (interval === 'weekly') {
        dateFormat = 'YYYY-"W"WW';
        groupBy = `DATE_TRUNC('week', "createdAt")`;
      } else if (interval === 'monthly') {
        dateFormat = 'YYYY-MM';
        groupBy = `DATE_TRUNC('month', "createdAt")`;
      } else {
        dateFormat = 'YYYY-MM-DD';
        groupBy = `DATE_TRUNC('day', "createdAt")`;
      }

      // Get new user registrations over time
      const userGrowth = await sequelize.query(`
        SELECT 
          TO_CHAR(${groupBy}, '${dateFormat}') as date,
          COUNT(*) as "newUsers"
        FROM users 
        WHERE "createdAt" BETWEEN :startDate AND :endDate
        GROUP BY ${groupBy}
        ORDER BY ${groupBy} ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Get user verification rates
      const verificationData = await sequelize.query(`
        SELECT 
          TO_CHAR(${groupBy}, '${dateFormat}') as date,
          COUNT(*) as "totalUsers",
          SUM(CASE WHEN "isVerified" = true THEN 1 ELSE 0 END) as "verifiedUsers"
        FROM users 
        WHERE "createdAt" BETWEEN :startDate AND :endDate
        GROUP BY ${groupBy}
        ORDER BY ${groupBy} ASC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      // Calculate cumulative totals
      let cumulativeUsers = 0;
      const cumulativeGrowth = userGrowth.map(item => {
        cumulativeUsers += parseInt(item.newUsers);
        return {
          ...item,
          cumulativeUsers
        };
      });

      // Calculate verification rates
      const verificationRates = verificationData.map(item => ({
        ...item,
        verificationRate: item.totalUsers > 0 ? 
          parseFloat((item.verifiedUsers / item.totalUsers * 100).toFixed(2)) : 0
      }));

      res.json({
        success: true,
        data: {
          userGrowth: cumulativeGrowth,
          verificationRates,
          summary: {
            totalNewUsers: userGrowth.reduce((sum, item) => sum + parseInt(item.newUsers), 0),
            averagePerDay: parseFloat((userGrowth.reduce((sum, item) => sum + parseInt(item.newUsers), 0) / days).toFixed(2)),
            peakDay: userGrowth.reduce((prev, current) => 
              parseInt(current.newUsers) > parseInt(prev.newUsers || 0) ? current : prev, userGrowth[0] || {})
          }
        }
      });

    } catch (error) {
      logger.error('User growth metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user growth metrics'
      });
    }
  },

  // Get geographic analytics
  getGeographicAnalytics: async (req, res) => {
    try {
      const admin = req.admin;

      if (!admin.hasPermission('analytics.view')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Get user distribution by state
      const usersByState = await sequelize.query(`
        SELECT 
          state,
          COUNT(*) as "userCount",
          SUM(CASE WHEN "isVerified" = true THEN 1 ELSE 0 END) as "verifiedUsers"
        FROM users 
        WHERE "isActive" = true AND state IS NOT NULL
        GROUP BY state
        ORDER BY COUNT(*) DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get location distribution by state
      const locationsByState = await sequelize.query(`
        SELECT 
          state,
          COUNT(*) as "locationCount",
          SUM(CASE WHEN "isVerified" = true THEN 1 ELSE 0 END) as "verifiedLocations"
        FROM locations 
        WHERE "isActive" = true
        GROUP BY state
        ORDER BY COUNT(*) DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get top cities
      const topCities = await sequelize.query(`
        SELECT 
          city,
          state,
          COUNT(*) as "userCount"
        FROM users 
        WHERE "isActive" = true AND city IS NOT NULL
        GROUP BY city, state
        ORDER BY COUNT(*) DESC
        LIMIT 20
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          usersByState: usersByState.map(item => ({
            ...item,
            verificationRate: item.userCount > 0 ? 
              parseFloat((item.verifiedUsers / item.userCount * 100).toFixed(2)) : 0
          })),
          locationsByState: locationsByState.map(item => ({
            ...item,
            verificationRate: item.locationCount > 0 ? 
              parseFloat((item.verifiedLocations / item.locationCount * 100).toFixed(2)) : 0
          })),
          topCities
        }
      });

    } catch (error) {
      logger.error('Geographic analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get geographic analytics'
      });
    }
  },

  // Get system health metrics
  getSystemHealth: async (req, res) => {
    try {
      const admin = req.admin;

      if (!admin.hasPermission('system.health')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Database health
      const dbStart = Date.now();
      let dbHealth;
      try {
        await sequelize.authenticate();
        const dbLatency = Date.now() - dbStart;
        dbHealth = { status: 'healthy', latency: dbLatency };
      } catch (err) {
        dbHealth = { status: 'unhealthy', error: err.message };
      }

      // Get database size and connections
      let dbStats = { size: 'unknown', active_connections: 0 };
      try {
        const [results] = await sequelize.query(`
          SELECT 
            pg_size_pretty(pg_database_size(current_database())) as size,
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
        `);
        dbStats = results[0];
      } catch (error) {
        logger.warn('Could not fetch database stats:', error.message);
      }

      // Redis health (if available)
      let redisHealth = { status: 'not_configured' };
      try {
        // Add Redis health check here if Redis client is available
        redisHealth = { status: 'healthy' };
      } catch (error) {
        redisHealth = { status: 'unhealthy', error: error.message };
      }

      // System metrics
      const systemMetrics = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        pid: process.pid
      };

      res.json({
        success: true,
        data: {
          database: {
            ...dbHealth,
            ...dbStats
          },
          redis: redisHealth,
          system: systemMetrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('System health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system health'
      });
    }
  },

  // Get audit logs
  getAuditLogs: async (req, res) => {
    try {
      const admin = req.admin;
      const { 
        page = 1, 
        limit = 50, 
        action, 
        resource, 
        adminId, 
        severity,
        startDate,
        endDate 
      } = req.query;

      if (!admin.hasPermission('system.logs')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (action) whereClause.action = action;
      if (resource) whereClause.resource = resource;
      if (adminId) whereClause.adminId = adminId;
      if (severity) whereClause.severity = severity;
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const { rows: logs, count } = await AuditLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Admin,
            as: 'admin',
            attributes: ['firstName', 'lastName', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit logs'
      });
    }
  },

  // Get user management data
  getUserManagement: async (req, res) => {
    try {
      const admin = req.admin;
      const { 
        page = 1, 
        limit = 50, 
        search, 
        status, 
        verified,
        state,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      if (!admin.hasPermission('users.view')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status !== undefined) whereClause.isActive = status === 'active';
      if (verified !== undefined) whereClause.isVerified = verified === 'true';
      if (state) whereClause.state = state;

      const validSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'reputationScore', 'lastLoginAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

      const { rows: users, count } = await User.findAndCountAll({
        where: whereClause,
        order: [[sortField, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset,
        attributes: { exclude: ['passwordHash', 'refreshToken'] }
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      logger.error('User management error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user management data'
      });
    }
  },

  // Update user status
  updateUserStatus: async (req, res) => {
    try {
      const admin = req.admin;
      const { userId } = req.params;
      const { isActive, isVerified, reason } = req.body;

      if (!admin.hasPermission('users.edit')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const oldValues = {
        isActive: user.isActive,
        isVerified: user.isVerified
      };

      const updates = {};
      if (isActive !== undefined) updates.isActive = isActive;
      if (isVerified !== undefined) updates.isVerified = isVerified;

      await user.update(updates);

      // Log the action
      await AuditLog.create({
        adminId: admin.id,
        action: 'update_user_status',
        resource: 'user',
        resourceId: userId,
        oldValues,
        newValues: updates,
        metadata: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: { user: user.toJSON() }
      });

    } catch (error) {
      logger.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      });
    }
  },

  // Get analytics export
  exportAnalytics: async (req, res) => {
    try {
      const admin = req.admin;
      const { type, format = 'csv', startDate, endDate } = req.query;

      if (!admin.hasPermission('analytics.export')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      let data = [];
      let filename = '';

      switch (type) {
        case 'users':
          const users = await User.findAll({
            where: startDate && endDate ? {
              createdAt: {
                [Op.between]: [new Date(startDate), new Date(endDate)]
              }
            } : {},
            attributes: ['id', 'email', 'firstName', 'lastName', 'state', 'city', 'isVerified', 'reputationScore', 'createdAt'],
            order: [['createdAt', 'DESC']]
          });
          data = users.map(u => u.toJSON());
          filename = `users_export_${Date.now()}.${format}`;
          break;

        case 'locations':
          const locations = await Location.findAll({
            where: startDate && endDate ? {
              createdAt: {
                [Op.between]: [new Date(startDate), new Date(endDate)]
              }
            } : {},
            attributes: ['id', 'name', 'address', 'city', 'state', 'latitude', 'longitude', 'isVerified', 'searchCount', 'createdAt']
          });
          data = locations.map(l => l.toJSON());
          filename = `locations_export_${Date.now()}.${format}`;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid export type'
          });
      }

      // Log export action
      await AuditLog.create({
        adminId: admin.id,
        action: 'export_data',
        resource: type,
        metadata: { format, recordCount: data.length, startDate, endDate },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      if (format === 'csv') {
        // Convert to CSV
        if (data.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No data found for export'
          });
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(header => 
            typeof row[header] === 'string' && row[header].includes(',') 
              ? `"${row[header]}"` 
              : row[header]
          ).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // JSON export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          data,
          exportInfo: {
            type,
            recordCount: data.length,
            exportedAt: new Date().toISOString(),
            exportedBy: admin.email
          }
        });
      }

    } catch (error) {
      logger.error('Analytics export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data'
      });
    }
  },

  // Logout admin
  logout: async (req, res) => {
    try {
      const admin = req.admin;

      // Remove session
      if (req.tokenId) {
        adminSessionManager.removeSession(admin.id, req.tokenId);
      }

      // Clear refresh token
      admin.refreshToken = null;
      admin.refreshTokenExpiresAt = null;
      await admin.save();

      // Log logout
      await AuditLog.create({
        adminId: admin.id,
        action: 'logout',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      logger.info(`Admin logged out: ${admin.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Admin logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
  }
};

module.exports = adminController;