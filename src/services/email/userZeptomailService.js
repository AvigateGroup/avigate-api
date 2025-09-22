// services/email/userZeptomailService.js
const { SendMailClient } = require('zeptomail')
const { logger } = require('../../utils/logger')
const { AuditLog } = require('../../models')

// ZeptoMail configuration
const ZEPTOMAIL_URL = 'api.zeptomail.com/'
const ZEPTOMAIL_API_TOKEN = process.env.ZEPTOMAIL_API_TOKEN
const FROM_EMAIL = 'noreply@avigate.co'
const FROM_NAME = 'Avigate'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://avigate.co'
const LOGO_URL = 'https://avigate.co/images/avigate-logo-email.png'

// Initialize ZeptoMail client
let zeptomailClient = null

const initializeZeptoMailClient = () => {
    if (!zeptomailClient && ZEPTOMAIL_API_TOKEN) {
        zeptomailClient = new SendMailClient({
            url: ZEPTOMAIL_URL,
            token: ZEPTOMAIL_API_TOKEN
        })
    }
    return zeptomailClient
}

/**
 * Validate ZeptoMail configuration
 */
const validateConfiguration = () => {
    const missingConfig = []
    
    if (!ZEPTOMAIL_API_TOKEN) missingConfig.push('ZEPTOMAIL_API_TOKEN')
    
    if (missingConfig.length > 0) {
        throw new Error(`Missing ZeptoMail configuration: ${missingConfig.join(', ')}`)
    }
    
    logger.info('User ZeptoMail configuration validated', {
        hasToken: !!ZEPTOMAIL_API_TOKEN,
        fromEmail: FROM_EMAIL
    })
}

/**
 * Send email using ZeptoMail SDK
 */
const sendZeptoMailEmail = async (emailData, emailType = 'unknown') => {
    try {
        validateConfiguration()
        
        const client = initializeZeptoMailClient()
        if (!client) {
            throw new Error('Failed to initialize ZeptoMail client')
        }

        logger.info(`Sending user email via ZeptoMail`, {
            emailType,
            recipient: emailData.to[0].email_address.address,
            subject: emailData.subject,
            hasHtmlBody: !!emailData.htmlbody
        })

        const response = await client.sendMail(emailData)

        // Log successful email
        await logEmailEvent(
            emailType, 
            emailData.to[0].email_address.address, 
            true, 
            null, 
            emailData.subject
        )

        logger.info(`User email sent successfully via ZeptoMail`, {
            emailType,
            recipient: emailData.to[0].email_address.address,
            response: response
        })
        
        return { success: true, data: response }
    } catch (error) {
        logger.error('User ZeptoMail SDK error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            emailType,
            recipient: emailData?.to?.[0]?.email_address?.address || 'unknown'
        })
        
        const errorMessage = error.message || error.toString() || 'Unknown error'
        
        // Log failed email
        await logEmailEvent(
            emailType, 
            emailData?.to?.[0]?.email_address?.address || 'unknown', 
            false, 
            errorMessage, 
            emailData?.subject || 'Unknown subject'
        )
        
        throw new Error(`Failed to send email: ${errorMessage}`)
    }
}

/**
 * Log email events for audit trail
 */
const logEmailEvent = async (emailType, recipient, success, errorMessage = null, subject = '') => {
    try {
        await AuditLog.create({
            action: 'user_email_sent',
            resource: 'user_email',
            metadata: {
                emailType,
                recipient,
                subject,
                success,
                error: errorMessage,
                service: 'zeptomail',
                timestamp: new Date().toISOString(),
            },
            severity: success ? 'low' : 'medium',
        })
    } catch (logError) {
        logger.error('Failed to log user email event:', logError)
    }
}

/**
 * Generate base email template
 */
const generateBaseEmailHTML = (title, content, footerText = null) => {
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
                <div style="background-color: #86B300; padding: 24px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 32px;">
                </div>
                
                <!-- Content -->
                <div style="padding: 32px 24px;">
                    ${content}
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; font-size: 12px; color: #6c757d; line-height: 1.4;">
                        ${footerText || 'This is an automated message from Avigate.'}
                        <br>Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a>
                    </p>
                </div>
                
            </div>
        </body>
        </html>
    `
}

/**
 * Send welcome email with OTP verification
 */
const sendWelcomeEmail = async (email, firstName, otpCode) => {
    try {
        logger.info(`Preparing welcome email with OTP`, { email, firstName })
        
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
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('Welcome to Avigate', content)
        }

        await sendZeptoMailEmail(emailData, 'welcome_verification')
        
        logger.info(`Welcome email sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send welcome email to ${email}:`, error)
        throw error
    }
}

/**
 * Send email verification OTP
 */
const sendEmailVerificationOTP = async (email, firstName, otpCode) => {
    try {
        logger.info(`Preparing email verification OTP`, { email, firstName })
        
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
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('Verify Your Email', content, 'This is a security verification from Avigate.')
        }

        await sendZeptoMailEmail(emailData, 'email_verification')
        
        logger.info(`Email verification OTP sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send verification OTP to ${email}:`, error)
        throw error
    }
}

/**
 * Send login OTP email
 */
const sendLoginOTP = async (email, firstName, otpCode, deviceInfo) => {
    try {
        logger.info(`Preparing login OTP email`, { email, firstName })
        
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
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('Login Verification', content, 'This is a security verification from Avigate.')
        }

        await sendZeptoMailEmail(emailData, 'login_otp')
        
        logger.info(`Login OTP sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send login OTP to ${email}:`, error)
        throw error
    }
}

/**
 * Send new device login notification
 */
const sendNewDeviceLoginNotification = async (email, firstName, deviceInfo, location) => {
    try {
        logger.info(`Preparing new device login notification`, { email, firstName })
        
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
                <a href="${FRONTEND_URL}/change-password" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500;">Change Password</a>
            </div>
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('New Device Login', content, 'This is a security alert from Avigate.')
        }

        await sendZeptoMailEmail(emailData, 'new_device_login')
        
        logger.info(`New device login notification sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send new device notification to ${email}:`, error)
        throw error
    }
}

/**
 * Send password change confirmation
 */
const sendPasswordChangeConfirmation = async (email, firstName, changeTime) => {
    try {
        logger.info(`Preparing password change confirmation`, { email, firstName })
        
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
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('Password Changed', content, 'This is a security confirmation from Avigate.')
        }

        await sendZeptoMailEmail(emailData, 'password_change')
        
        logger.info(`Password change confirmation sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send password change confirmation to ${email}:`, error)
        throw error
    }
}

/**
 * Send account deletion confirmation
 */
const sendAccountDeletionConfirmation = async (email, firstName, deletionTime) => {
    try {
        logger.info(`Preparing account deletion confirmation`, { email, firstName })
        
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
        `
        
        const emailData = {
            from: {
                address: FROM_EMAIL,
                name: FROM_NAME,
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
            htmlbody: generateBaseEmailHTML('Account Deleted', content, 'This is a final confirmation from Avigate.')
        }

        await sendZeptoMailEmail(emailData, 'account_deletion')
        
        logger.info(`Account deletion confirmation sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send account deletion confirmation to ${email}:`, error)
        throw error
    }
}

module.exports = {
    sendWelcomeEmail,
    sendEmailVerificationOTP,
    sendLoginOTP,
    sendNewDeviceLoginNotification,
    sendPasswordChangeConfirmation,
    sendAccountDeletionConfirmation,
}