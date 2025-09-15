const { Admin, AuditLog } = require('../../models')
const {
    generateAdminTokens,
    adminSessionManager,
    verifyAdminRefreshToken,
    blacklistAdminToken,
} = require('../../services/admin')
const { logger } = require('../../utils/logger')

// Email domain validation
const ALLOWED_EMAIL_DOMAIN = '@avigate.co'
const validateEmailDomain = (email) => {
    return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase())
}

const authController = {
    // Admin Login
    login: async (req, res) => {
        try {
            const { email, password, totpToken, backupCode } = req.body

            // Validate email domain
            if (!validateEmailDomain(email)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access restricted to authorized domains',
                })
            }

            // Find admin
            const admin = await Admin.findByEmail(email)
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                })
            }

            // Check if account is locked
            if (admin.isLocked()) {
                return res.status(423).json({
                    success: false,
                    message:
                        'Account is temporarily locked due to multiple failed attempts',
                })
            }

            // Verify password
            const isPasswordValid = await admin.comparePassword(password)
            if (!isPasswordValid) {
                await admin.incrementFailedAttempts()
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                })
            }

            // Check TOTP if enabled
            if (admin.totpEnabled) {
                let totpValid = false

                if (totpToken) {
                    totpValid = admin.verifyTOTP(totpToken)
                } else if (backupCode) {
                    totpValid = await admin.useBackupCode(backupCode)
                }

                if (!totpValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid TOTP token or backup code',
                        requiresTOTP: true,
                    })
                }
            }

            // Generate tokens with tokenId
            const tokens = generateAdminTokens(admin)
            const tokenPayload = JSON.parse(
                Buffer.from(tokens.refreshToken.split('.')[1], 'base64')
            )

            // Update login info and create session
            await admin.updateLastLogin(req.ip, req.get('User-Agent'))
            adminSessionManager.createSession(admin, tokenPayload.tokenId, req)

            // Log successful login
            await AuditLog.create({
                adminId: admin.id,
                action: 'login',
                resource: 'admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            logger.info(`Admin logged in: ${email}`)

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            })

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    admin: admin.toJSON(),
                    accessToken: tokens.accessToken,
                },
            })
        } catch (error) {
            logger.error('Admin login error:', error)
            res.status(500).json({
                success: false,
                message: 'Login failed',
            })
        }
    },

    // Refresh Token Endpoint
    refreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token not provided',
                })
            }

            // Verify refresh token
            const decoded = verifyAdminRefreshToken(refreshToken)
            if (!decoded) {
                res.clearCookie('refreshToken')
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token',
                })
            }

            // Find admin
            const admin = await Admin.findByPk(decoded.adminId)
            if (!admin || !admin.isActive) {
                res.clearCookie('refreshToken')
                return res.status(401).json({
                    success: false,
                    message: 'Admin not found or inactive',
                })
            }

            // Check session
            const session = adminSessionManager.getSession(
                decoded.adminId,
                decoded.tokenId
            )
            if (!session) {
                res.clearCookie('refreshToken')
                return res.status(401).json({
                    success: false,
                    message: 'Session expired',
                })
            }

            // Generate new tokens
            const newTokens = generateAdminTokens(admin)
            const newTokenPayload = JSON.parse(
                Buffer.from(newTokens.refreshToken.split('.')[1], 'base64')
            )

            // Update session
            adminSessionManager.removeSession(decoded.adminId, decoded.tokenId)
            adminSessionManager.createSession(
                admin,
                newTokenPayload.tokenId,
                req
            )

            // Blacklist old refresh token
            blacklistAdminToken(decoded.tokenId)

            // Set new refresh token cookie
            res.cookie('refreshToken', newTokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })

            res.json({
                success: true,
                data: {
                    accessToken: newTokens.accessToken,
                },
            })
        } catch (error) {
            logger.error('Token refresh error:', error)
            res.status(500).json({
                success: false,
                message: 'Token refresh failed',
            })
        }
    },

    // Logout admin
    logout: async (req, res) => {
        try {
            const admin = req.admin

            // Remove session
            if (req.tokenId) {
                adminSessionManager.removeSession(admin.id, req.tokenId)
                blacklistAdminToken(req.tokenId)
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken')

            // Log logout
            await AuditLog.create({
                adminId: admin.id,
                action: 'logout',
                resource: 'admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'low',
            })

            logger.info(`Admin logged out: ${admin.email}`)

            res.json({
                success: true,
                message: 'Logout successful',
            })
        } catch (error) {
            logger.error('Admin logout error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to logout',
            })
        }
    },
}

module.exports = authController
