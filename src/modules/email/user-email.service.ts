// src/modules/email/services/user-email.service.ts

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
export class UserEmailService {
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
    logger.info('User ZeptoMail configuration validated', {
      hasToken: !!token,
      fromEmail: this.fromEmail,
    });
  }

  private async sendZeptoMailEmail(emailData: EmailData, emailType: string): Promise<any> {
    try {
      this.validateConfiguration();

      logger.info('Sending user email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('User email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('User ZeptoMail SDK error:', {
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

  async sendWelcomeEmail(email: string, firstName: string, otpCode: string): Promise<void> {
    logger.info('Preparing welcome email with OTP', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">Welcome to Avigate</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Welcome to Nigeria's smartest transportation guide. To complete your registration, please verify your email with this code:
      </p>
      
      <div style="background-color: #f8f9fa; border: 2px solid #86B300; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #86B300; letter-spacing: 4px; margin: 0;">${otpCode}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Expires in 10 minutes</p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        If you didn't create this account, please ignore this email.
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
      subject: 'Welcome to Avigate - Verify Your Email',
      htmlbody: this.generateBaseEmailHTML('Welcome to Avigate', content),
    };

    await this.sendZeptoMailEmail(emailData, 'welcome_verification');
    logger.info(`Welcome email sent to ${email}`);
  }

  async sendEmailVerificationOTP(email: string, firstName: string, otpCode: string): Promise<void> {
    logger.info('Preparing email verification OTP', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">Verify Your Email</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Please use this code to verify your email address:
      </p>
      
      <div style="background-color: #f8f9fa; border: 2px solid #86B300; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #86B300; letter-spacing: 4px; margin: 0;">${otpCode}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Expires in 10 minutes</p>
      </div>
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
      subject: 'Verify Your Email - Avigate',
      htmlbody: this.generateBaseEmailHTML('Verify Your Email', content, 'This is a security verification from Avigate.'),
    };

    await this.sendZeptoMailEmail(emailData, 'email_verification');
    logger.info(`Email verification OTP sent to ${email}`);
  }

  async sendLoginOTP(email: string, firstName: string, otpCode: string, deviceInfo?: string): Promise<void> {
    logger.info('Preparing login OTP email', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">Login Verification</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Here's your login verification code:
      </p>
      
      <div style="background-color: #f8f9fa; border: 2px solid #86B300; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #86B300; letter-spacing: 4px; margin: 0;">${otpCode}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">Expires in 5 minutes</p>
      </div>
      
      ${deviceInfo ? `
        <div style="background-color: #f8f9fa; border-radius: 4px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #6c757d;"><strong>Device:</strong> ${deviceInfo}</p>
        </div>
      ` : ''}
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        If you didn't request this code, please secure your account immediately.
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
      subject: 'Your Avigate Login Code',
      htmlbody: this.generateBaseEmailHTML('Login Verification', content, 'This is a security verification from Avigate.'),
    };

    await this.sendZeptoMailEmail(emailData, 'login_otp');
    logger.info(`Login OTP sent to ${email}`);
  }

  async sendNewDeviceLoginNotification(
    email: string,
    firstName: string,
    deviceInfo: string,
    location?: string,
  ): Promise<void> {
    logger.info('Preparing new device login notification', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #d63384;">New Device Login</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your account was accessed from a new device.
      </p>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404;"><strong>Login Details:</strong></p>
        <p style="margin: 4px 0; font-size: 14px; color: #856404;">Time: ${new Date().toLocaleString()}</p>
        ${deviceInfo ? `<p style="margin: 4px 0; font-size: 14px; color: #856404;">Device: ${deviceInfo}</p>` : ''}
        ${location ? `<p style="margin: 4px 0; font-size: 14px; color: #856404;">Location: ${location}</p>` : ''}
      </div>
      
      <p style="margin: 16px 0; font-size: 16px; line-height: 1.5; color: #555;">
        If this wasn't you, please change your password immediately.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${this.frontendUrl}/change-password" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500;">Change Password</a>
      </div>
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
      subject: 'New Device Login - Avigate',
      htmlbody: this.generateBaseEmailHTML('New Device Login', content, 'This is a security alert from Avigate.'),
    };

    await this.sendZeptoMailEmail(emailData, 'new_device_login');
    logger.info(`New device login notification sent to ${email}`);
  }

  async sendPasswordChangeConfirmation(email: string, firstName: string, changeTime: string): Promise<void> {
    logger.info('Preparing password change confirmation', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #198754;">Password Changed</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your password was successfully changed.
      </p>
      
      <div style="background-color: #d1e7dd; border: 1px solid #badbcc; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #0f5132;">Changed: ${changeTime}</p>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d;">
        If you didn't make this change, contact our support team immediately.
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
      subject: 'Password Changed - Avigate',
      htmlbody: this.generateBaseEmailHTML('Password Changed', content, 'This is a security confirmation from Avigate.'),
    };

    await this.sendZeptoMailEmail(emailData, 'password_change');
    logger.info(`Password change confirmation sent to ${email}`);
  }

  async sendAccountDeletionConfirmation(email: string, firstName: string, deletionTime: string): Promise<void> {
    logger.info('Preparing account deletion confirmation', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #6c757d;">Account Deleted</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your Avigate account has been permanently deleted.
      </p>
      
      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px; color: #495057;">Deleted: ${deletionTime}</p>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.5; color: #555;">
        Thank you for using Avigate. You're welcome to create a new account anytime.
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
      subject: 'Account Deleted - Avigate',
      htmlbody: this.generateBaseEmailHTML('Account Deleted', content, 'This is a final confirmation from Avigate.'),
    };

    await this.sendZeptoMailEmail(emailData, 'account_deletion');
    logger.info(`Account deletion confirmation sent to ${email}`);
  }
}
