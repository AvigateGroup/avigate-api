// models/transportation/TransportOperator.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const TransportOperator = sequelize.define(
        'TransportOperator',
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
                        msg: 'Operator name cannot be empty',
                    },
                    len: {
                        args: [2, 255],
                        msg: 'Operator name must be between 2 and 255 characters',
                    },
                },
            },
            operatorType: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [['bus_company', 'taxi_union', 'keke_association', 'okada_union', 'private_operator']],
                        msg: 'Invalid operator type',
                    },
                },
            },
            contactInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            serviceAreas: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            operatingHours: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            licenseNumber: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [3, 100],
                        msg: 'License number must be between 3 and 100 characters',
                    },
                },
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
                    model: 'admins',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'transport_operators',
            timestamps: true,
            indexes: [
                {
                    fields: ['operatorType'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['safetyRating'],
                },
            ],
        }
    )

    // Instance methods
    TransportOperator.prototype.getContactEmail = function () {
        return this.contactInfo.email || null;
    };

    TransportOperator.prototype.getContactPhone = function () {
        return this.contactInfo.phone || null;
    };

    TransportOperator.prototype.servesArea = function (city, state = null) {
        if (!this.serviceAreas.length) return true; // Serves all areas if none specified
        
        return this.serviceAreas.some(area => {
            if (state && area.state && area.state !== state) return false;
            return area.city === city || area.state === state;
        });
    };

    // Static methods
    TransportOperator.findByType = function (operatorType) {
        return TransportOperator.findAll({
            where: {
                operatorType,
                isActive: true,
            },
            order: [['isVerified', 'DESC'], ['safetyRating', 'DESC'], ['name', 'ASC']],
        });
    };

    TransportOperator.findByArea = function (city, state = null) {
        // This would require a more complex query in practice
        return TransportOperator.findAll({
            where: {
                isActive: true,
            },
            order: [['isVerified', 'DESC'], ['safetyRating', 'DESC']],
        });
    };

    // Association method
    TransportOperator.associate = (models) => {
        TransportOperator.belongsTo(models.Admin, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
        TransportOperator.hasMany(models.Vehicle, {
            foreignKey: 'operatorId',
            as: 'vehicles',
        });
    };

    return TransportOperator;
};