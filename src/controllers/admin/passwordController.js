const { Admin, AuditLog } = require('../../models');
const { 
  generateAdminPasswordResetToken,
  verifyAdminPasswordResetToken,
  adminSecurityUtils
} = require('../../services/admin');
const { logger } = require('../../utils/logger');

// Email domain validation
const ALLOWED_EMAIL_DOMAIN = '@avigate.co';
const validateEmailDomain = (email) => {
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
};

const passwordController = {
  // Password Reset Request
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

  // Reset Password with Token
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      // Verify reset token
      const decoded = verifyAdminPasswordResetToken(token);
      if (!decoded) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset token'
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
      const admin = await Admin.findByPk(decoded.adminId);
      if (!admin || !admin.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Admin account not found or inactive'
        });
      }

      // Update password
      admin.passwordHash = newPassword; // Will be hashed in beforeUpdate hook
      await admin.save();

      // Log password reset completion
      await AuditLog.create({
        adminId: admin.id,
        action: 'password_reset_complete',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      logger.info(`Password reset completed for: ${admin.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  },

  // Change Password (for logged-in admin)
  changePassword: async (req, res) => {
    try {
      const admin = req.admin;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Verify current password
      const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New passwords do not match'
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

      // Update password
      admin.passwordHash = newPassword; // Will be hashed in beforeUpdate hook
      await admin.save();

      // Log password change
      await AuditLog.create({
        adminId: admin.id,
        action: 'password_change',
        resource: 'admin',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      logger.info(`Password changed for admin: ${admin.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Password change error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
};

// Email service function (implement based on your email provider)
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  // Implement your email sending logic here
  logger.info(`Password reset email sent to ${email} with token: ${resetToken}`);
};

module.exports = passwordController;