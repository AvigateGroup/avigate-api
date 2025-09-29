// models/transportation/Route.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const Route = sequelize.define(
        'Route',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Route name cannot be empty',
                    },
                    len: {
                        args: [3, 255],
                        msg: 'Route name must be between 3 and 255 characters',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            startLocationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
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
                    notSameAsStart(value) {
                        if (value === this.startLocationId) {
                            throw new Error('End location must be different from start location');
                        }
                    },
                },
            },
            transportMode: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [['bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car']],
                        msg: 'Invalid transport mode',
                    },
                },
            },
            distanceKm: {
                type: DataTypes.DECIMAL(8, 3),
                allowNull: true,
                validate: {
                    min: {
                        args: [0.001],
                        msg: 'Distance must be greater than 0',
                    },
                    max: {
                        args: [1000],
                        msg: 'Distance cannot exceed 1000km',
                    },
                },
            },
            estimatedDuration: {
                type: DataTypes.INTEGER, // in minutes
                allowNull: true,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Duration must be at least 1 minute',
                    },
                    max: {
                        args: [1440], // 24 hours
                        msg: 'Duration cannot exceed 24 hours',
                    },
                },
            },
            operatingHours: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidOperatingHours(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Operating hours must be a valid object');
                        }
                    },
                },
            },
            fareInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidFareInfo(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Fare info must be a valid object');
                        }
                    },
                },
            },
            difficultyLevel: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Difficulty level must be between 1 and 5',
                    },
                    max: {
                        args: [5],
                        msg: 'Difficulty level must be between 1 and 5',
                    },
                },
            },
            safetyRating: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                defaultValue: 5.0,
                validate: {
                    min: {
                        args: [0.0],
                        msg: 'Safety rating must be between 0.0 and 10.0',
                    },
                    max: {
                        args: [10.0],
                        msg: 'Safety rating must be between 0.0 and 10.0',
                    },
                },
            },
            popularityScore: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Popularity score cannot be negative',
                    },
                },
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            verificationNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            lastUsed: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            verifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            verifiedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'routes',
            timestamps: true,
            indexes: [
                {
                    fields: ['startLocationId'],
                },
                {
                    fields: ['endLocationId'],
                },
                {
                    fields: ['transportMode'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['popularityScore'],
                },
                {
                    fields: ['safetyRating'],
                },
                {
                    fields: ['lastUsed'],
                },
                {
                    fields: ['createdBy'],
                },
                {
                    unique: true,
                    fields: ['startLocationId', 'endLocationId', 'transportMode'],
                    name: 'unique_route_combination',
                },
            ],
            hooks: {
                beforeSave: (route) => {
                    if (route.changed('isVerified') && route.isVerified && !route.verifiedAt) {
                        route.verifiedAt = new Date();
                    }
                },
            },
        }
    )

    // Instance methods
    Route.prototype.updateLastUsed = async function () {
        this.lastUsed = new Date();
        this.popularityScore += 1;
        await this.save({ fields: ['lastUsed', 'popularityScore'] });
    };

    Route.prototype.calculateEstimatedFare = function () {
        if (!this.fareInfo || !this.fareInfo.baseRate) return null;
        
        const { baseRate, perKmRate = 0 } = this.fareInfo;
        const distance = this.distanceKm || 0;
        return baseRate + (distance * perKmRate);
    };

    Route.prototype.isOperatingNow = function () {
        if (!this.operatingHours || Object.keys(this.operatingHours).length === 0) {
            return true; // Assume 24/7 if no hours specified
        }

        const now = new Date();
        const dayOfWeek = now.toLocaleLowerCase().substring(0, 3); // mon, tue, etc.
        const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

        const daySchedule = this.operatingHours[dayOfWeek];
        if (!daySchedule) return false;

        return daySchedule.some(period => {
            const startTime = parseInt(period.start.replace(':', ''));
            const endTime = parseInt(period.end.replace(':', ''));
            return currentTime >= startTime && currentTime <= endTime;
        });
    };

    Route.prototype.getDifficultyDescription = function () {
        const descriptions = {
            1: 'Very Easy',
            2: 'Easy', 
            3: 'Moderate',
            4: 'Difficult',
            5: 'Very Difficult'
        };
        return descriptions[this.difficultyLevel] || 'Unknown';
    };

    // Static methods
    Route.findByLocations = function (startLocationId, endLocationId, transportMode = null) {
        const where = {
            startLocationId,
            endLocationId,
            isActive: true,
        };
        if (transportMode) where.transportMode = transportMode;

        return Route.findAll({
            where,
            order: [
                ['isVerified', 'DESC'],
                ['popularityScore', 'DESC'],
                ['safetyRating', 'DESC'],
            ],
        });
    };

    Route.findAlternativeRoutes = function (startLocationId, endLocationId, excludeRouteId = null) {
        const where = {
            [sequelize.Sequelize.Op.or]: [
                { startLocationId, endLocationId },
                { startLocationId: endLocationId, endLocationId: startLocationId }, // Reverse direction
            ],
            isActive: true,
        };
        
        if (excludeRouteId) {
            where.id = { [sequelize.Sequelize.Op.ne]: excludeRouteId };
        }

        return Route.findAll({
            where,
            order: [
                ['transportMode', 'ASC'],
                ['popularityScore', 'DESC'],
            ],
        });
    };

    Route.findByTransportMode = function (transportMode, city = null) {
        const where = { transportMode, isActive: true };
        
        return Route.findAll({
            where,
            include: [
                {
                    model: sequelize.models.Location,
                    as: 'startLocation',
                    where: city ? { city } : {},
                },
                {
                    model: sequelize.models.Location,
                    as: 'endLocation',
                },
            ],
            order: [['popularityScore', 'DESC']],
        });
    };

    Route.getPopularRoutes = function (limit = 10, city = null) {
        return Route.findAll({
            where: { isActive: true },
            include: [
                {
                    model: sequelize.models.Location,
                    as: 'startLocation',
                    where: city ? { city } : {},
                },
                {
                    model: sequelize.models.Location,
                    as: 'endLocation',
                },
            ],
            order: [['popularityScore', 'DESC']],
            limit,
        });
    };

    Route.searchRoutes = function (searchTerm, limit = 20) {
        return Route.findAll({
            where: {
                [sequelize.Sequelize.Op.and]: [
                    { isActive: true },
                    {
                        [sequelize.Sequelize.Op.or]: [
                            {
                                name: {
                                    [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`,
                                },
                            },
                            {
                                description: {
                                    [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`,
                                },
                            },
                        ],
                    },
                ],
            },
            include: [
                { model: sequelize.models.Location, as: 'startLocation' },
                { model: sequelize.models.Location, as: 'endLocation' },
            ],
            order: [
                ['isVerified', 'DESC'],
                ['popularityScore', 'DESC'],
            ],
            limit,
        });
    };

    // Association method
    Route.associate = (models) => {
        Route.belongsTo(models.Location, {
            foreignKey: 'startLocationId',
            as: 'startLocation',
        });
        Route.belongsTo(models.Location, {
            foreignKey: 'endLocationId',
            as: 'endLocation',
        });
        Route.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
        Route.belongsTo(models.Admin, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
        Route.hasMany(models.RouteStep, {
            foreignKey: 'routeId',
            as: 'steps',
        });
        Route.hasMany(models.FareFeedback, {
            foreignKey: 'routeId',
            as: 'fareFeedbacks',
        });
    };

    return Route;
};