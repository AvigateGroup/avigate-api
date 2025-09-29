// models/fare/FareFeedback.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const FareFeedback = sequelize.define(
        'FareFeedback',
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
            routeStepId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'route_steps',
                    key: 'id',
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
            fareType: {
                type: DataTypes.ENUM('fixed', 'negotiable', 'metered', 'distance_based'),
                allowNull: false,
            },
            amountPaid: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0.01],
                        msg: 'Amount paid must be greater than 0',
                    },
                    max: {
                        args: [100000],
                        msg: 'Amount paid seems unreasonably high',
                    },
                },
            },
            suggestedAmount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0.01],
                        msg: 'Suggested amount must be greater than 0',
                    },
                },
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'NGN',
                validate: {
                    isIn: {
                        args: [['NGN', 'USD', 'EUR', 'GBP']],
                        msg: 'Invalid currency code',
                    },
                },
            },
            paymentMethod: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [['cash', 'card', 'mobile_money', 'bank_transfer', 'other']],
                        msg: 'Invalid payment method',
                    },
                },
            },
            tripDate: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: 'Trip date must be a valid date',
                    },
                    notFuture(value) {
                        if (value > new Date()) {
                            throw new Error('Trip date cannot be in the future');
                        }
                    },
                },
            },
            timeOfDay: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [['morning', 'afternoon', 'evening', 'night', 'dawn']],
                        msg: 'Invalid time of day',
                    },
                },
            },
            passengerCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Passenger count must be at least 1',
                    },
                    max: {
                        args: [20],
                        msg: 'Passenger count seems unreasonably high',
                    },
                },
            },
            vehicleType: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: true,
            },
            routeConditions: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            driverRating: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [1.0],
                        msg: 'Driver rating must be between 1.0 and 5.0',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Driver rating must be between 1.0 and 5.0',
                    },
                },
            },
            overallExperience: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [1.0],
                        msg: 'Overall experience rating must be between 1.0 and 5.0',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Overall experience rating must be between 1.0 and 5.0',
                    },
                },
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Notes cannot exceed 1000 characters',
                    },
                },
            },
            isDisputed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            disputeReason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            verificationScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                defaultValue: 5.0,
                validate: {
                    min: {
                        args: [0.0],
                        msg: 'Verification score must be between 0.0 and 10.0',
                    },
                    max: {
                        args: [10.0],
                        msg: 'Verification score must be between 0.0 and 10.0',
                    },
                },
            },
            reportedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
        },
        {
            tableName: 'fare_feedback',
            timestamps: true,
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['routeStepId'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['tripDate'],
                },
                {
                    fields: ['amountPaid'],
                },
                {
                    fields: ['fareType'],
                },
                {
                    fields: ['vehicleType'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['isDisputed'],
                },
                {
                    fields: ['verificationScore'],
                },
            ],
        }
    )

    // Instance methods
    FareFeedback.prototype.getFarePerPassenger = function () {
        return this.amountPaid / this.passengerCount;
    };

    FareFeedback.prototype.isReasonable = function () {
        // Simple reasonableness check
        if (this.suggestedAmount) {
            const difference = Math.abs(this.amountPaid - this.suggestedAmount);
            const tolerance = this.suggestedAmount * 0.3; // 30% tolerance
            return difference <= tolerance;
        }
        return true; // Can't determine without suggested amount
    };

    FareFeedback.prototype.markDisputed = async function (reason) {
        this.isDisputed = true;
        this.disputeReason = reason;
        this.verificationScore = Math.max(0, this.verificationScore - 2);
        await this.save(['isDisputed', 'disputeReason', 'verificationScore']);
    };

    // Static methods
    FareFeedback.findByRoute = function (routeId, vehicleType = null, limit = 50) {
        const where = { routeId, isVerified: true };
        if (vehicleType) where.vehicleType = vehicleType;
        
        return FareFeedback.findAll({
            where,
            order: [['tripDate', 'DESC']],
            limit,
        });
    };

    FareFeedback.getAverageFare = async function (routeId, vehicleType = null, days = 30) {
        const where = {
            routeId,
            isVerified: true,
            isDisputed: false,
            tripDate: {
                [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
        };
        
        if (vehicleType) where.vehicleType = vehicleType;
        
        const result = await FareFeedback.findOne({
            where,
            attributes: [
                [sequelize.fn('AVG', sequelize.col('amountPaid')), 'averageFare'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'feedbackCount'],
                [sequelize.fn('MIN', sequelize.col('amountPaid')), 'minFare'],
                [sequelize.fn('MAX', sequelize.col('amountPaid')), 'maxFare'],
            ],
            raw: true,
        });
        
        return result;
    };

    FareFeedback.getFareTrends = async function (routeId, vehicleType = null, days = 90) {
        const where = {
            routeId,
            isVerified: true,
            isDisputed: false,
            tripDate: {
                [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
        };
        
        if (vehicleType) where.vehicleType = vehicleType;
        
        return FareFeedback.findAll({
            where,
            attributes: [
                [sequelize.fn('DATE', sequelize.col('tripDate')), 'date'],
                [sequelize.fn('AVG', sequelize.col('amountPaid')), 'averageFare'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'feedbackCount'],
            ],
            group: [sequelize.fn('DATE', sequelize.col('tripDate'))],
            order: [[sequelize.fn('DATE', sequelize.col('tripDate')), 'ASC']],
            raw: true,
        });
    };

    // Association method
    FareFeedback.associate = (models) => {
        FareFeedback.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        FareFeedback.belongsTo(models.RouteStep, {
            foreignKey: 'routeStepId',
            as: 'routeStep',
        });
        FareFeedback.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        FareFeedback.belongsTo(models.User, {
            foreignKey: 'reportedBy',
            as: 'reporter',
        });
    };

    return FareFeedback;
};