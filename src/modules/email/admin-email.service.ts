// src/modules/email/services/admin-email.service.ts

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
export class AdminEmailService {
  private client: SendMailClient;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly adminFrontendUrl: string;
  private readonly logoUrl: string;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('ZEPTOMAIL_API_TOKEN');
    this.client = new SendMailClient({
      url: 'api.zeptomail.com/',
      token,
    });
    this.fromEmail = this.configService.get<string>('ADMIN_FROM_EMAIL', 'notifications@avigate.co');
    this.fromName = 'Avigate Admin';
    this.adminFrontendUrl = this.configService.get<string>('ADMIN_FRONTEND_URL', 'https://admin.avigate.co');
    this.logoUrl = 'https://avigate.co/images/avigate-logo-email.png';
  }

  private validateConfiguration(): void {
    const token = this.configService.get<string>('ZEPTOMAIL_API_TOKEN');
    if (!token) {
      throw new Error('Missing ZeptoMail configuration: ZEPTOMAIL_API_TOKEN');
    }
    logger.info('Admin ZeptoMail configuration validated', {
      hasToken: !!token,
      fromEmail: this.fromEmail,
    });
  }

  private async sendZeptoMailEmail(emailData: EmailData, emailType: string): Promise<any> {
    try {
      this.validateConfiguration();

      logger.info('Sending admin email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('Admin email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('Admin ZeptoMail SDK error:', {
        name: error.name,
        message: error.message,
        emailType,
        recipient: emailData?.to?.[0]?.email_address?.address || 'unknown',
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private generateInvitationHTML(firstName: string, email: string, inviteUrl: string, tempPassword: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
        <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 8px;">
          
          <!-- Header -->
          <div style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
            <img src="${this.logoUrl}" alt="Avigate" style="height: 50px;">
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            <h2 style="margin: 0 0 24px; color: #333; font-size: 24px; font-weight: 600;">Admin Access Invitation</h2>
            
            <p style="margin: 0 0 24px; color: #666; line-height: 1.6;">Hi ${firstName},</p>
            
            <p style="margin: 0 0 32px; color: #666; line-height: 1.6;">You've been invited to access the Avigate Admin Portal. Use these credentials to get started:</p>
            
            <!-- Credentials -->
            <div style="background: #f8f9fa; padding: 24px; border-radius: 6px; margin: 0 0 32px;">
              <p style="margin: 0 0 8px; color: #333; font-size: 14px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0; color: #333; font-size: 14px;"><strong>Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #495057;">${tempPassword}</code></p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 0 0 32px;">
              <a href="${inviteUrl}" style="display: inline-block; background: #86B300; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Access Admin Portal</a>
            </div>
            
            <!-- Important Note -->
            <div style="padding: 16px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 24px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">Please change your password on first login. This invitation expires in 7 days.</p>
            </div>
            
            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a></p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 24px 40px; background: #f8f9fa; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">© 2025 Avigate. This is an automated message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetHTML(firstName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
        <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 8px;">
          
          <!-- Header -->
          <div style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
            <img src="${this.logoUrl}" alt="Avigate" style="height: 50px;">
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            <h2 style="margin: 0 0 24px; color: #333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
            
            <p style="margin: 0 0 24px; color: #666; line-height: 1.6;">Hi ${firstName},</p>
            
            <p style="margin: 0 0 32px; color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new one:</p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 0 0 32px;">
              <a href="${resetUrl}" style="display: inline-block; background: #86B300; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            
            <!-- Important Note -->
            <div style="padding: 16px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 24px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">This link expires in 1 hour for security.</p>
            </div>
            
            <p style="margin: 0 0 16px; color: #666; font-size: 14px; line-height: 1.6;">If you didn't request this, you can safely ignore this email.</p>
            
            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">Questions? Contact us at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a></p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 24px 40px; background: #f8f9fa; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">© 2025 Avigate. This is an automated security message.</p>
              </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendAdminInvitationEmail(
    email: string,
    firstName: string,
    tempPassword: string,
    inviteToken: string,
  ): Promise<void> {
    const inviteUrl = `${this.adminFrontendUrl}/admin/accept-invitation?token=${inviteToken}`;

    logger.info('Preparing admin invitation email', { email, firstName });

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
      subject: 'Welcome to Avigate Admin - Complete Your Account Setup',
      htmlbody: this.generateInvitationHTML(firstName, email, inviteUrl, tempPassword),
    };

    await this.sendZeptoMailEmail(emailData, 'admin_invitation');
    logger.info(`Admin invitation email sent to ${email}`);
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.adminFrontendUrl}/admin/reset-password?token=${resetToken}`;

    logger.info('Preparing password reset email', { email, firstName });

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
      subject: 'Avigate Admin - Password Reset Request',
      htmlbody: this.generatePasswordResetHTML(firstName, resetUrl),
    };

    await this.sendZeptoMailEmail(emailData, 'password_reset');
    logger.info(`Password reset email sent to ${email}`);
  }
}