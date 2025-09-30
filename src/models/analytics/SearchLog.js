// models/analytics/SearchLog.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const SearchLog = sequelize.define(
        'SearchLog',
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
            searchQuery: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Search query cannot be empty',
                    },
                    len: {
                        args: [1, 1000],
                        msg: 'Search query must be between 1 and 1000 characters',
                    },
                },
            },
            searchType: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [[
                            'location_search',
                            'route_planning',
                            'fare_search',
                            'transport_search',
                            'general_search'
                        ]],
                        msg: 'Invalid search type',
                    },
                },
            },
            searchFilters: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            searchContext: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 100],
                        msg: 'Search context must be less than 100 characters',
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
            resultsCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Results count cannot be negative',
                    },
                },
            },
            resultIds: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Result IDs must be an array');
                        }
                    },
                },
            },
            selectedResultId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            selectedResultRank: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Selected result rank must be positive',
                    },
                },
            },
            responseTimeMs: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Response time cannot be negative',
                    },
                },
            },
            wasSuccessful: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            errorMessage: {
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
            tableName: 'search_logs',
            timestamps: true,
            updatedAt: false, // Search logs are immutable after creation
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['sessionId'],
                },
                {
                    fields: ['searchType'],
                },
                {
                    fields: ['wasSuccessful'],
                },
                {
                    fields: ['resultsCount'],
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
            ],
        }
    )

    // Instance methods
    SearchLog.prototype.hadResults = function () {
        return this.resultsCount > 0;
    };

    SearchLog.prototype.userSelectedResult = function () {
        return this.selectedResultId !== null;
    };

    SearchLog.prototype.getClickThroughRate = function () {
        if (this.resultsCount === 0) return 0;
        return this.selectedResultId ? 1 : 0;
    };

    SearchLog.prototype.isSlowSearch = function (thresholdMs = 2000) {
        return this.responseTimeMs && this.responseTimeMs > thresholdMs;
    };

    // Static methods
    SearchLog.findByUser = function (userId, limit = 50) {
        return SearchLog.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    SearchLog.findByType = function (searchType, days = 7, limit = 100) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return SearchLog.findAll({
            where: {
                searchType,
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    SearchLog.getPopularSearches = async function (days = 7, limit = 20) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return SearchLog.findAll({
            where: {
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
                wasSuccessful: true,
            },
            attributes: [
                'searchQuery',
                [sequelize.fn('COUNT', sequelize.col('id')), 'searchCount'],
                [sequelize.fn('AVG', sequelize.col('resultsCount')), 'averageResults'],
            ],
            group: ['searchQuery'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit,
            raw: true,
        });
    };

    SearchLog.getSearchAnalytics = async function (days = 30) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const analytics = await SearchLog.findOne({
            where: {
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSearches'],
                [sequelize.fn('AVG', sequelize.col('resultsCount')), 'averageResultsCount'],
                [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'averageResponseTime'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "wasSuccessful" = true THEN 1 END')), 'successfulSearches'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "selectedResultId" IS NOT NULL THEN 1 END')), 'searchesWithSelection'],
            ],
            raw: true,
        });

        return analytics;
    };

    SearchLog.getFailedSearches = function (days = 7, limit = 50) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        return SearchLog.findAll({
            where: {
                wasSuccessful: false,
                createdAt: { [sequelize.Sequelize.Op.gte]: cutoffDate },
            },
            order: [['createdAt', 'DESC']],
            limit,
        });
    };

    // Association method
    SearchLog.associate = (models) => {
        SearchLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
    };

    return SearchLog;
};