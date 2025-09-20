// utils/deviceUtils.js
const crypto = require('crypto')

/**
 * Generate a device fingerprint based on request information
 */
const getDeviceFingerprint = (req, deviceInfo = null) => {
    const userAgent = req.get('User-Agent') || 'unknown'
    const acceptLanguage = req.get('Accept-Language') || ''
    const acceptEncoding = req.get('Accept-Encoding') || ''
    const deviceInfoStr = deviceInfo || userAgent
    
    // Create a hash from various request headers and device info
    const fingerprintData = [
        userAgent,
        acceptLanguage,
        acceptEncoding,
        deviceInfoStr,
    ].join('|')
    
    return crypto
        .createHash('sha256')
        .update(fingerprintData)
        .digest('hex')
        .substring(0, 32) // Use first 32 characters
}

/**
 * Extract device type from user agent
 */
const getDeviceType = (userAgent) => {
    if (!userAgent) return 'unknown'
    
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'mobile'
    }
    
    if (ua.includes('tablet') || ua.includes('ipad')) {
        return 'tablet'
    }
    
    if (ua.includes('electron') || ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari')) {
        return 'desktop'
    }
    
    return 'unknown'
}

/**
 * Extract platform from user agent
 */
const getPlatform = (userAgent) => {
    if (!userAgent) return 'unknown'
    
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('android')) {
        return 'android'
    }
    
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
        return 'ios'
    }
    
    if (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari') || ua.includes('edge')) {
        return 'web'
    }
    
    return 'unknown'
}

/**
 * Check if this is a new device for the user
 */
const isNewDevice = async (userId, deviceFingerprint) => {
    const { UserDevice } = require('../models')
    
    try {
        const existingDevice = await UserDevice.findOne({
            where: {
                userId,
                deviceFingerprint,
                isActive: true,
            },
        })
        
        return !existingDevice
    } catch (error) {
        // If there's an error checking, assume it's a new device for security
        return true
    }
}

/**
 * Parse device info from request
 */
const parseDeviceInfo = (req, deviceInfo = null) => {
    const userAgent = req.get('User-Agent') || 'unknown'
    const deviceInfoStr = deviceInfo || userAgent
    
    return {
        userAgent,
        deviceType: getDeviceType(userAgent),
        platform: getPlatform(userAgent),
        deviceInfo: deviceInfoStr,
        ipAddress: req.ip,
        fingerprint: getDeviceFingerprint(req, deviceInfo),
    }
}

/**
 * Validate FCM token format
 */
const isValidFCMToken = (fcmToken) => {
    if (!fcmToken || typeof fcmToken !== 'string') {
        return false
    }
    
    // Basic FCM token validation - they're typically long base64-like strings
    const fcmTokenRegex = /^[A-Za-z0-9_-]+$/
    return fcmToken.length >= 140 && fcmToken.length <= 500 && fcmTokenRegex.test(fcmToken)
}

/**
 * Clean up old inactive devices for a user
 */
const cleanupOldDevices = async (userId, keepDays = 30) => {
    const { UserDevice } = require('../models')
    
    try {
        await UserDevice.deactivateOldDevices(userId, keepDays)
    } catch (error) {
        const { logger } = require('./logger')
        logger.error('Failed to cleanup old devices:', error)
    }
}

module.exports = {
    getDeviceFingerprint,
    getDeviceType,
    getPlatform,
    isNewDevice,
    parseDeviceInfo,
    isValidFCMToken,
    cleanupOldDevices,
}
