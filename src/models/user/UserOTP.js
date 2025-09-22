// models/user/UserOTP.js 
module.exports = (sequelize, DataTypes) => {
    const UserOTP = sequelize.define(
        'UserOTP',
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
            otpCode: {
                type: DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    len: {
                        args: [4, 10],
                        msg: 'OTP code must be between 4 and 10 characters',
                    },
                },
            },
            otpType: {
                type: DataTypes.ENUM(
                    'email_verification',
                    'login_verification',
                    'password_reset',
                    'phone_verification'
                ),
                allowNull: false,
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: 'Expires at must be a valid date',
                    },
                    isAfterNow(value) {
                        if (value <= new Date()) {
                            throw new Error('Expiration date must be in the future');
                        }
                    },
                },
            },
            isUsed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            usedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            // ✅ ADD the missing attempts field with proper validation
            attempts: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Attempts cannot be negative',
                    },
                    max: {
                        args: [10],
                        msg: 'Maximum 10 attempts allowed',
                    },
                },
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
                allowNull: true,
            },
        },
        {
            tableName: 'user_otps',
            timestamps: true,
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['otpCode'],
                },
                {
                    fields: ['otpType'],
                },
                {
                    fields: ['expiresAt'],
                },
                {
                    fields: ['isUsed'],
                },
                {
                    fields: ['createdAt'],
                },
            ],
            hooks: {
                // Ensure default values are set before creation
                beforeCreate: async (userOTP) => {
                    if (userOTP.attempts === null || userOTP.attempts === undefined) {
                        userOTP.attempts = 0;
                    }
                    if (userOTP.isUsed === null || userOTP.isUsed === undefined) {
                        userOTP.isUsed = false;
                    }
                },
            },
        }
    )

    // Associations
    UserOTP.associate = (models) => {
        UserOTP.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
            onDelete: 'CASCADE',
        })
    }

    // Instance methods
    UserOTP.prototype.isExpired = function () {
        return new Date() > this.expiresAt
    }

    UserOTP.prototype.markAsUsed = async function () {
        this.isUsed = true
        this.usedAt = new Date()
        await this.save({ fields: ['isUsed', 'usedAt'] })
    }

    UserOTP.prototype.incrementAttempts = async function () {
        this.attempts = (this.attempts || 0) + 1
        await this.save({ fields: ['attempts'] })
    }

    // Class methods
    UserOTP.findValidOTP = function (userId, otpCode, otpType) {
        return UserOTP.findOne({
            where: {
                userId,
                otpCode,
                otpType,
                isUsed: false,
                expiresAt: {
                    [sequelize.Sequelize.Op.gt]: new Date(),
                },
            },
        })
    }

    UserOTP.getRecentAttempts = async function (userId, otpType, minutesAgo = 5) {
        const since = new Date(Date.now() - minutesAgo * 60 * 1000)
        const count = await UserOTP.count({
            where: {
                userId,
                otpType,
                createdAt: {
                    [sequelize.Sequelize.Op.gte]: since,
                },
            },
        })
        return count
    }

    UserOTP.cleanupExpired = async function () {
        const deletedCount = await UserOTP.destroy({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    {
                        expiresAt: {
                            [sequelize.Sequelize.Op.lt]: new Date(),
                        },
                    },
                    {
                        isUsed: true,
                        createdAt: {
                            [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                        },
                    },
                ],
            },
        })
        return deletedCount
    }

    return UserOTP
}