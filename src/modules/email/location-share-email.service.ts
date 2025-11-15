// src/modules/email/services/location-share-email.service.ts

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
export class LocationShareEmailService {
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
  }

  private async sendZeptoMailEmail(emailData: EmailData, emailType: string): Promise<any> {
    try {
      this.validateConfiguration();

      logger.info('Sending location share email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('Location share email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('Location Share ZeptoMail SDK error:', {
        name: error.name,
        message: error.message,
        emailType,
        recipient: emailData?.to?.[0]?.email_address?.address || 'unknown',
      });

      throw new Error(`Failed to send location share email: ${error.message}`);
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
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
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

  /**
   * Send invitation to access shared location (with QR code)
   */
  async sendLocationShareInvitation(
    email: string,
    recipientName: string,
    shareData: {
      ownerName: string;
      locationName: string;
      description?: string;
      shareUrl: string;
      eventDate?: Date;
      expiresAt?: Date;
      qrCodeDataUrl?: string; // Optional QR code
    },
  ): Promise<void> {
    logger.info('Preparing location share invitation', {
      email,
      recipientName,
      locationName: shareData.locationName,
    });

    const isEvent = !!shareData.eventDate;
    const eventInfo = shareData.eventDate
      ? new Date(shareData.eventDate).toLocaleString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '';

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #86B300;">${isEvent ? '🎉 ' : '📍 '}${shareData.ownerName} Shared a Location</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">${isEvent ? 'Event invitation' : 'Location shared with you'}</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${recipientName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        ${shareData.ownerName} has shared their location with you${isEvent ? ' for an upcoming event' : ''}. Get step-by-step directions using local transportation!
      </p>
      
      <!-- Location Card -->
      <div style="background: linear-gradient(135deg, #86B300 0%, #6d9000 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">
          ${isEvent ? '🎉' : '📍'}
        </div>
        <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">${shareData.locationName}</h2>
        ${shareData.description ? `<p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.95; line-height: 1.5;">${shareData.description}</p>` : ''}
        ${
          isEvent
            ? `
        <div style="background-color: rgba(255,255,255,0.2); border-radius: 8px; padding: 16px; margin-top: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9; font-weight: 600; text-transform: uppercase;">Event Date & Time</p>
          <p style="margin: 0; font-size: 16px; font-weight: 500;">${eventInfo}</p>
        </div>
        `
            : ''
        }
      </div>
      
      <!-- How It Works -->
      <div style="background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #084298; font-weight: 600;">🚌 How to Get There:</p>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #084298; line-height: 1.8;">
          <li>Click the button below to access the location</li>
          <li>Avigate will detect your current location</li>
          <li>Get step-by-step directions using buses, taxis, and keke</li>
          <li>Real-time navigation with local landmarks</li>
        </ol>
      </div>
      
      ${
        shareData.qrCodeDataUrl
          ? `
      <!-- QR Code -->
      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #333; font-weight: 600;">📱 Scan to Get Directions</p>
        <img src="${shareData.qrCodeDataUrl}" alt="QR Code" style="max-width: 250px; width: 100%; height: auto; border-radius: 8px;">
        <p style="margin: 16px 0 0 0; font-size: 12px; color: #6c757d;">Point your camera at this code to open the location</p>
      </div>
      `
          : ''
      }
      
      ${
        shareData.expiresAt
          ? `
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #856404;">
          ⏰ This share link expires on ${new Date(shareData.expiresAt).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      `
          : ''
      }
      
      <!-- Main CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${shareData.shareUrl}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(134, 179, 0, 0.3);">Get Directions</a>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d; text-align: center;">
        Avigate helps you navigate Nigerian cities using local transport. No special app required!
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
            name: recipientName,
          },
        },
      ],
      subject: isEvent
        ? `🎉 You're Invited: ${shareData.locationName}`
        : `📍 ${shareData.ownerName} Shared a Location with You`,
      htmlbody: this.generateBaseEmailHTML(
        isEvent ? 'Event Invitation' : 'Location Shared',
        content,
        `Shared by ${shareData.ownerName} via Avigate.`,
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'location_share_invitation');
    logger.info(`Location share invitation sent to ${email}`);
  }

  /**
   * Send notification when location share is accessed
   */
  async sendLocationAccessNotification(
    email: string,
    ownerName: string,
    accessData: {
      locationName: string;
      accessedBy: string;
      accessedAt: Date;
      accessCount: number;
    },
  ): Promise<void> {
    logger.info('Preparing location access notification', {
      email,
      ownerName,
      locationName: accessData.locationName,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #86B300;">Location Accessed 👁️</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${ownerName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Someone just accessed the location you shared!
      </p>
      
      <!-- Access Details -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">LOCATION</p>
          <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${accessData.locationName}</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">ACCESSED BY</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${accessData.accessedBy || 'Anonymous visitor'}</p>
        </div>
        
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">TIME</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${new Date(accessData.accessedAt).toLocaleString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">TOTAL ACCESSES</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${accessData.accessCount} time${accessData.accessCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
      
      <div style="background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #084298; line-height: 1.5;">
          💡 <strong>Tip:</strong> You can pause or revoke access to your shared location anytime from your profile settings.
        </p>
      </div>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/profile/shares" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">Manage Shares</a>
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
            name: ownerName,
          },
        },
      ],
      subject: `👁️ Someone accessed your shared location: ${accessData.locationName}`,
      htmlbody: this.generateBaseEmailHTML('Location Accessed', content),
    };

    await this.sendZeptoMailEmail(emailData, 'location_access_notification');
    logger.info(`Location access notification sent to ${email}`);
  }

  /**
   * Send reminder for upcoming event
   */
  async sendEventReminderEmail(
    email: string,
    userName: string,
    eventData: {
      eventName: string;
      locationName: string;
      eventDate: Date;
      shareUrl: string;
      hoursUntilEvent: number;
    },
  ): Promise<void> {
    logger.info('Preparing event reminder email', {
      email,
      userName,
      eventName: eventData.eventName,
    });

    const timeString =
      eventData.hoursUntilEvent < 24
        ? `in ${eventData.hoursUntilEvent} hours`
        : `in ${Math.round(eventData.hoursUntilEvent / 24)} days`;

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #86B300;">Event Reminder 🎉</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">Don't forget your upcoming event!</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${userName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        This is a friendly reminder that <strong>${eventData.eventName}</strong> is coming up ${timeString}!
      </p>
      
      <!-- Event Card -->
      <div style="background: linear-gradient(135deg, #86B300 0%, #6d9000 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white; text-align: center;">
        <div style="font-size: 56px; margin-bottom: 16px;">🎉</div>
        <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">${eventData.eventName}</h2>
        
        <div style="background-color: rgba(255,255,255,0.2); border-radius: 8px; padding: 16px; margin-top: 16px;">
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9; font-weight: 600; text-transform: uppercase;">Date & Time</p>
            <p style="margin: 0; font-size: 16px; font-weight: 500;">
              ${new Date(eventData.eventDate).toLocaleString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          </div>
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9; font-weight: 600; text-transform: uppercase;">Location</p>
            <p style="margin: 0; font-size: 16px; font-weight: 500;">${eventData.locationName}</p>
          </div>
        </div>
      </div>
      
      <!-- Planning Tips -->
      <div style="background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #084298; font-weight: 600;">📋 Planning Tips:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #084298; line-height: 1.8;">
          <li>Get directions before you leave to plan your route</li>
          <li>Check for traffic updates in the community feed</li>
          <li>Allow extra time for finding transport</li>
          <li>Save the location for offline access</li>
        </ul>
      </div>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${eventData.shareUrl}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(134, 179, 0, 0.3);">Get Directions</a>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d; text-align: center;">
        See you there! 🎊
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
            name: userName,
          },
        },
      ],
      subject: `🎉 Reminder: ${eventData.eventName} ${timeString}!`,
      htmlbody: this.generateBaseEmailHTML('Event Reminder', content),
    };

    await this.sendZeptoMailEmail(emailData, 'event_reminder');
    logger.info(`Event reminder email sent to ${email}`);
  }
}
