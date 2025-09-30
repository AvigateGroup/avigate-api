// models/analytics/UserInteraction.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const UserInteraction = sequelize.define(
        'UserInteraction',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            sessionId: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 100],
                        msg: 'Session ID must be between 1 and 100 characters',
                    },
                },
            },
            interactionType: {
                type: DataTypes.ENUM(
                    'search', 'route_view', 'direction_request', 'fare_report', 'safety_report',
                    'share_link_click', 'app_open', 'location_select', 'filter_use',
                    'route_planning', 'geocoding', 'reverse_geocoding', 'location_search',
                    'popular_routes_view', 'route_alternatives', 'direction_share_create',
                    'direction_share_access', 'direction_share_update', 'direction_share_delete',
                    'community_feed_view', 'community_post_create', 'community_post_view',
                    'community_post_vote', 'community_post_report', 'safety_report_create',
                    'safety_reports_view', 'safety_report_vote', 'route_contribution_submit',
                    'user_feedback_submit', 'fare_feedback_submit', 'fare_info_view',
                    'fare_comparison', 'fare_feedback_dispute'
                ),
                allowNull: false,
            },
            resourceId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            resourceType: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [[
                            'route', 'location', 'direction_share', 'community_post',
                            'safety_report', 'route_contribution', 'user_feedback',
                            'fare_feedback', 'address', 'coordinates'
                        ]],
                        msg: 'Invalid resource type',
                    },
                },
            },
            interactionData: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            screenName: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 100],
                        msg: 'Screen name must be less than 100 characters',
                    },
                },
            },
            actionTaken: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 100],
                        msg: 'Action taken must be less than 100 characters',
                    },
                },
            },
            userLat: {
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
            userLng: {
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
            duration: {
                type: DataTypes.INTEGER, // in milliseconds
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Duration cannot be negative',
                    },
                },
            },
            wasSuccessful: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            errorDetails: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            deviceInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            appVersion: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 20],
                        msg: 'App version must be less than 20 characters',
                    },
                },
            },
            networkType: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [['wifi', '4g', '5g', '3g', '2g', 'offline', 'unknown']],
                        msg: 'Invalid network type',
                    },
                },
            },
            batteryLevel: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Battery level must be between 0 and 100',
                    },
                    max: {
                        args: [100],
                        msg: 'Battery level must be between 0 and 100',
                    },
                },
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
                validate: {
                    isIP: {
                        msg: 'Invalid IP address format',
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
            tableName: 'user_interactions',
            timestamps: true,
            updatedAt: false, // Interaction logs are immutable after creation
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['sessionId'],
                },
                {
                    fields: ['interactionType'],
                },
                {
                    fields: ['resourceId', 'resourceType'],
                },
                {
                    fields: ['screenName'],
                },
                {
                    fields: ['wasSuccessful'],
                },
                {
                    fields: ['createdAt'],
                },
                {
                    fields: ['userLat', 'userLng'],
                },
                {
                    fields: ['userId', 'createdAt'],
                },
                {
                    fields: ['sessionId', 'createdAt'],
                },
            ],
        }
    )

    // Instance methods
    UserInteraction.prototype.getDurationInSeconds = function () {
        if (!this.duration) return null;
        return (this.duration / 1000).toFixed(2);
    };

    UserInteraction.prototype.hasLocation = function () {
        return this.userLat !== null && this.userLng !== null;
    };

    UserInteraction.prototype.isResourceInteraction = function () {
        return this.resourceId !== null && this.resourceType !== null;
    };

    UserInteraction.prototype.hadError = function () {
        return !this.wasSuccessful && this.errorDetails !== null;
    };

    // Static methods
    UserInteraction.findByUser = function (userId, limit = 100) {
        return UserInteraction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    UserInteraction.findBySession = function (sessionId) {
        return UserInteraction.findAll({
            where: { sessionId },
            order: [['createdAt', 'ASC']],
        });
    };

    UserInteraction.findByType = function (interactionType, days = 7, limit = 100) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return UserInteraction.findAll({
            where: {
                interactionType,
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    UserInteraction.getInteractionStats = async function (days = 30) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const stats = await UserInteraction.findOne({
            where: {
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalInteractions'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'uniqueUsers'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionId'))), 'uniqueSessions'],
                [sequelize.fn('AVG', sequelize.col('duration')), 'averageDuration'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "wasSuccessful" = true THEN 1 END')), 'successfulInteractions'],
            ],
            raw: true,
        });

        return stats;
    };

    UserInteraction.getPopularInteractions = async function (days = 7, limit = 20) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return UserInteraction.findAll({
            where: {
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            attributes: [
                'interactionType',
                [sequelize.fn('COUNT', sequelize.col('id')), 'interactionCount'],
                [sequelize.fn('AVG', sequelize.col('duration')), 'averageDuration'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "wasSuccessful" = true THEN 1 END')), 'successCount'],
            ],
            group: ['interactionType'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit,
            raw: true,
        });
    };

    UserInteraction.getUserJourney = async function (userId, sessionId = null) {
        const where = { userId };
        if (sessionId) where.sessionId = sessionId;

        return UserInteraction.findAll({
            where,
            order: [['createdAt', 'ASC']],
            attributes: [
                'id',
                'interactionType',
                'resourceType',
                'resourceId',
                'screenName',
                'actionTaken',
                'duration',
                'wasSuccessful',
                'createdAt',
            ],
        });
    };

    UserInteraction.getFailedInteractions = function (days = 7, limit = 50) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return UserInteraction.findAll({
            where: {
                wasSuccessful: false,
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    // Association method
    UserInteraction.associate = (models) => {
        UserInteraction.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
    };

    return UserInteraction;
};