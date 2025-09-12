const { Admin, AuditLog } = require('../models');
const { 
  generateAdminTokens, 
  adminSessionManager, 
  verifyAdminRefreshToken,
  blacklistAdminToken,
  generateAdminInviteToken,
  verifyAdminInviteToken,
  generateAdminPasswordResetToken,
  adminSecurityUtils
} = require('../services/adminAuthService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Email domain validation
const ALLOWED_EMAIL_DOMAIN = '@avigate.co';
const validateEmailDomain = (email) => {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
};

const adminController = {
  // Admin Authentication - Fixed
  login: async (req, res) => {
    try {
      const { email, password, totpToken, backupCode } = req.body;

      // Validate email domain
      if (!validateEmailDomain(email)) {
        return res.status(403).json({
          success: false,
          message: 'Access restricted to authorized domains'
        });
      }

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

      // Generate tokens with tokenId
      const tokens = generateAdminTokens(admin);
      const tokenPayload = JSON.parse(Buffer.from(tokens.refreshToken.split('.')[1], 'base64'));

      // Update login info and create session
      await admin.updateLastLogin(req.ip, req.get('User-Agent'));
      adminSessionManager.createSession(admin, tokenPayload.tokenId, req);

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

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: admin.toJSON(),
          accessToken: tokens.accessToken
          // refreshToken removed from response body
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

  // Refresh Token Endpoint - NEW
  refreshToken: async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided'
        });
      }

      // Verify refresh token
      const decoded = verifyAdminRefreshToken(refreshToken);
      if (!decoded) {
        res.clearCookie('refreshToken');
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Find admin
      const admin = await Admin.findByPk(decoded.adminId);
      if (!admin || !admin.isActive) {
        res.clearCookie('refreshToken');
        return res.status(401).json({
          success: false,
          message: 'Admin not found or inactive'
        });
      }

      // Check session
      const session = adminSessionManager.getSession(decoded.adminId, decoded.tokenId);
      if (!session) {
        res.clearCookie('refreshToken');
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }

      // Generate new tokens
      const newTokens = generateAdminTokens(admin);
      const newTokenPayload = JSON.parse(Buffer.from(newTokens.refreshToken.split('.')[1], 'base64'));

      // Update session
      adminSessionManager.removeSession(decoded.adminId, decoded.tokenId);
      adminSessionManager.createSession(admin, newTokenPayload.tokenId, req);

      // Blacklist old refresh token
      blacklistAdminToken(decoded.tokenId);

      // Set new refresh token cookie
      res.cookie('refreshToken', newTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: {
          accessToken: newTokens.accessToken
        }
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  },

  // Create Admin - NEW (Super Admin Only)
  createAdmin: async (req, res) => {
    try {
      const currentAdmin = req.admin;
      const { email, firstName, lastName, role = 'admin' } = req.body;

      // Only super admins can create admins
      if (currentAdmin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super administrators can create admin accounts'
        });
      }

      // Validate email domain
      if (!validateEmailDomain(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email must be from @avigate.co domain'
        });
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Admin with this email already exists'
        });
      }

      // Validate role
      const validRoles = ['admin', 'moderator', 'analyst'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Generate secure temporary password
      const tempPassword = adminSecurityUtils.generateSecurePassword(16);
      
      // Get default permissions for role
      const permissions = Admin.getRolePermissions(role);

      // Create admin
      const newAdmin = await Admin.create({
        email,
        firstName,
        lastName,
        passwordHash: tempPassword, // Will be hashed in the beforeCreate hook
        role,
        permissions,
        isActive: true,
        createdBy: currentAdmin.id,
        lastModifiedBy: currentAdmin.id
      });

      // Generate invitation token
      const inviteToken = generateAdminInviteToken(email, role, currentAdmin.id);

      // Send invitation email (you'll need to implement this)
      await sendAdminInvitationEmail(email, firstName, tempPassword, inviteToken);

      // Log admin creation
      await AuditLog.create({
        adminId: currentAdmin.id,
        action: 'create_admin',
        resource: 'admin',
        resourceId: newAdmin.id,
        metadata: { 
          newAdminEmail: email, 
          role,
          permissions: permissions.length 
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      logger.info(`Admin created: ${email} by ${currentAdmin.email}`);

      res.status(201).json({
        success: true,
        message: 'Admin created successfully. Invitation email sent.',
        data: {
          admin: newAdmin.toJSON(),
          inviteToken: process.env.NODE_ENV === 'development' ? inviteToken : undefined
        }
      });

    } catch (error) {
      logger.error('Create admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin'
      });
    }
  },

  // Accept Invitation - NEW
  acceptInvitation: async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      // Verify invitation token
      const decoded = verifyAdminInviteToken(token);
      if (!decoded) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation token'
        });
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Validate password strength
      const passwordValidation = adminSecurityUtils.validateAdminPassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      // Find admin
      const admin = await Admin.findOne({ 
        where: { 
          email: decoded.email,
          isActive: true 
        } 
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin account not found'
        });
      }

      // Update password
      admin.passwordHash = newPassword; // Will be hashed in beforeUpdate hook
      await admin.save();

      // Log invitation acceptance
      await AuditLog.create({
        adminId: admin.id,
        action: 'accept_invitation',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      logger.info(`Admin invitation accepted: ${decoded.email}`);

      res.json({
        success: true,
        message: 'Invitation accepted successfully. You can now log in with your new password.'
      });

    } catch (error) {
      logger.error('Accept invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation'
      });
    }
  },

  // Update Admin Role/Permissions - NEW
  updateAdmin: async (req, res) => {
    try {
      const currentAdmin = req.admin;
      const { adminId } = req.params;
      const { role, permissions, isActive } = req.body;

      // Only super admins can update other admins
      if (currentAdmin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super administrators can update admin accounts'
        });
      }

      // Find target admin
      const targetAdmin = await Admin.findByPk(adminId);
      if (!targetAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Prevent self-deactivation
      if (currentAdmin.id === adminId && isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }

      const oldValues = {
        role: targetAdmin.role,
        permissions: [...targetAdmin.permissions],
        isActive: targetAdmin.isActive
      };

      const updates = {};
      
      if (role && role !== targetAdmin.role) {
        const validRoles = ['admin', 'moderator', 'analyst'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role specified'
          });
        }
        updates.role = role;
        updates.permissions = Admin.getRolePermissions(role);
      }

      if (permissions && Array.isArray(permissions)) {
        const validPermissions = Admin.getPermissionsList();
        const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
        if (invalidPerms.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid permissions specified',
            invalidPermissions: invalidPerms
          });
        }
        updates.permissions = permissions;
      }

      if (typeof isActive === 'boolean') {
        updates.isActive = isActive;
      }

      updates.lastModifiedBy = currentAdmin.id;

      await targetAdmin.update(updates);

      // If admin was deactivated, remove all their sessions
      if (isActive === false) {
        const removedSessions = adminSessionManager.removeAllAdminSessions(adminId);
        logger.info(`Removed ${removedSessions} sessions for deactivated admin: ${targetAdmin.email}`);
      }

      // Log admin update
      await AuditLog.create({
        adminId: currentAdmin.id,
        action: 'update_admin',
        resource: 'admin',
        resourceId: adminId,
        oldValues,
        newValues: updates,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      logger.info(`Admin updated: ${targetAdmin.email} by ${currentAdmin.email}`);

      res.json({
        success: true,
        message: 'Admin updated successfully',
        data: {
          admin: targetAdmin.toJSON()
        }
      });

    } catch (error) {
      logger.error('Update admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update admin'
      });
    }
  },

  // Get All Admins - NEW
  getAdmins: async (req, res) => {
    try {
      const currentAdmin = req.admin;
      const { page = 1, limit = 50, role, status, search } = req.query;

      // Only super admins can view all admins
      if (currentAdmin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super administrators can view admin accounts'
        });
      }

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (role) whereClause.role = role;
      if (status !== undefined) whereClause.isActive = status === 'active';
      
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { rows: admins, count } = await Admin.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Admin,
            as: 'creator',
            attributes: ['firstName', 'lastName', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: {
          admins,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get admins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get admin accounts'
      });
    }
  },

  // Password Reset Request - NEW
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;

      // Validate email domain
      if (!validateEmailDomain(email)) {
        // Return success to avoid email enumeration
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link will be sent'
        });
      }

      const admin = await Admin.findByEmail(email);
      if (!admin) {
        // Return success to avoid email enumeration
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link will be sent'
        });
      }

      // Generate password reset token
      const resetToken = generateAdminPasswordResetToken(admin);

      // Send password reset email
      await sendPasswordResetEmail(email, admin.firstName, resetToken);

      // Log password reset request
      await AuditLog.create({
        adminId: admin.id,
        action: 'password_reset_request',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent'
      });

    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  },

  // Continue with existing methods (TOTP, dashboard, etc.)
  // ... (rest of your existing methods with the same security fixes)

  // Logout admin - Fixed
  logout: async (req, res) => {
    try {
      const admin = req.admin;

      // Remove session
      if (req.tokenId) {
        adminSessionManager.removeSession(admin.id, req.tokenId);
        blacklistAdminToken(req.tokenId);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

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

// Email service functions (implement based on your email provider)
const sendAdminInvitationEmail = async (email, firstName, tempPassword, inviteToken) => {
  // Implement your email sending logic here
  // This is a placeholder - use your actual email service
  logger.info(`Invitation email sent to ${email} with token: ${inviteToken}`);
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  // Implement your email sending logic here
  logger.info(`Password reset email sent to ${email} with token: ${resetToken}`);
};

module.exports = adminController;