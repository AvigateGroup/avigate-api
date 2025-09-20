// controllers/user/testController.js - Test Account Management
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
const { generateTokens } = require('../../services/user/authService')
const { TEST_ACCOUNTS, TEST_TOKENS, TEST_SETTINGS } = require('../../config/testAccounts')

const testController = {
    // Get test account info (for debugging/development)
    getTestAccounts: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const testUsers = await User.findAll({
                where: { isTestAccount: true },
                attributes: { exclude: ['passwordHash', 'refreshToken'] },
                include: [
                    {
                        model: UserDevice,
                        as: 'devices',
                        attributes: { exclude: ['fcmToken'] },
                    },
                ],
            })

            // Get test account statistics
            const stats = {
                totalTestAccounts: Object.keys(TEST_ACCOUNTS).length,
                activeTestUsers: testUsers.filter(user => user.isActive).length,
                verifiedTestUsers: testUsers.filter(user => user.isVerified).length,
                testUsersWithDevices: testUsers.filter(user => user.devices && user.devices.length > 0).length,
            }

            res.json({
                success: true,
                message: 'Test accounts retrieved',
                data: {
                    accounts: Object.keys(TEST_ACCOUNTS).map(email => ({
                        email,
                        description: TEST_ACCOUNTS[email].description,
                        features: TEST_ACCOUNTS[email].features,
                        googleId: TEST_ACCOUNTS[email].googleId || null,
                        password: '***HIDDEN***', // Don't expose passwords in response
                    })),
                    users: testUsers,
                    tokens: {
                        google: TEST_TOKENS.google,
                        bypass: '***HIDDEN***', // Don't expose bypass token
                    },
                    settings: TEST_SETTINGS,
                    statistics: stats,
                    note: 'These accounts bypass OTP verification and device checks for app store testing',
                },
            })
        } catch (error) {
            logger.error('Get test accounts error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get test accounts',
                error: error.message,
            })
        }
    },

    // Reset specific test account to default state (development only)
    resetTestAccount: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const { email } = req.params

            if (!email || !TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Not a valid test account email',
                    validAccounts: Object.keys(TEST_ACCOUNTS),
                })
            }

            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Test account not found in database',
                })
            }

            if (!user.isTestAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Account is not marked as a test account',
                })
            }

            // Reset user to default state
            await user.update({
                isVerified: true,
                isActive: true,
                refreshToken: null,
                refreshTokenExpiresAt: null,
                lastLoginAt: null,
                reputationScore: TEST_ACCOUNTS[email.toLowerCase()].defaultReputation || 100,
                totalContributions: 0,
            })

            // Clean up OTPs
            await UserOTP.destroy({
                where: { userId: user.id }
            })

            // Reset devices
            await UserDevice.update(
                {
                    isActive: true,
                    lastActiveAt: new Date(),
                    fcmToken: null,
                },
                { where: { userId: user.id } }
            )

            logger.info(`Test account reset: ${email}`)

            res.json({
                success: true,
                message: 'Test account reset successfully',
                data: {
                    user: user.toJSON(),
                    resetActions: [
                        'Set isVerified to true',
                        'Set isActive to true',
                        'Cleared refresh tokens',
                        'Reset last login',
                        'Reset reputation score',
                        'Cleared contributions',
                        'Removed all OTPs',
                        'Reset device states',
                    ],
                },
            })
        } catch (error) {
            logger.error('Reset test account error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to reset test account',
                error: error.message,
            })
        }
    },

    // Reset all test accounts to default state
    resetAllTestAccounts: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const testUsers = await User.findAll({
                where: { isTestAccount: true }
            })

            const resetResults = []

            for (const user of testUsers) {
                try {
                    // Reset user to default state
                    await user.update({
                        isVerified: true,
                        isActive: true,
                        refreshToken: null,
                        refreshTokenExpiresAt: null,
                        lastLoginAt: null,
                        reputationScore: 100,
                        totalContributions: 0,
                    })

                    // Clean up OTPs
                    await UserOTP.destroy({
                        where: { userId: user.id }
                    })

                    // Reset devices
                    await UserDevice.update(
                        {
                            isActive: true,
                            lastActiveAt: new Date(),
                            fcmToken: null,
                        },
                        { where: { userId: user.id } }
                    )

                    resetResults.push({
                        email: user.email,
                        success: true,
                        message: 'Reset successfully'
                    })

                    logger.info(`Test account reset: ${user.email}`)
                } catch (error) {
                    resetResults.push({
                        email: user.email,
                        success: false,
                        message: error.message
                    })
                    logger.error(`Failed to reset test account ${user.email}:`, error)
                }
            }

            const successCount = resetResults.filter(r => r.success).length
            const failureCount = resetResults.filter(r => !r.success).length

            res.json({
                success: failureCount === 0,
                message: `Reset completed: ${successCount} successful, ${failureCount} failed`,
                data: {
                    results: resetResults,
                    summary: {
                        total: testUsers.length,
                        successful: successCount,
                        failed: failureCount,
                    },
                },
            })
        } catch (error) {
            logger.error('Reset all test accounts error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to reset test accounts',
                error: error.message,
            })
        }
    },

    // Test token validation (for debugging)
    validateTestToken: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const { token } = req.body

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required',
                })
            }

            const isValidTestToken = Object.values(TEST_TOKENS).includes(token)
            const tokenType = isValidTestToken ? 
                Object.keys(TEST_TOKENS).find(key => TEST_TOKENS[key] === token) : 
                'invalid'

            res.json({
                success: true,
                data: {
                    token: token.length > 20 ? token.substring(0, 20) + '...' : token,
                    isValidTestToken,
                    tokenType,
                    settings: TEST_SETTINGS,
                    usage: tokenType === 'google' ? 
                        'Use this token for Google OAuth testing' : 
                        tokenType === 'bypass' ? 
                        'Use this token for bypassing authentication checks' : 
                        'Invalid test token',
                },
            })
        } catch (error) {
            logger.error('Validate test token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to validate test token',
                error: error.message,
            })
        }
    },

    // Create test login session (for automated testing)
    createTestSession: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const { email } = req.body

            if (!email || !TEST_ACCOUNTS.hasOwnProperty(email.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid test account email',
                    validAccounts: Object.keys(TEST_ACCOUNTS),
                })
            }

            const user = await User.findByEmail(email)
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Test account not found',
                })
            }

            // Generate tokens for test session
            const { accessToken, refreshToken } = generateTokens(user)

            // Update user with tokens
            user.refreshToken = refreshToken
            user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            await user.updateLastLogin()

            logger.info(`Test session created for: ${email}`)

            res.json({
                success: true,
                message: 'Test session created successfully',
                data: {
                    user: user.toJSON(),
                    accessToken,
                    refreshToken,
                    expiresAt: user.refreshTokenExpiresAt,
                    note: 'Use these tokens for automated testing',
                },
            })
        } catch (error) {
            logger.error('Create test session error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create test session',
                error: error.message,
            })
        }
    },

    // Get test account credentials (for documentation/setup)
    getTestCredentials: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const credentials = Object.keys(TEST_ACCOUNTS).map(email => ({
                email,
                password: TEST_ACCOUNTS[email].password,
                description: TEST_ACCOUNTS[email].description,
                features: TEST_ACCOUNTS[email].features,
                specialNotes: {
                    ...(TEST_ACCOUNTS[email].googleId && { googleId: TEST_ACCOUNTS[email].googleId }),
                    bypassOTP: TEST_ACCOUNTS[email].bypassOTP,
                },
            }))

            res.json({
                success: true,
                message: 'Test credentials retrieved',
                data: {
                    credentials,
                    testTokens: {
                        googleOAuth: TEST_TOKENS.google,
                        authBypass: TEST_TOKENS.bypass,
                    },
                    instructions: {
                        registration: 'Test accounts auto-verify on registration',
                        login: 'Test accounts bypass OTP verification',
                        googleAuth: `Use token "${TEST_TOKENS.google}" for Google OAuth testing`,
                        deviceChecks: 'Test accounts bypass new device verification',
                    },
                    warning: 'These credentials are for testing only. Never use in production.',
                },
            })
        } catch (error) {
            logger.error('Get test credentials error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get test credentials',
                error: error.message,
            })
        }
    },

    // Test account health check
    checkTestAccountHealth: async (req, res) => {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({
                    success: false,
                    message: 'Not found',
                })
            }

            const healthReport = []

            for (const email of Object.keys(TEST_ACCOUNTS)) {
                const user = await User.findByEmail(email)
                
                if (!user) {
                    healthReport.push({
                        email,
                        status: 'missing',
                        issues: ['User not found in database'],
                        recommendations: ['Run user table setup script'],
                    })
                    continue
                }

                const issues = []
                const recommendations = []

                // Check user status
                if (!user.isTestAccount) {
                    issues.push('Not marked as test account')
                    recommendations.push('Update isTestAccount flag to true')
                }

                if (!user.isVerified) {
                    issues.push('Email not verified')
                    recommendations.push('Set isVerified to true')
                }

                if (!user.isActive) {
                    issues.push('Account not active')
                    recommendations.push('Set isActive to true')
                }

                // Check devices
                const deviceCount = await UserDevice.count({ where: { userId: user.id } })
                if (deviceCount === 0) {
                    issues.push('No devices registered')
                    recommendations.push('Register at least one test device')
                }

                // Check for expired tokens
                if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
                    issues.push('Refresh token expired')
                    recommendations.push('Clear expired refresh token')
                }

                healthReport.push({
                    email,
                    status: issues.length === 0 ? 'healthy' : 'needs_attention',
                    issues,
                    recommendations,
                    lastLogin: user.lastLoginAt,
                    deviceCount,
                })
            }

            const healthySummary = healthReport.filter(r => r.status === 'healthy').length
            const needsAttentionSummary = healthReport.filter(r => r.status === 'needs_attention').length
            const missingSummary = healthReport.filter(r => r.status === 'missing').length

            res.json({
                success: true,
                message: 'Test account health check completed',
                data: {
                    summary: {
                        total: Object.keys(TEST_ACCOUNTS).length,
                        healthy: healthySummary,
                        needsAttention: needsAttentionSummary,
                        missing: missingSummary,
                    },
                    accounts: healthReport,
                    overallHealth: missingSummary === 0 && needsAttentionSummary === 0 ? 'good' : 'poor',
                },
            })
        } catch (error) {
            logger.error('Check test account health error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to check test account health',
                error: error.message,
            })
        }
    },
}

module.exports = testController