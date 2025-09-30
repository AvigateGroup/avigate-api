// models/fare/FareRule.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const FareRule = sequelize.define(
        'FareRule',
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
                        msg: 'Rule name cannot be empty',
                    },
                    len: {
                        args: [3, 255],
                        msg: 'Rule name must be between 3 and 255 characters',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
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
            city: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 100],
                        msg: 'City must be between 2 and 100 characters',
                    },
                },
            },
            state: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 100],
                        msg: 'State must be between 2 and 100 characters',
                    },
                },
            },
            fareType: {
                type: DataTypes.ENUM('fixed', 'negotiable', 'metered', 'distance_based'),
                allowNull: false,
                defaultValue: 'negotiable',
                validate: {
                    isIn: {
                        args: [['fixed', 'negotiable', 'metered', 'distance_based']],
                        msg: 'Invalid fare type',
                    },
                },
            },
            baseFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Base fare cannot be negative',
                    },
                    max: {
                        args: [100000],
                        msg: 'Base fare seems unreasonably high',
                    },
                },
            },
            perKmRate: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Per km rate cannot be negative',
                    },
                    max: {
                        args: [10000],
                        msg: 'Per km rate seems unreasonably high',
                    },
                },
            },
            perMinuteRate: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Per minute rate cannot be negative',
                    },
                    max: {
                        args: [1000],
                        msg: 'Per minute rate seems unreasonably high',
                    },
                },
            },
            minimumFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Minimum fare cannot be negative',
                    },
                },
            },
            maximumFare: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Maximum fare cannot be negative',
                    },
                    isGreaterThanMin(value) {
                        if (value && this.minimumFare && value < this.minimumFare) {
                            throw new Error('Maximum fare must be greater than minimum fare');
                        }
                    },
                },
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'NGN',
                validate: {
                    isIn: {
                        args: [['NGN']],
                        msg: 'Invalid currency code',
                    },
                    isUppercase: {
                        msg: 'Currency code must be uppercase',
                    },
                    len: {
                        args: [3, 3],
                        msg: 'Currency code must be exactly 3 characters',
                    },
                },
            },
            peakHourMultiplier: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 1.0,
                validate: {
                    min: {
                        args: [0.5],
                        msg: 'Peak hour multiplier must be at least 0.5',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Peak hour multiplier cannot exceed 5.0',
                    },
                },
            },
            peakHours: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Peak hours must be an array');
                        }
                        // Each entry should have start and end time
                        const validEntries = value.every(entry => 
                            entry.start && entry.end && 
                            typeof entry.start === 'string' && 
                            typeof entry.end === 'string'
                        );
                        if (!validEntries) {
                            throw new Error('Each peak hour entry must have start and end times');
                        }
                    },
                },
            },
            weekendMultiplier: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 1.0,
                validate: {
                    min: {
                        args: [0.5],
                        msg: 'Weekend multiplier must be at least 0.5',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Weekend multiplier cannot exceed 5.0',
                    },
                },
            },
            holidayMultiplier: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 1.0,
                validate: {
                    min: {
                        args: [0.5],
                        msg: 'Holiday multiplier must be at least 0.5',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Holiday multiplier cannot exceed 5.0',
                    },
                },
            },
            seasonalAdjustments: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidObject(value) {
                        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                            throw new Error('Seasonal adjustments must be a valid object');
                        }
                    },
                },
            },
            fuelSurcharge: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Fuel surcharge cannot be negative',
                    },
                },
            },
            fuelSurchargePercentage: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Fuel surcharge percentage cannot be negative',
                    },
                    max: {
                        args: [100],
                        msg: 'Fuel surcharge percentage cannot exceed 100%',
                    },
                },
            },
            additionalCharges: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidObject(value) {
                        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                            throw new Error('Additional charges must be a valid object');
                        }
                    },
                },
            },
            discounts: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidObject(value) {
                        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                            throw new Error('Discounts must be a valid object');
                        }
                    },
                },
            },
            validFrom: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                validate: {
                    isDate: {
                        msg: 'Valid from must be a valid date',
                    },
                },
            },
            validUntil: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Valid until must be a valid date',
                    },
                    isAfterValidFrom(value) {
                        if (value && value <= this.validFrom) {
                            throw new Error('Valid until must be after valid from date');
                        }
                    },
                },
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Priority must be at least 1',
                    },
                    max: {
                        args: [1000],
                        msg: 'Priority cannot exceed 1000',
                    },
                },
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isDefault: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            lastModifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
        },
        {
            tableName: 'fare_rules',
            timestamps: true,
            indexes: [
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
                    fields: ['fareType'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['isDefault'],
                },
                {
                    fields: ['priority'],
                },
                {
                    fields: ['validFrom'],
                },
                {
                    fields: ['validUntil'],
                },
                {
                    fields: ['createdBy'],
                },
                {
                    fields: ['transportMode', 'city', 'isActive'],
                },
            ],
        }
    )

    // Instance methods
    FareRule.prototype.calculateFare = function (distanceKm, durationMinutes = null, options = {}) {
        const {
            isPeakHour = false,
            isWeekend = false,
            isHoliday = false,
            passengerCount = 1,
            dateTime = new Date(),
        } = options

        let fare = this.baseFare

        // Add distance-based charges
        if (this.perKmRate && distanceKm) {
            fare += distanceKm * this.perKmRate
        }

        // Add time-based charges
        if (this.perMinuteRate && durationMinutes) {
            fare += durationMinutes * this.perMinuteRate
        }

        // Apply peak hour multiplier
        if (isPeakHour && this.peakHourMultiplier > 1.0) {
            fare *= this.peakHourMultiplier
        }

        // Apply weekend multiplier
        if (isWeekend && this.weekendMultiplier > 1.0) {
            fare *= this.weekendMultiplier
        }

        // Apply holiday multiplier
        if (isHoliday && this.holidayMultiplier > 1.0) {
            fare *= this.holidayMultiplier
        }

        // Add fuel surcharge
        if (this.fuelSurcharge > 0) {
            fare += this.fuelSurcharge
        }

        // Add fuel surcharge percentage
        if (this.fuelSurchargePercentage > 0) {
            fare += fare * (this.fuelSurchargePercentage / 100)
        }

        // Apply additional charges
        if (this.additionalCharges && Object.keys(this.additionalCharges).length > 0) {
            Object.values(this.additionalCharges).forEach(charge => {
                if (typeof charge === 'number') {
                    fare += charge
                }
            })
        }

        // Apply discounts
        if (this.discounts && Object.keys(this.discounts).length > 0) {
            Object.values(this.discounts).forEach(discount => {
                if (typeof discount === 'number') {
                    if (discount < 1) {
                        // Percentage discount
                        fare *= (1 - discount)
                    } else {
                        // Fixed amount discount
                        fare -= discount
                    }
                }
            })
        }

        // Apply minimum and maximum fare constraints
        if (this.minimumFare && fare < this.minimumFare) {
            fare = this.minimumFare
        }

        if (this.maximumFare && fare > this.maximumFare) {
            fare = this.maximumFare
        }

        return Math.round(fare * 100) / 100 // Round to 2 decimal places
    }

    FareRule.prototype.getFareRange = function (distanceKm, durationMinutes = null, options = {}) {
        // Calculate base fare
        const baseFare = this.calculateFare(distanceKm, durationMinutes, {
            ...options,
            isPeakHour: false,
            isWeekend: false,
            isHoliday: false,
        })

        // Calculate maximum fare (with all multipliers)
        const maxFare = this.calculateFare(distanceKm, durationMinutes, {
            ...options,
            isPeakHour: true,
            isWeekend: true,
            isHoliday: true,
        })

        return {
            min: Math.round(baseFare * 0.8 * 100) / 100, // 20% negotiation buffer
            max: Math.round(maxFare * 1.2 * 100) / 100, // 20% negotiation buffer
            base: baseFare,
            currency: this.currency,
        }
    }

    FareRule.prototype.isValidNow = function () {
        const now = new Date()
        return this.isActive && 
               this.validFrom <= now && 
               (!this.validUntil || this.validUntil >= now)
    }

    FareRule.prototype.isPeakHour = function (dateTime = new Date()) {
        if (!this.peakHours || this.peakHours.length === 0) {
            return false
        }

        const hours = dateTime.getHours()
        const minutes = dateTime.getMinutes()
        const currentTime = hours * 100 + minutes // HHMM format

        return this.peakHours.some(period => {
            const startTime = parseInt(period.start.replace(':', ''))
            const endTime = parseInt(period.end.replace(':', ''))
            return currentTime >= startTime && currentTime <= endTime
        })
    }

    FareRule.prototype.isWeekend = function (dateTime = new Date()) {
        const day = dateTime.getDay()
        return day === 0 || day === 6 // Sunday or Saturday
    }

    FareRule.prototype.estimateWithConfidence = function (distanceKm, durationMinutes = null, options = {}) {
        const fareRange = this.getFareRange(distanceKm, durationMinutes, options)
        
        // Calculate confidence based on rule characteristics
        let confidence = 50 // Base confidence

        if (this.isDefault) confidence += 10
        if (this.fareType === 'fixed') confidence += 20
        if (this.fareType === 'distance_based') confidence += 10
        if (this.city) confidence += 15
        if (this.validFrom) confidence += 5

        return {
            ...fareRange,
            confidence: Math.min(confidence, 95), // Cap at 95%
            fareType: this.fareType,
            ruleName: this.name,
        }
    }

    // Static methods
    FareRule.findApplicableRules = function (transportMode, city = null, state = null, dateTime = new Date()) {
        const where = {
            transportMode,
            isActive: true,
            validFrom: { [sequelize.Sequelize.Op.lte]: dateTime },
            [sequelize.Sequelize.Op.or]: [
                { validUntil: null },
                { validUntil: { [sequelize.Sequelize.Op.gte]: dateTime } },
            ],
        }

        if (city) where.city = city
        if (state) where.state = state

        return FareRule.findAll({
            where,
            order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        })
    }

    FareRule.findBestRule = async function (transportMode, city = null, state = null, dateTime = new Date()) {
        const applicableRules = await this.findApplicableRules(transportMode, city, state, dateTime)

        if (applicableRules.length === 0) {
            // Find default rule for this transport mode
            return await FareRule.findOne({
                where: {
                    transportMode,
                    isDefault: true,
                    isActive: true,
                },
            })
        }

        // Return the highest priority rule
        return applicableRules[0]
    }

    FareRule.getDefaultRules = function () {
        return FareRule.findAll({
            where: {
                isDefault: true,
                isActive: true,
            },
            order: [['transportMode', 'ASC']],
        })
    }

    // Association method
    FareRule.associate = (models) => {
        FareRule.belongsTo(models.Admin, {
            foreignKey: 'createdBy',
            as: 'creator',
        })
        FareRule.belongsTo(models.Admin, {
            foreignKey: 'lastModifiedBy',
            as: 'lastModifier',
        })
    }

    return FareRule
}