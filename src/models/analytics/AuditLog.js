//models/analytics/AuditLog.js

// Audit Log Model
const AuditLog = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define(
        'AuditLog',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            // Who performed the action
            adminId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            // What action was performed
            action: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            resource: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            resourceId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            // Action details
            changes: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            oldValues: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            newValues: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            // Request context
            ipAddress: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            userAgent: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            method: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            endpoint: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            // Metadata
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            severity: {
                type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
                defaultValue: 'low',
                allowNull: false,
            },
        },
        {
            tableName: 'audit_logs',
            timestamps: true,
            indexes: [
                { fields: ['adminId'] },
                { fields: ['userId'] },
                { fields: ['action'] },
                { fields: ['resource'] },
                { fields: ['createdAt'] },
                { fields: ['severity'] },
            ],
        }
    )

    return AuditLog
}