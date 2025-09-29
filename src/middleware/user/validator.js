// middleware/user/validator.js
const Joi = require('joi')
const { logger } = require('../../utils/logger')

// Common validation schemas
const commonSchemas = {
    coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
    }),

    location: Joi.object({
        id: Joi.string().uuid().optional(),
        name: Joi.string().min(2).max(255).optional(),
        address: Joi.string().max(500).optional(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
    }).or('id', 'latitude', 'address'),

    transportModes: Joi.array().items(
        Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car')
    ),
}

// Validation schemas
const validationSchemas = {
    planRoute: Joi.object({
        startLocation: commonSchemas.location.required(),
        endLocation: commonSchemas.location.required(),
        transportModes: commonSchemas.transportModes.default(['bus', 'taxi', 'keke_napep', 'walking']),
        preferences: Joi.object({
            maxFare: Joi.number().min(0).optional(),
            preferredModes: commonSchemas.transportModes.optional(),
            avoidHighways: Joi.boolean().default(false),
            preferSafeRoutes: Joi.boolean().default(true),
            maxWalkingDistance: Joi.number().min(0).max(10).default(2),
        }).default({}),
        maxAlternatives: Joi.number().min(1).max(10).default(3),
        includeRealTime: Joi.boolean().default(true),
    }),

    geocode: Joi.object({
        address: Joi.string().min(3).max(500).required(),
        city: Joi.string().min(2).max(100).optional(),
        state: Joi.string().min(2).max(100).optional(),
    }),

    createDirectionShare: Joi.object({
        title: Joi.string().min(3).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        startLocation: commonSchemas.location.optional(),
        endLocation: commonSchemas.location.optional(),
        customInstructions: Joi.string().max(2000).optional(),
        preferredTransportModes: commonSchemas.transportModes.default([]),
        isPublic: Joi.boolean().default(false),
        allowedUsers: Joi.array().items(Joi.string().uuid()).default([]),
        accessCode: Joi.string().min(4).max(10).optional(),
        expiresAt: Joi.date().greater('now').optional(),
        maxUses: Joi.number().min(1).max(1000).optional(),
        cityRestriction: Joi.string().min(2).max(100).optional(),
    }).custom((value, helpers) => {
        if (!value.startLocation && !value.endLocation) {
            return helpers.error('custom.missingLocation')
        }
        return value
    }).messages({
        'custom.missingLocation': 'At least one location (start or end) is required'
    }),

    updateDirectionShare: Joi.object({
        title: Joi.string().min(3).max(255).optional(),
        description: Joi.string().max(1000).optional(),
        customInstructions: Joi.string().max(2000).optional(),
        preferredTransportModes: commonSchemas.transportModes.optional(),
        isPublic: Joi.boolean().optional(),
        allowedUsers: Joi.array().items(Joi.string().uuid()).optional(),
        accessCode: Joi.string().min(4).max(10).allow(null).optional(),
        expiresAt: Joi.date().greater('now').allow(null).optional(),
        maxUses: Joi.number().min(1).max(1000).allow(null).optional(),
    }),

    createCommunityPost: Joi.object({
        type: Joi.string().valid(
            'traffic_update', 'route_closure', 'safety_alert', 'fare_update',
            'new_route', 'general_info', 'community_event', 'transport_strike'
        ).required(),
        title: Joi.string().min(5).max(255).required(),
        content: Joi.string().min(10).max(5000).required(),
        locationId: Joi.string().uuid().optional(),
        routeId: Joi.string().uuid().optional(),
        affectedAreas: Joi.array().items(Joi.string()).default([]),
        isUrgent: Joi.boolean().default(false),
        expiresAt: Joi.date().greater('now').optional(),
        tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
        attachments: Joi.array().items(Joi.object({
            type: Joi.string().valid('image', 'video', 'document').required(),
            url: Joi.string().uri().required(),
            filename: Joi.string().max(255).optional(),
            size: Joi.number().max(10 * 1024 * 1024).optional(), // 10MB max
        })).max(5).default([]),
    }),

    votePost: Joi.object({
        voteType: Joi.string().valid('upvote', 'downvote').required(),
    }),

    reportPost: Joi.object({
        reason: Joi.string().min(10).max(500).required(),
    }),

    createSafetyReport: Joi.object({
        locationId: Joi.string().uuid().optional(),
        routeId: Joi.string().uuid().optional(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        safetyLevel: Joi.string().valid('very_safe', 'safe', 'moderate', 'unsafe', 'very_unsafe').required(),
        incidentType: Joi.string().valid(
            'theft', 'robbery', 'accident', 'harassment', 'violence',
            'vandalism', 'scam', 'poor_lighting', 'road_condition',
            'vehicle_breakdown', 'fare_dispute', 'other'
        ).required(),
        description: Joi.string().min(20).max(2000).required(),
        timeOfIncident: Joi.date().max('now').optional(),
        isAnonymous: Joi.boolean().default(false),
        severity: Joi.number().min(1).max(5).default(3),
        affectsTransport: Joi.boolean().default(false),
        transportModes: commonSchemas.transportModes.default([]),
        recommendedAction: Joi.string().max(1000).optional(),
        attachments: Joi.array().items(Joi.object({
            type: Joi.string().valid('image', 'video', 'document').required(),
            url: Joi.string().uri().required(),
            filename: Joi.string().max(255).optional(),
        })).max(3).default([]),
    }).custom((value, helpers) => {
        const hasLocation = value.locationId || value.routeId || (value.latitude && value.longitude)
        if (!hasLocation) {
            return helpers.error('custom.missingLocation')
        }
        return value
    }).messages({
        'custom.missingLocation': 'Either location, route, or coordinates must be provided'
    }),

    voteSafetyReport: Joi.object({
        voteType: Joi.string().valid('upvote', 'downvote').required(),
    }),

    routeContribution: Joi.object({
        contributionType: Joi.string().valid('new_route', 'route_update', 'fare_update', 'schedule_update').required(),
        routeId: Joi.string().uuid().optional(),
        routeName: Joi.string().min(3).max(255).optional(),
        routeDescription: Joi.string().max(1000).optional(),
        startLocationId: Joi.string().uuid().optional(),
        endLocationId: Joi.string().uuid().optional(),
        transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').optional(),
        estimatedFare: Joi.object({
            min: Joi.number().min(0).required(),
            max: Joi.number().min(Joi.ref('min')).required(),
            currency: Joi.string().default('NGN'),
        }).optional(),
        estimatedDuration: Joi.number().min(1).optional(),
        routeSteps: Joi.array().items(Joi.object({
            stepNumber: Joi.number().min(1).required(),
            fromLocationId: Joi.string().uuid().optional(),
            toLocationId: Joi.string().uuid().optional(),
            transportMode: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car').required(),
            instruction: Joi.string().min(10).max(1000).required(),
            distanceKm: Joi.number().min(0).optional(),
            estimatedDuration: Joi.number().min(1).optional(),
            fareRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).optional(),
        })).optional(),
        supportingEvidence: Joi.array().items(Joi.object({
            type: Joi.string().valid('image', 'video', 'document', 'link').required(),
            url: Joi.string().uri().required(),
            description: Joi.string().max(255).optional(),
        })).max(5).default([]),
        contributorNotes: Joi.string().max(2000).optional(),
    }),

    userFeedback: Joi.object({
        type: Joi.string().valid('route_feedback', 'app_feedback', 'service_feedback', 'bug_report', 'feature_request').required(),
        feedbackCategory: Joi.string().max(100).optional(),
        title: Joi.string().min(5).max(255).required(),
        description: Joi.string().min(10).max(5000).required(),
        routeId: Joi.string().uuid().optional(),
        locationId: Joi.string().uuid().optional(),
        rating: Joi.number().min(1).max(5).optional(),
        isAnonymous: Joi.boolean().default(false),
        contactEmail: Joi.string().email().optional(),
        priority: Joi.number().min(1).max(5).default(3),
        attachments: Joi.array().items(Joi.object({
            type: Joi.string().valid('image', 'video', 'document', 'screenshot').required(),
            url: Joi.string().uri().required(),
            filename: Joi.string().max(255).optional(),
        })).max(5).default([]),
        tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    }),

    fareFeedback: Joi.object({
        routeStepId: Joi.string().uuid().optional(),
        routeId: Joi.string().uuid().optional(),
        fareType: Joi.string().valid('fixed', 'negotiable', 'metered', 'distance_based').required(),
        amountPaid: Joi.number().min(0.01).max(100000).required(),
        suggestedAmount: Joi.number().min(0.01).max(100000).optional(),
        currency: Joi.string().valid('NGN', 'USD', 'EUR', 'GBP').default('NGN'),
        paymentMethod: Joi.string().valid('cash', 'card', 'mobile_money', 'bank_transfer', 'other').optional(),
        tripDate: Joi.date().max('now').required(),
        timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'night', 'dawn').optional(),
        passengerCount: Joi.number().min(1).max(20).default(1),
        vehicleType: Joi.string().valid('bus', 'taxi', 'keke_napep', 'okada', 'car').optional(),
        routeConditions: Joi.object({
            traffic: Joi.string().valid('light', 'moderate', 'heavy').optional(),
            weather: Joi.string().valid('clear', 'rain', 'cloudy', 'storm').optional(),
            roadCondition: Joi.string().valid('good', 'fair', 'poor').optional(),
        }).default({}),
        driverRating: Joi.number().min(1).max(5).optional(),
        overallExperience: Joi.number().min(1).max(5).optional(),
        notes: Joi.string().max(1000).optional(),
    }).custom((value, helpers) => {
        if (!value.routeStepId && !value.routeId) {
            return helpers.error('custom.missingRoute')
        }
        return value
    }).messages({
        'custom.missingRoute': 'Either route step ID or route ID is required'
    }),

    fareComparison: Joi.object({
        routeIds: Joi.array().items(Joi.string().uuid()).min(2).max(10).required(),
    }),

    disputeFare: Joi.object({
        reason: Joi.string().min(10).max(500).required(),
    }),
}

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
        })

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }))

            logger.warn('Validation error:', { errors, body: req.body })

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            })
        }

        req.body = value
        next()
    }
}

// Individual validation middleware
const validationMiddleware = {
    validatePlanRoute: validate(validationSchemas.planRoute),
    validateGeocode: validate(validationSchemas.geocode),
    validateCreateDirectionShare: validate(validationSchemas.createDirectionShare),
    validateUpdateDirectionShare: validate(validationSchemas.updateDirectionShare),
    validateCreateCommunityPost: validate(validationSchemas.createCommunityPost),
    validateVotePost: validate(validationSchemas.votePost),
    validateReportPost: validate(validationSchemas.reportPost),
    validateCreateSafetyReport: validate(validationSchemas.createSafetyReport),
    validateVoteSafetyReport: validate(validationSchemas.voteSafetyReport),
    validateRouteContribution: validate(validationSchemas.routeContribution),
    validateUserFeedback: validate(validationSchemas.userFeedback),
    validateFareFeedback: validate(validationSchemas.fareFeedback),
    validateFareComparison: validate(validationSchemas.fareComparison),
    validateDisputeFare: validate(validationSchemas.disputeFare),
}

module.exports = {
    validationMiddleware,
    validate,
    schemas: validationSchemas,
}
