// controllers/user/verificationController.js - Email & OTP verification
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
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
        try {
            const { email, otpCode } = req.body

            // Find user
            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            if (user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified',
                })
            }

            // Test account bypass
            if (user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                return await verificationController._handleTestAccountVerification(user, res)
            }

            // Normal OTP verification flow
            await verificationController._handleNormalEmailVerification(user, otpCode, res)

        } catch (error) {
            logger.error('Email verification error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify email',
                error: error.message,
            })
        }
    },

    // Resend verification email (skip for test accounts)
    resendVerificationEmail: async (req, res) => {
        try {
            const { email } = req.body

            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            if (user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified',
                })
            }

            // Test account bypass
            if (user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Test accounts are automatically verified. Please try logging in.',
                })
            }

            // Invalidate previous OTPs
            await UserOTP.update(
                { isUsed: true },
                {
                    where: {
                        userId: user.id,
                        otpType: 'email_verification',
                        isUsed: false,
                    },
                }
            )

            // Generate new OTP
            const otpCode = generateSecureRandomString(6, '0123456789')
            await UserOTP.create({
                userId: user.id,
                otpCode,
                otpType: 'email_verification',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                isUsed: false,
                ipAddress: req.ip,
            })

            // Send verification email
            await sendEmailVerificationOTP(email, user.firstName, otpCode)

            logger.info(`Verification email resent to: ${email}`)

            res.json({
                success: true,
                message: 'Verification email sent successfully',
            })
        } catch (error) {
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
        try {
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
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
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
        // Auto-verify test account
        await user.update({ isVerified: true })

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user)
        user.refreshToken = refreshToken
        user.refreshTokenExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )
        await user.save()

        // Activate any devices for this test user
        await UserDevice.update(
            { isActive: true },
            { where: { userId: user.id } }
        )

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
    },

    _handleNormalEmailVerification: async (user, otpCode, res) => {
        // Find valid OTP
        const validOTP = await UserOTP.findOne({
            where: {
                userId: user.id,
                otpCode,
                otpType: 'email_verification',
                isUsed: false,
                expiresAt: { $gt: new Date() },
            },
        })

        if (!validOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code',
            })
        }

        // Mark OTP as used and verify user
        await validOTP.update({ isUsed: true, usedAt: new Date() })
        await user.update({ isVerified: true })

        // Generate tokens for verified user
        const { accessToken, refreshToken } = generateTokens(user)

        // Save refresh token
        user.refreshToken = refreshToken
        user.refreshTokenExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )
        await user.save()

        // Activate user devices
        await UserDevice.update(
            { isActive: true },
            { where: { userId: user.id } }
        )

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
    },
}

module.exports = verificationController