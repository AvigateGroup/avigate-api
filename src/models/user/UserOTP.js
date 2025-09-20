// models/UserOTP.js
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
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [4, 10],
                        msg: 'OTP code must be between 4 and 10 characters',
                    },
                    isAlphanumeric: {
                        msg: 'OTP code must contain only letters and numbers',
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
                    isAfter: {
                        args: new Date().toISOString(),
                        msg: 'Expiry date must be in the future',
                    },
                },
            },
            isUsed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            usedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Attempts cannot be negative',
                    },
                    max: {
                        args: 10,
                        msg: 'Maximum 10 attempts allowed',
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
            // Additional metadata for context
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
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
                beforeUpdate: (otp) => {
                    if (otp.changed('isUsed') && otp.isUsed && !otp.usedAt) {
                        otp.usedAt = new Date()
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
    UserOTP.prototype.incrementAttempt = async function () {
        this.attempts += 1
        await this.save({ fields: ['attempts'] })
    }

    UserOTP.prototype.markAsUsed = async function () {
        this.isUsed = true
        this.usedAt = new Date()
        await this.save({ fields: ['isUsed', 'usedAt'] })
    }

    UserOTP.prototype.isExpired = function () {
        return new Date() > this.expiresAt
    }

    UserOTP.prototype.isValid = function () {
        return !this.isUsed && !this.isExpired() && this.attempts < 5
    }

    // Class methods
    UserOTP.findValidOTP = function (userId, otpCode, otpType) {
        return UserOTP.findOne({
            where: {
                userId,
                otpCode,
                otpType,
                isUsed: false,
                expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() },
                attempts: { [sequelize.Sequelize.Op.lt]: 5 },
            },
        })
    }

    UserOTP.invalidateUserOTPs = async function (userId, otpType) {
        await UserOTP.update(
            { isUsed: true },
            {
                where: {
                    userId,
                    otpType,
                    isUsed: false,
                },
            }
        )
    }

    UserOTP.cleanupExpiredOTPs = async function () {
        const deletedCount = await UserOTP.destroy({
            where: {
                expiresAt: { [sequelize.Sequelize.Op.lt]: new Date() },
            },
        })
        return deletedCount
    }

    UserOTP.getRecentAttempts = function (userId, otpType, minutes = 5) {
        const timeThreshold = new Date()
        timeThreshold.setMinutes(timeThreshold.getMinutes() - minutes)

        return UserOTP.count({
            where: {
                userId,
                otpType,
                createdAt: { [sequelize.Sequelize.Op.gte]: timeThreshold },
            },
        })
    }

    return UserOTP
}