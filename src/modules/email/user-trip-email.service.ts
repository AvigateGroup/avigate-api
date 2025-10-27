// src/modules/email/services/user-trip-email.service.ts

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

export interface TripEmailData {
  tripId: string;
  userName: string;
  userEmail: string;
  startLocation: string;
  endLocation: string;
  startTime: Date;
  endTime: Date;
  distance: number; // in kilometers
  duration: number; // in minutes
  transportModes: string[];
  steps: Array<{
    stepNumber: number;
    instruction: string;
    distance: number;
    duration: number;
    fromLocation?: string;
    toLocation?: string;
  }>;
  fare?: {
    min: number;
    max: number;
  };
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
}

@Injectable()
export class UserTripEmailService {
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
    logger.info('Trip ZeptoMail configuration validated', {
      hasToken: !!token,
      fromEmail: this.fromEmail,
    });
  }

  private async sendZeptoMailEmail(emailData: EmailData, emailType: string): Promise<any> {
    try {
      this.validateConfiguration();

      logger.info('Sending trip email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('Trip email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('Trip ZeptoMail SDK error:', {
        name: error.name,
        message: error.message,
        emailType,
        recipient: emailData?.to?.[0]?.email_address?.address || 'unknown',
      });

      throw new Error(`Failed to send trip email: ${error.message}`);
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

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private generateStepsHTML(steps: TripEmailData['steps']): string {
    return steps
      .map(
        (step, index) => `
      <div style="display: flex; margin-bottom: ${index < steps.length - 1 ? '16px' : '0'}; padding-bottom: ${index < steps.length - 1 ? '16px' : '0'}; border-bottom: ${index < steps.length - 1 ? '1px dashed #dee2e6' : 'none'};">
        <div style="flex-shrink: 0; width: 32px; height: 32px; background-color: #86B300; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px;">
          ${step.stepNumber}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 500; color: #333;">${step.instruction}</p>
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            ${step.distance.toFixed(1)} km • ${this.formatDuration(step.duration)}
            ${step.fromLocation ? ` • From: ${step.fromLocation}` : ''}
            ${step.toLocation ? ` • To: ${step.toLocation}` : ''}
          </p>
        </div>
      </div>
    `,
      )
      .join('');
  }

  async sendTripCompletionEmail(tripData: TripEmailData): Promise<void> {
    logger.info('Preparing trip completion email', {
      email: tripData.userEmail,
      tripId: tripData.tripId,
    });

    const actualDuration = Math.round(
      (new Date(tripData.endTime).getTime() - new Date(tripData.startTime).getTime()) / 60000,
    );

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #198754;">Trip Completed! 🎉</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">Journey Summary</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${tripData.userName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        You've successfully completed your journey! Here's a summary of your trip.
      </p>
      
      <!-- Trip Overview Card -->
      <div style="background: linear-gradient(135deg, #86B300 0%, #6d9000 100%); border-radius: 8px; padding: 20px; margin: 24px 0; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">From</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">${tripData.startLocation}</p>
          </div>
          <div style="font-size: 24px;">→</div>
          <div style="text-align: right;">
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">To</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">${tripData.endLocation}</p>
          </div>
        </div>
        <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; display: flex; justify-content: space-around; text-align: center;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Distance</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${tripData.distance.toFixed(1)} km</p>
          </div>
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Duration</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${this.formatDuration(actualDuration)}</p>
          </div>
          ${
            tripData.fare
              ? `
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">Est. Fare</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">₦${tripData.fare.min} - ₦${tripData.fare.max}</p>
          </div>
          `
              : ''
          }
        </div>
      </div>
      
      <!-- Trip Details -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333;">Trip Details</h2>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">STARTED</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${this.formatDate(tripData.startTime)}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">COMPLETED</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${this.formatDate(tripData.endTime)}</p>
        </div>
        
        <div>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">TRANSPORT MODES</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${tripData.transportModes.map(mode => mode.charAt(0).toUpperCase() + mode.slice(1)).join(', ')}</p>
        </div>
      </div>
      
      <!-- Route Steps -->
      ${
        tripData.steps.length > 0
          ? `
      <div style="margin: 24px 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333;">Your Route</h2>
        ${this.generateStepsHTML(tripData.steps)}
      </div>
      `
          : ''
      }
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/trips/${tripData.tripId}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">View Trip Details</a>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #6c757d; text-align: center;">
        Thank you for using Avigate! We hope you had a safe journey.
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
            address: tripData.userEmail,
            name: tripData.userName,
          },
        },
      ],
      subject: `Trip Completed: ${tripData.startLocation} → ${tripData.endLocation}`,
      htmlbody: this.generateBaseEmailHTML('Trip Completed', content),
    };

    await this.sendZeptoMailEmail(emailData, 'trip_completion');
    logger.info(`Trip completion email sent to ${tripData.userEmail} for trip ${tripData.tripId}`);
  }

  async sendTripCancellationEmail(tripData: TripEmailData): Promise<void> {
    logger.info('Preparing trip cancellation email', {
      email: tripData.userEmail,
      tripId: tripData.tripId,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #dc3545;">Trip Cancelled</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${tripData.userName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Your trip has been cancelled. Here are the details:
      </p>
      
      <!-- Cancelled Trip Info -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #856404; font-weight: 500;">ROUTE</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${tripData.startLocation} → ${tripData.endLocation}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #856404; font-weight: 500;">STARTED</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${this.formatDate(tripData.startTime)}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #856404; font-weight: 500;">CANCELLED</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${this.formatDate(tripData.endTime)}</p>
        </div>
        
        ${
          tripData.cancellationReason
            ? `
        <div>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #856404; font-weight: 500;">REASON</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${tripData.cancellationReason}</p>
        </div>
        `
            : ''
        }
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #555;">
        No worries! You can start a new trip anytime.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/routes" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">Find New Route</a>
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
            address: tripData.userEmail,
            name: tripData.userName,
          },
        },
      ],
      subject: `Trip Cancelled: ${tripData.startLocation} → ${tripData.endLocation}`,
      htmlbody: this.generateBaseEmailHTML('Trip Cancelled', content),
    };

    await this.sendZeptoMailEmail(emailData, 'trip_cancellation');
    logger.info(
      `Trip cancellation email sent to ${tripData.userEmail} for trip ${tripData.tripId}`,
    );
  }

  async sendTripReminderEmail(
    email: string,
    userName: string,
    tripDetails: {
      startLocation: string;
      endLocation: string;
      estimatedDuration: number;
      nextStep: string;
    },
  ): Promise<void> {
    logger.info('Preparing trip reminder email', { email, userName });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #86B300;">Trip in Progress 📍</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${userName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        You have an active trip in progress. Don't forget to track your location!
      </p>
      
      <div style="background-color: #e7f5ff; border-left: 4px solid #86B300; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #333;"><strong>Current Trip:</strong></p>
        <p style="margin: 0 0 12px 0; font-size: 16px; color: #333;">${tripDetails.startLocation} → ${tripDetails.endLocation}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;"><strong>Next Step:</strong></p>
        <p style="margin: 0; font-size: 14px; color: #555;">${tripDetails.nextStep}</p>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${this.frontendUrl}/trips/active" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500;">Continue Trip</a>
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
            name: userName,
          },
        },
      ],
      subject: 'Active Trip Reminder - Avigate',
      htmlbody: this.generateBaseEmailHTML('Trip Reminder', content),
    };

    await this.sendZeptoMailEmail(emailData, 'trip_reminder');
    logger.info(`Trip reminder email sent to ${email}`);
  }
}