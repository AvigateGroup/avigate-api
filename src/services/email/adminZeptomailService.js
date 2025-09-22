// services/email/adminZeptomailService.js (or zeptomailService.js)
const { SendMailClient } = require('zeptomail')
const { logger } = require('../../utils/logger')
const { AuditLog } = require('../../models')

// ZeptoMail configuration
const ZEPTOMAIL_URL = 'api.zeptomail.com/'
const ZEPTOMAIL_API_TOKEN = process.env.ZEPTOMAIL_API_TOKEN
const FROM_EMAIL = 'notifications@avigate.co'
const FROM_NAME = 'Avigate Admin'
const FRONTEND_URL = 'https://admin.avigate.co'
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
    
    logger.info('ZeptoMail configuration validated', {
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

        logger.info(`Sending email via ZeptoMail`, {
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

        logger.info(`Email sent successfully via ZeptoMail`, {
            emailType,
            recipient: emailData.to[0].email_address.address,
            response: response
        })
        
        return { success: true, data: response }
    } catch (error) {
        // Enhanced error logging
        logger.error('ZeptoMail SDK detailed error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.status,
            response: error.response,
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
            action: 'email_sent',
            resource: 'email',
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
        logger.error('Failed to log email event:', logError)
    }
}

/**
 * Send admin invitation email
 */
const sendAdminInvitationEmail = async (email, firstName, tempPassword, inviteToken) => {
    try {
        const inviteUrl = `${FRONTEND_URL}/admin/accept-invitation?token=${inviteToken}`
        
        logger.info(`Preparing admin invitation email`, {
            email,
            firstName
        })
        
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
            subject: 'Welcome to Avigate Admin - Complete Your Account Setup',
            htmlbody: generateInvitationHTML(firstName, email, inviteUrl, tempPassword)
        }

        await sendZeptoMailEmail(emailData, 'admin_invitation')
        
        logger.info(`Admin invitation email sent to ${email}`)
        
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send admin invitation email to ${email}:`, {
            error: error.message,
            stack: error.stack
        })
        throw error
    }
}

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
    try {
        const resetUrl = `${FRONTEND_URL}/admin/reset-password?token=${resetToken}`
        
        logger.info(`Preparing password reset email`, {
            email,
            firstName
        })
        
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
            subject: 'Avigate Admin - Password Reset Request',
            htmlbody: generatePasswordResetHTML(firstName, resetUrl)
        }

        await sendZeptoMailEmail(emailData, 'password_reset')
        
        logger.info(`Password reset email sent to ${email}`)
        
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send password reset email to ${email}:`, {
            error: error.message,
            stack: error.stack
        })
        throw error
    }
}

/**
 * Generate simplified admin invitation HTML email
 */
const generateInvitationHTML = (firstName, email, inviteUrl, tempPassword) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
            <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 50px;">
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
    `
}

/**
 * Generate simplified password reset HTML email
 */
const generatePasswordResetHTML = (firstName, resetUrl) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; color: #333;">
            <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <div style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 50px;">
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
    `
}

module.exports = {
    sendAdminInvitationEmail,
    sendPasswordResetEmail,
}