// controllers/user/loginHelper.js - Login completion logic
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
const { generateTokens } = require('../../services/user/authService')
const { parseDeviceInfo } = require('../../utils/deviceUtils')
const { TEST_ACCOUNTS } = require('../../config/testAccounts')

const loginHelper = {
    // Complete test login (bypass OTP and device checks)
    completeTestLogin: async (user, req, res, fcmToken, deviceInfo) => {
        try {
            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user)

            // Update refresh token and last login
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.updateLastLogin()

            // Handle device registration/update
            const deviceData = parseDeviceInfo(req, deviceInfo)

            // For test accounts, always upsert device (no fingerprint checking)
            await UserDevice.upsert({
                userId: user.id,
                deviceFingerprint: deviceData.fingerprint,
                fcmToken: fcmToken || null,
                deviceInfo: deviceData.deviceInfo,
                deviceType: deviceData.deviceType,
                platform: deviceData.platform,
                ipAddress: deviceData.ipAddress,
                lastActiveAt: new Date(),
                isActive: true,
            })

            logger.info(`Test user logged in: ${user.email}`)

            res.json({
                success: true,
                message: 'Test account login successful',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                    isTestAccount: true,
                },
            })
        } catch (error) {
            logger.error('Complete test login error:', error)
            throw error
        }
    },

    // Complete normal login process
    completeLogin: async (user, req, res, fcmToken, deviceInfo, existingDevice) => {
        try {
            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user)

            // Update refresh token and last login
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.updateLastLogin()

            // Handle device registration/update
            const deviceData = parseDeviceInfo(req, deviceInfo)

            if (existingDevice) {
                // Update existing device
                await existingDevice.update({
                    fcmToken: fcmToken || existingDevice.fcmToken,
                    lastActiveAt: new Date(),
                    ipAddress: deviceData.ipAddress,
                    deviceInfo: deviceData.deviceInfo,
                })
            } else {
                // Register new device
                await UserDevice.create({
                    userId: user.id,
                    fcmToken,
                    deviceFingerprint: deviceData.fingerprint,
                    deviceInfo: deviceData.deviceInfo,
                    deviceType: deviceData.deviceType,
                    platform: deviceData.platform,
                    ipAddress: deviceData.ipAddress,
                    lastActiveAt: new Date(),
                    isActive: true,
                })
            }

            logger.info(`User logged in: ${user.email}`)

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                },
            })
        } catch (error) {
            logger.error('Complete login error:', error)
            throw error
        }
    },

    // Verify login OTP for new device (skip for test accounts)
    verifyLoginOTP: async (req, res) => {
        try {
            const { email, otpCode, fcmToken, deviceInfo } = req.body

            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                })
            }

            // Test account bypass
            if (user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                logger.info(`Test account OTP bypass: ${email}`)
                return await loginHelper.completeTestLogin(user, req, res, fcmToken, deviceInfo)
            }

            // Find valid OTP
            const validOTP = await UserOTP.findOne({
                where: {
                    userId: user.id,
                    otpCode,
                    otpType: 'login_verification',
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

            // Mark OTP as used
            await validOTP.update({ isUsed: true, usedAt: new Date() })

            // Complete login process
            await loginHelper.completeLogin(user, req, res, fcmToken, deviceInfo, null)

        } catch (error) {
            logger.error('Login OTP verification error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to verify login OTP',
                error: error.message,
            })
        }
    },

    // Logout user
    logout: async (req, res) => {
        try {
            const user = req.user
            const { fcmToken } = req.body

            // Clear refresh token
            user.refreshToken = null
            user.refreshTokenExpiresAt = null
            await user.save()

            // Deactivate device if FCM token provided
            if (fcmToken) {
                await UserDevice.update(
                    { isActive: false },
                    {
                        where: {
                            userId: user.id,
                            fcmToken,
                        },
                    }
                )
            }

            logger.info(`User logged out: ${user.email}`)

            res.json({
                success: true,
                message: 'Logout successful',
            })
        } catch (error) {
            logger.error('Logout error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to logout',
                error: error.message,
            })
        }
    },
}

module.exports = loginHelper