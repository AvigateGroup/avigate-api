const { Admin, AuditLog } = require('../../models')
const {
    generateAdminInviteToken,
    verifyAdminInviteToken,
    adminSessionManager,
    adminSecurityUtils,
} = require('../../services/admin')
const { sendAdminInvitationEmail } = require('../../services/email/adminZeptomailService')
const { logger } = require('../../utils/logger')
const { Op } = require('sequelize')

// Email domain validation
const ALLOWED_EMAIL_DOMAIN = '@avigate.co'
const validateEmailDomain = (email) => {
    return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase())
}

const managementController = {
    // Create Admin (Super Admin Only)
    createAdmin: async (req, res) => {
        try {
            const currentAdmin = req.admin
            const { email, firstName, lastName, role = 'admin' } = req.body

            // Only super admins can create admins
            if (currentAdmin.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only super administrators can create admin accounts',
                })
            }

            // Validate email domain
            if (!validateEmailDomain(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email must be from @avigate.co domain',
                })
            }

            // Check if admin already exists
            const existingAdmin = await Admin.findOne({ where: { email } })
            if (existingAdmin) {
                return res.status(409).json({
                    success: false,
                    message: 'Admin with this email already exists',
                })
            }

            // Validate role
            const validRoles = ['admin', 'moderator', 'analyst']
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified',
                })
            }

            // Generate secure temporary password
            const tempPassword = adminSecurityUtils.generateSecurePassword(16)

            // Get default permissions for role
            const permissions = Admin.getRolePermissions(role)

            // Create admin
            const newAdmin = await Admin.create({
                email,
                firstName,
                lastName,
                passwordHash: tempPassword, // Will be hashed in the beforeCreate hook
                role,
                permissions,
                isActive: true,
                createdBy: currentAdmin.id,
                lastModifiedBy: currentAdmin.id,
            })

            // Generate invitation token
            const inviteToken = generateAdminInviteToken(
                email,
                role,
                currentAdmin.id
            )

            // Send invitation email (you'll need to implement this)
            await sendAdminInvitationEmail(
                email,
                firstName,
                tempPassword,
                inviteToken
            )

            // Log admin creation
            await AuditLog.create({
                adminId: currentAdmin.id,
                action: 'create_admin',
                resource: 'admin',
                resourceId: newAdmin.id,
                metadata: {
                    newAdminEmail: email,
                    role,
                    permissions: permissions.length,
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            logger.info(`Admin created: ${email} by ${currentAdmin.email}`)

            res.status(201).json({
                success: true,
                message: 'Admin created successfully. Invitation email sent.',
                data: {
                    admin: newAdmin.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Create admin error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create admin',
            })
        }
    },

    // Accept Invitation
    acceptInvitation: async (req, res) => {
        try {
            const { token, newPassword, confirmPassword } = req.body

            // Verify invitation token
            const decoded = verifyAdminInviteToken(token)
            if (!decoded) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired invitation token',
                })
            }

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match',
                })
            }

            // Validate password strength
            const passwordValidation =
                adminSecurityUtils.validateAdminPassword(newPassword)
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Password does not meet requirements',
                    errors: passwordValidation.errors,
                })
            }

            // Find admin
            const admin = await Admin.findOne({
                where: {
                    email: decoded.email,
                    isActive: true,
                },
            })

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin account not found',
                })
            }

            // Update password
            admin.passwordHash = newPassword // Will be hashed in beforeUpdate hook
            await admin.save()

            // Log invitation acceptance
            await AuditLog.create({
                adminId: admin.id,
                action: 'accept_invitation',
                resource: 'admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'medium',
            })

            logger.info(`Admin invitation accepted: ${decoded.email}`)

            res.json({
                success: true,
                message:
                    'Invitation accepted successfully. You can now log in with your new password.',
            })
        } catch (error) {
            logger.error('Accept invitation error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to accept invitation',
            })
        }
    },

    // Update Admin Role/Permissions
    updateAdmin: async (req, res) => {
        try {
            const currentAdmin = req.admin
            const { adminId } = req.params
            const { role, permissions, isActive } = req.body

            // Only super admins can update other admins
            if (currentAdmin.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only super administrators can update admin accounts',
                })
            }

            // Find target admin
            const targetAdmin = await Admin.findByPk(adminId)
            if (!targetAdmin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found',
                })
            }

            // Prevent self-deactivation
            if (currentAdmin.id === adminId && isActive === false) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot deactivate your own account',
                })
            }

            const oldValues = {
                role: targetAdmin.role,
                permissions: [...targetAdmin.permissions],
                isActive: targetAdmin.isActive,
            }

            const updates = {}

            if (role && role !== targetAdmin.role) {
                const validRoles = ['admin', 'moderator', 'analyst']
                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid role specified',
                    })
                }
                updates.role = role
                updates.permissions = Admin.getRolePermissions(role)
            }

            if (permissions && Array.isArray(permissions)) {
                const validPermissions = Admin.getPermissionsList()
                const invalidPerms = permissions.filter(
                    (p) => !validPermissions.includes(p)
                )
                if (invalidPerms.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid permissions specified',
                        invalidPermissions: invalidPerms,
                    })
                }
                updates.permissions = permissions
            }

            if (typeof isActive === 'boolean') {
                updates.isActive = isActive
            }

            updates.lastModifiedBy = currentAdmin.id

            await targetAdmin.update(updates)

            // If admin was deactivated, remove all their sessions
            if (isActive === false) {
                const removedSessions =
                    await adminSessionManager.removeAllAdminSessions(adminId)
                logger.info(
                    `Removed ${removedSessions} sessions for deactivated admin: ${targetAdmin.email}`
                )
            }

            // Log admin update
            await AuditLog.create({
                adminId: currentAdmin.id,
                action: 'update_admin',
                resource: 'admin',
                resourceId: adminId,
                oldValues,
                newValues: updates,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                severity: 'high',
            })

            logger.info(
                `Admin updated: ${targetAdmin.email} by ${currentAdmin.email}`
            )

            res.json({
                success: true,
                message: 'Admin updated successfully',
                data: {
                    admin: targetAdmin.toJSON(),
                },
            })
        } catch (error) {
            logger.error('Update admin error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to update admin',
            })
        }
    },

    // Get All Admins
    getAdmins: async (req, res) => {
        try {
            const currentAdmin = req.admin
            const { page = 1, limit = 50, role, status, search } = req.query

            // Only super admins can view all admins
            if (currentAdmin.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message:
                        'Only super administrators can view admin accounts',
                })
            }

            const offset = (page - 1) * limit
            const whereClause = {}

            if (role) whereClause.role = role
            if (status !== undefined) whereClause.isActive = status === 'active'

            if (search) {
                whereClause[Op.or] = [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ]
            }

            const { rows: admins, count } = await Admin.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Admin,
                        as: 'creator',
                        attributes: ['firstName', 'lastName', 'email'],
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset,
            })

            res.json({
                success: true,
                data: {
                    admins,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count,
                        pages: Math.ceil(count / limit),
                    },
                },
            })
        } catch (error) {
            logger.error('Get admins error:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to get admin accounts',
            })
        }
    },
}

module.exports = managementController
