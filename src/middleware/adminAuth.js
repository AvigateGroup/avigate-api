const { 
  verifyAdminAccessToken, 
  adminSessionManager, 
  isAdminTokenBlacklisted,
  adminSecurityUtils 
} = require('../services/adminAuthService');
const { Admin, AuditLog } = require('../models');
const logger = require('../utils/logger');

// Enhanced admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token structure and signature
    const decoded = verifyAdminAccessToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await isAdminTokenBlacklisted(decoded.tokenId);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    // Verify admin still exists and is active
    const admin = await Admin.findByPk(decoded.adminId);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive'
      });
    }

    // Check if admin account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Admin account is temporarily locked'
      });
    }

    // Verify session exists and is valid
    const session = await adminSessionManager.getSession(decoded.adminId, decoded.tokenId);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid'
      });
    }

    // Check for suspicious activity
    const suspiciousActivity = adminSecurityUtils.detectSuspiciousActivity(admin, req);
    if (suspiciousActivity.length > 0) {
      logger.warn('Suspicious admin activity detected:', {
        adminId: admin.id,
        email: admin.email,
        suspiciousActivity,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log security alert
      await AuditLog.create({
        adminId: admin.id,
        action: 'security_alert',
        resource: 'admin',
        metadata: { suspiciousActivity },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      // For high-risk activities, require re-authentication
      const highRiskActivities = ['login_from_new_ip', 'user_agent_change'];
      const hasHighRisk = suspiciousActivity.some(activity => 
        highRiskActivities.includes(activity)
      );

      if (hasHighRisk) {
        return res.status(401).json({
          success: false,
          message: 'Re-authentication required due to security concerns',
          requiresReauth: true
        });
      }
    }

    // Check if password change is required
    if (admin.requiresPasswordChange()) {
      // Allow only profile update and logout endpoints
      const allowedPaths = ['/api/admin/profile', '/api/admin/auth/logout'];
      if (!allowedPaths.some(path => req.path.startsWith(path))) {
        return res.status(403).json({
          success: false,
          message: 'Password change required',
          requiresPasswordChange: true
        });
      }
    }

    // Check if password is expired (hard block)
    if (admin.isPasswordExpired()) {
      return res.status(403).json({
        success: false,
        message: 'Password has expired. Please contact system administrator.',
        passwordExpired: true
      });
    }

    // Update session activity
    await adminSessionManager.updateSessionActivity(decoded.adminId, decoded.tokenId);

    // Attach admin and token info to request
    req.admin = admin;
    req.tokenId = decoded.tokenId;
    req.sessionData = session;

    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

// Permission-based authorization middleware
const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const admin = req.admin;
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!admin.hasPermission(requiredPermission)) {
        // Log unauthorized access attempt
        await AuditLog.create({
          adminId: admin.id,
          action: 'unauthorized_access_attempt',
          resource: 'admin',
          metadata: { 
            requiredPermission,
            userPermissions: admin.permissions,
            attemptedPath: req.path,
            method: req.method
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredPermission
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

// Multiple permission authorization (require ANY of the permissions)
const requireAnyPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const admin = req.admin;
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!admin.hasAnyPermission(requiredPermissions)) {
        await AuditLog.create({
          adminId: admin.id,
          action: 'unauthorized_access_attempt',
          resource: 'admin',
          metadata: { 
            requiredPermissions,
            userPermissions: admin.permissions,
            attemptedPath: req.path,
            method: req.method
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredPermissions
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

// Super admin only middleware
const requireSuperAdmin = async (req, res, next) => {
  try {
    const admin = req.admin;
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (admin.role !== 'super_admin') {
      // Log super admin access attempt
      await AuditLog.create({
        adminId: admin.id,
        action: 'super_admin_access_attempt',
        resource: 'admin',
        metadata: { 
          userRole: admin.role,
          attemptedPath: req.path,
          method: req.method
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      return res.status(403).json({
        success: false,
        message: 'Super administrator access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization service error'
    });
  }
};

// Role-based authorization middleware
const requireRole = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return async (req, res, next) => {
    try {
      const admin = req.admin;
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(admin.role)) {
        await AuditLog.create({
          adminId: admin.id,
          action: 'role_access_attempt',
          resource: 'admin',
          metadata: { 
            requiredRoles,
            userRole: admin.role,
            attemptedPath: req.path,
            method: req.method
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient role permissions',
          requiredRoles
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

// Middleware to check if admin can manage target admin
const canManageAdmin = async (req, res, next) => {
  try {
    const currentAdmin = req.admin;
    const { adminId } = req.params;

    if (!currentAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admins can manage anyone except preventing self-deactivation
    if (currentAdmin.role === 'super_admin') {
      // Prevent super admin from deactivating themselves
      if (currentAdmin.id === adminId && req.body.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }
      return next();
    }

    // Find target admin
    const targetAdmin = await Admin.findByPk(adminId);
    if (!targetAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check role hierarchy
    if (!Admin.canManageRole(currentAdmin.role, targetAdmin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot manage admin with equal or higher role'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin management check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization service error'
    });
  }
};

// Rate limiting middleware for sensitive operations
const sensitiveOperationLimiter = (operation, maxAttempts = 3, windowMs = 60000) => {
  const limiter = adminSecurityUtils.createOperationLimiter();
  
  return async (req, res, next) => {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = limiter.checkLimit(adminId, operation, maxAttempts, windowMs);
      
      if (!result.allowed) {
        // Log rate limit violation
        await AuditLog.create({
          adminId,
          action: 'rate_limit_exceeded',
          resource: 'admin',
          metadata: { 
            operation,
            maxAttempts,
            resetTime: result.resetTime
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(429).json({
          success: false,
          message: `Too many ${operation} attempts. Please try again later.`,
          resetTime: result.resetTime
        });
      }

      // Add remaining attempts to response headers
      res.set('X-RateLimit-Remaining', result.remaining.toString());
      
      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      next(); // Continue on limiter error
    }
  };
};

// Middleware to validate domain email in requests
const validateEmailDomain = (req, res, next) => {
  const { email } = req.body;
  
  if (email && !email.toLowerCase().endsWith('@avigate.co')) {
    return res.status(400).json({
      success: false,
      message: 'Email must be from @avigate.co domain'
    });
  }
  
  next();
};

// Middleware to ensure at least one super admin exists before deactivation
const ensureSuperAdminExists = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;
    
    // Only check if deactivating an admin
    if (isActive !== false) {
      return next();
    }

    const targetAdmin = await Admin.findByPk(adminId);
    if (!targetAdmin || targetAdmin.role !== 'super_admin') {
      return next();
    }

    // Check if this would leave no active super admins
    await Admin.ensureSuperAdminExists();
    
    next();
  } catch (error) {
    if (error.message === 'Cannot remove the last super administrator') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'System validation error'
    });
  }
};

// Security headers middleware for admin panel
const securityHeaders = (req, res, next) => {
  // Strict security headers for admin panel
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  next();
};

// Request logging middleware for audit trail
const auditRequest = (req, res, next) => {
  // Log sensitive operations
  const sensitiveEndpoints = [
    '/admins',
    '/auth',
    '/totp',
    '/users/:userId/status'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.includes(endpoint.split(':')[0])
  );
  
  if (isSensitive && req.admin) {
    // This will be logged after the request completes
    req.shouldAudit = true;
    req.auditData = {
      adminId: req.admin.id,
      action: `${req.method.toLowerCase()}_${req.path.replace(/^\/api\/admin\//, '').replace(/\//g, '_')}`,
      resource: 'admin_api',
      metadata: {
        path: req.path,
        method: req.method,
        query: req.query,
        // Don't log sensitive body data like passwords
        bodyKeys: Object.keys(req.body || {}).filter(key => 
          !['password', 'newPassword', 'currentPassword', 'totpToken'].includes(key)
        )
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'low'
    };
  }
  
  next();
};

// Response audit logging
const auditResponse = (req, res, next) => {
  if (req.shouldAudit) {
    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function(data) {
      // Log the request after response
      setImmediate(async () => {
        try {
          await AuditLog.create({
            ...req.auditData,
            metadata: {
              ...req.auditData.metadata,
              statusCode: res.statusCode,
              success: data?.success
            }
          });
        } catch (error) {
          logger.error('Audit log creation failed:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  authenticateAdmin,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireRole,
  canManageAdmin,
  sensitiveOperationLimiter,
  validateEmailDomain,
  ensureSuperAdminExists,
  securityHeaders,
  auditRequest,
  auditResponse
};