// models/transportation/Vehicle.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const Vehicle = sequelize.define(
        'Vehicle',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            operatorId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'transport_operators',
                    key: 'id',
                },
            },
            plateNumber: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    len: {
                        args: [3, 20],
                        msg: 'Plate number must be between 3 and 20 characters',
                    },
                },
            },
            vehicleType: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: false,
            },
            model: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 100],
                        msg: 'Model must be between 2 and 100 characters',
                    },
                },
            },
            color: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 50],
                        msg: 'Color must be between 2 and 50 characters',
                    },
                },
            },
            capacity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Capacity must be at least 1',
                    },
                    max: {
                        args: [100],
                        msg: 'Capacity cannot exceed 100',
                    },
                },
            },
            routeNumber: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 20],
                        msg: 'Route number must be between 1 and 20 characters',
                    },
                },
            },
            routeDescription: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'out_of_service'),
                allowNull: false,
                defaultValue: 'active',
            },
            currentLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            lastSeenAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            driverInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            safetyFeatures: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            accessibilityFeatures: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
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
            verifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'vehicles',
            timestamps: true,
            indexes: [
                {
                    fields: ['operatorId'],
                },
                {
                    fields: ['vehicleType'],
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['routeNumber'],
                },
                {
                    fields: ['currentLocationId'],
                },
                {
                    fields: ['lastSeenAt'],
                },
                {
                    fields: ['plateNumber'],
                },
                {
                    fields: ['isActive'],
                },
            ],
        }
    )

    // Instance methods
    Vehicle.prototype.updateLocation = async function (locationId) {
        this.currentLocationId = locationId;
        this.lastSeenAt = new Date();
        await this.save({ fields: ['currentLocationId', 'lastSeenAt'] });
    };

    Vehicle.prototype.getDisplayName = function () {
        const parts = [this.vehicleType];
        if (this.routeNumber) parts.push(`Route ${this.routeNumber}`);
        if (this.plateNumber) parts.push(`(${this.plateNumber})`);
        return parts.join(' ');
    };

    Vehicle.prototype.isOperational = function () {
        return this.status === 'active' && this.isActive;
    };

    Vehicle.prototype.hasFeature = function (feature) {
        return this.safetyFeatures.includes(feature) || this.accessibilityFeatures.includes(feature);
    };

    // Static methods
    Vehicle.findByType = function (vehicleType, isOperational = true) {
        const where = { vehicleType, isActive: true };
        if (isOperational) where.status = 'active';
        
        return Vehicle.findAll({
            where,
            order: [['routeNumber', 'ASC'], ['plateNumber', 'ASC']],
        });
    };

    Vehicle.findByRoute = function (routeNumber) {
        return Vehicle.findAll({
            where: {
                routeNumber,
                isActive: true,
                status: 'active',
            },
            order: [['lastSeenAt', 'DESC']],
        });
    };

    Vehicle.findByLocation = function (locationId, radiusKm = 5) {
        return Vehicle.findAll({
            where: {
                currentLocationId: locationId,
                isActive: true,
                status: 'active',
            },
            order: [['lastSeenAt', 'DESC']],
        });
    };

    Vehicle.findRecentlyActive = function (hoursAgo = 24) {
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
        return Vehicle.findAll({
            where: {
                lastSeenAt: {
                    [sequelize.Sequelize.Op.gte]: cutoffTime,
                },
                isActive: true,
            },
            order: [['lastSeenAt', 'DESC']],
        });
    };

    // Association method
    Vehicle.associate = (models) => {
        Vehicle.belongsTo(models.TransportOperator, {
            foreignKey: 'operatorId',
            as: 'operator',
        });
        Vehicle.belongsTo(models.Location, {
            foreignKey: 'currentLocationId',
            as: 'currentLocation',
        });
        Vehicle.belongsTo(models.Admin, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
        Vehicle.hasMany(models.VehicleAvailability, {
            foreignKey: 'vehicleId',
            as: 'availability',
        });
    };

    return Vehicle;
};