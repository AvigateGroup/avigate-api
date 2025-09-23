// controllers/user/verificationController.js - Email & OTP verification
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize') 
const {
    generateTokens,
    generateSecureRandomString,
} = require('../../services/user/authService')
const {
    sendEmailVerificationOTP,
} = require('../../services/email/userZeptomailService')
const { TEST_ACCOUNTS } = require('../../config/testAccounts')

const verificationController = {
    // Verify email with OTP (skip for test accounts)
    verifyEmail: async (req, res) => {
        console.log('=== EMAIL VERIFICATION START ===')
        console.log('Request body:', JSON.stringify(req.body, null, 2))
        
        try {
            const { email, otpCode } = req.body
            console.log('Extracted email:', email)
            console.log('Extracted OTP code:', otpCode)

            // Find user
            console.log('Looking for user with email:', email)
            const user = await User.findByEmail(email)
            
            if (!user) {
                console.log('❌ User not found')
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }
            
            console.log('✅ User found:', {
                id: user.id,
                email: user.email,
                isVerified: user.isVerified,
                isTestAccount: user.isTestAccount
            })

            if (user.isVerified) {
                console.log('❌ User already verified')
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified',
                })
            }

            // Test account bypass
            console.log('Checking if test account...')
            if (user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                console.log('✅ Test account detected - bypassing OTP verification')
                return await verificationController._handleTestAccountVerification(user, res)
            }

            console.log('📧 Normal user - proceeding with OTP verification')
            // Normal OTP verification flow
            await verificationController._handleNormalEmailVerification(user, otpCode, res)

        } catch (error) {
            console.error('=== EMAIL VERIFICATION ERROR ===')
            console.error('Error message:', error.message)
            console.error('Error name:', error.name)
            console.error('Error stack:', error.stack)
            console.error('Error details:', error)
            
            logger.error('Email verification error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify email',
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        }
    },

    // Resend verification email (skip for test accounts)
    resendVerificationEmail: async (req, res) => {
        console.log('=== RESEND VERIFICATION START ===')
        console.log('Request body:', JSON.stringify(req.body, null, 2))
        
        try {
            const { email } = req.body
            console.log('Resending verification for email:', email)

            const user = await User.findByEmail(email)
            if (!user) {
                console.log('❌ User not found for resend')
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            console.log('✅ User found for resend:', {
                id: user.id,
                email: user.email,
                isVerified: user.isVerified
            })

            if (user.isVerified) {
                console.log('❌ User already verified - cannot resend')
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified',
                })
            }

            // Test account bypass
            if (user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                console.log('❌ Test account - cannot resend (should be auto-verified)')
                return res.status(400).json({
                    success: false,
                    message: 'Test accounts are automatically verified. Please try logging in.',
                })
            }

            console.log('Invalidating previous OTPs...')
            // Invalidate previous OTPs
            const updateResult = await UserOTP.update(
                { isUsed: true },
                {
                    where: {
                        userId: user.id,
                        otpType: 'email_verification',
                        isUsed: false,
                    },
                }
            )
            console.log('Previous OTPs invalidated:', updateResult)

            // Generate new OTP
            const otpCode = generateSecureRandomString(6, '0123456789')
            console.log('Generated new OTP code:', otpCode)
            
            const newOTP = await UserOTP.create({
                userId: user.id,
                otpCode,
                otpType: 'email_verification',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
                ipAddress: req.ip,
            })
            console.log('New OTP created:', { id: newOTP.id, expiresAt: newOTP.expiresAt })

            // Send verification email
            console.log('Sending verification email...')
            await sendEmailVerificationOTP(email, user.firstName, otpCode)
            console.log('✅ Verification email sent successfully')

            logger.info(`Verification email resent to: ${email}`)

            res.json({
                success: true,
                message: 'Verification email sent successfully',
            })
        } catch (error) {
            console.error('=== RESEND VERIFICATION ERROR ===')
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
            
            logger.error('Resend verification error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to resend verification email',
                error: error.message,
            })
        }
    },

    // Check verification status
    checkVerificationStatus: async (req, res) => {
        console.log('=== CHECK VERIFICATION STATUS ===')
        console.log('Request query:', req.query)
        
        try {
            const { email } = req.query

            if (!email) {
                console.log('❌ Email parameter missing')
                return res.status(400).json({
                    success: false,
                    message: 'Email parameter is required',
                })
            }

            const user = await User.findByEmail(email)
            if (!user) {
                console.log('❌ User not found for status check')
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            console.log('✅ User status:', {
                email: user.email,
                isVerified: user.isVerified,
                isTestAccount: user.isTestAccount
            })

            res.json({
                success: true,
                data: {
                    email: user.email,
                    isVerified: user.isVerified,
                    isTestAccount: user.isTestAccount,
                    canResendOTP: !user.isVerified && !user.isTestAccount,
                },
            })
        } catch (error) {
            console.error('=== CHECK STATUS ERROR ===')
            console.error('Error:', error)
            
            logger.error('Check verification status error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to check verification status',
                error: error.message,
            })
        }
    },

    // Get OTP information (for debugging/admin use)
    getOTPInfo: async (req, res) => {
        console.log('=== GET OTP INFO ===')
        console.log('Environment:', process.env.NODE_ENV)
        
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                console.log('❌ Production environment - endpoint disabled')
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const { email } = req.query

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email parameter is required',
                })
            }

            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            // Get recent OTPs (without exposing actual codes)
            const otps = await UserOTP.findAll({
                where: { userId: user.id },
                attributes: ['id', 'otpType', 'expiresAt', 'isUsed', 'usedAt', 'attempts', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit: 10,
            })

            console.log('Found OTPs:', otps.length)

            res.json({
                success: true,
                data: {
                    user: {
                        email: user.email,
                        isVerified: user.isVerified,
                        isTestAccount: user.isTestAccount,
                    },
                    otps,
                    note: 'Development endpoint - OTP codes are not exposed for security',
                },
            })
        } catch (error) {
            console.error('=== GET OTP INFO ERROR ===')
            console.error('Error:', error)
            
            logger.error('Get OTP info error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get OTP information',
                error: error.message,
            })
        }
    },

    // Private helper methods
    _handleTestAccountVerification: async (user, res) => {
        console.log('=== TEST ACCOUNT VERIFICATION ===')
        console.log('Auto-verifying test account:', user.email)
        
        try {
            // Auto-verify test account
            await user.update({ isVerified: true })
            console.log('✅ Test user verified')

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user)
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.save()
            console.log('✅ Tokens generated and saved')

            // Activate any devices for this test user
            const deviceUpdateResult = await UserDevice.update(
                { isActive: true },
                { where: { userId: user.id } }
            )
            console.log('✅ Devices activated:', deviceUpdateResult)

            logger.info(`Test account auto-verified: ${user.email}`)

            return res.json({
                success: true,
                message: 'Test account verified successfully',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                    isTestAccount: true,
                },
            })
        } catch (error) {
            console.error('❌ Test account verification error:', error)
            throw error
        }
    },

    _handleNormalEmailVerification: async (user, otpCode, res) => {
        console.log('=== NORMAL EMAIL VERIFICATION ===')
        console.log('User ID:', user.id)
        console.log('OTP Code provided:', otpCode)
        
        try {
            // Find valid OTP - ✅ FIXED: Using proper Sequelize syntax
            console.log('Searching for valid OTP...')
            const validOTP = await UserOTP.findOne({
                where: {
                    userId: user.id,
                    otpCode,
                    otpType: 'email_verification',
                    isUsed: false,
                    expiresAt: { [Op.gt]: new Date() }, // ✅ FIXED: Was { $gt: new Date() }
                },
            })

            console.log('OTP search result:', validOTP ? 'Found' : 'Not found')
            
            if (!validOTP) {
                console.log('❌ Invalid or expired OTP')
                
                // Let's also check what OTPs exist for debugging
                const allOTPs = await UserOTP.findAll({
                    where: {
                        userId: user.id,
                        otpType: 'email_verification',
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 5
                })
                
                console.log('Recent OTPs for user:', allOTPs.map(otp => ({
                    id: otp.id,
                    code: otp.otpCode,
                    isUsed: otp.isUsed,
                    expiresAt: otp.expiresAt,
                    expired: new Date() > otp.expiresAt
                })))
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code',
                })
            }

            console.log('✅ Valid OTP found:', {
                id: validOTP.id,
                expiresAt: validOTP.expiresAt,
                attempts: validOTP.attempts
            })

            // Mark OTP as used and verify user
            console.log('Marking OTP as used...')
            await validOTP.update({ isUsed: true, usedAt: new Date() })
            console.log('✅ OTP marked as used')
            
            console.log('Verifying user...')
            await user.update({ isVerified: true })
            console.log('✅ User verified')

            // Generate tokens for verified user
            console.log('Generating tokens...')
            const { accessToken, refreshToken } = generateTokens(user)

            // Save refresh token
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.save()
            console.log('✅ Tokens saved')

            // Activate user devices
            console.log('Activating user devices...')
            const deviceUpdateResult = await UserDevice.update(
                { isActive: true },
                { where: { userId: user.id } }
            )
            console.log('✅ Devices activated:', deviceUpdateResult)

            logger.info(`Email verified for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Email verified successfully',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                },
            })
        } catch (error) {
            console.error('❌ Normal verification error:', error)
            throw error
        }
    },
}

module.exports = verificationController