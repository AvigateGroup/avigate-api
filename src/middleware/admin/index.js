const { authenticateAdmin } = require('./authMiddleware');
const { 
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireSuperAdmin,
  canManageAdmin 
} = require('./permissionsMiddleware');
const {
  sensitiveOperationLimiter,
  validateEmailDomain,
  ensureSuperAdminExists,
  securityHeaders
} = require('./securityMiddleware');
const {
  auditRequest,
  auditResponse
} = require('./auditMiddleware');

module.exports = {
  // Authentication
  authenticateAdmin,
  
  // Authorization
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireSuperAdmin,
  canManageAdmin,
  
  // Security
  sensitiveOperationLimiter,
  validateEmailDomain,
  ensureSuperAdminExists,
  securityHeaders,
  
  // Audit
  auditRequest,
  auditResponse
};