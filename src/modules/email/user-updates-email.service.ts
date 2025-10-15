// src/modules/email/services/user-updates-email.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMailClient } from 'zeptomail';
import { logger } from '@/utils/logger.util';

interface EmailRecipient {
  email_address: {
    address: string;
    name: string;
  };
}

interface EmailData {
  from: {
    address: string;
    name: string;
  };
  to: EmailRecipient[];
  subject: string;
  htmlbody: string;
}

@Injectable()
export class UserUpdatesEmailService {
  private client: SendMailClient;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private readonly logoUrl: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('ZEPTOMAIL_API_TOKEN');
    this.client = new SendMailClient({
      url: 'api.zeptomail.com/',
      token,
    });
    this.fromEmail = this.configService.get<string>('FROM_EMAIL', 'noreply@avigate.co');
    this.fromName = 'Avigate';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://avigate.co');
    this.logoUrl = 'https://avigate.co/images/avigate-logo-email.png';
  }

  private validateConfiguration(): void {
    const token = this.configService.get<string>('ZEPTOMAIL_API_TOKEN');
    if (!token) {
      throw new Error('Missing ZeptoMail configuration: ZEPTOMAIL_API_TOKEN');
    }
    logger.info('User Updates ZeptoMail configuration validated', {
      hasToken: !!token,
      fromEmail: this.fromEmail,
    });
  }

  private async sendZeptoMailEmail(emailData: EmailData, emailType: string): Promise<any> {
    try {
      this.validateConfiguration();

      logger.info('Sending user update email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('User update email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('User Updates ZeptoMail SDK error:', {
        name: error.name,
        message: error.message,
        emailType,
        recipient: emailData?.to?.[0]?.email_address?.address || 'unknown',
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private generateBaseEmailHTML(title: string, content: string, footerText?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
        <div style="max-width: 480px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="padding: 24px; text-align: center; border-bottom: 1px solid #e9ecef;">
            <img src="${this.logoUrl}" alt="Avigate" style="height: 32px;">
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px;">
            ${content}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #6c757d; line-height: 1.4;">
              ${footerText || 'This is an automated message from Avigate.'}
              <br>Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a>
            </p>
            
            <!-- Social Media Links -->
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #6c757d; font-weight: 600;">Follow us on social media:</p>
              <div style="margin: 0;">
                <a href="https://www.instagram.com/try_avigate/" style="color: #86B300; text-decoration: none; font-size: 11px; margin: 0 6px;">Instagram</a>
                <span style="color: #dee2e6; margin: 0 2px;">•</span>
                <a href="https://x.com/try_avigate" style="color: #86B300; text-decoration: none; font-size: 11px; margin: 0 6px;">X (Twitter)</a>
                <span style="color: #dee2e6; margin: 0 2px;">•</span>
                <a href="https://www.tiktok.com/@try_avigate" style="color: #86B300; text-decoration: none; font-size: 11px; margin: 0 6px;">TikTok</a>
                <br style="margin: 4px 0;">
                <a href="https://web.facebook.com/profile.php?id=61580695756879" style="color: #86B300; text-decoration: none; font-size: 11px; margin: 0 6px;">Facebook</a>
                <span style="color: #dee2e6; margin: 0 2px;">•</span>
                <a href="https://www.linkedin.com/company/109130197" style="color: #86B300; text-decoration: none; font-size: 11px; margin: 0 6px;">LinkedIn</a>
              </div>
            </div>
          </div>
          
        </div>
      </body>
      </html>
    `;
  }

  async sendProfileUpdateNotification(
    email: string,
    firstName: string,
    updatedFields: string[],
  ): Promise<void> {
    logger.info('Preparing profile update notification', { email, firstName, updatedFields });

    const fieldsList = updatedFields
      .map(field => {
        // Convert camelCase to Title Case
        return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      })
      .join(', ');

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">Profile Updated</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your profile information has been successfully updated.
      </p>
      
      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #495057;"><strong>Updated Fields:</strong></p>
        <p style="margin: 0; font-size: 14px; color: #495057;">${fieldsList}</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Updated: ${new Date().toLocaleString()}</p>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        If you didn't make these changes, please contact our support team immediately.
      </p>
    `;

    const emailData: EmailData = {
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email_address: {
            address: email,
            name: firstName,
          },
        },
      ],
      subject: 'Profile Updated - Avigate',
      htmlbody: this.generateBaseEmailHTML(
        'Profile Updated',
        content,
        'This is a security notification from Avigate.',
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'profile_update');
    logger.info(`Profile update notification sent to ${email}`);
  }

  async sendEmailChangeNotificationToOldEmail(
    oldEmail: string,
    newEmail: string,
    firstName: string,
  ): Promise<void> {
    logger.info('Preparing email change notification for old email', {
      oldEmail,
      newEmail,
      firstName,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #d63384;">Email Address Changed</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your Avigate account email has been changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
      </p>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404;"><strong>Change Details:</strong></p>
        <p style="margin: 4px 0; font-size: 14px; color: #856404;">Previous Email: ${oldEmail}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #856404;">New Email: ${newEmail}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #856404;">Changed: ${new Date().toLocaleString()}</p>
      </div>
      
      <p style="margin: 16px 0; font-size: 16px; line-height: 1.5; color: #555;">
        If you didn't make this change, please contact our support team immediately at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a>.
      </p>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        This email was sent to your previous address as a security notification. Future communications will be sent to your new email address.
      </p>
    `;

    const emailData: EmailData = {
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email_address: {
            address: oldEmail,
            name: firstName,
          },
        },
      ],
      subject: 'Email Address Changed - Avigate',
      htmlbody: this.generateBaseEmailHTML(
        'Email Address Changed',
        content,
        'This is a critical security notification from Avigate.',
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'email_change_old');
    logger.info(`Email change notification sent to old email: ${oldEmail}`);
  }

  async sendEmailChangeConfirmationToNewEmail(
    newEmail: string,
    oldEmail: string,
    firstName: string,
  ): Promise<void> {
    logger.info('Preparing email change confirmation for new email', {
      newEmail,
      oldEmail,
      firstName,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #198754;">Email Updated Successfully</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your Avigate account email has been successfully updated to this address.
      </p>
      
      <div style="background-color: #d1e7dd; border: 1px solid #badbcc; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f5132;"><strong>Update Details:</strong></p>
        <p style="margin: 4px 0; font-size: 14px; color: #0f5132;">Previous Email: ${oldEmail}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #0f5132;">New Email: ${newEmail}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #0f5132;">Updated: ${new Date().toLocaleString()}</p>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.5; color: #555;">
        All future communications will be sent to this email address. You can now use this email to log in to your account.
      </p>
    `;

    const emailData: EmailData = {
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email_address: {
            address: newEmail,
            name: firstName,
          },
        },
      ],
      subject: 'Email Updated Successfully - Avigate',
      htmlbody: this.generateBaseEmailHTML(
        'Email Updated Successfully',
        content,
        'Welcome to your new email address with Avigate.',
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'email_change_new');
    logger.info(`Email change confirmation sent to new email: ${newEmail}`);
  }

  async sendPasswordResetOTP(email: string, firstName: string, otpCode: string): Promise<void> {
    logger.info('Preparing password reset OTP', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">Reset Your Password</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        We received a request to reset your password. Use this code to complete the process:
      </p>
      
      <div style="background-color: #f8f9fa; border: 2px solid #86B300; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #86B300; letter-spacing: 4px; margin: 0;">${otpCode}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Expires in 10 minutes</p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        If you didn't request this password reset, please ignore this email and your password will remain unchanged.
      </p>
    `;

    const emailData: EmailData = {
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to: [
        {
          email_address: {
            address: email,
            name: firstName,
          },
        },
      ],
      subject: 'Reset Your Password - Avigate',
      htmlbody: this.generateBaseEmailHTML(
        'Reset Your Password',
        content,
        'This is a password recovery request from Avigate.',
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'password_reset');
    logger.info(`Password reset OTP sent to ${email}`);
  }
}
