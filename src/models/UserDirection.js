module.exports = (sequelize, DataTypes) => {
    const UserDirection = sequelize.define(
        'UserDirection',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                validate: {
                    notNull: {
                        msg: 'Creator is required',
                    },
                    isUUID: {
                        args: 4,
                        msg: 'Creator must be a valid UUID',
                    },
                },
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [5, 100],
                        msg: 'Title must be between 5 and 100 characters',
                    },
                    notEmpty: {
                        msg: 'Title cannot be empty',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'Description cannot exceed 500 characters',
                    },
                },
            },
            startLocationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
                validate: {
                    notNull: {
                        msg: 'Start location is required',
                    },
                    isUUID: {
                        args: 4,
                        msg: 'Start location must be a valid UUID',
                    },
                },
            },
            endLocationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
                validate: {
                    notNull: {
                        msg: 'End location is required',
                    },
                    isUUID: {
                        args: 4,
                        msg: 'End location must be a valid UUID',
                    },
                    differentFromStart(value) {
                        if (value === this.startLocationId) {
                            throw new Error(
                                'End location must be different from start location'
                            )
                        }
                    },
                },
            },
            routeData: {
                type: DataTypes.JSON,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Route data is required',
                    },
                    isValidRouteData(value) {
                        if (!value || typeof value !== 'object') {
                            throw new Error('Route data must be a valid object')
                        }

                        if (
                            !value.steps ||
                            !Array.isArray(value.steps) ||
                            value.steps.length === 0
                        ) {
                            throw new Error(
                                'Route data must contain at least one step'
                            )
                        }

                        // Validate each step has required fields
                        for (let i = 0; i < value.steps.length; i++) {
                            const step = value.steps[i]
                            if (
                                !step.instructions ||
                                !step.vehicleType ||
                                !step.pickupPoint ||
                                !step.dropoffPoint
                            ) {
                                throw new Error(
                                    `Step ${i + 1} is missing required fields`
                                )
                            }
                        }
                    },
                },
            },
            totalEstimatedFare: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Total estimated fare cannot be negative',
                    },
                    max: {
                        args: 200000,
                        msg: 'Total estimated fare cannot exceed ₦200,000',
                    },
                    isInt: {
                        msg: 'Total estimated fare must be an integer',
                    },
                },
            },
            totalEstimatedDuration: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: 1,
                        msg: 'Total estimated duration must be at least 1 minute',
                    },
                    max: {
                        args: 2880,
                        msg: 'Total estimated duration cannot exceed 48 hours (2880 minutes)',
                    },
                    isInt: {
                        msg: 'Total estimated duration must be an integer',
                    },
                },
            },
            shareCode: {
                type: DataTypes.STRING(8),
                allowNull: false,
                unique: true,
                validate: {
                    len: {
                        args: [8, 8],
                        msg: 'Share code must be exactly 8 characters',
                    },
                    isAlphanumeric: {
                        msg: 'Share code must contain only letters and numbers',
                    },
                },
            },
            isPublic: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            usageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Usage count cannot be negative',
                    },
                },
            },
            viewCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'View count cannot be negative',
                    },
                },
            },
            shareCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Share count cannot be negative',
                    },
                },
            },
            // Quality metrics
            rating: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: 1.0,
                        msg: 'Rating cannot be less than 1.0',
                    },
                    max: {
                        args: 5.0,
                        msg: 'Rating cannot be more than 5.0',
                    },
                },
            },
            ratingCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Rating count cannot be negative',
                    },
                },
            },
            // Status tracking
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            isFeatured: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            // Expiry for temporary shares
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Expiry date must be a valid date',
                    },
                    isAfter: {
                        args: new Date().toISOString(),
                        msg: 'Expiry date must be in the future',
                    },
                },
            },
            // Analytics data
            lastAccessedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            accessHistory: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
            },
            // Category for organization
            category: {
                type: DataTypes.ENUM(
                    'daily_commute',
                    'tourist_route',
                    'emergency_route',
                    'shopping_trip',
                    'airport_route',
                    'night_route',
                    'business_trip',
                    'other'
                ),
                defaultValue: 'other',
                allowNull: false,
            },
            // Tags for better discovery
            tags: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
                validate: {
                    isArray(value) {
                        if (value && !Array.isArray(value)) {
                            throw new Error('Tags must be an array')
                        }
                    },
                },
            },
            // Additional metadata
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
            },
        },
        {
            tableName: 'user_directions',
            timestamps: true,
            indexes: [
                {
                    fields: ['shareCode'],
                    unique: true,
                },
                {
                    fields: ['createdBy'],
                },
                {
                    fields: ['startLocationId', 'endLocationId'],
                },
                {
                    fields: ['isPublic'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['isFeatured'],
                },
                {
                    fields: ['category'],
                },
                {
                    fields: ['usageCount'],
                },
                {
                    fields: ['rating'],
                },
                {
                    fields: ['expiresAt'],
                },
                {
                    fields: ['tags'],
                    using: 'gin',
                },
            ],
            hooks: {
                beforeCreate: (userDirection) => {
                    // Generate unique share code
                    if (!userDirection.shareCode) {
                        userDirection.shareCode =
                            UserDirection.generateShareCode()
                    }

                    // Clean up text fields
                    if (userDirection.title) {
                        userDirection.title = userDirection.title.trim()
                    }
                    if (userDirection.description) {
                        userDirection.description =
                            userDirection.description.trim()
                    }
                },

                beforeUpdate: (userDirection) => {
                    // Update lastAccessedAt when usage count changes
                    if (
                        userDirection.changed('usageCount') ||
                        userDirection.changed('viewCount')
                    ) {
                        userDirection.lastAccessedAt = new Date()
                    }
                },
            },
        }
    )

    // Static methods
    UserDirection.generateShareCode = function () {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    // Instance methods
    UserDirection.prototype.incrementUsage = async function (userId = null) {
        this.usageCount += 1
        this.lastAccessedAt = new Date()

        // Track access history for analytics
        const accessHistory = this.accessHistory || []
        accessHistory.push({
            userId,
            timestamp: new Date().toISOString(),
            type: 'usage',
        })

        // Keep only last 100 accesses
        if (accessHistory.length > 100) {
            accessHistory.splice(0, accessHistory.length - 100)
        }

        this.accessHistory = accessHistory
        await this.save({
            fields: ['usageCount', 'lastAccessedAt', 'accessHistory'],
        })
    }

    UserDirection.prototype.incrementView = async function (userId = null) {
        this.viewCount += 1
        this.lastAccessedAt = new Date()

        // Track view history
        const accessHistory = this.accessHistory || []
        accessHistory.push({
            userId,
            timestamp: new Date().toISOString(),
            type: 'view',
        })

        if (accessHistory.length > 100) {
            accessHistory.splice(0, accessHistory.length - 100)
        }

        this.accessHistory = accessHistory
        await this.save({
            fields: ['viewCount', 'lastAccessedAt', 'accessHistory'],
        })
    }

    UserDirection.prototype.incrementShare = async function () {
        this.shareCount += 1
        await this.save({ fields: ['shareCount'] })
    }

    UserDirection.prototype.addRating = async function (newRating) {
        const currentTotal = (this.rating || 0) * this.ratingCount
        this.ratingCount += 1
        this.rating = (currentTotal + newRating) / this.ratingCount
        await this.save({ fields: ['rating', 'ratingCount'] })
    }

    UserDirection.prototype.isExpired = function () {
        return this.expiresAt && new Date() > this.expiresAt
    }

    UserDirection.prototype.isAccessible = function () {
        return this.isActive && !this.isExpired()
    }

    UserDirection.prototype.regenerateShareCode = async function () {
        let newCode
        let attempts = 0

        // Try to generate a unique code
        do {
            newCode = UserDirection.generateShareCode()
            attempts++

            if (attempts > 10) {
                throw new Error('Unable to generate unique share code')
            }
        } while (await UserDirection.findOne({ where: { shareCode: newCode } }))

        this.shareCode = newCode
        await this.save({ fields: ['shareCode'] })
        return newCode
    }

    UserDirection.prototype.getDurationInHours = function () {
        return {
            minutes: this.totalEstimatedDuration,
            hours: Math.floor(this.totalEstimatedDuration / 60),
            remainingMinutes: this.totalEstimatedDuration % 60,
        }
    }

    UserDirection.prototype.getFormattedFare = function () {
        return {
            amount: this.totalEstimatedFare,
            currency: 'NGN',
            formatted: `₦${this.totalEstimatedFare.toLocaleString()}`,
        }
    }

    UserDirection.prototype.getStepCount = function () {
        return this.routeData?.steps?.length || 0
    }

    UserDirection.prototype.getVehicleTypes = function () {
        if (!this.routeData?.steps) return []

        const types = new Set()
        this.routeData.steps.forEach((step) => {
            if (step.vehicleType) {
                types.add(step.vehicleType)
            }
        })

        return Array.from(types)
    }

    UserDirection.prototype.isPopular = function () {
        return this.usageCount >= 20 || this.viewCount >= 50
    }

    UserDirection.prototype.toJSON = function () {
        const direction = { ...this.get() }

        // Add computed fields
        direction.duration = this.getDurationInHours()
        direction.formattedFare = this.getFormattedFare()
        direction.stepCount = this.getStepCount()
        direction.vehicleTypes = this.getVehicleTypes()
        direction.isPopular = this.isPopular()
        direction.isExpired = this.isExpired()
        direction.isAccessible = this.isAccessible()

        return direction
    }

    // Class methods
    UserDirection.findByShareCode = function (
        shareCode,
        includeInactive = false
    ) {
        const whereClause = { shareCode }

        if (!includeInactive) {
            whereClause.isActive = true
        }

        return UserDirection.findOne({
            where: whereClause,
            include: [
                {
                    model: sequelize.models.User,
                    as: 'creator',
                    attributes: [
                        'id',
                        'firstName',
                        'lastName',
                        'reputationScore',
                    ],
                },
                {
                    model: sequelize.models.Location,
                    as: 'startLocation',
                    attributes: [
                        'id',
                        'name',
                        'latitude',
                        'longitude',
                        'address',
                        'city',
                    ],
                },
                {
                    model: sequelize.models.Location,
                    as: 'endLocation',
                    attributes: [
                        'id',
                        'name',
                        'latitude',
                        'longitude',
                        'address',
                        'city',
                    ],
                },
            ],
        })
    }

    UserDirection.findByUser = function (userId, options = {}) {
        const {
            isActive = true,
            isPublic = null,
            category = null,
            limit = 20,
            offset = 0,
        } = options

        const whereClause = { createdBy: userId }

        if (isActive !== null) {
            whereClause.isActive = isActive
        }

        if (isPublic !== null) {
            whereClause.isPublic = isPublic
        }

        if (category) {
            whereClause.category = category
        }

        return UserDirection.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: sequelize.models.Location,
                    as: 'startLocation',
                    attributes: ['id', 'name', 'address', 'city'],
                },
                {
                    model: sequelize.models.Location,
                    as: 'endLocation',
                    attributes: ['id', 'name', 'address', 'city'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        })
    }

    UserDirection.findPublic = function (options = {}) {
        const {
            category = null,
            city = null,
            tags = null,
            featured = false,
            limit = 20,
            offset = 0,
        } = options

        const whereClause = {
            isPublic: true,
            isActive: true,
            [Op.or]: [
                { expiresAt: { [Op.is]: null } },
                { expiresAt: { [Op.gt]: new Date() } },
            ],
        }

        if (category) {
            whereClause.category = category
        }

        if (featured) {
            whereClause.isFeatured = true
        }

        if (tags && Array.isArray(tags)) {
            whereClause.tags = {
                [Op.overlap]: tags,
            }
        }

        const include = [
            {
                model: sequelize.models.User,
                as: 'creator',
                attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
            },
            {
                model: sequelize.models.Location,
                as: 'startLocation',
                attributes: ['id', 'name', 'city', 'state'],
            },
            {
                model: sequelize.models.Location,
                as: 'endLocation',
                attributes: ['id', 'name', 'city', 'state'],
            },
        ]

        // Filter by city if provided
        if (city) {
            include[1].where = { city: { [Op.iLike]: `%${city}%` } }
            include[2].where = { city: { [Op.iLike]: `%${city}%` } }
        }

        return UserDirection.findAndCountAll({
            where: whereClause,
            include,
            order: [
                ['isFeatured', 'DESC'],
                ['usageCount', 'DESC'],
                ['rating', 'DESC'],
                ['createdAt', 'DESC'],
            ],
            limit,
            offset,
        })
    }

    UserDirection.findPopular = function (limit = 10, timeframe = '30 days') {
        const dateThreshold = new Date()

        switch (timeframe) {
            case '7 days':
                dateThreshold.setDate(dateThreshold.getDate() - 7)
                break
            case '30 days':
                dateThreshold.setDate(dateThreshold.getDate() - 30)
                break
            case '90 days':
                dateThreshold.setDate(dateThreshold.getDate() - 90)
                break
            default:
                dateThreshold.setDate(dateThreshold.getDate() - 30)
        }

        return UserDirection.findAll({
            where: {
                isPublic: true,
                isActive: true,
                createdAt: { [Op.gte]: dateThreshold },
                usageCount: { [Op.gte]: 5 },
            },
            include: [
                {
                    model: sequelize.models.Location,
                    as: 'startLocation',
                    attributes: ['name', 'city'],
                },
                {
                    model: sequelize.models.Location,
                    as: 'endLocation',
                    attributes: ['name', 'city'],
                },
            ],
            order: [
                ['usageCount', 'DESC'],
                ['viewCount', 'DESC'],
                ['rating', 'DESC'],
            ],
            limit,
        })
    }

    UserDirection.findByRoute = function (
        startLocationId,
        endLocationId,
        limit = 10
    ) {
        return UserDirection.findAll({
            where: {
                startLocationId,
                endLocationId,
                isPublic: true,
                isActive: true,
                [Op.or]: [
                    { expiresAt: { [Op.is]: null } },
                    { expiresAt: { [Op.gt]: new Date() } },
                ],
            },
            include: [
                {
                    model: sequelize.models.User,
                    as: 'creator',
                    attributes: [
                        'id',
                        'firstName',
                        'lastName',
                        'reputationScore',
                    ],
                },
            ],
            order: [
                ['usageCount', 'DESC'],
                ['rating', 'DESC'],
                ['createdAt', 'DESC'],
            ],
            limit,
        })
    }

    UserDirection.cleanupExpired = async function () {
        const expired = await UserDirection.findAll({
            where: {
                expiresAt: { [Op.lt]: new Date() },
                isActive: true,
            },
        })

        const count = expired.length

        await UserDirection.update(
            { isActive: false },
            {
                where: {
                    expiresAt: { [Op.lt]: new Date() },
                    isActive: true,
                },
            }
        )

        return count
    }

    UserDirection.getStatistics = async function () {
        const stats = await UserDirection.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalDirections'],
                [
                    sequelize.fn(
                        'COUNT',
                        sequelize.literal(
                            'CASE WHEN "isPublic" = true THEN 1 END'
                        )
                    ),
                    'publicDirections',
                ],
                [
                    sequelize.fn(
                        'COUNT',
                        sequelize.literal(
                            'CASE WHEN "isActive" = true THEN 1 END'
                        )
                    ),
                    'activeDirections',
                ],
                [
                    sequelize.fn(
                        'COUNT',
                        sequelize.literal(
                            'CASE WHEN "isFeatured" = true THEN 1 END'
                        )
                    ),
                    'featuredDirections',
                ],
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [
                    sequelize.fn('SUM', sequelize.col('usageCount')),
                    'totalUsage',
                ],
                [sequelize.fn('SUM', sequelize.col('viewCount')), 'totalViews'],
                [
                    sequelize.fn('SUM', sequelize.col('shareCount')),
                    'totalShares',
                ],
            ],
            raw: true,
        })

        return {
            totalDirections: parseInt(stats.totalDirections) || 0,
            publicDirections: parseInt(stats.publicDirections) || 0,
            activeDirections: parseInt(stats.activeDirections) || 0,
            featuredDirections: parseInt(stats.featuredDirections) || 0,
            averageRating: parseFloat(stats.avgRating) || 0,
            totalUsage: parseInt(stats.totalUsage) || 0,
            totalViews: parseInt(stats.totalViews) || 0,
            totalShares: parseInt(stats.totalShares) || 0,
        }
    }

    return UserDirection
}
