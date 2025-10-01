//model/analytics/AppUsageAnalytics.js
const AppUsageAnalytics = (sequelize, DataTypes) => {
    const AppUsageAnalytics = sequelize.define(
        'AppUsageAnalytics',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            // API usage
            totalApiRequests: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            searchRequests: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            routeRequests: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            authRequests: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Feature usage
            locationSearches: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            routeCreations: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            directionShares: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            crowdsourceContributions: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Performance metrics
            avgResponseTime: {
                type: DataTypes.INTEGER, // in milliseconds
                defaultValue: 0,
                allowNull: false,
            },
            errorRate: {
                type: DataTypes.DECIMAL(5, 4),
                defaultValue: 0,
                allowNull: false,
            },
            uptime: {
                type: DataTypes.DECIMAL(5, 4),
                defaultValue: 1,
                allowNull: false,
            },
        },
        {
            tableName: 'app_usage_analytics',
            timestamps: true,
            indexes: [{ fields: ['date'] }, { unique: true, fields: ['date'] }],
        }
    )

    return AppUsageAnalytics
}
