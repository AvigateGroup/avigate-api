// src/modules/email/services/community-email.service.ts

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
export class CommunityEmailService {
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

      logger.info('Sending community email via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
        subject: emailData.subject,
      });

      const response = await this.client.sendMail(emailData);

      logger.info('Community email sent successfully via ZeptoMail', {
        emailType,
        recipient: emailData.to[0].email_address.address,
      });

      return { success: true, data: response };
    } catch (error) {
      logger.error('Community ZeptoMail SDK error:', {
        name: error.name,
        message: error.message,
        emailType,
        recipient: emailData?.to?.[0]?.email_address?.address || 'unknown',
      });

      throw new Error(`Failed to send community email: ${error.message}`);
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
   * Send notification when user's contribution is approved
   */
  async sendContributionApprovedEmail(
    email: string,
    firstName: string,
    contributionData: {
      contributionId: string;
      type: string;
      description: string;
      reputationPoints: number;
      routeName?: string;
    },
  ): Promise<void> {
    logger.info('Preparing contribution approved email', {
      email,
      firstName,
      contributionId: contributionData.contributionId,
    });

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #198754;">Contribution Approved! 🎉</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">Your contribution is now live</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Great news! Your route contribution has been reviewed and approved by our team. It's now available to all Avigate users!
      </p>
      
      <!-- Contribution Card -->
      <div style="background: linear-gradient(135deg, #86B300 0%, #6d9000 100%); border-radius: 8px; padding: 20px; margin: 24px 0; color: white;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">CONTRIBUTION TYPE</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${contributionData.type}</p>
        </div>
        ${
          contributionData.routeName
            ? `
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">ROUTE</p>
          <p style="margin: 0; font-size: 16px; font-weight: 500;">${contributionData.routeName}</p>
        </div>
        `
            : ''
        }
        <div>
          <p style="margin: 0 0 4px 0; font-size: 12px; opacity: 0.9;">DESCRIPTION</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.4;">${contributionData.description}</p>
        </div>
      </div>
      
      <!-- Reputation Points -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #856404; font-weight: 600;">REPUTATION EARNED</p>
            <p style="margin: 0; font-size: 14px; color: #856404;">Your verified contribution earned you bonus reputation points!</p>
          </div>
          <div style="text-align: center; padding-left: 16px;">
            <div style="background-color: #ffc107; color: white; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
              +${contributionData.reputationPoints}
            </div>
          </div>
        </div>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.5; color: #555;">
        Thank you for helping make Avigate better for everyone! Your local knowledge is invaluable to our community.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/community/contributions/${contributionData.contributionId}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">View Contribution</a>
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
      subject: '🎉 Your Contribution Has Been Approved!',
      htmlbody: this.generateBaseEmailHTML(
        'Contribution Approved',
        content,
        'Keep contributing to earn more reputation points!',
      ),
    };

    await this.sendZeptoMailEmail(emailData, 'contribution_approved');
    logger.info(`Contribution approved email sent to ${email}`);
  }

  /**
   * Send notification when user's contribution is rejected
   */
  async sendContributionRejectedEmail(
    email: string,
    firstName: string,
    contributionData: {
      contributionId: string;
      type: string;
      description: string;
      rejectionReason: string;
    },
  ): Promise<void> {
    logger.info('Preparing contribution rejected email', {
      email,
      firstName,
      contributionId: contributionData.contributionId,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #dc3545;">Contribution Update</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Thank you for your recent contribution to Avigate. After careful review, we're unable to approve it at this time.
      </p>
      
      <!-- Contribution Details -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">CONTRIBUTION TYPE</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${contributionData.type}</p>
        </div>
        <div>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6c757d; font-weight: 500;">DESCRIPTION</p>
          <p style="margin: 0; font-size: 14px; color: #333;">${contributionData.description}</p>
        </div>
      </div>
      
      <!-- Rejection Reason -->
      <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #721c24; font-weight: 600;">Reason for Rejection:</p>
        <p style="margin: 0; font-size: 14px; color: #721c24; line-height: 1.5;">${contributionData.rejectionReason}</p>
      </div>
      
      <!-- Tips for Better Contributions -->
      <div style="background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #084298; font-weight: 600;">Tips for Better Contributions:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #084298; line-height: 1.6;">
          <li>Include accurate fare ranges</li>
          <li>Provide clear, step-by-step instructions</li>
          <li>Mention recognizable landmarks</li>
          <li>Use local language (Pidgin) where appropriate</li>
          <li>Verify information before submitting</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.5; color: #555;">
        Don't be discouraged! We appreciate your effort to help the community. Please feel free to submit another contribution with the feedback in mind.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/community/contribute" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">Submit New Contribution</a>
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
      subject: 'Contribution Update - Avigate',
      htmlbody: this.generateBaseEmailHTML('Contribution Update', content),
    };

    await this.sendZeptoMailEmail(emailData, 'contribution_rejected');
    logger.info(`Contribution rejected email sent to ${email}`);
  }

  /**
   * Send notification for new badge earned
   */
  async sendBadgeEarnedEmail(
    email: string,
    firstName: string,
    badgeData: {
      badgeName: string;
      badgeDescription: string;
      badgeIcon: string;
      tier: string;
    },
  ): Promise<void> {
    logger.info('Preparing badge earned email', {
      email,
      firstName,
      badgeName: badgeData.badgeName,
    });

    const tierColors: Record<string, string> = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
    };

    const tierColor = tierColors[badgeData.tier.toLowerCase()] || '#86B300';

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #86B300;">New Badge Earned! 🏆</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">Achievement Unlocked</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Congratulations! Your continued contributions to the Avigate community have earned you a new badge.
      </p>
      
      <!-- Badge Card -->
      <div style="background: linear-gradient(135deg, ${tierColor} 0%, ${tierColor}dd 100%); border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center; color: white;">
        <div style="font-size: 64px; margin-bottom: 16px;">
          ${badgeData.badgeIcon || '🏆'}
        </div>
        <div style="background-color: rgba(255,255,255,0.2); border-radius: 4px; padding: 4px 12px; display: inline-block; margin-bottom: 12px;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${badgeData.tier} TIER</p>
        </div>
        <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">${badgeData.badgeName}</h2>
        <p style="margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.5;">${badgeData.badgeDescription}</p>
      </div>
      
      <!-- Stats Info -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">Show off your achievement to the community!</p>
        <p style="margin: 0; font-size: 12px; color: #6c757d;">Your badge is now displayed on your profile.</p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.5; color: #555; text-align: center;">
        Keep up the great work! Continue contributing to earn more badges and reputation.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/profile/badges" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">View All Badges</a>
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
      subject: `🏆 New Badge Earned: ${badgeData.badgeName}!`,
      htmlbody: this.generateBaseEmailHTML('New Badge Earned', content),
    };

    await this.sendZeptoMailEmail(emailData, 'badge_earned');
    logger.info(`Badge earned email sent to ${email}`);
  }

  /**
   * Send weekly community digest
   */
  async sendWeeklyCommunityDigest(
    email: string,
    firstName: string,
    digestData: {
      totalContributions: number;
      topContributors: Array<{ name: string; points: number }>;
      newRoutes: number;
      trafficUpdates: number;
      userRank: number;
      userPoints: number;
    },
  ): Promise<void> {
    logger.info('Preparing weekly community digest', { email, firstName });

    const content = `
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #86B300;">Your Weekly Avigate Digest 📊</h1>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6c757d;">Community highlights from this week</p>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        Here's what happened in the Avigate community this week!
      </p>
      
      <!-- Community Stats -->
      <div style="background: linear-gradient(135deg, #86B300 0%, #6d9000 100%); border-radius: 8px; padding: 24px; margin: 24px 0; color: white;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Community Activity</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">${digestData.totalContributions}</div>
            <div style="font-size: 12px; opacity: 0.9;">Contributions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">${digestData.newRoutes}</div>
            <div style="font-size: 12px; opacity: 0.9;">New Routes</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">${digestData.trafficUpdates}</div>
            <div style="font-size: 12px; opacity: 0.9;">Traffic Updates</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">#${digestData.userRank}</div>
            <div style="font-size: 12px; opacity: 0.9;">Your Rank</div>
          </div>
        </div>
      </div>
      
      <!-- Your Progress -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333;">Your Progress</h2>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6c757d;">Current Reputation</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #86B300;">${digestData.userPoints} points</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6c757d;">Community Rank</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">#${digestData.userRank}</p>
          </div>
        </div>
      </div>
      
      <!-- Top Contributors -->
      ${
        digestData.topContributors.length > 0
          ? `
      <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #856404;">🌟 Top Contributors</h2>
        ${digestData.topContributors
          .map(
            (contributor, index) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; ${index < digestData.topContributors.length - 1 ? 'border-bottom: 1px solid #ffeaa7;' : ''}">
          <div style="display: flex; align-items: center;">
            <div style="width: 28px; height: 28px; background-color: #ffc107; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 12px;">
              ${index + 1}
            </div>
            <span style="font-size: 14px; color: #856404; font-weight: 500;">${contributor.name}</span>
          </div>
          <span style="font-size: 14px; color: #856404; font-weight: bold;">${contributor.points} pts</span>
        </div>
        `,
          )
          .join('')}
      </div>
      `
          : ''
      }
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.5; color: #555; text-align: center;">
        Keep contributing to climb the leaderboard and earn more badges!
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/community" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">View Community Feed</a>
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
      subject: '📊 Your Weekly Avigate Digest',
      htmlbody: this.generateBaseEmailHTML('Weekly Digest', content),
    };

    await this.sendZeptoMailEmail(emailData, 'weekly_digest');
    logger.info(`Weekly digest email sent to ${email}`);
  }

  /**
   * Send notification when someone comments on user's post
   */
  async sendPostCommentNotification(
    email: string,
    firstName: string,
    commentData: {
      postTitle: string;
      postId: string;
      commenterName: string;
      commentText: string;
    },
  ): Promise<void> {
    logger.info('Preparing post comment notification', {
      email,
      firstName,
      postId: commentData.postId,
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #86B300;">New Comment on Your Post 💬</h1>
      
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #333;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
        <strong>${commentData.commenterName}</strong> commented on your post.
      </p>
      
      <!-- Post Info -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d; font-weight: 600; text-transform: uppercase;">Your Post</p>
        <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">${commentData.postTitle}</p>
      </div>
      
      <!-- Comment -->
      <div style="background-color: #e7f3ff; border-left: 4px solid #86B300; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #0d6efd; font-weight: 600;">${commentData.commenterName}</p>
        <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">${commentData.commentText}</p>
      </div>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${this.frontendUrl}/community/posts/${commentData.postId}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">View & Reply</a>
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
      subject: `💬 ${commentData.commenterName} commented on your post`,
      htmlbody: this.generateBaseEmailHTML('New Comment', content),
    };

    await this.sendZeptoMailEmail(emailData, 'post_comment');
    logger.info(`Post comment notification sent to ${email}`);
  }
}
