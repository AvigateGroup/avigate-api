// models/community/CommunityPost.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const CommunityPost = sequelize.define(
        'CommunityPost',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            authorId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            type: {
                type: DataTypes.ENUM(
                    'traffic_update', 'route_closure', 'safety_alert', 'fare_update',
                    'new_route', 'general_info', 'community_event', 'transport_strike'
                ),
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Title cannot be empty',
                    },
                    len: {
                        args: [5, 255],
                        msg: 'Title must be between 5 and 255 characters',
                    },
                },
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Content cannot be empty',
                    },
                    len: {
                        args: [10, 5000],
                        msg: 'Content must be between 10 and 5000 characters',
                    },
                },
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
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
            affectedAreas: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            isUrgent: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            verifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            verifiedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            upvotes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Upvotes cannot be negative',
                    },
                },
            },
            downvotes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Downvotes cannot be negative',
                    },
                },
            },
            reportCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Report count cannot be negative',
                    },
                },
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isFeatured: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            viewCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'View count cannot be negative',
                    },
                },
            },
            commentCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Comment count cannot be negative',
                    },
                },
            },
            tags: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            attachments: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            moderationNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            lastInteractionAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'community_posts',
            timestamps: true,
            indexes: [
                {
                    fields: ['authorId'],
                },
                {
                    fields: ['type'],
                },
                {
                    fields: ['locationId'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['isUrgent'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['isFeatured'],
                },
                {
                    fields: ['expiresAt'],
                },
                {
                    fields: ['lastInteractionAt'],
                },
                {
                    fields: ['upvotes'],
                },
            ],
        }
    )

    // Instance methods
    CommunityPost.prototype.incrementView = async function () {
        this.viewCount += 1;
        this.lastInteractionAt = new Date();
        await this.save({ fields: ['viewCount', 'lastInteractionAt'] });
    };

    CommunityPost.prototype.addUpvote = async function () {
        this.upvotes += 1;
        this.lastInteractionAt = new Date();
        await this.save({ fields: ['upvotes', 'lastInteractionAt'] });
    };

    CommunityPost.prototype.addDownvote = async function () {
        this.downvotes += 1;
        this.lastInteractionAt = new Date();
        await this.save({ fields: ['downvotes', 'lastInteractionAt'] });
    };

    CommunityPost.prototype.addReport = async function () {
        this.reportCount += 1;
        this.lastInteractionAt = new Date();
        await this.save({ fields: ['reportCount', 'lastInteractionAt'] });
        
        // Auto-disable if too many reports
        if (this.reportCount >= 5 && this.isActive) {
            this.isActive = false;
            await this.save({ fields: ['isActive'] });
        }
    };

    CommunityPost.prototype.getScore = function () {
        return this.upvotes - this.downvotes;
    };

    CommunityPost.prototype.isExpired = function () {
        return this.expiresAt && this.expiresAt <= new Date();
    };

    CommunityPost.prototype.isVisible = function () {
        return this.isActive && !this.isExpired();
    };

    // Static methods
    CommunityPost.findByType = function (type, limit = 20) {
        return CommunityPost.findAll({
            where: {
                type,
                isActive: true,
                [sequelize.Sequelize.Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() } },
                ],
            },
            order: [
                ['isUrgent', 'DESC'],
                ['isFeatured', 'DESC'],
                ['lastInteractionAt', 'DESC'],
            ],
            limit,
        });
    };

    CommunityPost.findByLocation = function (locationId, limit = 20) {
        return CommunityPost.findAll({
            where: {
                locationId,
                isActive: true,
            },
            order: [['lastInteractionAt', 'DESC']],
            limit,
        });
    };

    CommunityPost.findUrgent = function (limit = 10) {
        return CommunityPost.findAll({
            where: {
                isUrgent: true,
                isActive: true,
                [sequelize.Sequelize.Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() } },
                ],
            },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    CommunityPost.findTrending = function (limit = 10) {
        return CommunityPost.findAll({
            where: {
                isActive: true,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
            order: [
                [sequelize.literal('(upvotes - downvotes + view_count / 10)'), 'DESC'],
                ['lastInteractionAt', 'DESC'],
            ],
            limit,
        });
    };

    // Association method
    CommunityPost.associate = (models) => {
        CommunityPost.belongsTo(models.User, {
            foreignKey: 'authorId',
            as: 'author',
        });
        CommunityPost.belongsTo(models.Location, {
            foreignKey: 'locationId',
            as: 'location',
        });
        CommunityPost.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        CommunityPost.belongsTo(models.Admin, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
    };

    return CommunityPost;
};