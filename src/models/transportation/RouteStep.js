// models/transportation/RouteStep.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const RouteStep = sequelize.define(
        'RouteStep',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            routeId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'routes',
                    key: 'id',
                },
            },
            stepNumber: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Step number must be positive',
                    },
                },
            },
            fromLocationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            toLocationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
                validate: {
                    notSameAsFrom(value) {
                        if (value === this.fromLocationId) {
                            throw new Error('To location must be different from from location');
                        }
                    },
                },
            },
            transportMode: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: false,
            },
            instruction: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Instruction cannot be empty',
                    },
                    len: {
                        args: [10, 1000],
                        msg: 'Instruction must be between 10 and 1000 characters',
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
                },
            },
            fareRange: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidFareRange(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Fare range must be a valid object');
                        }
                        if (value.min && value.max && value.min > value.max) {
                            throw new Error('Minimum fare cannot be greater than maximum fare');
                        }
                    },
                },
            },
            waitingTime: {
                type: DataTypes.INTEGER, // in minutes
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Waiting time cannot be negative',
                    },
                    max: {
                        args: [480], // 8 hours max
                        msg: 'Waiting time cannot exceed 8 hours',
                    },
                },
            },
            safetyNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            accessibilityNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            landmarks: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Landmarks must be an array');
                        }
                    },
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: 'route_steps',
            timestamps: true,
            indexes: [
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['routeId', 'stepNumber'],
                },
                {
                    fields: ['fromLocationId'],
                },
                {
                    fields: ['toLocationId'],
                },
                {
                    fields: ['transportMode'],
                },
                {
                    unique: true,
                    fields: ['routeId', 'stepNumber'],
                    name: 'unique_route_step_number',
                },
            ],
        }
    )

    // Instance methods
    RouteStep.prototype.getEstimatedFare = function () {
        if (!this.fareRange || (!this.fareRange.min && !this.fareRange.max)) return null;
        
        if (this.fareRange.min && this.fareRange.max) {
            return (this.fareRange.min + this.fareRange.max) / 2;
        }
        return this.fareRange.min || this.fareRange.max;
    };

    RouteStep.prototype.getTotalTime = function () {
        return (this.estimatedDuration || 0) + this.waitingTime;
    };

    RouteStep.prototype.hasLandmark = function (landmarkName) {
        return this.landmarks.some(landmark => 
            landmark.toLowerCase().includes(landmarkName.toLowerCase())
        );
    };

    // Static methods
    RouteStep.findByRoute = function (routeId) {
        return RouteStep.findAll({
            where: { routeId, isActive: true },
            order: [['stepNumber', 'ASC']],
            include: [
                { model: sequelize.models.Location, as: 'fromLocation' },
                { model: sequelize.models.Location, as: 'toLocation' },
            ],
        });
    };

    RouteStep.findByTransportMode = function (transportMode, routeId = null) {
        const where = { transportMode, isActive: true };
        if (routeId) where.routeId = routeId;
        
        return RouteStep.findAll({
            where,
            order: [['routeId', 'ASC'], ['stepNumber', 'ASC']],
        });
    };

    // Association method
    RouteStep.associate = (models) => {
        RouteStep.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        RouteStep.belongsTo(models.Location, {
            foreignKey: 'fromLocationId',
            as: 'fromLocation',
        });
        RouteStep.belongsTo(models.Location, {
            foreignKey: 'toLocationId',
            as: 'toLocation',
        });
        RouteStep.hasMany(models.FareFeedback, {
            foreignKey: 'routeStepId',
            as: 'fareFeedbacks',
        });
    };

    return RouteStep;
};