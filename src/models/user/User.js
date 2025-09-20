// models/User.js - Updated version with English only
const bcrypt = require('bcryptjs')

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
        'User',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: {
                        msg: 'Please provide a valid email address',
                    },
                },
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [2, 50],
                        msg: 'First name must be between 2 and 50 characters',
                    },
                    isAlpha: {
                        msg: 'First name must contain only letters',
                    },
                },
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [2, 50],
                        msg: 'Last name must be between 2 and 50 characters',
                    },
                    isAlpha: {
                        msg: 'Last name must contain only letters',
                    },
                },
            },
            phoneNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isValidNigerianPhone(value) {
                        const phoneRegex = /^(\+234|234|0)(70|80|81|90|91)[0-9]{8}$/
                        if (!phoneRegex.test(value)) {
                            throw new Error(
                                'Please provide a valid Nigerian phone number'
                            )
                        }
                    },
                },
            },
            googleId: {
                type: DataTypes.STRING,
                allowNull: true,
                unique: true,
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: true, // Nullable for Google OAuth users
                validate: {
                    len: {
                        args: [8, 128],
                        msg: 'Password must be between 8 and 128 characters',
                    },
                },
            },
            profilePicture: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isUrl: {
                        msg: 'Profile picture must be a valid URL',
                    },
                },
            },
            // Language preference - English only now
            preferredLanguage: {
                type: DataTypes.STRING,
                defaultValue: 'English',
                allowNull: false,
                validate: {
                    isIn: {
                        args: [['English']],
                        msg: 'Only English is supported',
                    },
                },
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            lastLoginAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            refreshToken: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            refreshTokenExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            passwordResetToken: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            passwordResetExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            // User reputation for crowdsourcing
            reputationScore: {
                type: DataTypes.INTEGER,
                defaultValue: 100,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Reputation score cannot be negative',
                    },
                },
            },
            totalContributions: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
                validate: {
                    min: {
                        args: 0,
                        msg: 'Total contributions cannot be negative',
                    },
                },
            },
        },
        {
            tableName: 'users',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['email'],
                },
                {
                    unique: true,
                    fields: ['phoneNumber'],
                },
                {
                    unique: true,
                    fields: ['googleId'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['reputationScore'],
                },
                {
                    fields: ['lastLoginAt'],
                },
            ],
            hooks: {
                // Hash password before creating user
                beforeCreate: async (user) => {
                    if (user.passwordHash) {
                        const salt = await bcrypt.genSalt(12)
                        user.passwordHash = await bcrypt.hash(
                            user.passwordHash,
                            salt
                        )
                    }
                },

                // Hash password before updating user
                beforeUpdate: async (user) => {
                    if (user.changed('passwordHash') && user.passwordHash) {
                        const salt = await bcrypt.genSalt(12)
                        user.passwordHash = await bcrypt.hash(
                            user.passwordHash,
                            salt
                        )
                    }
                },
            },
        }
    )

    // Associations
    User.associate = (models) => {
        User.hasMany(models.UserDevice, {
            foreignKey: 'userId',
            as: 'devices',
            onDelete: 'CASCADE',
        })
        
        User.hasMany(models.UserOTP, {
            foreignKey: 'userId',
            as: 'otps',
            onDelete: 'CASCADE',
        })
    }

    // Instance methods
    User.prototype.comparePassword = async function (candidatePassword) {
        if (!this.passwordHash) return false
        return bcrypt.compare(candidatePassword, this.passwordHash)
    }

    User.prototype.getFullName = function () {
        return `${this.firstName} ${this.lastName}`
    }

    User.prototype.toJSON = function () {
        const user = { ...this.get() }
        delete user.passwordHash
        delete user.refreshToken
        delete user.refreshTokenExpiresAt
        delete user.passwordResetToken
        delete user.passwordResetExpiresAt
        return user
    }

    // Update last login timestamp
    User.prototype.updateLastLogin = async function () {
        this.lastLoginAt = new Date()
        await this.save({ fields: ['lastLoginAt'] })
    }

    // Update reputation score
    User.prototype.updateReputation = async function (change) {
        this.reputationScore = Math.max(0, this.reputationScore + change)
        this.totalContributions += 1
        await this.save({ fields: ['reputationScore', 'totalContributions'] })
    }

    // Class methods
    User.findByEmail = function (email) {
        return User.findOne({ where: { email, isActive: true } })
    }

    User.findByGoogleId = function (googleId) {
        return User.findOne({ where: { googleId, isActive: true } })
    }

    User.findByPhoneNumber = function (phoneNumber) {
        return User.findOne({ where: { phoneNumber, isActive: true } })
    }

    // Get users by reputation (for leaderboard)
    User.getTopContributors = function (limit = 10) {
        return User.findAll({
            where: { isActive: true },
            order: [
                ['reputationScore', 'DESC'],
                ['totalContributions', 'DESC'],
            ],
            limit,
            attributes: [
                'id',
                'firstName',
                'lastName',
                'reputationScore',
                'totalContributions',
                'createdAt',
            ],
        })
    }

    return User
}
