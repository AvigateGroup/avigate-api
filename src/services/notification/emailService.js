// services/notification/emailService.js
const { SendMailClient } = require('zeptomail')
const { logger } = require('../../utils/logger')
const { AuditLog } = require('../../models')

const ZEPTOMAIL_URL = 'api.zeptomail.com/'
const ZEPTOMAIL_API_TOKEN = process.env.ZEPTOMAIL_API_TOKEN
const FROM_EMAIL = 'noreply@avigate.co'
const FROM_NAME = 'Avigate'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://avigate.co'
const LOGO_URL = 'https://avigate.co/images/avigate-logo-email.png'

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
                <div style="padding: 24px; text-align: center; border-bottom: 1px solid #e9ecef;">
                    <img src="${LOGO_URL}" alt="Avigate" style="height: 32px;">
                </div>
                <div style="padding: 32px 24px;">
                    ${content}
                </div>
                <div style="background-color: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #6c757d; line-height: 1.4;">
                        ${footerText || 'This is an automated message from Avigate.'}
                        <br>Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: #86B300; text-decoration: none;">hello@avigate.co</a>
                    </p>
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
    `
}

const sendEmail = async (to, subject, htmlContent, emailType = 'general') => {
    try {
        const client = initializeZeptoMailClient()
        
        if (!client) {
            throw new Error('Email client not initialized')
        }

        const emailData = {
            from: { address: FROM_EMAIL, name: FROM_NAME },
            to: [{ email_address: { address: to.email, name: to.name } }],
            subject,
            htmlbody: htmlContent,
        }

        await client.sendMail(emailData)

        await AuditLog.create({
            action: 'email_sent',
            resource: 'email',
            metadata: { emailType, recipient: to.email, subject },
            severity: 'low',
        })

        logger.info(`Email sent: ${emailType} to ${to.email}`)
        return { success: true }
    } catch (error) {
        logger.error('Send email error:', error)
        return { success: false, error: error.message }
    }
}

const sendDirectionShareNotification = async (recipientEmail, senderName, shareUrl) => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #333;">${senderName} Shared Directions With You</h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.5; color: #555;">
            ${senderName} has shared navigation directions with you on Avigate.
        </p>
        <div style="text-align: center; margin: 24px 0;">
            <a href="${shareUrl}" style="display: inline-block; background-color: #86B300; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500;">View Directions</a>
        </div>
    `

    return await sendEmail(
        { email: recipientEmail, name: '' },
        'Directions Shared with You - Avigate',
        generateBaseEmailHTML('Directions Shared', content),
        'direction_share'
    )
}

module.exports = {
    sendEmail,
    sendDirectionShareNotification,
    generateBaseEmailHTML,
}