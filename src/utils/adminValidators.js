// utils/adminValidators.js 
const Joi = require('joi')

const adminValidators = {
    // User management validators
    validateGetAllUsers: (req, res, next) => {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            search: Joi.string().max(100).optional(),
            isVerified: Joi.string().valid('true', 'false').optional(),
            isActive: Joi.string().valid('true', 'false').optional(),
            sortBy: Joi.string().valid('createdAt', 'firstName', 'lastName', 'email', 'reputationScore').default('createdAt'),
            sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
            dateFrom: Joi.date().iso().optional(),
            dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
        })

        const { error, value } = schema.validate(req.query)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.query = value
        next()
    },

    validateGetUserStats: (req, res, next) => {
        const schema = Joi.object({
            dateFrom: Joi.date().iso().optional(),
            dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
        })

        const { error, value } = schema.validate(req.query)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.query = value
        next()
    },

    validateSearchUsers: (req, res, next) => {
        const schema = Joi.object({
            query: Joi.string().max(100).optional(),
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
            filters: Joi.object({
                isVerified: Joi.boolean().optional(),
                isActive: Joi.boolean().optional(),
                hasGoogleId: Joi.boolean().optional(),
                reputationMin: Joi.number().integer().min(0).optional(),
                reputationMax: Joi.number().integer().min(0).optional(),
            }).optional().default({}),
        })

        const { error, value } = schema.validate(req.body)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.body = value
        next()
    },

    validateUserId: (req, res, next) => {
        const schema = Joi.object({
            userId: Joi.string().uuid().required(),
        })

        const { error, value } = schema.validate(req.params)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.params = value
        next()
    },

    validateDeviceId: (req, res, next) => {
        const schema = Joi.object({
            userId: Joi.string().uuid().required(),
            deviceId: Joi.string().uuid().required(),
        })

        const { error, value } = schema.validate(req.params)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid device ID format',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.params = value
        next()
    },

    validateUpdateUserStatus: (req, res, next) => {
        const schema = Joi.object({
            isVerified: Joi.boolean().optional(),
            isActive: Joi.boolean().optional(),
            reason: Joi.string().min(5).max(500).required(),
        }).min(2) // At least isVerified/isActive and reason

        const { error, value } = schema.validate(req.body)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.body = value
        next()
    },

    validateResetUserPassword: (req, res, next) => {
        const schema = Joi.object({
            newPassword: Joi.string().min(8).max(128).required(),
            reason: Joi.string().min(5).max(500).required(),
            notifyUser: Joi.boolean().default(true),
        })

        const { error, value } = schema.validate(req.body)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.body = value
        next()
    },

    validateDeleteUserAccount: (req, res, next) => {
        const schema = Joi.object({
            reason: Joi.string().min(10).max(500).required(),
            sendNotification: Joi.boolean().default(true),
        })

        const { error, value } = schema.validate(req.body)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.body = value
        next()
    },

    validateDeactivateUserDevice: (req, res, next) => {
        const schema = Joi.object({
            reason: Joi.string().min(5).max(500).required(),
        })

        const { error, value } = schema.validate(req.body)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.body = value
        next()
    },

    validatePagination: (req, res, next) => {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20),
        })

        const { error, value } = schema.validate(req.query)
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                })),
            })
        }

        req.query = { ...req.query, ...value }
        next()
    },
}

module.exports = { adminValidators }