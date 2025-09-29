// models/location/Landmark.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const Landmark = sequelize.define(
        'Landmark',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Landmark name cannot be empty',
                    },
                    len: {
                        args: [2, 255],
                        msg: 'Landmark name must be between 2 and 255 characters',
                    },
                },
            },
            alternativeNames: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Alternative names must be an array');
                        }
                    },
                },
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Category cannot be empty',
                    },
                    isIn: {
                        args: [[
                            'bank', 'hospital', 'school', 'market', 'church', 'mosque',
                            'government', 'hotel', 'restaurant', 'shopping_mall',
                            'fuel_station', 'monument', 'bridge', 'park', 'stadium'
                        ]],
                        msg: 'Invalid landmark category',
                    },
                },
            },
            isProminent: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            visibilityRadius: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    min: {
                        args: [10],
                        msg: 'Visibility radius must be at least 10 meters',
                    },
                    max: {
                        args: [5000],
                        msg: 'Visibility radius cannot exceed 5000 meters',
                    },
                },
            },
            directionsNote: {
                type: DataTypes.TEXT,
                allowNull: true,
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
            userRatings: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
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
                    model: 'users',
                    key: 'id',
                },
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: 'landmarks',
            timestamps: true,
            indexes: [
                {
                    fields: ['locationId'],
                },
                {
                    fields: ['category'],
                },
                {
                    fields: ['isProminent'],
                },
                {
                    fields: ['safetyRating'],
                },
                {
                    fields: ['isActive'],
                },
            ],
        }
    )

    // Instance methods
    Landmark.prototype.addUserRating = async function (userId, rating, comment = null) {
        if (!this.userRatings) this.userRatings = {};
        this.userRatings[userId] = {
            rating: parseFloat(rating),
            comment,
            ratedAt: new Date(),
        };
        
        // Recalculate average safety rating
        const ratings = Object.values(this.userRatings).map(r => r.rating);
        this.safetyRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        
        await this.save(['userRatings', 'safetyRating']);
    };

    Landmark.prototype.getAverageRating = function () {
        if (!this.userRatings || Object.keys(this.userRatings).length === 0) {
            return null;
        }
        const ratings = Object.values(this.userRatings).map(r => r.rating);
        return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    };

    Landmark.prototype.getAllNames = function () {
        return [this.name, ...this.alternativeNames];
    };

    // Static methods
    Landmark.findByCategory = function (category, locationId = null) {
        const where = { category, isActive: true };
        if (locationId) where.locationId = locationId;
        return Landmark.findAll({
            where,
            order: [['isProminent', 'DESC'], ['safetyRating', 'DESC'], ['name', 'ASC']],
        });
    };

    Landmark.findProminent = function (locationId = null) {
        const where = { isProminent: true, isActive: true };
        if (locationId) where.locationId = locationId;
        return Landmark.findAll({
            where,
            order: [['safetyRating', 'DESC'], ['name', 'ASC']],
        });
    };

    Landmark.searchByName = function (searchTerm, limit = 20) {
        return Landmark.findAll({
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
                                alternativeNames: {
                                    [sequelize.Sequelize.Op.contains]: [searchTerm],
                                },
                            },
                        ],
                    },
                ],
            },
            order: [
                ['isProminent', 'DESC'],
                ['safetyRating', 'DESC'],
                ['name', 'ASC'],
            ],
            limit,
        });
    };

    // Association method
    Landmark.associate = (models) => {
        Landmark.belongsTo(models.Location, {
            foreignKey: 'locationId',
            as: 'location',
        });
        Landmark.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
        Landmark.belongsTo(models.User, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
    };

    return Landmark;
};