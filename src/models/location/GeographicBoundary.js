// models/location/GeographicBoundary.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const GeographicBoundary = sequelize.define(
        'GeographicBoundary',
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
                        msg: 'Boundary name cannot be empty',
                    },
                },
            },
            type: {
                type: DataTypes.ENUM('state', 'lga', 'city', 'district', 'neighborhood'),
                allowNull: false,
            },
            parentId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'geographic_boundaries',
                    key: 'id',
                },
            },
            centerLat: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: false,
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
            centerLng: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: false,
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
            population: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Population cannot be negative',
                    },
                },
            },
            areaKm2: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Area cannot be negative',
                    },
                },
            },
            postalCodes: {
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
        },
        {
            tableName: 'geographic_boundaries',
            timestamps: true,
            indexes: [
                {
                    fields: ['type'],
                },
                {
                    fields: ['parentId'],
                },
                {
                    fields: ['centerLat', 'centerLng'],
                },
                {
                    fields: ['isActive'],
                },
            ],
        }
    )

    // Instance methods
    GeographicBoundary.prototype.getCenter = function () {
        return {
            latitude: parseFloat(this.centerLat),
            longitude: parseFloat(this.centerLng),
        };
    };

    // Static methods
    GeographicBoundary.findByType = function (type, parentId = null) {
        const where = { type, isActive: true };
        if (parentId) where.parentId = parentId;
        return GeographicBoundary.findAll({
            where,
            order: [['name', 'ASC']],
        });
    };

    GeographicBoundary.findStates = function () {
        return GeographicBoundary.findByType('state');
    };

    GeographicBoundary.findLGAs = function (stateId) {
        return GeographicBoundary.findByType('lga', stateId);
    };

    GeographicBoundary.findCities = function (lgaId) {
        return GeographicBoundary.findByType('city', lgaId);
    };

    // Association method
    GeographicBoundary.associate = (models) => {
        GeographicBoundary.belongsTo(GeographicBoundary, {
            foreignKey: 'parentId',
            as: 'parent',
        });
        GeographicBoundary.hasMany(GeographicBoundary, {
            foreignKey: 'parentId',
            as: 'children',
        });
    };

    return GeographicBoundary;
};