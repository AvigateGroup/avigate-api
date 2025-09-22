// controllers/user/profileController.js - Profile & Account Management
const { User, UserDevice, UserOTP } = require('../../models')
const { logger } = require('../../utils/logger')
const {
    sendPasswordChangeConfirmation,
    sendAccountDeletionConfirmation,
} = require('../../services/email/userZeptomailService')
const { TEST_ACCOUNTS } = require('../../config/testAccounts')

const profileController = {
    // Get current user profile
    getProfile: async (req, res) => {
        try {
            const user = req.user

            res.json({
                success: true,
                data: {
                    user: user.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Get profile error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get profile',
                error: error.message,
            })
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
    try {
        const user = req.user
        const {
            firstName,
            lastName,
            sex, // Add sex field
            phoneNumber,
            profilePicture,
        } = req.body

        // Check if phone number is already taken by another user
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const existingUser = await User.findByPhoneNumber(phoneNumber)
            if (existingUser && existingUser.id !== user.id) {
                return res.status(409).json({
                    success: false,
                    message:
                        'Phone number is already in use by another user',
                })
            }
        }

        // Update user fields
        const updates = {}
        if (firstName) updates.firstName = firstName
        if (lastName) updates.lastName = lastName
        if (sex) updates.sex = sex // Add sex field update
        if (phoneNumber) updates.phoneNumber = phoneNumber
        if (profilePicture) updates.profilePicture = profilePicture

        await user.update(updates)

        logger.info(`Profile updated for user: ${user.email}`)

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.toJSON(),
            },
        })
    } catch (error) {
        logger.error('Profile update error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message,
        })
    }
},

    // Change password
    changePassword: async (req, res) => {
        try {
            const user = req.user
            const { currentPassword, newPassword } = req.body

            // Skip password check for test accounts
            if (!user.isTestAccount && !TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase())) {
                // Verify current password
                const isCurrentPasswordValid =
                    await user.comparePassword(currentPassword)
                if (!isCurrentPasswordValid) {
                    return res.status(400).json({
                        success: false,
                        message: 'Current password is incorrect',
                    })
                }
            }

            // Update password
            user.passwordHash = newPassword // Will be hashed by model hook
            await user.save()

            // Send confirmation email (skip for test accounts)
            if (!user.isTestAccount) {
                await sendPasswordChangeConfirmation(
                    user.email,
                    user.firstName,
                    new Date().toLocaleString()
                )
            }

            logger.info(`Password changed for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Password changed successfully',
            })
        } catch (error) {
            logger.error('Change password error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to change password',
                error: error.message,
            })
        }
    },

    // Delete user account
    deleteAccount: async (req, res) => {
        try {
            const user = req.user
            const { password, confirmDelete } = req.body

            if (!confirmDelete || confirmDelete !== 'DELETE_MY_ACCOUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Please confirm account deletion by sending "DELETE_MY_ACCOUNT"',
                })
            }

            // Skip password check for test accounts
            if (!user.isTestAccount && !TEST_ACCOUNTS.hasOwnProperty(user.email.toLowerCase())) {
                // Verify password for security
                const isPasswordValid = await user.comparePassword(password)
                if (!isPasswordValid) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password is incorrect',
                    })
                }
            }

            const userEmail = user.email
            const userFirstName = user.firstName

            // Delete related data
            await UserDevice.destroy({ where: { userId: user.id } })
            await UserOTP.destroy({ where: { userId: user.id } })

            // Delete user account
            await user.destroy()

            // Send deletion confirmation email (skip for test accounts)
            if (!user.isTestAccount) {
                await sendAccountDeletionConfirmation(
                    userEmail,
                    userFirstName,
                    new Date().toLocaleString()
                )
            }

            logger.info(`Account deleted for user: ${userEmail}`)

            res.json({
                success: true,
                message: 'Account deleted successfully',
            })
        } catch (error) {
            logger.error('Delete account error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to delete account',
                error: error.message,
            })
        }
    },

    // Get user's devices
    getUserDevices: async (req, res) => {
        try {
            const user = req.user

            const devices = await UserDevice.findAll({
                where: { userId: user.id },
                attributes: { exclude: ['fcmToken'] }, // Don't expose FCM tokens
                order: [['lastActiveAt', 'DESC']],
            })

            res.json({
                success: true,
                data: {
                    devices,
                },
            })
        } catch (error) {
            logger.error('Get user devices error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get user devices',
                error: error.message,
            })
        }
    },

    // Deactivate a user device
    deactivateDevice: async (req, res) => {
        try {
            const user = req.user
            const { deviceId } = req.params

            const device = await UserDevice.findOne({
                where: {
                    id: deviceId,
                    userId: user.id,
                },
            })

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                })
            }

            await device.update({ isActive: false })

            logger.info(`Device deactivated by user: ${user.email}, device: ${deviceId}`)

            res.json({
                success: true,
                message: 'Device deactivated successfully',
            })
        } catch (error) {
            logger.error('Deactivate device error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to deactivate device',
                error: error.message,
            })
        }
    },

    // Get user statistics
    getUserStats: async (req, res) => {
        try {
            const user = req.user

            const stats = {
                // Basic user info
                userId: user.id,
                email: user.email,
                isVerified: user.isVerified,
                isTestAccount: user.isTestAccount,
                memberSince: user.createdAt,
                lastLogin: user.lastLoginAt,
                
                // Reputation and contributions
                reputationScore: user.reputationScore,
                totalContributions: user.totalContributions,
                
                // Device and activity stats
                totalDevices: await UserDevice.count({ where: { userId: user.id } }),
                activeDevices: await UserDevice.count({ 
                    where: { userId: user.id, isActive: true } 
                }),
                
                // OTP usage stats
                totalOTPs: await UserOTP.count({ where: { userId: user.id } }),
                usedOTPs: await UserOTP.count({ 
                    where: { userId: user.id, isUsed: true } 
                }),
            }

            res.json({
                success: true,
                data: stats,
            })
        } catch (error) {
            logger.error('Get user stats error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get user statistics',
                error: error.message,
            })
        }
    },

    // Update user preferences
    updatePreferences: async (req, res) => {
        try {
            const user = req.user
            const { preferredLanguage } = req.body

            // Validate language (only English supported now)
            if (preferredLanguage && preferredLanguage !== 'English') {
                return res.status(400).json({
                    success: false,
                    message: 'Only English language is currently supported',
                })
            }

            const updates = {}
            if (preferredLanguage) updates.preferredLanguage = preferredLanguage

            await user.update(updates)

            logger.info(`Preferences updated for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                data: {
                    user: user.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Update preferences error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update preferences',
                error: error.message,
            })
        }
    },
}

module.exports = profileController