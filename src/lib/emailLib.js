const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// SendGrid Dynamic Template IDs (you'll need to create these in SendGrid)
const TEMPLATE_IDS = {
  ADMIN_INVITATION: process.env.SENDGRID_ADMIN_INVITATION_TEMPLATE || 'd-1234567890abcdef1234567890abcdef',
  PASSWORD_RESET: process.env.SENDGRID_PASSWORD_RESET_TEMPLATE || 'd-abcdef1234567890abcdef1234567890',
  ACCOUNT_LOCKED: process.env.SENDGRID_ACCOUNT_LOCKED_TEMPLATE || 'd-fedcba0987654321fedcba0987654321',
  SECURITY_ALERT: process.env.SENDGRID_SECURITY_ALERT_TEMPLATE || 'd-456789abcdef0123456789abcdef0123',
  TOTP_ENABLED: process.env.SENDGRID_TOTP_ENABLED_TEMPLATE || 'd-789abcdef0123456789abcdef01234567'
};

// Default sender email
const DEFAULT_FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'admin@avigate.co',
  name: process.env.SENDGRID_FROM_NAME || 'Avigate Admin'
};

class EmailService {
  constructor() {
    this.initialized = false;
    this.validateConfiguration();
  }

  validateConfiguration() {
    if (!process.env.SENDGRID_API_KEY) {
      logger.error('SENDGRID_API_KEY is required but not provided');
      return;
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      logger.warn('SENDGRID_FROM_EMAIL not provided, using default');
    }

    this.initialized = true;
    logger.info('SendGrid email service initialized');
  }

  async sendEmail(templateData) {
    if (!this.initialized) {
      throw new Error('Email service not properly initialized');
    }

    try {
      const msg = {
        to: templateData.to,
        from: templateData.from || DEFAULT_FROM,
        templateId: templateData.templateId,
        dynamicTemplateData: templateData.dynamicTemplateData || {}
      };

      // Add custom headers if provided
      if (templateData.headers) {
        msg.headers = templateData.headers;
      }

      // Add categories for tracking
      if (templateData.categories) {
        msg.categories = templateData.categories;
      }

      const result = await sgMail.send(msg);
      
      logger.info('Email sent successfully', {
        to: templateData.to.email || templateData.to,
        templateId: templateData.templateId,
        messageId: result[0]?.headers?.['x-message-id']
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to: templateData.to.email || templateData.to,
        templateId: templateData.templateId,
        response: error.response?.body
      });
      throw error;
    }
  }

  /**
   * Send admin invitation email
   * @param {string} email - Recipient email
   * @param {string} firstName - Recipient first name
   * @param {string} inviteToken - Invitation token
   * @param {Object} invitedBy - Admin who created the invitation
   */
  async sendAdminInvitation(email, firstName, inviteToken, invitedBy) {
    const inviteUrl = `${process.env.FRONTEND_URL}/admin/accept-invitation?token=${inviteToken}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.sendEmail({
      to: { email, name: firstName },
      templateId: TEMPLATE_IDS.ADMIN_INVITATION,
      dynamicTemplateData: {
        firstName,
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString(),
        invitedByName: invitedBy.getFullName(),
        invitedByEmail: invitedBy.email,
        companyName: 'Avigate',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@avigate.co'
      },
      categories: ['admin_invitation'],
      headers: {
        'X-Priority': '1', // High priority
        'X-Email-Type': 'admin_invitation'
      }
    });
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} firstName - Recipient first name
   * @param {string} resetToken - Password reset token
   */
  async sendPasswordReset(email, firstName, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return this.sendEmail({
      to: { email, name: firstName },
      templateId: TEMPLATE_IDS.PASSWORD_RESET,
      dynamicTemplateData: {
        firstName,
        resetUrl,
        expiresAt: expiresAt.toLocaleTimeString(),
        ipAddress: this.getCurrentIP(),
        requestTime: new Date().toLocaleString(),
        companyName: 'Avigate',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@avigate.co'
      },
      categories: ['password_reset'],
      headers: {
        'X-Priority': '1',
        'X-Email-Type': 'password_reset'
      }
    });
  }

  /**
   * Send account locked notification
   * @param {Object} admin - Admin object
   * @param {string} reason - Lock reason
   * @param {Date} lockedUntil - When the account will be unlocked
   */
  async sendAccountLocked(admin, reason, lockedUntil) {
    return this.sendEmail({
      to: { email: admin.email, name: admin.getFullName() },
      templateId: TEMPLATE_IDS.ACCOUNT_LOCKED,
      dynamicTemplateData: {
        firstName: admin.firstName,
        reason,
        lockedUntil: lockedUntil.toLocaleString(),
        unlockTime: lockedUntil.toLocaleTimeString(),
        failedAttempts: admin.failedLoginAttempts,
        lastAttemptTime: new Date().toLocaleString(),
        companyName: 'Avigate',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@avigate.co'
      },
      categories: ['security', 'account_locked'],
      headers: {
        'X-Priority': '1',
        'X-Email-Type': 'account_locked'
      }
    });
  }

  /**
   * Send security alert notification
   * @param {Object} admin - Admin object
   * @param {string} alertType - Type of security alert
   * @param {Object} alertData - Alert-specific data
   */
  async sendSecurityAlert(admin, alertType, alertData) {
    const alertMessages = {
      'suspicious_login': 'Suspicious login activity detected',
      'new_ip_login': 'Login from new IP address',
      'multiple_failed_attempts': 'Multiple failed login attempts',
      'unusual_activity': 'Unusual account activity detected',
      'permission_escalation': 'Permission escalation attempt detected'
    };

    return this.sendEmail({
      to: { email: admin.email, name: admin.getFullName() },
      templateId: TEMPLATE_IDS.SECURITY_ALERT,
      dynamicTemplateData: {
        firstName: admin.firstName,
        alertType: alertMessages[alertType] || 'Security Alert',
        alertTime: new Date().toLocaleString(),
        ipAddress: alertData.ipAddress || 'Unknown',
        userAgent: alertData.userAgent || 'Unknown',
        location: alertData.location || 'Unknown',
        actionRequired: this.getSecurityActionRequired(alertType),
        companyName: 'Avigate',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@avigate.co',
        securityCenterUrl: `${process.env.FRONTEND_URL}/admin/security`
      },
      categories: ['security', 'alert', alertType],
      headers: {
        'X-Priority': '1',
        'X-Email-Type': 'security_alert'
      }
    });
  }

  /**
   * Send TOTP enabled confirmation
   * @param {Object} admin - Admin object
   * @param {Array} backupCodes - Generated backup codes
   */
  async sendTOTPEnabled(admin, backupCodes) {
    return this.sendEmail({
      to: { email: admin.email, name: admin.getFullName() },
      templateId: TEMPLATE_IDS.TOTP_ENABLED,
      dynamicTemplateData: {
        firstName: admin.firstName,
        enabledTime: new Date().toLocaleString(),
        backupCodesCount: backupCodes.length,
        backupCodes: backupCodes,
        securityTips: [
          'Store backup codes in a secure location',
          'Do not share your backup codes with anyone',
          'Generate new backup codes if you suspect they are compromised',
          'Use an authenticator app like Google Authenticator or Authy'
        ],
        companyName: 'Avigate',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@avigate.co',
        securityCenterUrl: `${process.env.FRONTEND_URL}/admin/security`
      },
      categories: ['security', 'totp_enabled'],
      headers: {
        'X-Email-Type': 'totp_enabled'
      }
    });
  }

  /**
   * Send bulk notification to multiple admins
   * @param {Array} recipients - Array of admin objects
   * @param {string} templateId - SendGrid template ID
   * @param {Object} dynamicTemplateData - Template data
   * @param {Array} categories - Email categories
   */
  async sendBulkNotification(recipients, templateId, dynamicTemplateData, categories = []) {
    const messages = recipients.map(admin => ({
      to: { email: admin.email, name: admin.getFullName() },
      from: DEFAULT_FROM,
      templateId,
      dynamicTemplateData: {
        ...dynamicTemplateData,
        firstName: admin.firstName,
        adminRole: admin.role
      },
      categories: ['bulk', ...categories],
      headers: {
        'X-Email-Type': 'bulk_notification'
      }
    }));

    try {
      const result = await sgMail.send(messages);
      
      logger.info('Bulk email sent successfully', {
        recipientCount: recipients.length,
        templateId,
        messageIds: result.map(r => r[0]?.headers?.['x-message-id'])
      });

      return result;
    } catch (error) {
      logger.error('Failed to send bulk email:', {
        error: error.message,
        recipientCount: recipients.length,
        templateId,
        response: error.response?.body
      });
      throw error;
    }
  }

  /**
   * Test email configuration
   * @param {string} testEmail - Email to send test to
   */
  async testConfiguration(testEmail = DEFAULT_FROM.email) {
    try {
      const testMessage = {
        to: testEmail,
        from: DEFAULT_FROM,
        subject: 'Avigate Admin - Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Configuration Test</h2>
            <p>This is a test email to verify SendGrid configuration.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p>If you received this email, SendGrid is configured correctly.</p>
          </div>
        `,
        categories: ['test', 'configuration']
      };

      const result = await sgMail.send(testMessage);
      
      logger.info('Test email sent successfully', {
        to: testEmail,
        messageId: result[0]?.headers?.['x-message-id']
      });

      return { success: true, messageId: result[0]?.headers?.['x-message-id'] };
    } catch (error) {
      logger.error('Test email failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get security action required message based on alert type
   * @private
   */
  getSecurityActionRequired(alertType) {
    const actions = {
      'suspicious_login': 'Please verify this was you. If not, change your password immediately.',
      'new_ip_login': 'If this login was not from you, please secure your account.',
      'multiple_failed_attempts': 'Your account may be under attack. Consider enabling 2FA.',
      'unusual_activity': 'Please review your recent account activity.',
      'permission_escalation': 'This is a critical security event. Contact support immediately.'
    };

    return actions[alertType] || 'Please review your account security settings.';
  }

  /**
   * Get current IP address (for logging purposes)
   * @private
   */
  getCurrentIP() {
    // This would typically be passed from the request
    // For now, return a placeholder
    return 'IP address will be provided in context';
  }
}

// Create singleton instance
const emailService = new EmailService();

/**
 * Wrapper functions for backward compatibility with existing controller code
 */

const sendAdminInvitationEmail = async (email, firstName, inviteToken, invitedBy) => {
  return emailService.sendAdminInvitation(email, firstName, inviteToken, invitedBy);
};

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  return emailService.sendPasswordReset(email, firstName, resetToken);
};

const sendAccountLockedEmail = async (admin, reason, lockedUntil) => {
  return emailService.sendAccountLocked(admin, reason, lockedUntil);
};

const sendSecurityAlertEmail = async (admin, alertType, alertData) => {
  return emailService.sendSecurityAlert(admin, alertType, alertData);
};

const sendTOTPEnabledEmail = async (admin, backupCodes) => {
  return emailService.sendTOTPEnabled(admin, backupCodes);
};

module.exports = {
  emailService,
  sendAdminInvitationEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
  sendSecurityAlertEmail,
  sendTOTPEnabledEmail,
  TEMPLATE_IDS
};