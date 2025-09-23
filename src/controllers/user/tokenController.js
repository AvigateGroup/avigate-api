// controllers/user/tokenController.js - JWT Token Management
const { User } = require('../../models')
const { logger } = require('../../utils/logger')
const { verifyRefreshToken, generateTokens } = require('../../services/user/authService')

const tokenController = {
    // Refresh access token
    refreshToken: async (req, res) => {
        try {
            const { refreshToken } = req.body

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token is required',
                })
            }

            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken)
            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token',
                })
            }

            // Find user and validate refresh token
            const user = await User.findByPk(decoded.userId)
            if (
                !user ||
                user.refreshToken !== refreshToken ||
                user.refreshTokenExpiresAt < new Date()
            ) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired refresh token',
                })
            }

            // Check if user is still active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is deactivated',
                })
            }

            // Generate new tokens
            const tokens = generateTokens(user)

            // Update refresh token
            user.refreshToken = tokens.refreshToken
            user.refreshTokenExpiresAt = new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
            await user.save()

            logger.info(`Token refreshed for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: user.refreshTokenExpiresAt,
                },
            })
        } catch (error) {
            logger.error('Refresh token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to refresh token',
                error: error.message,
            })
        }
    },

    // Revoke refresh token (for security purposes)
    revokeToken: async (req, res) => {
        try {
            const user = req.user

            // Clear refresh token
            user.refreshToken = null
            user.refreshTokenExpiresAt = null
            await user.save()

            logger.info(`Token revoked for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Token revoked successfully',
            })
        } catch (error) {
            logger.error('Revoke token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to revoke token',
                error: error.message,
            })
        }
    },

    // Validate current token
    validateToken: async (req, res) => {
        try {
            const user = req.user

            res.json({
                success: true,
                message: 'Token is valid',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        isVerified: user.isVerified,
                        isActive: user.isActive,
                        isTestAccount: user.isTestAccount,
                    },
                    tokenValid: true,
                },
            })
        } catch (error) {
            logger.error('Validate token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to validate token',
                error: error.message,
            })
        }
    },

    // Get token information
    getTokenInfo: async (req, res) => {
        try {
            const user = req.user

            const tokenInfo = {
                userId: user.id,
                email: user.email,
                hasRefreshToken: !!user.refreshToken,
                refreshTokenExpiresAt: user.refreshTokenExpiresAt,
                isExpiringSoon: user.refreshTokenExpiresAt ? 
                    user.refreshTokenExpiresAt <= new Date(Date.now() + 24 * 60 * 60 * 1000) : false,
                lastLogin: user.lastLoginAt,
            }

            res.json({
                success: true,
                data: tokenInfo,
            })
        } catch (error) {
            logger.error('Get token info error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get token information',
                error: error.message,
            })
        }
    },
}

module.exports = tokenController