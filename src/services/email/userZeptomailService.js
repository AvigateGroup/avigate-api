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
    danger: '#dc3545'
}

// Social Media Links
const SOCIAL_MEDIA_LINKS = {
    instagram: 'https://www.instagram.com/try_avigate/',
    twitter: 'https://x.com/try_avigate',
    tiktok: 'https://www.tiktok.com/@try_avigate',
    facebook: 'https://web.facebook.com/profile.php?id=61580695756879',
    linkedin: 'https://www.linkedin.com/company/109130197'
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
 * Generate base email template structure
 */
const generateBaseEmailTemplate = (content) => {
    return `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Avigate</title>
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
                                <td align="center" style="padding: 40px 30px 30px 30px;">
                                    <img src="${LOGO_URL}" alt="Avigate" style="display: block; height: 60px; max-width: 200px;" />
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
 * Generate social media footer HTML
 */
const generateSocialMediaFooter = () => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.lightGray}; border-radius: 8px; margin: 30px 0;">
            <tr>
                <td align="center" style="padding: 25px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td align="center">
                                <h3 style="color: ${BRAND_COLORS.primary}; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Follow Us</h3>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <p style="color: ${BRAND_COLORS.text}; margin: 0 0 20px 0; font-size: 14px; line-height: 1.4;">Stay connected and get the latest updates on transportation in Nigeria</p>
                            </td>
                        </tr>
                        <tr>
                            <td align="center">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="padding: 0 8px;">
                                            <a href="${SOCIAL_MEDIA_LINKS.instagram}" style="display: inline-block; text-decoration: none;">
                                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="Instagram" style="width: 32px; height: 32px; display: block;" />
                                            </a>
                                        </td>
                                        <td style="padding: 0 8px;">
                                            <a href="${SOCIAL_MEDIA_LINKS.twitter}" style="display: inline-block; text-decoration: none;">
                                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg" alt="X (Twitter)" style="width: 32px; height: 32px; display: block;" />
                                            </a>
                                        </td>
                                        <td style="padding: 0 8px;">
                                            <a href="${SOCIAL_MEDIA_LINKS.tiktok}" style="display: inline-block; text-decoration: none;">
                                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tiktok.svg" alt="TikTok" style="width: 32px; height: 32px; display: block;" />
                                            </a>
                                        </td>
                                        <td style="padding: 0 8px;">
                                            <a href="${SOCIAL_MEDIA_LINKS.facebook}" style="display: inline-block; text-decoration: none;">
                                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook" style="width: 32px; height: 32px; display: block;" />
                                            </a>
                                        </td>
                                        <td style="padding: 0 8px;">
                                            <a href="${SOCIAL_MEDIA_LINKS.linkedin}" style="display: inline-block; text-decoration: none;">
                                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="LinkedIn" style="width: 32px; height: 32px; display: block;" />
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `
}

/**
 * Generate OTP code display
 */
const generateOTPDisplay = (otpCode, description = 'Verification Code') => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.lightGray}; border: 2px solid ${BRAND_COLORS.primary}; border-radius: 8px; margin: 30px 0;">
            <tr>
                <td align="center" style="padding: 30px;">
                    <h2 style="color: ${BRAND_COLORS.primary}; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${otpCode}</h2>
                    <p style="margin: 10px 0 0 0; color: ${BRAND_COLORS.darkGray}; font-size: 14px;">${description}</p>
                </td>
            </tr>
        </table>
    `
}

/**
 * Generate info box
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
 * Generate button
 */
const generateButton = (text, url, backgroundColor = BRAND_COLORS.primary, textColor = BRAND_COLORS.white) => {
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
            <tr>
                <td>
                    <a href="${url}" style="background-color: ${backgroundColor}; color: ${textColor}; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">${text}</a>
                </td>
            </tr>
        </table>
    `
}

/**
 * Send welcome email with OTP verification
 */
const sendWelcomeEmail = async (email, firstName, otpCode) => {
    try {
        logger.info(`Preparing welcome email with OTP`, { email, firstName })
        
        const content = `
            <h1 style="color: ${BRAND_COLORS.primary}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">Welcome to Avigate!</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Welcome to Avigate - Nigeria's smartest transportation guide! We're excited to help you navigate your journey with ease.</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">To get started, please verify your email address using the code below:</p>
            
            ${generateOTPDisplay(otpCode, 'Enter this code in the app to verify your email')}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;"><strong>This code expires in 10 minutes</strong> for your security.</p>
            
            ${generateInfoBox(`
                <h3 style="margin-top: 0; color: ${BRAND_COLORS.primary}; font-size: 18px;">What you can do with Avigate:</h3>
                <ul style="color: ${BRAND_COLORS.text}; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Find the best routes between any two locations in Nigeria</li>
                    <li style="margin-bottom: 8px;">Get real-time fare information and travel times</li>
                    <li style="margin-bottom: 8px;">Discover landmarks and navigation tips from local experts</li>
                    <li style="margin-bottom: 8px;">Share your favorite routes with friends and family</li>
                </ul>
            `, '#e3f2fd', BRAND_COLORS.primary)}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">If you didn't create this account, please ignore this email.</p>
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is an automated message from Avigate.<br>
                Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: ${BRAND_COLORS.primary};">hello@avigate.co</a>
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
            htmlbody: generateBaseEmailTemplate(content)
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
            <h1 style="color: ${BRAND_COLORS.primary}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">Verify Your Email</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Please use the verification code below to verify your email address:</p>
            
            ${generateOTPDisplay(otpCode, 'Verification Code')}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"><strong>This code expires in 10 minutes</strong> for your security.</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">If you didn't request this verification, please ignore this email.</p>
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is an automated security message from Avigate.
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
            subject: 'Verify Your Email - Avigate',
            htmlbody: generateBaseEmailTemplate(content)
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
        
        const deviceInfoBox = deviceInfo ? `
            ${generateInfoBox(`
                <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text};"><strong>Device Information:</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.darkGray};">${deviceInfo}</p>
            `, BRAND_COLORS.lightGray, BRAND_COLORS.primary)}
        ` : ''
        
        const content = `
            <h1 style="color: ${BRAND_COLORS.primary}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">Your Login Code</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Here's your login verification code:</p>
            
            ${generateOTPDisplay(otpCode, 'Login Verification Code')}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;"><strong>This code expires in 5 minutes</strong> for your security.</p>
            
            ${deviceInfoBox}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">If you didn't try to log in, please secure your account immediately by changing your password.</p>
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is an automated security message from Avigate.
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
            htmlbody: generateBaseEmailTemplate(content)
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
            <h1 style="color: ${BRAND_COLORS.warning}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">New Device Login</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Your Avigate account was just accessed from a new device.</p>
            
            ${generateInfoBox(`
                <p style="margin: 0 0 10px 0; color: ${BRAND_COLORS.text}; font-weight: bold;">Login Details:</p>
                <p style="margin: 5px 0; color: ${BRAND_COLORS.darkGray};"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                ${deviceInfo ? `<p style="margin: 5px 0; color: ${BRAND_COLORS.darkGray};"><strong>Device:</strong> ${deviceInfo}</p>` : ''}
                ${location ? `<p style="margin: 5px 0; color: ${BRAND_COLORS.darkGray};"><strong>Location:</strong> ${location}</p>` : ''}
            `, '#fff3e0', BRAND_COLORS.warning)}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;"><strong>Was this you?</strong></p>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">If this was you, you can ignore this email. If you don't recognize this activity, please:</p>
            
            <ul style="color: ${BRAND_COLORS.text}; margin: 0 0 20px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Change your password immediately</li>
                <li style="margin-bottom: 8px;">Review your account activity</li>
                <li style="margin-bottom: 8px;">Contact our support team if needed</li>
            </ul>
            
            ${generateButton('Change Password', `${FRONTEND_URL}/change-password`, BRAND_COLORS.danger)}
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is an automated security alert from Avigate.<br>
                Need help? Contact us at <a href="mailto:hello@avigate.co" style="color: ${BRAND_COLORS.primary};">hello@avigate.co</a>
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
            subject: 'New Device Login - Avigate',
            htmlbody: generateBaseEmailTemplate(content)
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
            <h1 style="color: ${BRAND_COLORS.success}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">Password Changed Successfully</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Your Avigate account password was successfully changed.</p>
            
            ${generateInfoBox(`
                <p style="margin: 0; color: ${BRAND_COLORS.text}; font-weight: bold;">Change Details:</p>
                <p style="margin: 5px 0 0 0; color: ${BRAND_COLORS.darkGray};">Time: ${changeTime}</p>
            `, '#d4edda', BRAND_COLORS.success)}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">If you didn't make this change, please contact our support team immediately.</p>
            
            ${generateButton('Report Unauthorized Change', 'mailto:hello@avigate.co', BRAND_COLORS.danger)}
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is an automated security confirmation from Avigate.
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
            subject: 'Password Changed Successfully - Avigate',
            htmlbody: generateBaseEmailTemplate(content)
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
            <h1 style="color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0 0 30px 0; font-size: 28px;">Account Deleted</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${firstName},</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Your Avigate account has been permanently deleted as requested.</p>
            
            ${generateInfoBox(`
                <p style="margin: 0; color: ${BRAND_COLORS.text}; font-weight: bold;">Deletion Details:</p>
                <p style="margin: 5px 0 0 0; color: ${BRAND_COLORS.darkGray};">Time: ${deletionTime}</p>
            `, BRAND_COLORS.lightGray, BRAND_COLORS.darkGray)}
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">All your personal data has been removed from our systems. We're sorry to see you go!</p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for using Avigate. If you change your mind, you're always welcome to create a new account.</p>
            
            ${generateSocialMediaFooter()}
            
            <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.mediumGray}; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: ${BRAND_COLORS.darkGray}; text-align: center; margin: 0;">
                This is a final confirmation from Avigate.
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
            htmlbody: generateBaseEmailTemplate(content)
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