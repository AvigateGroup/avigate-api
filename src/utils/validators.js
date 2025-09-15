const Joi = require('joi')

// Nigerian phone number regex pattern
const nigerianPhoneRegex =
    /^(\+234|234|0)(70|80|81|90|91|80|81|70|90|91)[0-9]{8}$/

// Nigerian coordinates boundaries
const NIGERIA_BOUNDS = {
    lat: { min: 4.0, max: 14.0 },
    lng: { min: 2.5, max: 15.0 },
}

// Base schemas
const schemas = {
    // UUID validation
    uuid: Joi.string().uuid().required(),

    // Coordinate validation for Nigeria
    latitude: Joi.number()
        .min(NIGERIA_BOUNDS.lat.min)
        .max(NIGERIA_BOUNDS.lat.max)
        .required(),
    longitude: Joi.number()
        .min(NIGERIA_BOUNDS.lng.min)
        .max(NIGERIA_BOUNDS.lng.max)
        .required(),

    // Nigerian phone number
    phoneNumber: Joi.string().pattern(nigerianPhoneRegex).required(),

    // Password requirements
    password: Joi.string().min(8).max(128).required(),

    // Language preferences
    language: Joi.string()
        .valid('English', 'Hausa', 'Igbo', 'Yoruba', 'Pidgin')
        .default('English'),

    // Vehicle types
    vehicleType: Joi.string().valid('bus', 'taxi', 'keke', 'okada').required(),
    vehicleTypes: Joi.array()
        .items(Joi.string().valid('bus', 'taxi', 'keke', 'okada'))
        .min(1)
        .required(),

    // Route difficulty
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').default('Medium'),

    // Fare amounts (in Naira, positive integers)
    fare: Joi.number().integer().min(0).max(100000).required(),

    // Duration (in minutes)
    duration: Joi.number().integer().min(0).max(1440).required(),

    // Rating
    rating: Joi.number().integer().min(1).max(5).required(),

    // Nigerian states
    nigerianState: Joi.string()
        .valid(
            'Abia',
            'Adamawa',
            'Akwa Ibom',
            'Anambra',
            'Bauchi',
            'Bayelsa',
            'Benue',
            'Borno',
            'Cross River',
            'Delta',
            'Ebonyi',
            'Edo',
            'Ekiti',
            'Enugu',
            'FCT',
            'Gombe',
            'Imo',
            'Jigawa',
            'Kaduna',
            'Kano',
            'Katsina',
            'Kebbi',
            'Kogi',
            'Kwara',
            'Lagos',
            'Nasarawa',
            'Niger',
            'Ogun',
            'Ondo',
            'Osun',
            'Oyo',
            'Plateau',
            'Rivers',
            'Sokoto',
            'Taraba',
            'Yobe',
            'Zamfara'
        )
        .required(),

    // Major Nigerian cities
    nigerianCity: Joi.string().min(2).max(50).required(),
}

// Authentication validators
const authValidators = {
    register: Joi.object({
        email: Joi.string().email().required(),
        password: schemas.password,
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: schemas.phoneNumber,
        preferredLanguage: schemas.language.optional(),
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),

    googleAuth: Joi.object({
        token: Joi.string().required(),
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phoneNumber: schemas.phoneNumber.optional(),
    }),

    updateProfile: Joi.object({
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phoneNumber: schemas.phoneNumber.optional(),
        preferredLanguage: schemas.language.optional(),
        profilePicture: Joi.string().uri().optional(),
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().required(),
    }),
}

// Location validators
const locationValidators = {
    create: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        latitude: schemas.latitude,
        longitude: schemas.longitude,
        address: Joi.string().min(5).max(200).required(),
        city: schemas.nigerianCity,
        state: schemas.nigerianState,
        landmarks: Joi.array().items(Joi.string().max(100)).optional(),
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        address: Joi.string().min(5).max(200).optional(),
        city: schemas.nigerianCity.optional(),
        state: schemas.nigerianState.optional(),
        landmarks: Joi.array().items(Joi.string().max(100)).optional(),
        isActive: Joi.boolean().optional(),
    }),

    search: Joi.object({
        q: Joi.string().min(2).max(100).required(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        limit: Joi.number().integer().min(1).max(50).default(20),
        offset: Joi.number().integer().min(0).default(0),
    }),

    nearby: Joi.object({
        lat: schemas.latitude,
        lng: schemas.longitude,
        radius: Joi.number().min(0.1).max(50).default(10), // km
        limit: Joi.number().integer().min(1).max(50).default(20),
    }),
}

// Route validators
const routeValidators = {
    create: Joi.object({
        startLocationId: schemas.uuid,
        endLocationId: schemas.uuid,
        vehicleTypes: schemas.vehicleTypes,
        estimatedFareMin: schemas.fare,
        estimatedFareMax: schemas.fare.greater(Joi.ref('estimatedFareMin')),
        estimatedDuration: schemas.duration,
        difficulty: schemas.difficulty.optional(),
        steps: Joi.array()
            .items(
                Joi.object({
                    stepNumber: Joi.number().integer().min(1).required(),
                    fromLocationId: schemas.uuid,
                    toLocationId: schemas.uuid,
                    vehicleType: schemas.vehicleType,
                    instructions: Joi.string().min(10).max(500).required(),
                    landmarks: Joi.array()
                        .items(Joi.string().max(100))
                        .optional(),
                    fareMin: schemas.fare.optional(),
                    fareMax: schemas.fare.optional(),
                    estimatedDuration: schemas.duration,
                    pickupPoint: Joi.string().min(5).max(200).required(),
                    dropoffPoint: Joi.string().min(5).max(200).required(),
                })
            )
            .min(1)
            .required(),
    }),

    update: Joi.object({
        vehicleTypes: schemas.vehicleTypes.optional(),
        estimatedFareMin: schemas.fare.optional(),
        estimatedFareMax: schemas.fare.optional(),
        estimatedDuration: schemas.duration.optional(),
        difficulty: schemas.difficulty.optional(),
        isActive: Joi.boolean().optional(),
    }),

    search: Joi.object({
        from: schemas.uuid,
        to: schemas.uuid,
        vehicleTypes: Joi.array()
            .items(Joi.string().valid('bus', 'taxi', 'keke', 'okada', 'train'))
            .optional(),
        maxFare: Joi.number().integer().min(0).optional(),
        maxDuration: Joi.number().integer().min(0).optional(),
        difficulty: Joi.array()
            .items(Joi.string().valid('Easy', 'Medium', 'Hard'))
            .optional(),
        limit: Joi.number().integer().min(1).max(20).default(10),
    }),

    feedback: Joi.object({
        routeStepId: schemas.uuid,
        actualFarePaid: schemas.fare,
        vehicleTypeUsed: schemas.vehicleType,
        dateOfTravel: Joi.date().max('now').required(),
        rating: schemas.rating,
        comments: Joi.string().max(500).optional(),
    }),
}

// Direction sharing validators
const directionValidators = {
    create: Joi.object({
        title: Joi.string().min(5).max(100).required(),
        description: Joi.string().max(500).optional(),
        startLocationId: schemas.uuid,
        endLocationId: schemas.uuid,
        routeData: Joi.object().required(), // Complex route object
        totalEstimatedFare: schemas.fare,
        totalEstimatedDuration: schemas.duration,
        isPublic: Joi.boolean().default(false),
    }),

    update: Joi.object({
        title: Joi.string().min(5).max(100).optional(),
        description: Joi.string().max(500).optional(),
        routeData: Joi.object().optional(),
        totalEstimatedFare: schemas.fare.optional(),
        totalEstimatedDuration: schemas.duration.optional(),
        isPublic: Joi.boolean().optional(),
    }),

    shareCode: Joi.object({
        shareCode: Joi.string().alphanum().length(8).required(),
    }),
}

// Crowdsourcing validators
const crowdsourceValidators = {
    routeUpdate: Joi.object({
        routeId: schemas.uuid,
        updateType: Joi.string()
            .valid('fare', 'duration', 'availability', 'condition')
            .required(),
        newValue: Joi.alternatives().conditional('updateType', {
            switch: [
                { is: 'fare', then: schemas.fare },
                { is: 'duration', then: schemas.duration },
                { is: 'availability', then: Joi.boolean() },
                {
                    is: 'condition',
                    then: Joi.string().valid('good', 'fair', 'poor'),
                },
            ],
        }),
        comments: Joi.string().max(300).optional(),
        confidence: Joi.number().min(1).max(5).default(3),
    }),

    fareReport: Joi.object({
        routeStepId: schemas.uuid,
        actualFarePaid: schemas.fare,
        vehicleTypeUsed: schemas.vehicleType,
        dateOfTravel: Joi.date().max('now').required(),
        timeOfDay: Joi.string()
            .valid('morning', 'afternoon', 'evening', 'night')
            .required(),
        trafficCondition: Joi.string()
            .valid('light', 'moderate', 'heavy')
            .optional(),
        weatherCondition: Joi.string()
            .valid('clear', 'rainy', 'cloudy')
            .optional(),
    }),

    newRoute: Joi.object({
        startLocationId: schemas.uuid,
        endLocationId: schemas.uuid,
        vehicleTypes: schemas.vehicleTypes,
        estimatedFareMin: schemas.fare,
        estimatedFareMax: schemas.fare.greater(Joi.ref('estimatedFareMin')),
        estimatedDuration: schemas.duration,
        description: Joi.string().min(20).max(500).required(),
        steps: Joi.array()
            .items(
                Joi.object({
                    stepNumber: Joi.number().integer().min(1).required(),
                    fromLocationId: schemas.uuid,
                    toLocationId: schemas.uuid,
                    vehicleType: schemas.vehicleType,
                    instructions: Joi.string().min(10).max(500).required(),
                    pickupPoint: Joi.string().min(5).max(200).required(),
                    dropoffPoint: Joi.string().min(5).max(200).required(),
                    estimatedDuration: schemas.duration,
                    fareMin: schemas.fare.optional(),
                    fareMax: schemas.fare.optional(),
                })
            )
            .min(1)
            .required(),
        confidence: Joi.number().min(1).max(5).default(3),
    }),
}

// Analytics validators
const analyticsValidators = {
    routeSearch: Joi.object({
        fromLocationId: schemas.uuid,
        toLocationId: schemas.uuid,
        searchFilters: Joi.object().optional(),
        resultsCount: Joi.number().integer().min(0).required(),
        searchDuration: Joi.number().min(0).optional(),
    }),

    directionUsage: Joi.object({
        directionId: schemas.uuid,
        shareCode: Joi.string().alphanum().length(8).required(),
        usageType: Joi.string().valid('view', 'follow', 'share').required(),
    }),
}

// Landmark validators
const landmarkValidators = {
    create: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        description: Joi.string().max(300).optional(),
        latitude: schemas.latitude,
        longitude: schemas.longitude,
        address: Joi.string().min(5).max(200).required(),
        category: Joi.string()
            .valid(
                'Market',
                'School',
                'Hospital',
                'Religious',
                'Government',
                'Transport',
                'Commercial',
                'Residential',
                'Entertainment'
            )
            .required(),
        visibility: Joi.string()
            .valid('High', 'Medium', 'Low')
            .default('Medium'),
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        description: Joi.string().max(300).optional(),
        address: Joi.string().min(5).max(200).optional(),
        category: Joi.string()
            .valid(
                'Market',
                'School',
                'Hospital',
                'Religious',
                'Government',
                'Transport',
                'Commercial',
                'Residential',
                'Entertainment'
            )
            .optional(),
        visibility: Joi.string().valid('High', 'Medium', 'Low').optional(),
    }),
}

// Query parameter validators
const queryValidators = {
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }),

    id: Joi.object({
        id: schemas.uuid,
    }),

    search: Joi.object({
        q: Joi.string().min(1).max(100).optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        category: Joi.string().optional(),
        isActive: Joi.boolean().optional(),
    }),
}

// Validation middleware function
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        })

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context.value,
            }))

            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors,
            })
        }

        req[property] = value
        next()
    }
}

// Custom validation functions
const customValidators = {
    // Check if coordinates are within Nigeria
    isWithinNigeria: (lat, lng) => {
        return (
            lat >= NIGERIA_BOUNDS.lat.min &&
            lat <= NIGERIA_BOUNDS.lat.max &&
            lng >= NIGERIA_BOUNDS.lng.min &&
            lng <= NIGERIA_BOUNDS.lng.max
        )
    },

    // Validate Nigerian phone number
    isValidNigerianPhone: (phone) => {
        return nigerianPhoneRegex.test(phone)
    },

    // Check if fare range is logical
    isValidFareRange: (min, max) => {
        return max >= min && min >= 0
    },

    // Validate route steps sequence
    validateRouteSteps: (steps) => {
        const stepNumbers = steps.map((step) => step.stepNumber)
        const sortedNumbers = [...stepNumbers].sort((a, b) => a - b)

        // Check if step numbers are sequential starting from 1
        for (let i = 0; i < sortedNumbers.length; i++) {
            if (sortedNumbers[i] !== i + 1) {
                return false
            }
        }

        return true
    },

    // Validate share code format
    isValidShareCode: (code) => {
        return /^[A-Z0-9]{8}$/.test(code)
    },
}

// Export all validators
module.exports = {
    schemas,
    authValidators,
    locationValidators,
    routeValidators,
    directionValidators,
    crowdsourceValidators,
    analyticsValidators,
    landmarkValidators,
    queryValidators,
    validate,
    customValidators,
    NIGERIA_BOUNDS,
    nigerianPhoneRegex,
}
