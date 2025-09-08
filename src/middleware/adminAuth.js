const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const logger = require('../utils/logger');

// Authenticate admin JWT token
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure it's an admin token
    if (decoded.type !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find admin
    const admin = await Admin.findByPk(decoded.adminId, {
      attributes: { exclude: ['passwordHash', 'totpSecret', 'totpBackupCodes'] }
    });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Admin account is temporarily locked'
      });
    }

    // Add admin to request object
    req.admin = admin;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired'
      });
    }

    logger.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.admin.hasPermission(permission)) {
      logger.warn(`Admin ${req.admin.email} attempted to access ${permission} without permission`);
      
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Check multiple permissions (admin must have at least one)
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.admin.hasAnyPermission(permissions)) {
      logger.warn(`Admin ${req.admin.email} attempted to access without required permissions: ${permissions.join(', ')}`);
      
      return res.status(403).json({
        success: false,
        message: `One of these permissions required: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

// Check admin role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.admin.role !== role && req.admin.role !== 'super_admin') {
      logger.warn(`Admin ${req.admin.email} attempted to access ${role} endpoint with role ${req.admin.role}`);
      
      return res.status(403).json({
        success: false,
        message: `Role '${role}' required`
      });
    }

    next();
  };
};

// Check if admin is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.admin.role !== 'super_admin') {
    logger.warn(`Admin ${req.admin.email} attempted to access super admin endpoint`);
    
    return res.status(403).json({
      success: false,
      message: 'Super admin privileges required'
    });
  }

  next();
};

// Audit logging middleware for admin actions
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log successful admin actions
      if (data.success && req.admin) {
        const { AuditLog } = require('../models');
        
        AuditLog.create({
          adminId: req.admin.id,
          action,
          resource,
          resourceId: req.params.id || req.params.userId || null,
          method: req.method,
          endpoint: req.originalUrl,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            body: req.body,
            query: req.query,
            params: req.params
          },
          severity: determineSeverity(action, resource)
        }).catch(err => {
          logger.error('Audit log creation failed:', err);
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Determine severity level for audit logs
const determineSeverity = (action, resource) => {
  const highSeverityActions = [
    'delete', 'disable', 'ban', 'suspend', 'enable_totp', 'disable_totp',
    'create_admin', 'delete_admin', 'change_permissions'
  ];
  
  const mediumSeverityActions = [
    'update', 'verify', 'moderate', 'login', 'logout', 'change_password'
  ];
  
  const criticalResources = ['admin', 'system', 'database'];
  
  if (criticalResources.includes(resource) && highSeverityActions.some(a => action.includes(a))) {
    return 'critical';
  }
  
  if (highSeverityActions.some(a => action.includes(a))) {
    return 'high';
  }
  
  if (mediumSeverityActions.some(a => action.includes(a))) {
    return 'medium';
  }
  
  return 'low';
};

// Rate limiting for admin actions
const adminRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.admin) {
      return next();
    }
    
    const key = `admin:${req.admin.id}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create request log for this admin
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const adminRequests = requests.get(key);
    
    // Remove old requests outside the window
    while (adminRequests.length > 0 && adminRequests[0] < windowStart) {
      adminRequests.shift();
    }
    
    // Check if limit exceeded
    if (adminRequests.length >= maxRequests) {
      logger.warn(`Admin rate limit exceeded for ${req.admin.email}`);
      
      return res.status(429).json({
        success: false,
        message: 'Admin rate limit exceeded'
      });
    }
    
    // Add current request
    adminRequests.push(now);
    
    next();
  };
};

// Session validation middleware
const validateSession = async (req, res, next) => {
  if (!req.admin) {
    return next();
  }
  
  // Check if admin's refresh token is still valid
  if (req.admin.refreshTokenExpiresAt && req.admin.refreshTokenExpiresAt < new Date()) {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please login again.'
    });
  }
  
  // Update last activity (optional - you might want to throttle this)
  if (Math.random() < 0.1) { // Update 10% of the time to reduce DB load
    req.admin.update({ 
      lastLoginAt: new Date() 
    }).catch(err => {
      logger.error('Failed to update admin last activity:', err);
    });
  }
  
  next();
};

// IP whitelist middleware for critical admin operations
const requireIPWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next(); // No whitelist configured
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!whitelist.includes(clientIP)) {
      logger.warn(`Admin ${req.admin?.email} attempted access from non-whitelisted IP: ${clientIP}`);
      
      return res.status(403).json({
        success: false,
        message: 'Access from this IP address is not allowed'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateAdmin,
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireSuperAdmin,
  auditLog,
  adminRateLimit,
  validateSession,
  requireIPWhitelist
};