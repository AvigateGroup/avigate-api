const bcrypt = require('bcryptjs')
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const Admin = sequelize.define(
        'Admin',
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
                    isAuthorizedDomain(value) {
                        if (!value.toLowerCase().endsWith('@avigate.co')) {
                            throw new Error(
                                'Email must be from @avigate.co domain'
                            )
                        }
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
                    notEmpty: {
                        msg: 'First name cannot be empty',
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
                    notEmpty: {
                        msg: 'Last name cannot be empty',
                    },
                },
            },
            passwordHash: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [8, 128],
                        msg: 'Password must be between 8 and 128 characters',
                    },
                },
            },
            role: {
                type: DataTypes.ENUM(
                    'super_admin',
                    'admin',
                    'moderator',
                    'analyst'
                ),
                defaultValue: 'admin',
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            ['super_admin', 'admin', 'moderator', 'analyst'],
                        ],
                        msg: 'Invalid role specified',
                    },
                },
            },
            permissions: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidPermissions(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Permissions must be an array')
                        }
                        const validPermissions = Admin.getPermissionsList()
                        const invalidPerms = value.filter(
                            (p) => !validPermissions.includes(p)
                        )
                        if (invalidPerms.length > 0) {
                            throw new Error(
                                `Invalid permissions: ${invalidPerms.join(', ')}`
                            )
                        }
                    },
                },
            },
            // Status
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            // Password history for security
            passwordHistory: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
            },
            // Force password change
            mustChangePassword: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            passwordChangedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            // Audit trail
            createdBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            lastModifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'admins',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['email'],
                },
                {
                    fields: ['role'],
                },
                {
                    fields: ['isActive'],
                },
                {
                    fields: ['createdBy'],
                },
            ],
            hooks: {
                beforeCreate: async (admin) => {
                    if (admin.passwordHash) {
                        // Check password history (for new admins, just validate strength)
                        const {
                            adminSecurityUtils,
                        } = require('../../services/admin/adminSecurityService')
                        const validation =
                            adminSecurityUtils.validateAdminPassword(
                                admin.passwordHash
                            )
                        if (!validation.isValid) {
                            throw new Error(
                                `Password validation failed: ${validation.errors.join(', ')}`
                            )
                        }

                        const salt = await bcrypt.genSalt(12)
                        const hashedPassword = await bcrypt.hash(
                            admin.passwordHash,
                            salt
                        )

                        // Store in password history
                        admin.passwordHistory = [hashedPassword]
                        admin.passwordHash = hashedPassword
                        admin.passwordChangedAt = new Date()
                    }

                    // Set default permissions based on role
                    if (!admin.permissions || admin.permissions.length === 0) {
                        admin.permissions = Admin.getRolePermissions(admin.role)
                    }
                },
                beforeUpdate: async (admin) => {
                    if (admin.changed('passwordHash') && admin.passwordHash) {
                        // Validate password strength
                        const {
                            adminSecurityUtils,
                        } = require('../../services/admin/adminSecurityService')
                        const validation =
                            adminSecurityUtils.validateAdminPassword(
                                admin.passwordHash
                            )
                        if (!validation.isValid) {
                            throw new Error(
                                `Password validation failed: ${validation.errors.join(', ')}`
                            )
                        }

                        // Check against password history (prevent reuse of last 5 passwords)
                        const passwordHistory = admin.passwordHistory || []
                        for (const oldHash of passwordHistory) {
                            const isReused = await bcrypt.compare(
                                admin.passwordHash,
                                oldHash
                            )
                            if (isReused) {
                                throw new Error(
                                    'Cannot reuse a previous password'
                                )
                            }
                        }

                        const salt = await bcrypt.genSalt(12)
                        const hashedPassword = await bcrypt.hash(
                            admin.passwordHash,
                            salt
                        )

                        // Update password history (keep last 5)
                        const updatedHistory = [
                            hashedPassword,
                            ...passwordHistory,
                        ].slice(0, 5)
                        admin.passwordHistory = updatedHistory
                        admin.passwordHash = hashedPassword
                        admin.passwordChangedAt = new Date()
                        admin.mustChangePassword = false
                    }

                    // Update permissions when role changes
                    if (admin.changed('role')) {
                        admin.permissions = Admin.getRolePermissions(admin.role)
                    }
                },
            },
        }
    )

    return Admin
}
