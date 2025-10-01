//models/analytics/SystemMetrics.js

// System Metrics Model
const SystemMetrics = (sequelize, DataTypes) => {
    const SystemMetrics = sequelize.define(
        'SystemMetrics',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            // Database metrics
            dbConnections: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            dbQueryTime: {
                type: DataTypes.INTEGER, // in milliseconds
                allowNull: false,
            },
            dbSize: {
                type: DataTypes.BIGINT, // in bytes
                allowNull: false,
            },
            // Redis metrics
            redisMemoryUsage: {
                type: DataTypes.BIGINT, // in bytes
                allowNull: true,
            },
            redisConnections: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            // Server metrics
            cpuUsage: {
                type: DataTypes.DECIMAL(5, 2), // percentage
                allowNull: false,
            },
            memoryUsage: {
                type: DataTypes.BIGINT, // in bytes
                allowNull: false,
            },
            diskUsage: {
                type: DataTypes.BIGINT, // in bytes
                allowNull: false,
            },
            // Application metrics
            activeConnections: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            requestsPerMinute: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            errorsPerMinute: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            tableName: 'system_metrics',
            timestamps: true,
            indexes: [{ fields: ['timestamp'] }],
        }
    )

    return SystemMetrics
}