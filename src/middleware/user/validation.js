// middleware/user/validators.js - Enhanced version with new auth validators
const Joi = require('joi')

// Nigerian phone number regex pattern
const nigerianPhoneRegex = /^(\+234|234|0)(70|80|81|90|91)[0-9]{8}$/

// Enhanced authentication validators
const authValidators = {
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(128).required(),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: Joi.string().pattern(nigerianPhoneRegex).required(),
        fcmToken: Joi.string().min(10).max(500).optional(),
        deviceInfo: Joi.string().max(1000).optional(),
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        fcmToken: Joi.string().min(10).max(500).optional(),
        deviceInfo: Joi.string().max(1000).optional(),
    }),

    verifyEmail: Joi.object({
        email: Joi.string().email().required(),
        otpCode: Joi.string().length(6).pattern(/^\d+$/).required(),
    }),

    resendVerificationEmail: Joi.object({
        email: Joi.string().email().required(),
    }),

    verifyLoginOTP: Joi.object({
        email: Joi.string().email().required(),
        otpCode: Joi.string().length(6).pattern(/^\d+$/).required(),
        fcmToken: Joi.string().min(10).max(500).optional(),
        deviceInfo: Joi.string().max(1000).optional(),
    }),

    googleAuth: Joi.object({
        token: Joi.string().required(),
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phoneNumber: Joi.string().pattern(nigerianPhoneRegex).optional(),
        fcmToken: Joi.string().min(10).max(500).optional(),
        deviceInfo: Joi.string().max(1000).optional(),
    }),

    updateProfile: Joi.object({
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phoneNumber: Joi.string().pattern(nigerianPhoneRegex).optional(),
        profilePicture: Joi.string().uri().optional(),
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).max(128).required(),
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().required(),
    }),

    logout: Joi.object({
        fcmToken: Joi.string().min(10).max(500).optional(),
    }),

    updateFCMToken: Joi.object({
        fcmToken: Joi.string().min(10).max(500).required(),
        deviceInfo: Joi.string().max(1000).optional(),
    }),

    deleteAccount: Joi.object({
        password: Joi.string().required(),
        confirmDelete: Joi.string().valid('DELETE_MY_ACCOUNT').required(),
    }),
}

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source]

        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
            allowUnknown: false,
        })

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, ''),
                value: detail.context?.value,
                type: detail.type,
            }))

            const { logger } = require('./logger')
            logger.warn('Validation failed', {
                endpoint: req.originalUrl,
                method: req.method,
                source,
                errors,
                userId: req.user?.id,
            })

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            })
        }

        // Replace the source data with validated and sanitized data
        req[source] = value
        next()
    }
}

// Rate limiting validation for OTP attempts
const validateOTPAttempts = async (req, res, next) => {
    try {
        const { email } = req.body
        const { User, UserOTP } = require('../models')

        const user = await User.findByEmail(email)
        if (!user) {
            return next() // Let the main controller handle user not found
        }

        // Check recent OTP attempts (last 5 minutes)
        const recentAttempts = await UserOTP.getRecentAttempts(
            user.id,
            'email_verification',
            5
        )

        if (recentAttempts >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many verification attempts. Please wait 5 minutes before trying again.',
                retryAfter: 300, // 5 minutes in seconds
            })
        }

        next()
    } catch (error) {
        const { logger } = require('./logger')
        logger.error('OTP validation error:', error)
        next() // Continue on error, let main controller handle
    }
}

// Sanitize user input to prevent XSS
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj
                .trim()
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitize)
        }

        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {}
            Object.keys(obj).forEach((key) => {
                sanitized[key] = sanitize(obj[key])
            })
            return sanitized
        }

        return obj
    }

    if (req.body) {
        req.body = sanitize(req.body)
    }

    next()
}

// Validate device information
const validateDeviceInfo = (req, res, next) => {
    const { deviceInfo } = req.body

    if (deviceInfo) {
        try {
            // Basic validation for device info structure
            const userAgent = req.get('User-Agent')
            
            if (deviceInfo.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Device information too long',
                })
            }

            // Extract basic device information
            req.deviceContext = {
                userAgent,
                ip: req.ip,
                deviceInfo: deviceInfo || userAgent,
            }
        } catch (error) {
            // If device info parsing fails, continue with basic info
            req.deviceContext = {
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                deviceInfo: req.get('User-Agent'),
            }
        }
    }

    next()
}

// Pre-defined validation middleware for common use cases
const validationMiddleware = {
    // Authentication validations
    validateRegister: [
        sanitizeInput,
        validate(authValidators.register),
        validateDeviceInfo,
    ],
    validateLogin: [
        sanitizeInput,
        validate(authValidators.login),
        validateDeviceInfo,
    ],
    validateVerifyEmail: [
        sanitizeInput,
        validate(authValidators.verifyEmail),
        validateOTPAttempts,
    ],
    validateResendVerificationEmail: [
        sanitizeInput,
        validate(authValidators.resendVerificationEmail),
        validateOTPAttempts,
    ],
    validateVerifyLoginOTP: [
        sanitizeInput,
        validate(authValidators.verifyLoginOTP),
        validateDeviceInfo,
    ],
    validateGoogleAuth: [
        sanitizeInput,
        validate(authValidators.googleAuth),
        validateDeviceInfo,
    ],
    validateUpdateProfile: [
        sanitizeInput,
        validate(authValidators.updateProfile),
    ],
    validateChangePassword: [
        sanitizeInput,
        validate(authValidators.changePassword),
    ],
    validateRefreshToken: [
        sanitizeInput,
        validate(authValidators.refreshToken),
    ],
    validateLogout: [
        sanitizeInput,
        validate(authValidators.logout),
    ],
    validateUpdateFCMToken: [
        sanitizeInput,
        validate(authValidators.updateFCMToken),
        validateDeviceInfo,
    ],
    validateDeleteAccount: [
        sanitizeInput,
        validate(authValidators.deleteAccount),
    ],
}

module.exports = {
    authValidators,
    validate,
    validateOTPAttempts,
    sanitizeInput,
    validateDeviceInfo,
    validationMiddleware,
}