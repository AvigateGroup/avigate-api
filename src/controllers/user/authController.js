// controllers/user/authController.js - Registration & Login
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
const {
    generateTokens,
    generateSecureRandomString,
} = require('../../services/user/authService')
const {
    sendWelcomeEmail,
    sendLoginOTP,
    sendNewDeviceLoginNotification,
} = require('../../services/email/userZeptomailService')
const { verifyGoogleToken } = require('../../services/user/googleAuthService')
const { parseDeviceInfo } = require('../../utils/deviceUtils')
const { TEST_ACCOUNTS } = require('../../config/testAccounts')

const authController = {
    // Register new user with email verification
    register: async (req, res) => {
        try {
            const {
                email,
                password,
                firstName,
                lastName,
                phoneNumber,
                fcmToken,
                deviceInfo,
            } = req.body

            // Check if user already exists
            const existingUser = await User.findOne({
                where: {
                    $or: [{ email }, { phoneNumber }],
                },
            })

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message:
                        existingUser.email === email
                            ? 'User with this email already exists'
                            : 'User with this phone number already exists',
                })
            }

            // Check if this is a test account registration
            const isTestAccount = TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())

            // Create new user
            const user = await User.create({
                email,
                passwordHash: password, // Will be hashed by the model hook
                firstName,
                lastName,
                phoneNumber,
                preferredLanguage: 'English',
                isVerified: isTestAccount, // Auto-verify test accounts
                isTestAccount,
            })

            // For test accounts, skip OTP and return tokens immediately
            if (isTestAccount) {
                return await authController._handleTestAccountRegistration(
                    user, req, res, fcmToken, deviceInfo
                )
            }

            // Normal user registration flow
            await authController._handleNormalRegistration(
                user, req, res, fcmToken, deviceInfo, email, firstName
            )

        } catch (error) {
            logger.error('Registration error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to register user',
                error: error.message,
            })
        }
    },

    // Login user with test account bypass
    login: async (req, res) => {
        try {
            const { email, password, fcmToken, deviceInfo } = req.body

            // Find user by email
            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                })
            }

            // Check password
            const isPasswordValid = await user.comparePassword(password)
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                })
            }

            // Check if user is verified (skip for test accounts)
            if (!user.isVerified && !user.isTestAccount) {
                return res.status(403).json({
                    success: false,
                    message: 'Please verify your email before logging in',
                    requiresVerification: true,
                })
            }

            // Check if this is a test account
            const isTestAccount = user.isTestAccount || TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())

            if (isTestAccount) {
                // Test account bypass - proceed directly to login
                logger.info(`Test account login bypass: ${email}`)
                const loginHelper = require('./loginHelper')
                return await loginHelper.completeTestLogin(user, req, res, fcmToken, deviceInfo)
            }

            // Normal user flow - check for new device
            await authController._handleNormalLogin(user, req, res, fcmToken, deviceInfo)

        } catch (error) {
            logger.error('Login error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to login',
                error: error.message,
            })
        }
    },

    // Google OAuth login (test accounts supported)
    googleAuth: async (req, res) => {
        try {
            const { token, firstName, lastName, phoneNumber, fcmToken, deviceInfo } = req.body

            // Handle test Google auth or real Google auth
            const googleUser = await authController._verifyGoogleToken(token)
            if (!googleUser) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid Google token',
                })
            }

            // Check if user exists or create new one
            let user = await User.findByEmail(googleUser.email)

            if (!user) {
                // Create new user with Google data
                const isTestAccount = TEST_ACCOUNTS.hasOwnProperty(googleUser.email.toLowerCase())
                
                user = await User.create({
                    email: googleUser.email,
                    firstName: firstName || googleUser.given_name,
                    lastName: lastName || googleUser.family_name,
                    phoneNumber: phoneNumber || '+2348012345673', // Default for test
                    googleId: googleUser.sub,
                    profilePicture: googleUser.picture,
                    isVerified: googleUser.email_verified,
                    preferredLanguage: 'English',
                    isTestAccount,
                })
            } else if (!user.googleId) {
                // Link existing account with Google
                user.googleId = googleUser.sub
                if (!user.profilePicture) {
                    user.profilePicture = googleUser.picture
                }
                if (!user.isVerified && googleUser.email_verified) {
                    user.isVerified = true
                }
                await user.save()
            }

            // Generate tokens and complete login
            const { accessToken, refreshToken } = generateTokens(user)

            // Update refresh token and last login
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.updateLastLogin()

            // Handle device registration
            if (fcmToken) {
                const deviceData = parseDeviceInfo(req, deviceInfo)
                await UserDevice.upsert({
                    userId: user.id,
                    deviceFingerprint: deviceData.fingerprint,
                    fcmToken,
                    deviceInfo: deviceData.deviceInfo,
                    deviceType: deviceData.deviceType,
                    platform: deviceData.platform,
                    ipAddress: deviceData.ipAddress,
                    lastActiveAt: new Date(),
                    isActive: true,
                })
            }

            logger.info(`Google auth successful: ${user.email}`)

            res.json({
                success: true,
                message: 'Google authentication successful',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                    isNewUser: !phoneNumber,
                    isTestAccount: user.isTestAccount,
                },
            })
        } catch (error) {
            logger.error('Google auth error:', error)
            res.status(500).json({
                success: false,
                message: 'Google authentication failed',
                error: error.message,
            })
        }
    },

    // Private helper methods
    _handleTestAccountRegistration: async (user, req, res, fcmToken, deviceInfo) => {
        // Generate tokens for verified test user
        const { accessToken, refreshToken } = generateTokens(user)

        // Save refresh token
        user.refreshToken = refreshToken
        user.refreshTokenExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )
        await user.save()

        // Save device if FCM token provided
        if (fcmToken) {
            const deviceData = parseDeviceInfo(req, deviceInfo)
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

        logger.info(`Test user registered and auto-verified: ${user.email}`)

        return res.status(201).json({
            success: true,
            message: 'Test account registration successful',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken,
                isTestAccount: true,
            },
        })
    },

    _handleNormalRegistration: async (user, req, res, fcmToken, deviceInfo, email, firstName) => {
        // Generate and save OTP for email verification
        const otpCode = generateSecureRandomString(6, '0123456789')
        await UserOTP.create({
            userId: user.id,
            otpCode,
            otpType: 'email_verification',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            isUsed: false,
            ipAddress: req.ip,
        })

        // Save device if FCM token provided (but mark as inactive until verified)
        if (fcmToken) {
            const deviceData = parseDeviceInfo(req, deviceInfo)
            await UserDevice.create({
                userId: user.id,
                fcmToken,
                deviceFingerprint: deviceData.fingerprint,
                deviceInfo: deviceData.deviceInfo,
                deviceType: deviceData.deviceType,
                platform: deviceData.platform,
                ipAddress: deviceData.ipAddress,
                lastActiveAt: new Date(),
                isActive: false, // Inactive until email verified
            })
        }

        // Send welcome email with verification code
        await sendWelcomeEmail(email, firstName, otpCode)

        logger.info(`New user registered: ${email}`)

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email to continue.',
            data: {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isVerified: user.isVerified,
                requiresVerification: true,
            },
        })
    },

    _handleNormalLogin: async (user, req, res, fcmToken, deviceInfo) => {
        const deviceData = parseDeviceInfo(req, deviceInfo)
        const existingDevice = await UserDevice.findOne({
            where: {
                userId: user.id,
                deviceFingerprint: deviceData.fingerprint,
                isActive: true,
            },
        })

        const isNewDeviceLogin = !existingDevice

        if (isNewDeviceLogin) {
            // Generate OTP for new device login
            const otpCode = generateSecureRandomString(6, '0123456789')
            await UserOTP.create({
                userId: user.id,
                otpCode,
                otpType: 'login_verification',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                isUsed: false,
                ipAddress: req.ip,
                metadata: { 
                    deviceFingerprint: deviceData.fingerprint, 
                    fcmToken 
                },
            })

            // Send login OTP
            await sendLoginOTP(user.email, user.firstName, otpCode, deviceData.deviceInfo)

            // Send new device notification
            await sendNewDeviceLoginNotification(
                user.email,
                user.firstName,
                deviceData.deviceInfo,
                req.ip
            )

            logger.info(`New device login attempt for user: ${user.email}`)

            return res.json({
                success: true,
                message: 'New device detected. Please verify with the code sent to your email.',
                requiresOTPVerification: true,
                userId: user.id,
            })
        }

        // Existing device - proceed with normal login
        const loginHelper = require('./loginHelper')
        await loginHelper.completeLogin(user, req, res, fcmToken, deviceInfo, existingDevice)
    },

    _verifyGoogleToken: async (token) => {
        // For test accounts, allow bypass of Google token verification
        if (token === 'test_google_token' || token.startsWith('test_')) {
            // Mock Google user for testing
            logger.info('Test Google auth bypass activated')
            return {
                sub: 'test_google_id_123',
                email: 'googletest@avigate.co',
                email_verified: true,
                given_name: 'Google',
                family_name: 'PlayTester',
                name: 'Google PlayTester',
                picture: 'https://via.placeholder.com/150',
            }
        } else {
            // Verify actual Google token
            return await verifyGoogleToken(token)
        }
    },
}

module.exports = authController