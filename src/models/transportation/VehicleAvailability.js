// models/transportation/VehicleAvailability.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const VehicleAvailability = sequelize.define(
        'VehicleAvailability',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            vehicleId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'vehicles',
                    key: 'id',
                },
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            estimatedArrival: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            availableSeats: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Available seats cannot be negative',
                    },
                },
            },
            fareRange: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            lastUpdated: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            reportedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isFuture(value) {
                        if (value <= new Date()) {
                            throw new Error('Expiry date must be in the future');
                        }
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
            tableName: 'vehicle_availability',
            timestamps: true,
            indexes: [
                {
                    fields: ['vehicleId'],
                },
                {
                    fields: ['locationId'],
                },
                {
                    fields: ['estimatedArrival'],
                },
                {
                    fields: ['expiresAt'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['lastUpdated'],
                },
            ],
            hooks: {
                beforeCreate: (availability) => {
                    // Set default expiry if not provided (30 minutes from now)
                    if (!availability.expiresAt) {
                        availability.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
                    }
                },
            },
        }
    )

    // Instance methods
    VehicleAvailability.prototype.isExpired = function () {
        return this.expiresAt <= new Date();
    };

    VehicleAvailability.prototype.getMinutesUntilArrival = function () {
        if (!this.estimatedArrival) return null;
        const now = new Date();
        const diff = this.estimatedArrival - now;
        return Math.max(0, Math.ceil(diff / 60000)); // Convert to minutes
    };

    VehicleAvailability.prototype.updateSeats = async function (newSeatCount) {
        this.availableSeats = newSeatCount;
        this.lastUpdated = new Date();
        await this.save({ fields: ['availableSeats', 'lastUpdated'] });
    };

    // Static methods
    VehicleAvailability.findActiveAtLocation = function (locationId) {
        return VehicleAvailability.findAll({
            where: {
                locationId,
                isActive: true,
                expiresAt: {
                    [sequelize.Sequelize.Op.gt]: new Date(),
                },
            },
            include: [
                { model: sequelize.models.Vehicle, as: 'vehicle' },
            ],
            order: [['estimatedArrival', 'ASC']],
        });
    };

    VehicleAvailability.findByVehicle = function (vehicleId, isActive = true) {
        const where = { vehicleId };
        if (isActive) {
            where.isActive = true;
            where.expiresAt = {
                [sequelize.Sequelize.Op.gt]: new Date(),
            };
        }
        
        return VehicleAvailability.findAll({
            where,
            order: [['lastUpdated', 'DESC']],
        });
    };

    VehicleAvailability.cleanupExpired = async function () {
        const result = await VehicleAvailability.update(
            { isActive: false },
            {
                where: {
                    expiresAt: {
                        [sequelize.Sequelize.Op.lt]: new Date(),
                    },
                    isActive: true,
                },
            }
        );
        return result[0]; // Number of updated records
    };

    // Association method
    VehicleAvailability.associate = (models) => {
        VehicleAvailability.belongsTo(models.Vehicle, {
            foreignKey: 'vehicleId',
            as: 'vehicle',
        });
        VehicleAvailability.belongsTo(models.Location, {
            foreignKey: 'locationId',
            as: 'location',
        });
        VehicleAvailability.belongsTo(models.User, {
            foreignKey: 'reportedBy',
            as: 'reporter',
        });
    };

    return VehicleAvailability;
};
