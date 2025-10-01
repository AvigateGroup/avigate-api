//models/analytics/UserAnalytics.js
const UserAnalytics = (sequelize, DataTypes) => {
    const UserAnalytics = sequelize.define(
        'UserAnalytics',
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
            // User metrics
            totalUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            newUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            activeUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            verifiedUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Engagement metrics
            dailyActiveUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            weeklyActiveUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            monthlyActiveUsers: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            // Retention metrics
            dayOneRetention: {
                type: DataTypes.DECIMAL(5, 4),
                defaultValue: 0,
                allowNull: false,
            },
            daySevenRetention: {
                type: DataTypes.DECIMAL(5, 4),
                defaultValue: 0,
                allowNull: false,
            },
            dayThirtyRetention: {
                type: DataTypes.DECIMAL(5, 4),
                defaultValue: 0,
                allowNull: false,
            },
            // User behavior
            avgSessionDuration: {
                type: DataTypes.INTEGER, // in minutes
                defaultValue: 0,
                allowNull: false,
            },
            avgSearchesPerUser: {
                type: DataTypes.DECIMAL(8, 2),
                defaultValue: 0,
                allowNull: false,
            },
            avgRoutesPerUser: {
                type: DataTypes.DECIMAL(8, 2),
                defaultValue: 0,
                allowNull: false,
            },
        },
        {
            tableName: 'user_analytics',
            timestamps: true,
            indexes: [{ fields: ['date'] }, { unique: true, fields: ['date'] }],
        }
    )

    return UserAnalytics
}