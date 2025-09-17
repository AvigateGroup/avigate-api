// services/email/zeptomailService.js
const axios = require('axios')
const { logger } = require('../../utils/logger')
const { AuditLog } = require('../../models')

// ZeptoMail configuration
const ZEPTOMAIL_API_URL = 'https://api.zeptomail.com/v1.1/email'
const ZEPTOMAIL_API_TOKEN = process.env.ZEPTOMAIL_API_TOKEN
const FROM_EMAIL = 'notifications@avigate.co'
const FROM_NAME = 'Avigate Admin'
const FRONTEND_URL = 'https://admin.avigate.co'
const LOGO_URL ='https://avigate.co/assets/images/avigate-logo-email.png'

// ZeptoMail template IDs (set these after creating templates in ZeptoMail)
const TEMPLATES = {
    ADMIN_INVITATION: process.env.ZEPTOMAIL_ADMIN_INVITATION_TEMPLATE_ID,
    PASSWORD_RESET: process.env.ZEPTOMAIL_PASSWORD_RESET_TEMPLATE_ID,
}

/**
 * Validate ZeptoMail configuration
 */
const validateConfiguration = () => {
    const missingConfig = []
    
    if (!ZEPTOMAIL_API_TOKEN) missingConfig.push('ZEPTOMAIL_API_TOKEN')
    if (!FROM_EMAIL) missingConfig.push('FROM_EMAIL')
    if (!FRONTEND_URL) missingConfig.push('FRONTEND_URL')
    if (!TEMPLATES.ADMIN_INVITATION) missingConfig.push('ZEPTOMAIL_ADMIN_INVITATION_TEMPLATE_ID')
    if (!TEMPLATES.PASSWORD_RESET) missingConfig.push('ZEPTOMAIL_PASSWORD_RESET_TEMPLATE_ID')
    
    if (missingConfig.length > 0) {
        throw new Error(`Missing ZeptoMail configuration: ${missingConfig.join(', ')}`)
    }
}

/**
 * Send email using ZeptoMail API
 */
const sendZeptoMailEmail = async (emailData, emailType = 'unknown') => {
    try {
        validateConfiguration()
        
        const response = await axios.post(ZEPTOMAIL_API_URL, emailData, {
            headers: {
                'Authorization': `Zoho-enczapikey ${ZEPTOMAIL_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000, // 30 second timeout
        })

        // Log successful email
        await logEmailEvent(emailType, emailData.to[0].email_address.address, true, null, emailData.subject)

        logger.info(`Email sent successfully via ZeptoMail: ${response.data.message}`, {
            emailType,
            recipient: emailData.to[0].email_address.address,
            messageId: response.data.data?.[0]?.message_id,
        })
        
        return { success: true, data: response.data }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message
        
        // Log failed email
        await logEmailEvent(emailType, emailData.to[0].email_address.address, false, errorMessage, emailData.subject)
        
        logger.error('ZeptoMail API error:', {
            message: errorMessage,
            response: error.response?.data,
            status: error.response?.status,
            emailType,
            recipient: emailData.to[0].email_address.address,
        })
        
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
            template_key: TEMPLATES.ADMIN_INVITATION,
            merge_info: {
                [email]: {
                    firstName: firstName,
                    email: email,
                    inviteUrl: inviteUrl,
                    tempPassword: tempPassword,
                    logoUrl: LOGO_URL,
                    companyName: 'Avigate',
                    supportEmail: 'support@avigate.co',
                    loginUrl: `${FRONTEND_URL}/admin/login`,
                },
            },
        }

        await sendZeptoMailEmail(emailData, 'admin_invitation')
        
        logger.info(`Admin invitation email sent to ${email}`, {
            inviteToken: inviteToken.substring(0, 10) + '...',
        })
        
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send admin invitation email to ${email}:`, error)
        throw error
    }
}

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
    try {
        const resetUrl = `${FRONTEND_URL}/admin/reset-password?token=${resetToken}`
        
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
            template_key: TEMPLATES.PASSWORD_RESET,
            merge_info: {
                [email]: {
                    firstName: firstName,
                    resetUrl: resetUrl,
                    logoUrl: LOGO_URL,
                    companyName: 'Avigate',
                    supportEmail: 'support@avigate.co',
                    loginUrl: `${FRONTEND_URL}/admin/login`,
                    expiryTime: '1 hour',
                },
            },
        }

        await sendZeptoMailEmail(emailData, 'password_reset')
        
        logger.info(`Password reset email sent to ${email}`, {
            resetToken: resetToken.substring(0, 10) + '...',
        })
        
        return { success: true }
    } catch (error) {
        logger.error(`Failed to send password reset email to ${email}:`, error)
        throw error
    }
}

module.exports = {
    sendAdminInvitationEmail,
    sendPasswordResetEmail,
}
