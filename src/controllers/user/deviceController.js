// controllers/user/deviceController.js - Device & Token Management
const { UserDevice } = require('../../models')
const { logger } = require('../../utils/logger')
const { parseDeviceInfo } = require('../../utils/deviceUtils')

const deviceController = {
    // Update FCM token
    updateFCMToken: async (req, res) => {
        try {
            const user = req.user
            const { fcmToken, deviceInfo } = req.body

            if (!fcmToken) {
                return res.status(400).json({
                    success: false,
                    message: 'FCM token is required',
                })
            }

            const deviceData = parseDeviceInfo(req, deviceInfo)

            // Update or create device record
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

            logger.info(`FCM token updated for user: ${user.email}`)

            res.json({
                success: true,
                message: 'FCM token updated successfully',
            })
        } catch (error) {
            logger.error('Update FCM token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update FCM token',
                error: error.message,
            })
        }
    },

    // Remove FCM token (for logout or token invalidation)
    removeFCMToken: async (req, res) => {
        try {
            const user = req.user
            const { fcmToken, deviceFingerprint } = req.body

            let whereClause = { userId: user.id }

            if (fcmToken) {
                whereClause.fcmToken = fcmToken
            } else if (deviceFingerprint) {
                whereClause.deviceFingerprint = deviceFingerprint
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Either fcmToken or deviceFingerprint is required',
                })
            }

            const updatedRows = await UserDevice.update(
                { fcmToken: null },
                { where: whereClause }
            )

            logger.info(`FCM token removed for user: ${user.email}`)

            res.json({
                success: true,
                message: 'FCM token removed successfully',
                data: {
                    devicesUpdated: updatedRows[0],
                },
            })
        } catch (error) {
            logger.error('Remove FCM token error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to remove FCM token',
                error: error.message,
            })
        }
    },

    // Register new device
    registerDevice: async (req, res) => {
        try {
            const user = req.user
            const { fcmToken, deviceInfo, appVersion } = req.body

            const deviceData = parseDeviceInfo(req, deviceInfo)

            // Check if device already exists
            const existingDevice = await UserDevice.findOne({
                where: {
                    userId: user.id,
                    deviceFingerprint: deviceData.fingerprint,
                },
            })

            if (existingDevice) {
                // Update existing device
                await existingDevice.update({
                    fcmToken: fcmToken || existingDevice.fcmToken,
                    deviceInfo: deviceData.deviceInfo,
                    appVersion: appVersion || existingDevice.appVersion,
                    ipAddress: deviceData.ipAddress,
                    lastActiveAt: new Date(),
                    isActive: true,
                })

                logger.info(`Device updated for user: ${user.email}`)

                return res.json({
                    success: true,
                    message: 'Device updated successfully',
                    data: {
                        device: existingDevice.toJSON(),
                        isNewDevice: false,
                    },
                })
            }

            // Create new device
            const newDevice = await UserDevice.create({
                userId: user.id,
                fcmToken,
                deviceFingerprint: deviceData.fingerprint,
                deviceInfo: deviceData.deviceInfo,
                deviceType: deviceData.deviceType,
                platform: deviceData.platform,
                appVersion,
                ipAddress: deviceData.ipAddress,
                lastActiveAt: new Date(),
                isActive: true,
            })

            logger.info(`New device registered for user: ${user.email}`)

            res.json({
                success: true,
                message: 'Device registered successfully',
                data: {
                    device: newDevice.toJSON(),
                    isNewDevice: true,
                },
            })
        } catch (error) {
            logger.error('Register device error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to register device',
                error: error.message,
            })
        }
    },

    // Update device activity
    updateDeviceActivity: async (req, res) => {
        try {
            const user = req.user
            const { deviceFingerprint, appVersion } = req.body

            if (!deviceFingerprint) {
                return res.status(400).json({
                    success: false,
                    message: 'Device fingerprint is required',
                })
            }

            const device = await UserDevice.findOne({
                where: {
                    userId: user.id,
                    deviceFingerprint,
                },
            })

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found',
                })
            }

            const deviceData = parseDeviceInfo(req)

            await device.update({
                lastActiveAt: new Date(),
                ipAddress: deviceData.ipAddress,
                appVersion: appVersion || device.appVersion,
                isActive: true,
            })

            res.json({
                success: true,
                message: 'Device activity updated successfully',
            })
        } catch (error) {
            logger.error('Update device activity error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update device activity',
                error: error.message,
            })
        }
    },
}

module.exports = deviceController