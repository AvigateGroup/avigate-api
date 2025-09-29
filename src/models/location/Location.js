// models/location/Location.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const Location = sequelize.define(
        'Location',
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
                        msg: 'Location name cannot be empty',
                    },
                    len: {
                        args: [2, 255],
                        msg: 'Location name must be between 2 and 255 characters',
                    },
                },
            },
            displayName: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Display name cannot be empty',
                    },
                    len: {
                        args: [2, 255],
                        msg: 'Display name must be between 2 and 255 characters',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            type: {
                type: DataTypes.ENUM(
                    'bus_stop', 'taxi_stand', 'keke_station', 'okada_point',
                    'landmark', 'residential', 'commercial', 'government',
                    'transport_hub', 'airport', 'junction', 'roundabout'
                ),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [[
                            'bus_stop', 'taxi_stand', 'keke_station', 'okada_point',
                            'landmark', 'residential', 'commercial', 'government',
                            'transport_hub', 'airport', 'junction', 'roundabout'
                        ]],
                        msg: 'Invalid location type',
                    },
                },
            },
            address: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            city: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'City cannot be empty',
                    },
                    len: {
                        args: [2, 100],
                        msg: 'City must be between 2 and 100 characters',
                    },
                },
            },
            state: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'State cannot be empty',
                    },
                    len: {
                        args: [2, 100],
                        msg: 'State must be between 2 and 100 characters',
                    },
                },
            },
            country: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: 'Nigeria',
                validate: {
                    notEmpty: {
                        msg: 'Country cannot be empty',
                    },
                },
            },
            latitude: {
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
                    isInNigeria(value) {
                        if (this.country === 'Nigeria' && (value < 4.0 || value > 14.0)) {
                            throw new Error('Latitude must be within Nigeria bounds (4.0 to 14.0)');
                        }
                    },
                },
            },
            longitude: {
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
                    isInNigeria(value) {
                        if (this.country === 'Nigeria' && (value < 2.5 || value > 15.0)) {
                            throw new Error('Longitude must be within Nigeria bounds (2.5 to 15.0)');
                        }
                    },
                },
            },
            googlePlaceId: {
                type: DataTypes.STRING(255),
                allowNull: true,
                unique: true,
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
            accessibilityInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidJSON(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Accessibility info must be a valid object');
                        }
                    },
                },
            },
            operatingHours: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidJSON(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Operating hours must be a valid object');
                        }
                    },
                },
            },
            transportModes: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Transport modes must be an array');
                        }
                        const validModes = ['bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'];
                        const invalidModes = value.filter(mode => !validModes.includes(mode));
                        if (invalidModes.length > 0) {
                            throw new Error(`Invalid transport modes: ${invalidModes.join(', ')}`);
                        }
                    },
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            verifiedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            verifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            lastModifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'locations',
            timestamps: true,
            indexes: [
                {
                    fields: ['latitude', 'longitude'],
                },
                {
                    fields: ['city', 'state'],
                },
                {
                    fields: ['type'],
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
                    unique: true,
                    fields: ['googlePlaceId'],
                    where: {
                        googlePlaceId: {
                            [sequelize.Sequelize.Op.ne]: null,
                        },
                    },
                },
            ],
            hooks: {
                beforeValidate: (location) => {
                    // Ensure coordinates are properly formatted
                    if (location.latitude) {
                        location.latitude = parseFloat(location.latitude);
                    }
                    if (location.longitude) {
                        location.longitude = parseFloat(location.longitude);
                    }
                },
                beforeSave: (location) => {
                    // Set verification timestamp when verified
                    if (location.changed('isVerified') && location.isVerified && !location.verifiedAt) {
                        location.verifiedAt = new Date();
                    }
                },
            },
        }
    )

    // Instance methods
    Location.prototype.getCoordinates = function () {
        return {
            latitude: parseFloat(this.latitude),
            longitude: parseFloat(this.longitude),
        };
    };

    Location.prototype.getFullAddress = function () {
        const parts = [this.address, this.city, this.state, this.country]
            .filter(part => part && part.trim());
        return parts.join(', ');
    };

    Location.prototype.calculateDistance = function (otherLocation) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(otherLocation.latitude - this.latitude);
        const dLon = this.toRadians(otherLocation.longitude - this.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(this.latitude)) *
            Math.cos(this.toRadians(otherLocation.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    };

    Location.prototype.toRadians = function (degrees) {
        return degrees * (Math.PI / 180);
    };

    Location.prototype.isWithinRadius = function (centerLat, centerLng, radiusKm) {
        const distance = this.calculateDistance({ latitude: centerLat, longitude: centerLng });
        return distance <= radiusKm;
    };

    Location.prototype.incrementPopularity = async function () {
        this.popularityScore += 1;
        await this.save({ fields: ['popularityScore'] });
    };

    Location.prototype.toJSON = function () {
        const location = { ...this.get() };
        // Convert coordinates to numbers for JSON response
        if (location.latitude) location.latitude = parseFloat(location.latitude);
        if (location.longitude) location.longitude = parseFloat(location.longitude);
        return location;
    };

    // Static methods
    Location.findByCoordinates = function (latitude, longitude, radiusKm = 1) {
        return Location.findAll({
            where: sequelize.literal(`
                ST_DWithin(
                    ST_MakePoint(longitude, latitude)::geography,
                    ST_MakePoint(${longitude}, ${latitude})::geography,
                    ${radiusKm * 1000}
                )
            `),
            order: [
                [sequelize.literal(`
                    ST_Distance(
                        ST_MakePoint(longitude, latitude)::geography,
                        ST_MakePoint(${longitude}, ${latitude})::geography
                    )
                `), 'ASC']
            ],
        });
    };

    Location.findByCity = function (city, state = null) {
        const where = { city, isActive: true };
        if (state) where.state = state;
        return Location.findAll({
            where,
            order: [['popularityScore', 'DESC'], ['name', 'ASC']],
        });
    };

    Location.findByType = function (type, city = null) {
        const where = { type, isActive: true };
        if (city) where.city = city;
        return Location.findAll({
            where,
            order: [['popularityScore', 'DESC'], ['name', 'ASC']],
        });
    };

    Location.searchByName = function (searchTerm, limit = 20) {
        return Location.findAll({
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
                                displayName: {
                                    [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`,
                                },
                            },
                            {
                                address: {
                                    [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%`,
                                },
                            },
                        ],
                    },
                ],
            },
            order: [
                ['popularityScore', 'DESC'],
                ['isVerified', 'DESC'],
                ['name', 'ASC'],
            ],
            limit,
        });
    };

    Location.getPopularLocations = function (city = null, limit = 10) {
        const where = { isActive: true };
        if (city) where.city = city;
        return Location.findAll({
            where,
            order: [['popularityScore', 'DESC'], ['name', 'ASC']],
            limit,
        });
    };

    Location.getVerifiedLocations = function (city = null) {
        const where = { isVerified: true, isActive: true };
        if (city) where.city = city;
        return Location.findAll({
            where,
            order: [['name', 'ASC']],
        });
    };

    // Association method
    Location.associate = (models) => {
        Location.belongsTo(models.User, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
        Location.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
        Location.belongsTo(models.User, {
            foreignKey: 'lastModifiedBy',
            as: 'lastModifier',
        });
        Location.hasMany(models.Landmark, {
            foreignKey: 'locationId',
            as: 'landmarks',
        });
        Location.hasMany(models.Route, {
            foreignKey: 'startLocationId',
            as: 'routesAsStart',
        });
        Location.hasMany(models.Route, {
            foreignKey: 'endLocationId',
            as: 'routesAsEnd',
        });
        Location.hasMany(models.RouteStep, {
            foreignKey: 'fromLocationId',
            as: 'stepsAsFrom',
        });
        Location.hasMany(models.RouteStep, {
            foreignKey: 'toLocationId',
            as: 'stepsAsTo',
        });
        Location.hasMany(models.VehicleAvailability, {
            foreignKey: 'locationId',
            as: 'vehicleAvailability',
        });
    };

    return Location;
};
