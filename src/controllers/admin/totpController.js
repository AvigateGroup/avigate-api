const { AuditLog } = require('../../models')
const { logger } = require('../../utils/logger')

const totpController = {
    // Generate TOTP Secret (Start Setup)
    generateTOTPSecret: async (req, res) => {
        try {
            const admin = req.admin

            // Check if TOTP is already enabled
            if (admin.totpEnabled) {
                return res.status(400).json({
                    success: false,
                    message:
                        'TOTP is already enabled. Disable first to regenerate.',
                })
            }

            // Generate TOTP secret
            const secret = admin.generateTOTPSecret()
            await admin.save()

            // Generate QR code
            const qrCodeDataUrl = await admin.generateQRCode()

            // Log TOTP setup initiation
            await AuditLog.create({
                adminId: admin.id,
                action: 'totp_setup_start',
                resource: 'admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            logger.info(`TOTP setup started for admin: ${admin.email}`)

            res.json({
                success: true,
                message:
                    'TOTP secret generated. Scan the QR code with your authenticator app.',
                data: {
                    secret: secret.base32,
                    qrCodeDataUrl,
                    manualEntryKey: secret.base32,
                    issuer: 'Avigate',
                    accountName: `Avigate Admin (${admin.email})`,
                },
            })
        } catch (error) {
            logger.error('Generate TOTP secret error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to generate TOTP secret',
            })
        }
    },

    // Enable TOTP (Complete Setup)
    enableTOTP: async (req, res) => {
        try {
            const admin = req.admin
            const { token } = req.body

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'TOTP token is required',
                })
            }

            // Check if TOTP is already enabled
            if (admin.totpEnabled) {
                return res.status(400).json({
                    success: false,
                    message: 'TOTP is already enabled',
                })
            }

            // Check if secret exists
            if (!admin.totpSecret) {
                return res.status(400).json({
                    success: false,
                    message:
                        'TOTP secret not found. Please generate a new secret first.',
                })
            }

            try {
                // Enable TOTP (this will verify the token)
                const backupCodes = await admin.enableTOTP(token)

                // Log TOTP enablement
                await AuditLog.create({
                    adminId: admin.id,
                    action: 'totp_enabled',
                    resource: 'admin',
                    metadata: { backupCodesCount: backupCodes.length },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    severity: 'high',
                })

                logger.info(`TOTP enabled for admin: ${admin.email}`)

                res.json({
                    success: true,
                    message:
                        'TOTP enabled successfully. Save these backup codes in a safe place.',
                    data: {
                        backupCodes,
                        message:
                            'Store these backup codes securely. They can only be used once each.',
                    },
                })
            } catch (tokenError) {
                return res.status(400).json({
                    success: false,
                    message: tokenError.message,
                })
            }
        } catch (error) {
            logger.error('Enable TOTP error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to enable TOTP',
            })
        }
    },

    // Disable TOTP
    disableTOTP: async (req, res) => {
        try {
            const admin = req.admin
            const { currentPassword, totpToken } = req.body

            // Verify current password
            const isPasswordValid = await admin.comparePassword(currentPassword)
            if (!isPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect',
                })
            }

            // Check if TOTP is enabled
            if (!admin.totpEnabled) {
                return res.status(400).json({
                    success: false,
                    message: 'TOTP is not enabled',
                })
            }

            // Verify TOTP token
            if (!admin.verifyTOTP(totpToken)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid TOTP token',
                })
            }

            // Disable TOTP
            admin.disableTOTP()
            await admin.save()

            // Log TOTP disabling
            await AuditLog.create({
                adminId: admin.id,
                action: 'totp_disabled',
                resource: 'admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            logger.info(`TOTP disabled for admin: ${admin.email}`)

            res.json({
                success: true,
                message: 'TOTP disabled successfully',
            })
        } catch (error) {
            logger.error('Disable TOTP error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to disable TOTP',
            })
        }
    },

    // Get TOTP Status
    getTOTPStatus: async (req, res) => {
        try {
            const admin = req.admin

            res.json({
                success: true,
                data: {
                    totpEnabled: admin.totpEnabled,
                    backupCodesRemaining: admin.totpBackupCodes
                        ? admin.totpBackupCodes.length
                        : 0,
                },
            })
        } catch (error) {
            logger.error('Get TOTP status error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get TOTP status',
            })
        }
    },

    // Regenerate Backup Codes
    regenerateBackupCodes: async (req, res) => {
        try {
            const admin = req.admin
            const { currentPassword, totpToken } = req.body

            // Check if TOTP is enabled
            if (!admin.totpEnabled) {
                return res.status(400).json({
                    success: false,
                    message: 'TOTP is not enabled',
                })
            }

            // Verify current password
            const isPasswordValid = await admin.comparePassword(currentPassword)
            if (!isPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect',
                })
            }

            // Verify TOTP token
            if (!admin.verifyTOTP(totpToken)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid TOTP token',
                })
            }

            // Generate new backup codes
            const newBackupCodes = admin.generateBackupCodes()
            admin.totpBackupCodes = newBackupCodes
            await admin.save()

            // Log backup codes regeneration
            await AuditLog.create({
                adminId: admin.id,
                action: 'totp_backup_codes_regenerated',
                resource: 'admin',
                metadata: { newBackupCodesCount: newBackupCodes.length },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            logger.info(
                `TOTP backup codes regenerated for admin: ${admin.email}`
            )

            res.json({
                success: true,
                message:
                    'New backup codes generated. Previous codes are no longer valid.',
                data: {
                    backupCodes: newBackupCodes,
                },
            })
        } catch (error) {
            logger.error('Regenerate backup codes error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to regenerate backup codes',
            })
        }
    },
}

module.exports = totpController
