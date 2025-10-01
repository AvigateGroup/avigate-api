//Models/analytics/GeographicAnalytics.js

// Geographic Analytics Model
const GeographicAnalytics = (sequelize, DataTypes) => {
    const GeographicAnalytics = sequelize.define(
        'GeographicAnalytics',
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
            state: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            city: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            // User metrics by location
            activeUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            newUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Usage metrics by location
            searchCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            routeCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Popular vehicle types by location
            busUsage: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            taxiUsage: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            kekeUsage: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            okadaUsage: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            trainUsage: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
        },
        {
            tableName: 'geographic_analytics',
            timestamps: true,
            indexes: [
                { fields: ['date'] },
                { fields: ['state'] },
                { fields: ['city'] },
                { fields: ['date', 'state'] },
            ],
        }
    )

    return GeographicAnalytics
}
