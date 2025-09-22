// models/user/UserDevice.js
module.exports = (sequelize, DataTypes) => {
    const UserDevice = sequelize.define(
        'UserDevice',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            fcmToken: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [10, 2000],
                        msg: 'FCM token must be between 10 and 2000 characters',
                    },
                },
            },
            deviceFingerprint: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    len: {
                        args: [10, 255],
                        msg: 'Device fingerprint must be between 10 and 255 characters',
                    },
                },
            },
            deviceInfo: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            deviceType: {
                type: DataTypes.ENUM('mobile', 'tablet', 'desktop', 'unknown'),
                defaultValue: 'unknown',
                allowNull: false,
            },
            platform: {
                type: DataTypes.ENUM('ios', 'android', 'web', 'unknown'),
                defaultValue: 'unknown',
                allowNull: false,
            },
            appVersion: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },
            lastActiveAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
                allowNull: true,
            },
        },
        {
            tableName: 'user_devices',
            timestamps: true,
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['fcmToken'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['lastActiveAt'],
                },
                {
                    fields: ['platform'],
                },
                {
                    unique: true,
                    fields: ['userId', 'deviceFingerprint'],
                    name: 'user_device_unique_fingerprint'
                },
            ],
            hooks: {
                // Ensure default values are set before creation
                beforeCreate: async (userDevice) => {
                    if (!userDevice.lastActiveAt) {
                        userDevice.lastActiveAt = new Date();
                    }
                    if (userDevice.isActive === null || userDevice.isActive === undefined) {
                        userDevice.isActive = true;
                    }
                },
            },
        }
    )

    // Associations
    UserDevice.associate = (models) => {
        UserDevice.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    // Instance methods
    UserDevice.prototype.updateLastActive = async function () {
        this.lastActiveAt = new Date()
        await this.save({ fields: ['lastActiveAt'] })
    }

    UserDevice.prototype.deactivate = async function () {
        this.isActive = false
        await this.save({ fields: ['isActive'] })
    }

    UserDevice.prototype.updateFCMToken = async function (newToken) {
        this.fcmToken = newToken
        this.lastActiveAt = new Date()
        await this.save({ fields: ['fcmToken', 'lastActiveAt'] })
    }

    // Class methods
    UserDevice.findByUserAndFingerprint = function (userId, deviceFingerprint) {
        return UserDevice.findOne({
            where: {
                userId,
                deviceFingerprint,
                isActive: true,
            },
        })
    }

    UserDevice.findActiveDevicesForUser = function (userId) {
        return UserDevice.findAll({
            where: {
                userId,
                isActive: true,
            },
            order: [['lastActiveAt', 'DESC']],
        })
    }

    UserDevice.cleanupInactiveDevices = async function (daysInactive = 90) {
        const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000)
        const deletedCount = await UserDevice.destroy({
            where: {
                lastActiveAt: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate,
                },
                isActive: false,
            },
        })
        return deletedCount
    }

    return UserDevice
}