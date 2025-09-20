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
 * Send welcome email with OTP verification
 */
const sendWelcomeEmail = async (email, firstName, otpCode) => {
    try {
        logger.info(`Preparing welcome email with OTP`, { email, firstName })
        
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
            htmlbody: generateWelcomeHTML(firstName, otpCode)
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
            htmlbody: generateVerificationOTPHTML(firstName, otpCode)
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
            htmlbody: generateLoginOTPHTML(firstName, otpCode, deviceInfo)
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
            htmlbody: generateNewDeviceLoginHTML(firstName, deviceInfo, location)
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
            subject: 'Password Changed Successfully - Avigate',
            htmlbody: generatePasswordChangeHTML(firstName, changeTime)
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
            htmlbody: generateAccountDeletionHTML(firstName, deletionTime)
        }

        await sendZeptoMailEmail(emailData, 'account_deletion')
        
        logger.info(`Account deletion confirmation sent to ${email}`)
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send account deletion confirmation to ${email}:`, error)
        throw error
    }
}

/**
 * Generate welcome HTML email
 */
const generateWelcomeHTML = (firstName, otpCode) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Avigate</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #007bff; text-align: center;">Welcome to Avigate!</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Welcome to Avigate - Nigeria's smartest transportation guide! We're excited to help you navigate your journey with ease.</p>
                
                <p>To get started, please verify your email address using the code below:</p>
                
                <div style="background-color: #f8f9fa; padding: 30px; margin: 30px 0; text-align: center; border-radius: 8px; border: 2px solid #007bff;">
                    <h2 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 8px;">${otpCode}</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">Enter this code in the app to verify your email</p>
                </div>
                
                <p><strong>This code expires in 10 minutes</strong> for your security.</p>
                
                <div style="background-color: #e3f2fd; padding: 20px; margin: 30px 0; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1976d2;">What you can do with Avigate:</h3>
                    <ul style="color: #666;">
                        <li>Find the best routes between any two locations in Nigeria</li>
                        <li>Get real-time fare information and travel times</li>
                        <li>Discover landmarks and navigation tips from local experts</li>
                        <li>Share your favorite routes with friends and family</li>
                    </ul>
                </div>
                
                <p>If you didn't create this account, please ignore this email.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated message from Avigate.<br>
                    Need help? Contact us at <a href="mailto:support@avigate.co">support@avigate.co</a>
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate email verification OTP HTML
 */
const generateVerificationOTPHTML = (firstName, otpCode) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #007bff; text-align: center;">Verify Your Email</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Please use the verification code below to verify your email address:</p>
                
                <div style="background-color: #f8f9fa; padding: 30px; margin: 30px 0; text-align: center; border-radius: 8px; border: 2px solid #007bff;">
                    <h2 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 8px;">${otpCode}</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">Verification Code</p>
                </div>
                
                <p><strong>This code expires in 10 minutes</strong> for your security.</p>
                
                <p>If you didn't request this verification, please ignore this email.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated security message from Avigate.
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate login OTP HTML
 */
const generateLoginOTPHTML = (firstName, otpCode, deviceInfo) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Login Code</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #007bff; text-align: center;">Your Login Code</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Here's your login verification code:</p>
                
                <div style="background-color: #f8f9fa; padding: 30px; margin: 30px 0; text-align: center; border-radius: 8px; border: 2px solid #007bff;">
                    <h2 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 8px;">${otpCode}</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">Login Verification Code</p>
                </div>
                
                <p><strong>This code expires in 5 minutes</strong> for your security.</p>
                
                ${deviceInfo ? `
                <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px; color: #666;"><strong>Device Information:</strong></p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${deviceInfo}</p>
                </div>
                ` : ''}
                
                <p>If you didn't try to log in, please secure your account immediately by changing your password.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated security message from Avigate.
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate new device login HTML
 */
const generateNewDeviceLoginHTML = (firstName, deviceInfo, location) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Device Login</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #ff6b35; text-align: center;">New Device Login</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Your Avigate account was just accessed from a new device.</p>
                
                <div style="background-color: #fff3e0; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ff6b35;">
                    <p style="margin: 0 0 10px 0;"><strong>Login Details:</strong></p>
                    <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    ${deviceInfo ? `<p style="margin: 5px 0; color: #666;"><strong>Device:</strong> ${deviceInfo}</p>` : ''}
                    ${location ? `<p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${location}</p>` : ''}
                </div>
                
                <p><strong>Was this you?</strong></p>
                <p>If this was you, you can ignore this email. If you don't recognize this activity, please:</p>
                
                <ul>
                    <li>Change your password immediately</li>
                    <li>Review your account activity</li>
                    <li>Contact our support team if needed</li>
                </ul>
                
                <p>
                    <a href="${FRONTEND_URL}/change-password" style="display: inline-block; background-color: #ff6b35; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px;">Change Password</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated security alert from Avigate.<br>
                    Need help? Contact us at <a href="mailto:support@avigate.co">support@avigate.co</a>
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate password change confirmation HTML
 */
const generatePasswordChangeHTML = (firstName, changeTime) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #28a745; text-align: center;">Password Changed Successfully</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Your Avigate account password was successfully changed.</p>
                
                <div style="background-color: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745;">
                    <p style="margin: 0;"><strong>Change Details:</strong></p>
                    <p style="margin: 5px 0 0 0; color: #155724;">Time: ${changeTime}</p>
                </div>
                
                <p>If you didn't make this change, please contact our support team immediately.</p>
                
                <p>
                    <a href="mailto:support@avigate.co" style="display: inline-block; background-color: #dc3545; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px;">Report Unauthorized Change</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is an automated security confirmation from Avigate.
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate account deletion confirmation HTML
 */
const generateAccountDeletionHTML = (firstName, deletionTime) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Deleted</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px; text-align: center;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 60px;">
                </div>
                
                <h1 style="color: #6c757d; text-align: center;">Account Deleted</h1>
                
                <p>Hi ${firstName},</p>
                
                <p>Your Avigate account has been permanently deleted as requested.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6c757d;">
                    <p style="margin: 0;"><strong>Deletion Details:</strong></p>
                    <p style="margin: 5px 0 0 0; color: #495057;">Time: ${deletionTime}</p>
                </div>
                
                <p>All your personal data has been removed from our systems. We're sorry to see you go!</p>
                
                <p>Thank you for using Avigate. If you change your mind, you're always welcome to create a new account.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This is a final confirmation from Avigate.
                </p>
            </div>
        </body>
        </html>
    `
}

module.exports = {
    sendWelcomeEmail,
    sendEmailVerificationOTP,
    sendLoginOTP,
    sendNewDeviceLoginNotification,
    sendPasswordChangeConfirmation,
    sendAccountDeletionConfirmation,
}