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

// Brand Colors
const BRAND_COLORS = {
    primary: '#86B300',
    text: '#333333',
    lightGray: '#f8f9fa',
    mediumGray: '#e9ecef',
    darkGray: '#6c757d',
    white: '#ffffff',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8'
}

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
 * Generate base email template structure for admin emails
 */
const generateBaseEmailTemplate = (content) => {
    return `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Avigate Admin</title>
            <!--[if mso]>
            <style type="text/css">
                table, td { border-collapse: collapse; }
                .fallback-font { font-family: Arial, sans-serif !important; }
            </style>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.lightGray}; font-family: Arial, Helvetica, sans-serif;">
            <!-- Wrapper Table -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background-color: ${BRAND_COLORS.lightGray}; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <!-- Main Container -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: ${BRAND_COLORS.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
                            <!-- Header with Logo -->
                            <tr>
                                <td align="center" style="padding: 40px 30px 30px 30px; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, #7aa000 100%); border-radius: 8px 8px 0 0;">
                                    <img src="${LOGO_URL}" alt="Avigate Admin" style="display: block; height: 60px; max-width: 200px;" />
                                    <h2 style="color: ${BRAND_COLORS.white}; margin: 15px 0 0 0; font-size: 18px; font-weight: normal;">Admin Portal</h2>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 30px 40px 30px;">
                                    ${content}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `
}

/**
 * Generate info box for admin emails
 */
const generateInfoBox = (content, backgroundColor = BRAND_COLORS.lightGray, borderColor = BRAND_COLORS.primary) => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${backgroundColor}; border-left: 4px solid ${borderColor}; border-radius: 8px; margin: 20px 0;">
            <tr>
                <td style="padding: 20px;">
                    ${content}
                </td>
            </tr>
        </table>
    `
}

/**
 * Generate button for admin emails
 */
const generateButton = (text, url, backgroundColor = BRAND_COLORS.primary, textColor = BRAND_COLORS.white) => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
            <tr>
                <td>
                    <a href="${url}" style="background-color: ${backgroundColor}; color: ${textColor}; text-decoration: none; padding: 14px 28px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${text}</a>
                </td>
            </tr>
        </table>
    `
}

/**
 * Generate credentials display box
 */
const generateCredentialsBox = (email, tempPassword) => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.lightGray}; border: 2px solid ${BRAND_COLORS.primary}; border-radius: 8px; margin: 25px 0;">
            <tr>
                <td style="padding: 25px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td>
                                <h3 style="color: ${BRAND_COLORS.primary}; margin: 0 0 15px 0; font-size: 18px;">Your Admin Credentials</h3>
                                <p style="margin: 8px 0; color: ${BRAND_COLORS.text}; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 8px 0; color: ${BRAND_COLORS.text}; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: 'Courier New', monospace; background-color: ${BRAND_COLORS.mediumGray}; padding: 2px 6px; border-radius: 3px;">${tempPassword}</span></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `
}

/**
 * Generate warning box
 */
const generateWarningBox = (content) => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff3cd; border-left: 4px solid ${BRAND_COLORS.warning}; border-radius: 8px; margin: 20px 0;">
            <tr>
                <td style="padding: 15px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td style="width: 24px; vertical-align: top; padding-right: 10px;">
                                <span style="display: inline-block; width: 20px; height: 20px; background-color: ${BRAND_COLORS.warning}; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold;">!</span>
                            </td>
                            <td>
                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.4;">${content}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `
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

        const content = `
            <h1 style="color: ${BRAND_COLORS.primary}; text-align: center; margin: 30px 0; font-size: 28px;">Welcome to Avigate Admin</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">You have been invited to access the Avigate Admin Portal. Use the credentials below to activate your account and get started managing the platform.</p>
            
            ${generateCredentialsBox(email, tempPassword)}
            
            <div align="center">
                ${generateButton('Activate Account', inviteUrl, BRAND_COLORS.primary)}
            </div>
            
            ${generateWarningBox('You must change this temporary password during your first login. This invitation expires in 7 days.')}
            
            <div style="background-color: ${BRAND_COLORS.lightGray}; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: ${BRAND_COLORS.primary}; margin: 0 0 15px 0; font-size: 16px;">Quick Access Links:</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td>
                            <p style="margin: 5px 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                                <strong>Admin Portal:</strong> <a href="${FRONTEND_URL}/admin/login" style="color: ${BRAND_COLORS.primary};">${FRONTEND_URL}/admin/login</a>
                            </p>
                            <p style="margin: 5px 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                                <strong>Support:</strong> <a href="mailto:hello@avigate.co" style="color: ${BRAND_COLORS.primary};">hello@avigate.co</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0; line-height: 1.4;">
                This is an automated message from Avigate Admin.<br>
                If you did not expect this invitation, please contact support immediately.
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
            subject: 'Welcome to Avigate Admin - Complete Your Account Setup',
            htmlbody: generateBaseEmailTemplate(content)
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

        const content = `
            <h1 style="color: ${BRAND_COLORS.info}; text-align: center; margin: 30px 0; font-size: 28px;">Password Reset Request</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">We received a request to reset your password for your Avigate Admin account. Click the button below to create a new password.</p>
            
            <div align="center">
                ${generateButton('Reset Password', resetUrl, BRAND_COLORS.info)}
            </div>
            
            ${generateWarningBox('This link will expire in 1 hour for security reasons.')}
            
            ${generateInfoBox(`
                <h3 style="margin: 0 0 10px 0; color: ${BRAND_COLORS.text}; font-size: 16px;">Security Information:</h3>
                <p style="margin: 5px 0; color: ${BRAND_COLORS.darkGray}; font-size: 14px;"><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 5px 0; color: ${BRAND_COLORS.darkGray}; font-size: 14px;"><strong>Account:</strong> ${email}</p>
                <p style="margin: 5px 0 0 0; color: ${BRAND_COLORS.darkGray}; font-size: 14px;"><strong>Admin Portal:</strong> ${FRONTEND_URL}</p>
            `, BRAND_COLORS.lightGray, BRAND_COLORS.info)}
            
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.danger};">
                <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.4;">
                    <strong>Didn't request this?</strong> If you did not request this password reset, please ignore this email or contact our support team immediately at <a href="mailto:hello@avigate.co" style="color: ${BRAND_COLORS.danger};">hello@avigate.co</a>
                </p>
            </div>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                For additional security, you can also access the admin portal directly at: <a href="${FRONTEND_URL}/admin/login" style="color: ${BRAND_COLORS.primary};">${FRONTEND_URL}/admin/login</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0; line-height: 1.4;">
                This is an automated security message from Avigate Admin.<br>
                For security questions, contact: <a href="mailto:hello@avigate.co" style="color: ${BRAND_COLORS.primary};">hello@avigate.co</a>
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
            subject: 'Avigate Admin - Password Reset Request',
            htmlbody: generateBaseEmailTemplate(content)
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

module.exports = {
    sendAdminInvitationEmail,
    sendPasswordResetEmail,
}