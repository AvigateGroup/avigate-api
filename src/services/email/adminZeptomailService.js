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
 * Generate invitation HTML email
 */
const generateInvitationHTML = (firstName, email, inviteUrl, tempPassword) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Access Invitation</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 40px;">
                </div>
                
                <p>Hello ${firstName},</p>
                
                <p>You have been invited to access the Avigate Admin Portal. Please use the credentials below to activate your account:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
                </div>
                
                <p>
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px;">Activate Account</a>
                </p>
                
                <p><strong>Important:</strong> You must change this temporary password during your first login. This invitation expires in 7 days.</p>
                
                <p>After activation, you can access the admin portal at: <a href="${FRONTEND_URL}/admin/login">${FRONTEND_URL}/admin/login</a></p>
                
                <p>If you need assistance, please contact us at <a href="mailto:support@avigate.co">support@avigate.co</a></p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666;">
                    This is an automated message from Avigate. If you did not expect this invitation, please contact support.
                </p>
            </div>
        </body>
        </html>
    `
}

/**
 * Generate password reset HTML email
 */
const generatePasswordResetHTML = (firstName, resetUrl) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 30px;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 40px;">
                </div>
                
                <p>Hello ${firstName},</p>
                
                <p>We received a request to reset your password for your Avigate Admin account.</p>
                
                <p>
                    <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px;">Reset Password</a>
                </p>
                
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                
                <p>If you did not request this password reset, please ignore this email or contact us at <a href="mailto:support@avigate.co">support@avigate.co</a></p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666;">
                    This is an automated security message from Avigate.
                </p>
            </div>
        </body>
        </html>
    `
}

module.exports = {
    sendAdminInvitationEmail,
    sendPasswordResetEmail,
}