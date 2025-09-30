// services/notification/pushNotificationService.js
const admin = require('firebase-admin')
const { UserDevice } = require('../../models')
const { logger } = require('../../utils/logger')

class PushNotificationService {
    constructor() {
        this.isInitialized = false
        this.initialize()
    }

    initialize() {
        try {
            if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                })
                
                this.isInitialized = true
                logger.info('Firebase Admin SDK initialized successfully')
            } else {
                logger.warn('Firebase service account key not configured')
            }
        } catch (error) {
            logger.error('Failed to initialize Firebase Admin SDK:', error)
        }
    }

    // Send notification to specific user
    async sendToUser(userId, notification, data = {}) {
        try {
            if (!this.isInitialized) {
                logger.warn('Push notification service not initialized')
                return { success: false, error: 'Service not initialized' }
            }

            // Get user's active devices
            const devices = await UserDevice.findAll({
                where: {
                    userId,
                    isActive: true,
                    fcmToken: { [require('sequelize').Op.ne]: null },
                },
            })

            if (devices.length === 0) {
                return { success: false, error: 'No active devices found for user' }
            }

            const tokens = devices.map(device => device.fcmToken).filter(Boolean)
            
            if (tokens.length === 0) {
                return { success: false, error: 'No valid FCM tokens found' }
            }

            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    ...notification.options,
                },
                data: {
                    ...data,
                    timestamp: new Date().toISOString(),
                },
                tokens,
            }

            const response = await admin.messaging().sendMulticast(message)

            // Handle failed tokens
            if (response.failureCount > 0) {
                await this.handleFailedTokens(response.responses, tokens)
            }

            logger.info(`Push notification sent to user ${userId}: ${response.successCount}/${tokens.length} successful`)

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                totalDevices: tokens.length,
            }
        } catch (error) {
            logger.error('Error sending push notification:', error)
            return { success: false, error: error.message }
        }
    }

    // Send notification to multiple users
    async sendToUsers(userIds, notification, data = {}) {
        const results = []

        for (const userId of userIds) {
            const result = await this.sendToUser(userId, notification, data)
            results.push({ userId, ...result })
        }

        return results
    }

    // Send notification to users in a specific location (optimized with geography)
async sendToLocation(locationId, notification, data = {}, radiusKm = 5) {
    try {
        if (!this.isInitialized) {
            return { success: false, error: 'Service not initialized' }
        }

        const { Location } = require('../../models')
        const sequelize = require('../../config/database')

        // Get the location coordinates
        const location = await Location.findByPk(locationId)
        if (!location) {
            return { success: false, error: 'Location not found' }
        }

        // Raw query for better PostGIS performance with geography
        const [nearbyUserDevices] = await sequelize.query(`
            SELECT DISTINCT u.id as user_id
            FROM users u
            INNER JOIN user_devices ud ON ud."userId" = u.id
            WHERE ud."isActive" = true 
            AND ud."fcmToken" IS NOT NULL
            AND u.latitude IS NOT NULL 
            AND u.longitude IS NOT NULL
            AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(u.longitude, u.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
            )
        `, {
            bind: [location.longitude, location.latitude, radiusKm * 1000], // meters
            type: sequelize.QueryTypes.SELECT
        })

        if (nearbyUserDevices.length === 0) {
            return { 
                success: true, 
                message: 'No users found in location radius',
                notifiedUsers: 0
            }
        }

        // Send notifications to all nearby users
        const userIds = nearbyUserDevices.map(row => row.user_id)
        const results = await this.sendToUsers(userIds, notification, {
            ...data,
            locationId,
            radiusKm
        })

        const successCount = results.filter(r => r.success).length
        const failureCount = results.length - successCount

        logger.info(
            `Location-based notification sent for location ${locationId}: ` +
            `${successCount}/${results.length} users notified within ${radiusKm}km`
        )

        return {
            success: true,
            notifiedUsers: successCount,
            failedUsers: failureCount,
            totalUsers: results.length,
            results
        }
    } catch (error) {
        logger.error('Error sending location-based notification:', error)
        return { success: false, error: error.message }
    }
}

    // Send notification to topic subscribers
    async sendToTopic(topic, notification, data = {}) {
        try {
            if (!this.isInitialized) {
                return { success: false, error: 'Service not initialized' }
            }

            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    ...notification.options,
                },
                data: {
                    ...data,
                    timestamp: new Date().toISOString(),
                },
                topic,
            }

            const response = await admin.messaging().send(message)

            logger.info(`Topic notification sent to ${topic}: ${response}`)

            return { success: true, messageId: response }
        } catch (error) {
            logger.error('Error sending topic notification:', error)
            return { success: false, error: error.message }
        }
    }

    // Handle failed FCM tokens
    async handleFailedTokens(responses, tokens) {
        const failedTokens = []

        responses.forEach((response, index) => {
            if (!response.success) {
                const error = response.error
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    failedTokens.push(tokens[index])
                }
            }
        })

        if (failedTokens.length > 0) {
            // Remove invalid tokens from database
            await UserDevice.update(
                { fcmToken: null, isActive: false },
                {
                    where: {
                        fcmToken: { [require('sequelize').Op.in]: failedTokens },
                    },
                }
            )

            logger.info(`Removed ${failedTokens.length} invalid FCM tokens`)
        }
    }

    // Subscribe device to topic
    async subscribeToTopic(fcmToken, topic) {
        try {
            if (!this.isInitialized) {
                return { success: false, error: 'Service not initialized' }
            }

            await admin.messaging().subscribeToTopic([fcmToken], topic)
            logger.info(`Device subscribed to topic: ${topic}`)
            
            return { success: true }
        } catch (error) {
            logger.error('Error subscribing to topic:', error)
            return { success: false, error: error.message }
        }
    }

    // Unsubscribe device from topic
    async unsubscribeFromTopic(fcmToken, topic) {
        try {
            if (!this.isInitialized) {
                return { success: false, error: 'Service not initialized' }
            }

            await admin.messaging().unsubscribeFromTopic([fcmToken], topic)
            logger.info(`Device unsubscribed from topic: ${topic}`)
            
            return { success: true }
        } catch (error) {
            logger.error('Error unsubscribing from topic:', error)
            return { success: false, error: error.message }
        }
    }

    // Send route-specific notifications
    async sendRouteNotification(routeId, type, data = {}) {
        const notifications = {
            route_update: {
                title: 'Route Update',
                body: 'New information available for your route',
            },
            fare_alert: {
                title: 'Fare Alert',
                body: 'Fare prices have changed for this route',
            },
            safety_alert: {
                title: 'Safety Alert',
                body: 'Safety information updated for this route',
            },
            traffic_update: {
                title: 'Traffic Update',
                body: 'Traffic conditions have changed on your route',
            },
        }

        const notification = notifications[type]
        if (!notification) {
            return { success: false, error: 'Invalid notification type' }
        }

        const notificationData = {
            type,
            routeId,
            ...data,
        }

        // Send to route topic subscribers
        return await this.sendToTopic(`route_${routeId}`, notification, notificationData)
    }

    // Send journey notifications
    async sendJourneyNotification(userId, type, data = {}) {
        const notifications = {
            journey_start: {
                title: 'Journey Started',
                body: 'Your journey has begun. Safe travels!',
            },
            almost_arrived: {
                title: 'Almost There',
                body: 'You are approaching your destination',
            },
            journey_complete: {
                title: 'Journey Complete',
                body: 'You have arrived at your destination',
            },
            vehicle_arriving: {
                title: 'Vehicle Arriving',
                body: 'Your transport is arriving soon',
            },
        }

        const notification = notifications[type]
        if (!notification) {
            return { success: false, error: 'Invalid notification type' }
        }

        return await this.sendToUser(userId, notification, { type, ...data })
    }
}

module.exports = new PushNotificationService()
