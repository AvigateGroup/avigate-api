const admin = require('firebase-admin')
const nodemailer = require('nodemailer')
const { logger } = require('../utils/logger')
const { User } = require('../models')

// Initialize Firebase Admin SDK
let firebaseApp = null
try {
    if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
    ) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
                    /\\n/g,
                    '\n'
                ),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
        })
        logger.info('Firebase Admin SDK initialized successfully')
    } else {
        logger.warn(
            'Firebase configuration missing. Push notifications will be disabled.'
        )
    }
} catch (error) {
    logger.error('Firebase initialization failed:', error)
}

// Initialize email transporter
let emailTransporter = null
try {
    if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD
    ) {
        emailTransporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        })
        logger.info('Email transporter initialized successfully')
    } else {
        logger.warn(
            'Email configuration missing. Email notifications will be disabled.'
        )
    }
} catch (error) {
    logger.error('Email transporter initialization failed:', error)
}

// Notification types enum
const NOTIFICATION_TYPES = {
    // Route related
    ROUTE_CREATED: 'route_created',
    ROUTE_UPDATED: 'route_updated',
    ROUTE_FEEDBACK: 'route_feedback',

    // Crowdsourcing
    CONTRIBUTION_ACCEPTED: 'contribution_accepted',
    CONTRIBUTION_REJECTED: 'contribution_rejected',
    REPUTATION_MILESTONE: 'reputation_milestone',

    // Direction sharing
    DIRECTION_SHARED: 'direction_shared',
    DIRECTION_USED: 'direction_used',

    // System notifications
    WELCOME: 'welcome',
    ACCOUNT_VERIFIED: 'account_verified',
    PASSWORD_RESET: 'password_reset',
    SECURITY_ALERT: 'security_alert',

    // Updates
    APP_UPDATE: 'app_update',
    MAINTENANCE: 'maintenance',

    // Community
    LEADERBOARD_RANK: 'leaderboard_rank',
    BADGE_EARNED: 'badge_earned',
}

// Notification priority levels
const PRIORITY_LEVELS = {
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
}

// Push notification service
class PushNotificationService {
    static async sendToUser(userId, notification) {
        if (!firebaseApp) {
            logger.warn('Firebase not configured. Skipping push notification.')
            return false
        }

        try {
            // Get user's FCM tokens (you'll need to store these when users register devices)
            const user = await User.findByPk(userId)
            if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
                logger.warn(`No FCM tokens found for user ${userId}`)
                return false
            }

            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    type: notification.type,
                    userId: userId.toString(),
                    ...notification.data,
                },
                android: {
                    priority:
                        notification.priority === PRIORITY_LEVELS.HIGH
                            ? 'high'
                            : 'normal',
                    notification: {
                        icon: 'ic_notification',
                        color: '#1976D2',
                        sound: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: notification.badge || 0,
                        },
                    },
                },
                tokens: user.fcmTokens,
            }

            const response = await admin.messaging().sendMulticast(message)

            // Handle failed tokens
            if (response.failureCount > 0) {
                const failedTokens = []
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(user.fcmTokens[idx])
                        logger.warn(`FCM token failed: ${resp.error?.message}`)
                    }
                })

                // Remove invalid tokens from user record
                if (failedTokens.length > 0) {
                    await this.removeInvalidTokens(userId, failedTokens)
                }
            }

            logger.info(
                `Push notification sent to user ${userId}: ${response.successCount} success, ${response.failureCount} failed`
            )
            return response.successCount > 0
        } catch (error) {
            logger.error('Push notification error:', error)
            return false
        }
    }

    static async sendToMultipleUsers(userIds, notification) {
        const results = await Promise.allSettled(
            userIds.map((userId) => this.sendToUser(userId, notification))
        )

        const successCount = results.filter(
            (result) => result.status === 'fulfilled' && result.value
        ).length
        logger.info(
            `Bulk push notification: ${successCount}/${userIds.length} successful`
        )

        return { successCount, totalCount: userIds.length }
    }

    static async sendToTopic(topic, notification) {
        if (!firebaseApp) {
            logger.warn('Firebase not configured. Skipping topic notification.')
            return false
        }

        try {
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: {
                    type: notification.type,
                    ...notification.data,
                },
                topic: topic,
            }

            const response = await admin.messaging().send(message)
            logger.info(`Topic notification sent to ${topic}: ${response}`)
            return true
        } catch (error) {
            logger.error('Topic notification error:', error)
            return false
        }
    }

    static async removeInvalidTokens(userId, invalidTokens) {
        try {
            const user = await User.findByPk(userId)
            if (user && user.fcmTokens) {
                user.fcmTokens = user.fcmTokens.filter(
                    (token) => !invalidTokens.includes(token)
                )
                await user.save()
                logger.info(
                    `Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`
                )
            }
        } catch (error) {
            logger.error('Error removing invalid FCM tokens:', error)
        }
    }
}

// Email notification service
class EmailService {
    static async sendEmail(to, subject, htmlContent, textContent = null) {
        if (!emailTransporter) {
            logger.warn('Email transporter not configured. Skipping email.')
            return false
        }

        try {
            const mailOptions = {
                from: `${process.env.FROM_NAME || 'Avigate'} <${process.env.FROM_EMAIL}>`,
                to,
                subject,
                html: htmlContent,
                text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            }

            const result = await emailTransporter.sendMail(mailOptions)
            logger.info(`Email sent to ${to}: ${result.messageId}`)
            return true
        } catch (error) {
            logger.error('Email sending error:', error)
            return false
        }
    }

    static async sendWelcomeEmail(user) {
        const subject = 'Welcome to Avigate! 🚀'
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976D2;">Welcome to Avigate, ${user.firstName}!</h1>
        <p>Thank you for joining Avigate, Nigeria's premier local transportation navigation app.</p>
        
        <h2>Get Started:</h2>
        <ul>
          <li>🗺️ Search for routes in your city</li>
          <li>🚌 Discover local transportation options</li>
          <li>💰 Get accurate fare estimates</li>
          <li>🤝 Contribute to the community</li>
        </ul>
        
        <p>Your journey with local Nigerian transportation just got easier!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Need Help?</h3>
          <p>Visit our help center or contact support at support@avigate.com</p>
        </div>
        
        <p>Happy travels!<br>The Avigate Team</p>
      </div>
    `

        return await this.sendEmail(user.email, subject, htmlContent)
    }

    static async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
        const subject = 'Reset Your Avigate Password'
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976D2;">Password Reset Request</h1>
        <p>Hello ${user.firstName},</p>
        
        <p>We received a request to reset your Avigate password. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p><strong>This link will expire in 1 hour.</strong></p>
        
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        
        <p>Best regards,<br>The Avigate Team</p>
      </div>
    `

        return await this.sendEmail(user.email, subject, htmlContent)
    }

    static async sendEmailVerification(user, verificationToken) {
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`
        const subject = 'Verify Your Avigate Email Address'
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976D2;">Verify Your Email Address</h1>
        <p>Hello ${user.firstName},</p>
        
        <p>Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <p>Thanks for joining Avigate!</p>
        <p>The Avigate Team</p>
      </div>
    `

        return await this.sendEmail(user.email, subject, htmlContent)
    }
}

// Main notification service
class NotificationService {
    // Send notification with multiple channels
    static async sendNotification(userId, notification, channels = ['push']) {
        const results = {}

        try {
            const user = await User.findByPk(userId)
            if (!user) {
                throw new Error(`User ${userId} not found`)
            }

            // Send push notification
            if (channels.includes('push')) {
                results.push = await PushNotificationService.sendToUser(
                    userId,
                    notification
                )
            }

            // Send email notification
            if (channels.includes('email') && notification.emailContent) {
                results.email = await EmailService.sendEmail(
                    user.email,
                    notification.emailSubject || notification.title,
                    notification.emailContent
                )
            }

            // Store notification in database for in-app notifications
            if (channels.includes('database')) {
                results.database = await this.storeNotification(
                    userId,
                    notification
                )
            }

            logger.info(`Notification sent to user ${userId}:`, results)
            return results
        } catch (error) {
            logger.error('Notification sending error:', error)
            return { error: error.message }
        }
    }

    // Store notification in database for in-app display
    static async storeNotification(userId, notification) {
        try {
            // You would implement a Notification model for this
            // For now, we'll log it
            logger.info(`Storing notification for user ${userId}:`, {
                type: notification.type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                createdAt: new Date(),
            })
            return true
        } catch (error) {
            logger.error('Error storing notification:', error)
            return false
        }
    }

    // Predefined notification templates
    static async sendWelcomeNotification(userId) {
        const notification = {
            type: NOTIFICATION_TYPES.WELCOME,
            title: 'Welcome to Avigate! 🚀',
            body: 'Start exploring local transportation routes in Nigerian cities.',
            priority: PRIORITY_LEVELS.NORMAL,
            data: {
                action: 'open_app',
            },
        }

        return await this.sendNotification(userId, notification, [
            'push',
            'database',
        ])
    }

    static async sendRouteCreatedNotification(userId, routeData) {
        const notification = {
            type: NOTIFICATION_TYPES.ROUTE_CREATED,
            title: 'New Route Created! 🗺️',
            body: `Your route from ${routeData.startLocation} to ${routeData.endLocation} has been created.`,
            priority: PRIORITY_LEVELS.NORMAL,
            data: {
                action: 'view_route',
                routeId: routeData.id,
            },
        }

        return await this.sendNotification(userId, notification, [
            'push',
            'database',
        ])
    }

    static async sendContributionAcceptedNotification(
        userId,
        contributionData
    ) {
        const notification = {
            type: NOTIFICATION_TYPES.CONTRIBUTION_ACCEPTED,
            title: 'Contribution Accepted! ✅',
            body: `Your contribution has been accepted. You earned ${contributionData.reputationGained} reputation points!`,
            priority: PRIORITY_LEVELS.HIGH,
            data: {
                action: 'view_profile',
                reputationGained: contributionData.reputationGained,
            },
        }

        return await this.sendNotification(userId, notification, [
            'push',
            'database',
        ])
    }

    static async sendReputationMilestoneNotification(userId, milestone) {
        const notification = {
            type: NOTIFICATION_TYPES.REPUTATION_MILESTONE,
            title: 'Reputation Milestone! 🏆',
            body: `Congratulations! You've reached ${milestone} reputation points.`,
            priority: PRIORITY_LEVELS.NORMAL,
            data: {
                action: 'view_profile',
                milestone: milestone,
            },
        }

        return await this.sendNotification(userId, notification, [
            'push',
            'database',
        ])
    }

    static async sendDirectionSharedNotification(userId, directionData) {
        const notification = {
            type: NOTIFICATION_TYPES.DIRECTION_SHARED,
            title: 'Direction Shared! 📤',
            body: `Someone used your shared direction. Share code: ${directionData.shareCode}`,
            priority: PRIORITY_LEVELS.LOW,
            data: {
                action: 'view_direction',
                directionId: directionData.id,
                shareCode: directionData.shareCode,
            },
        }

        return await this.sendNotification(userId, notification, [
            'push',
            'database',
        ])
    }

    // Bulk notifications
    static async sendBulkNotification(userIds, notification) {
        const results = await Promise.allSettled(
            userIds.map((userId) => this.sendNotification(userId, notification))
        )

        const successCount = results.filter(
            (result) => result.status === 'fulfilled'
        ).length
        logger.info(
            `Bulk notification sent: ${successCount}/${userIds.length} successful`
        )

        return { successCount, totalCount: userIds.length, results }
    }

    // Topic-based notifications for announcements
    static async sendAnnouncementNotification(topic, announcement) {
        const notification = {
            type: NOTIFICATION_TYPES.APP_UPDATE,
            title: announcement.title,
            body: announcement.body,
            priority: PRIORITY_LEVELS.NORMAL,
            data: {
                action: 'view_announcement',
                announcementId: announcement.id,
            },
        }

        return await PushNotificationService.sendToTopic(topic, notification)
    }

    // FCM token management
    static async addFCMToken(userId, token) {
        try {
            const user = await User.findByPk(userId)
            if (!user) {
                throw new Error('User not found')
            }

            const tokens = user.fcmTokens || []
            if (!tokens.includes(token)) {
                tokens.push(token)
                user.fcmTokens = tokens
                await user.save()
                logger.info(`FCM token added for user ${userId}`)
            }

            return true
        } catch (error) {
            logger.error('Error adding FCM token:', error)
            return false
        }
    }

    static async removeFCMToken(userId, token) {
        try {
            const user = await User.findByPk(userId)
            if (!user) {
                throw new Error('User not found')
            }

            const tokens = user.fcmTokens || []
            user.fcmTokens = tokens.filter((t) => t !== token)
            await user.save()
            logger.info(`FCM token removed for user ${userId}`)

            return true
        } catch (error) {
            logger.error('Error removing FCM token:', error)
            return false
        }
    }
}

module.exports = {
    NotificationService,
    PushNotificationService,
    EmailService,
    NOTIFICATION_TYPES,
    PRIORITY_LEVELS,
}
