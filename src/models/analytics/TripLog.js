// models/analytics/TripLog.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const TripLog = sequelize.define(
        'TripLog',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            sessionId: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 100],
                        msg: 'Session ID must be between 1 and 100 characters',
                    },
                },
            },
            routeId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'routes',
                    key: 'id',
                },
            },
            startLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            endLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            startLat: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: true,
                validate: {
                    min: {
                        args: [-90],
                        msg: 'Latitude must be between -90 and 90',
                    },
                    max: {
                        args: [90],
                        msg: 'Latitude must be between -90 and 90',
                    },
                },
            },
            startLng: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: true,
                validate: {
                    min: {
                        args: [-180],
                        msg: 'Longitude must be between -180 and 180',
                    },
                    max: {
                        args: [180],
                        msg: 'Longitude must be between -180 and 180',
                    },
                },
            },
            endLat: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: true,
            },
            endLng: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: true,
            },
            tripStartedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: 'Trip started at must be a valid date',
                    },
                },
            },
            tripCompletedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isAfterStart(value) {
                        if (value && this.tripStartedAt && value < this.tripStartedAt) {
                            throw new Error('Trip completion time must be after start time');
                        }
                    },
                },
            },
            transportModesUsed: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Transport modes used must be an array');
                        }
                        const validModes = ['bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'];
                        const invalidModes = value.filter(mode => !validModes.includes(mode));
                        if (invalidModes.length > 0) {
                            throw new Error(`Invalid transport modes: ${invalidModes.join(', ')}`);
                        }
                    },
                },
            },
            actualRoute: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Actual route must be an array');
                        }
                    },
                },
            },
            totalFarePaid: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total fare paid cannot be negative',
                    },
                },
            },
            totalDistanceKm: {
                type: DataTypes.DECIMAL(8, 3),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total distance cannot be negative',
                    },
                },
            },
            totalDurationMinutes: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total duration cannot be negative',
                    },
                },
            },
            deviations: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Deviations must be an array');
                        }
                    },
                },
            },
            satisfactionRating: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [1.0],
                        msg: 'Satisfaction rating must be between 1.0 and 5.0',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Satisfaction rating must be between 1.0 and 5.0',
                    },
                },
            },
            issuesEncountered: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Issues encountered must be an array');
                        }
                    },
                },
            },
            weatherConditions: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'clear']],
                        msg: 'Invalid weather condition',
                    },
                },
            },
            trafficConditions: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [['light', 'moderate', 'heavy', 'severe', 'clear']],
                        msg: 'Invalid traffic condition',
                    },
                },
            },
            peakHours: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            wasSuccessful: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            abandonReason: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 100],
                        msg: 'Abandon reason must be less than 100 characters',
                    },
                },
            },
            deviceInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            appVersion: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 20],
                        msg: 'App version must be less than 20 characters',
                    },
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
        },
        {
            tableName: 'trip_logs',
            timestamps: true,
            updatedAt: false, // Trip logs are immutable after creation
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['sessionId'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['startLocationId'],
                },
                {
                    fields: ['endLocationId'],
                },
                {
                    fields: ['tripStartedAt'],
                },
                {
                    fields: ['tripCompletedAt'],
                },
                {
                    fields: ['wasSuccessful'],
                },
                {
                    fields: ['peakHours'],
                },
                {
                    fields: ['satisfactionRating'],
                },
                {
                    fields: ['userId', 'tripStartedAt'],
                },
            ],
        }
    )

    // Instance methods
    TripLog.prototype.getTripDuration = function () {
        if (!this.tripCompletedAt || !this.tripStartedAt) return null;
        return Math.round((this.tripCompletedAt - this.tripStartedAt) / 60000); // minutes
    };

    TripLog.prototype.getAverageSpeed = function () {
        const duration = this.getTripDuration();
        if (!duration || !this.totalDistanceKm) return null;
        return (this.totalDistanceKm / (duration / 60)).toFixed(2); // km/h
    };

    TripLog.prototype.getFarePerKm = function () {
        if (!this.totalFarePaid || !this.totalDistanceKm) return null;
        return (parseFloat(this.totalFarePaid) / parseFloat(this.totalDistanceKm)).toFixed(2);
    };

    TripLog.prototype.hadIssues = function () {
        return this.issuesEncountered.length > 0;
    };

    TripLog.prototype.usedMultipleTransportModes = function () {
        return this.transportModesUsed.length > 1;
    };

    // Static methods
    TripLog.findByUser = function (userId, limit = 20) {
        return TripLog.findAll({
            where: { userId },
            order: [['tripStartedAt', 'DESC']],
            limit,
        });
    };

    TripLog.findByRoute = function (routeId, limit = 50) {
        return TripLog.findAll({
            where: { routeId, wasSuccessful: true },
            order: [['tripStartedAt', 'DESC']],
            limit,
        });
    };

    TripLog.getUserStats = async function (userId, days = 30) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const stats = await TripLog.findOne({
            where: {
                userId,
                tripStartedAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTrips'],
                [sequelize.fn('SUM', sequelize.col('totalFarePaid')), 'totalFareSpent'],
                [sequelize.fn('AVG', sequelize.col('totalFarePaid')), 'averageFare'],
                [sequelize.fn('SUM', sequelize.col('totalDistanceKm')), 'totalDistance'],
                [sequelize.fn('AVG', sequelize.col('satisfactionRating')), 'averageSatisfaction'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "wasSuccessful" = true THEN 1 END')), 'successfulTrips'],
            ],
            raw: true,
        });

        return stats;
    };

    TripLog.getPopularRoutes = async function (days = 30, limit = 10) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return TripLog.findAll({
            where: {
                routeId: { [sequelize.Sequelize.Op.ne]: null },
                tripStartedAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
                wasSuccessful: true,
            },
            attributes: [
                'routeId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'tripCount'],
                [sequelize.fn('AVG', sequelize.col('satisfactionRating')), 'averageSatisfaction'],
                [sequelize.fn('AVG', sequelize.col('totalFarePaid')), 'averageFare'],
            ],
            group: ['routeId'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit,
            raw: true,
        });
    };

    // Association method
    TripLog.associate = (models) => {
        TripLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        TripLog.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        TripLog.belongsTo(models.Location, {
            foreignKey: 'startLocationId',
            as: 'startLocation',
        });
        TripLog.belongsTo(models.Location, {
            foreignKey: 'endLocationId',
            as: 'endLocation',
        });
    };

    return TripLog;
};