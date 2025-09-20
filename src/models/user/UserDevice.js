// models/UserDevice.js
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
                        args: [1, 500],
                        msg: 'FCM token must be between 1 and 500 characters',
                    },
                },
            },
            deviceFingerprint: {
                type: DataTypes.STRING,
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
                validate: {
                    len: {
                        args: [1, 1000],
                        msg: 'Device info must be less than 1000 characters',
                    },
                },
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
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 20],
                        msg: 'App version must be less than 20 characters',
                    },
                },
            },
            ipAddress: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isIP: {
                        msg: 'Must be a valid IP address',
                    },
                },
            },
            lastActiveAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            // Metadata for additional device information
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
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
                    unique: true,
                    fields: ['userId', 'deviceFingerprint'],
                    name: 'unique_user_device',
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
            ],
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

    UserDevice.prototype.toJSON = function () {
        const device = { ...this.get() }
        // Don't expose sensitive information
        delete device.fcmToken
        return device
    }

    // Class methods
    UserDevice.findActiveByUser = function (userId) {
        return UserDevice.findAll({
            where: { userId, isActive: true },
            order: [['lastActiveAt', 'DESC']],
        })
    }

    UserDevice.findByFCMToken = function (fcmToken) {
        return UserDevice.findOne({
            where: { fcmToken, isActive: true },
        })
    }

    UserDevice.deactivateOldDevices = async function (userId, keepDays = 30) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - keepDays)

        await UserDevice.update(
            { isActive: false },
            {
                where: {
                    userId,
                    lastActiveAt: { [sequelize.Sequelize.Op.lt]: cutoffDate },
                    isActive: true,
                },
            }
        )
    }

    return UserDevice
}

