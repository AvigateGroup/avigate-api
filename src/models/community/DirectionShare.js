// models/community/DirectionShare.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const DirectionShare = sequelize.define(
        'DirectionShare',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            shareId: {
                type: DataTypes.STRING(32),
                allowNull: false,
                unique: true,
                validate: {
                    len: {
                        args: [8, 32],
                        msg: 'Share ID must be between 8 and 32 characters',
                    },
                },
            },
            createdBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    len: {
                        args: [3, 255],
                        msg: 'Title must be between 3 and 255 characters',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            startLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            endLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            startLat: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: true,
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
            startLng: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: true,
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
            endLat: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: true,
            },
            endLng: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: true,
            },
            startAddress: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            endAddress: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            customInstructions: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            preferredTransportModes: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Preferred transport modes must be an array');
                        }
                        const validModes = ['bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'];
                        const invalidModes = value.filter(mode => !validModes.includes(mode));
                        if (invalidModes.length > 0) {
                            throw new Error(`Invalid transport modes: ${invalidModes.join(', ')}`);
                        }
                    },
                },
            },
            routeOptions: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            isPublic: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            allowedUsers: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            accessCode: {
                type: DataTypes.STRING(10),
                allowNull: true,
                validate: {
                    len: {
                        args: [4, 10],
                        msg: 'Access code must be between 4 and 10 characters',
                    },
                },
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            maxUses: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Maximum uses must be at least 1',
                    },
                },
            },
            currentUses: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Current uses cannot be negative',
                    },
                },
            },
            status: {
                type: DataTypes.ENUM('active', 'expired', 'disabled', 'reported'),
                allowNull: false,
                defaultValue: 'active',
            },
            shareUrl: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            qrCodeUrl: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            cityRestriction: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            lastAccessedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            lastAccessedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            accessLog: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
        },
        {
            tableName: 'direction_shares',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['shareId'],
                },
                {
                    fields: ['createdBy'],
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['isPublic'],
                },
                {
                    fields: ['expiresAt'],
                },
                {
                    fields: ['cityRestriction'],
                },
                {
                    fields: ['startLocationId'],
                },
                {
                    fields: ['endLocationId'],
                },
            ],
            hooks: {
                beforeValidate: (share) => {
                    // Generate shareId if not provided
                    if (!share.shareId) {
                        share.shareId = require('crypto')
                            .randomBytes(16)
                            .toString('hex');
                    }
                },
                beforeSave: (share) => {
                    // Update status if expired
                    if (share.expiresAt && share.expiresAt <= new Date() && share.status === 'active') {
                        share.status = 'expired';
                    }
                    // Update status if max uses reached
                    if (share.maxUses && share.currentUses >= share.maxUses && share.status === 'active') {
                        share.status = 'expired';
                    }
                },
            },
        }
    )

    // Instance methods
    DirectionShare.prototype.canAccess = function (userId = null) {
        if (this.status !== 'active') return false;
        if (this.expiresAt && this.expiresAt <= new Date()) return false;
        if (this.maxUses && this.currentUses >= this.maxUses) return false;
        
        if (!this.isPublic) {
            if (!userId) return false;
            if (this.createdBy === userId) return true;
            if (this.allowedUsers.includes(userId)) return true;
            return false;
        }
        
        return true;
    };

    DirectionShare.prototype.incrementUsage = async function (userId = null) {
        if (!this.canAccess(userId)) return false;
        
        this.currentUses += 1;
        this.lastAccessedAt = new Date();
        if (userId) this.lastAccessedBy = userId;
        
        // Add to access log
        this.accessLog.push({
            userId,
            accessedAt: new Date(),
            ipAddress: null, // Should be set by the calling code
        });
        
        // Keep only last 100 access records
        if (this.accessLog.length > 100) {
            this.accessLog = this.accessLog.slice(-100);
        }
        
        await this.save();
        return true;
    };

    DirectionShare.prototype.isExpired = function () {
        return this.status === 'expired' || 
               (this.expiresAt && this.expiresAt <= new Date()) ||
               (this.maxUses && this.currentUses >= this.maxUses);
    };

    DirectionShare.prototype.getShareUrl = function (baseUrl = 'https://avigate.co') {
        return `${baseUrl}/directions/${this.shareId}`;
    };

    DirectionShare.prototype.hasCoordinates = function () {
        return this.startLat && this.startLng && this.endLat && this.endLng;
    };

    // Static methods
    DirectionShare.findByShareId = function (shareId) {
        return DirectionShare.findOne({
            where: { shareId },
            include: [
                { model: sequelize.models.User, as: 'creator' },
                { model: sequelize.models.Location, as: 'startLocation' },
                { model: sequelize.models.Location, as: 'endLocation' },
            ],
        });
    };

    DirectionShare.findByUser = function (userId, includeExpired = false) {
        const where = { createdBy: userId };
        if (!includeExpired) {
            where.status = 'active';
        }
        
        return DirectionShare.findAll({
            where,
            order: [['createdAt', 'DESC']],
        });
    };

    DirectionShare.findPublic = function (city = null, limit = 20) {
        const where = { isPublic: true, status: 'active' };
        if (city) where.cityRestriction = city;
        
        return DirectionShare.findAll({
            where,
            order: [['currentUses', 'DESC'], ['createdAt', 'DESC']],
            limit,
        });
    };

    DirectionShare.cleanupExpired = async function () {
        const result = await DirectionShare.update(
            { status: 'expired' },
            {
                where: {
                    status: 'active',
                    [sequelize.Sequelize.Op.or]: [
                        {
                            expiresAt: {
                                [sequelize.Sequelize.Op.lt]: new Date(),
                            },
                        },
                        sequelize.where(
                            sequelize.col('currentUses'),
                            '>=',
                            sequelize.col('maxUses')
                        ),
                    ],
                },
            }
        );
        return result[0];
    };

    // Association method
    DirectionShare.associate = (models) => {
        DirectionShare.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
        DirectionShare.belongsTo(models.Location, {
            foreignKey: 'startLocationId',
            as: 'startLocation',
        });
        DirectionShare.belongsTo(models.Location, {
            foreignKey: 'endLocationId',
            as: 'endLocation',
        });
        DirectionShare.belongsTo(models.User, {
            foreignKey: 'lastAccessedBy',
            as: 'lastAccessor',
        });
    };

    return DirectionShare;
};