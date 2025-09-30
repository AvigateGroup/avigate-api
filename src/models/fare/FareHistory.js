// models/fare/FareHistory.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const FareHistory = sequelize.define(
        'FareHistory',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            routeId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'routes',
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
            fareRuleId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'fare_rules',
                    key: 'id',
                },
            },
            transportMode: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: false,
            },
            city: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            state: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            recordDate: {
                type: DataTypes.DATEONLY,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            averageFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Average fare cannot be negative',
                    },
                },
            },
            minimumFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Minimum fare cannot be negative',
                    },
                },
            },
            maximumFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Maximum fare cannot be negative',
                    },
                },
            },
            medianFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Median fare cannot be negative',
                    },
                },
            },
            standardDeviation: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Standard deviation cannot be negative',
                    },
                },
            },
            sampleSize: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Sample size must be at least 1',
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
            peakHourAverage: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Peak hour average cannot be negative',
                    },
                },
            },
            offPeakAverage: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Off-peak average cannot be negative',
                    },
                },
            },
            weekendAverage: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Weekend average cannot be negative',
                    },
                },
            },
            weekdayAverage: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Weekday average cannot be negative',
                    },
                },
            },
            priceChange: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Change from previous period',
            },
            priceChangePercentage: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: true,
                comment: 'Percentage change from previous period',
            },
            seasonalIndex: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                defaultValue: 1.0,
                validate: {
                    min: {
                        args: [0.1],
                        msg: 'Seasonal index must be at least 0.1',
                    },
                    max: {
                        args: [10.0],
                        msg: 'Seasonal index cannot exceed 10.0',
                    },
                },
            },
            volatilityIndex: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                comment: 'Measure of fare price volatility',
                validate: {
                    min: {
                        args: [0],
                        msg: 'Volatility index cannot be negative',
                    },
                },
            },
            qualityScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 5.0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Quality score must be between 0 and 10',
                    },
                    max: {
                        args: [10],
                        msg: 'Quality score must be between 0 and 10',
                    },
                },
            },
            dataSource: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'user_feedback',
                validate: {
                    isIn: {
                        args: [['user_feedback', 'admin_update', 'api_import', 'calculated', 'verified']],
                        msg: 'Invalid data source',
                    },
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'fare_history',
            timestamps: true,
            indexes: [
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['routeStepId'],
                },
                {
                    fields: ['fareRuleId'],
                },
                {
                    fields: ['transportMode'],
                },
                {
                    fields: ['city'],
                },
                {
                    fields: ['state'],
                },
                {
                    fields: ['recordDate'],
                },
                {
                    fields: ['dataSource'],
                },
                {
                    fields: ['transportMode', 'city', 'recordDate'],
                },
                {
                    unique: true,
                    fields: ['routeId', 'transportMode', 'recordDate'],
                    name: 'unique_route_fare_history',
                },
            ],
        }
    )

    // Instance methods
    FareHistory.prototype.calculatePriceChange = async function () {
        const previousRecord = await FareHistory.findOne({
            where: {
                routeId: this.routeId,
                transportMode: this.transportMode,
                recordDate: {
                    [sequelize.Sequelize.Op.lt]: this.recordDate,
                },
            },
            order: [['recordDate', 'DESC']],
        })

        if (previousRecord) {
            this.priceChange = this.averageFare - previousRecord.averageFare
            this.priceChangePercentage = ((this.priceChange / previousRecord.averageFare) * 100)
            await this.save(['priceChange', 'priceChangePercentage'])
        }

        return {
            priceChange: this.priceChange,
            priceChangePercentage: this.priceChangePercentage,
        }
    }

    FareHistory.prototype.getPriceRange = function () {
        return {
            min: parseFloat(this.minimumFare),
            max: parseFloat(this.maximumFare),
            average: parseFloat(this.averageFare),
            median: this.medianFare ? parseFloat(this.medianFare) : null,
            currency: this.currency,
        }
    }

    FareHistory.prototype.isPriceStable = function () {
        if (!this.volatilityIndex) return null
        return this.volatilityIndex < 0.1 // Less than 10% volatility is considered stable
    }

    FareHistory.prototype.isReliable = function () {
        return this.sampleSize >= 10 && this.qualityScore >= 6.0
    }

    // Static methods
    FareHistory.getTrendForRoute = function (routeId, transportMode, days = 30) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        return FareHistory.findAll({
            where: {
                routeId,
                transportMode,
                recordDate: {
                    [sequelize.Sequelize.Op.gte]: startDate,
                },
            },
            order: [['recordDate', 'ASC']],
        })
    }

    FareHistory.getLatestForRoute = function (routeId, transportMode) {
        return FareHistory.findOne({
            where: {
                routeId,
                transportMode,
            },
            order: [['recordDate', 'DESC']],
        })
    }

    FareHistory.getAverageForPeriod = async function (routeId, transportMode, startDate, endDate) {
        const result = await FareHistory.findOne({
            where: {
                routeId,
                transportMode,
                recordDate: {
                    [sequelize.Sequelize.Op.between]: [startDate, endDate],
                },
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('averageFare')), 'periodAverage'],
                [sequelize.fn('MIN', sequelize.col('minimumFare')), 'periodMin'],
                [sequelize.fn('MAX', sequelize.col('maximumFare')), 'periodMax'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'recordCount'],
            ],
            raw: true,
        })

        return result
    }

    FareHistory.getVolatilityForRoute = async function (routeId, transportMode, days = 30) {
        const records = await this.getTrendForRoute(routeId, transportMode, days)
        
        if (records.length < 2) return null

        const fares = records.map(r => parseFloat(r.averageFare))
        const mean = fares.reduce((sum, fare) => sum + fare, 0) / fares.length
        const variance = fares.reduce((sum, fare) => sum + Math.pow(fare - mean, 2), 0) / fares.length
        const standardDeviation = Math.sqrt(variance)
        
        return {
            volatilityIndex: standardDeviation / mean,
            standardDeviation,
            mean,
            coefficient: (standardDeviation / mean) * 100, // Coefficient of variation
        }
    }

    FareHistory.compareTransportModes = async function (city, date = new Date()) {
        const comparison = await FareHistory.findAll({
            where: {
                city,
                recordDate: date,
            },
            attributes: [
                'transportMode',
                [sequelize.fn('AVG', sequelize.col('averageFare')), 'avgFare'],
                [sequelize.fn('MIN', sequelize.col('minimumFare')), 'minFare'],
                [sequelize.fn('MAX', sequelize.col('maximumFare')), 'maxFare'],
                [sequelize.fn('SUM', sequelize.col('sampleSize')), 'totalSamples'],
            ],
            group: ['transportMode'],
            raw: true,
        })

        return comparison
    }

    FareHistory.getPriceTrend = async function (routeId, transportMode, months = 6) {
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)

        const trend = await FareHistory.findAll({
            where: {
                routeId,
                transportMode,
                recordDate: {
                    [sequelize.Sequelize.Op.gte]: startDate,
                },
            },
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('recordDate')), 'month'],
                [sequelize.fn('AVG', sequelize.col('averageFare')), 'monthlyAverage'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'recordCount'],
            ],
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('recordDate'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('recordDate')), 'ASC']],
            raw: true,
        })

        // Calculate trend direction
        if (trend.length >= 2) {
            const firstAvg = parseFloat(trend[0].monthlyAverage)
            const lastAvg = parseFloat(trend[trend.length - 1].monthlyAverage)
            const overallChange = ((lastAvg - firstAvg) / firstAvg) * 100

            return {
                trend,
                direction: overallChange > 5 ? 'increasing' : overallChange < -5 ? 'decreasing' : 'stable',
                overallChange: overallChange.toFixed(2),
            }
        }

        return { trend, direction: 'insufficient_data' }
    }

    // Association method
    FareHistory.associate = (models) => {
        FareHistory.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        })
        FareHistory.belongsTo(models.RouteStep, {
            foreignKey: 'routeStepId',
            as: 'routeStep',
        })
        FareHistory.belongsTo(models.FareRule, {
            foreignKey: 'fareRuleId',
            as: 'fareRule',
        })
        FareHistory.belongsTo(models.Admin, {
            foreignKey: 'createdBy',
            as: 'creator',
        })
    }

    return FareHistory
}