// models/community/UserFeedback.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const UserFeedback = sequelize.define(
        'UserFeedback',
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
            },
            type: {
                type: DataTypes.ENUM('route_feedback', 'app_feedback', 'service_feedback', 'bug_report', 'feature_request'),
                allowNull: false,
            },
            feedbackCategory: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 100],
                        msg: 'Feedback category must be between 2 and 100 characters',
                    },
                },
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Title cannot be empty',
                    },
                    len: {
                        args: [5, 255],
                        msg: 'Title must be between 5 and 255 characters',
                    },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Description cannot be empty',
                    },
                    len: {
                        args: [10, 5000],
                        msg: 'Description must be between 10 and 5000 characters',
                    },
                },
            },
            routeId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'routes',
                    key: 'id',
                },
            },
            locationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            appVersion: {
                type: DataTypes.STRING(20),
                allowNull: true,
                validate: {
                    len: {
                        args: [3, 20],
                        msg: 'App version must be between 3 and 20 characters',
                    },
                },
            },
            deviceInfo: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            screenContext: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [2, 100],
                        msg: 'Screen context must be between 2 and 100 characters',
                    },
                },
            },
            rating: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [1.0],
                        msg: 'Rating must be between 1.0 and 5.0',
                    },
                    max: {
                        args: [5.0],
                        msg: 'Rating must be between 1.0 and 5.0',
                    },
                },
            },
            isAnonymous: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            contactEmail: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    isEmail: {
                        msg: 'Contact email must be a valid email address',
                    },
                },
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Priority must be between 1 and 5',
                    },
                    max: {
                        args: [5],
                        msg: 'Priority must be between 1 and 5',
                    },
                },
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'open',
                validate: {
                    isIn: {
                        args: [['open', 'in_progress', 'resolved', 'closed', 'wont_fix', 'duplicate']],
                        msg: 'Invalid status',
                    },
                },
            },
            assignedTo: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            adminResponse: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 2000],
                        msg: 'Admin response cannot exceed 2000 characters',
                    },
                },
            },
            responseAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            internalNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 2000],
                        msg: 'Internal notes cannot exceed 2000 characters',
                    },
                },
            },
            resolutionNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 2000],
                        msg: 'Resolution notes cannot exceed 2000 characters',
                    },
                },
            },
            followUpRequired: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            userSatisfaction: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [1.0],
                        msg: 'User satisfaction must be between 1.0 and 5.0',
                    },
                    max: {
                        args: [5.0],
                        msg: 'User satisfaction must be between 1.0 and 5.0',
                    },
                },
            },
            attachments: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Attachments must be an array');
                        }
                    },
                },
            },
            tags: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Tags must be an array');
                        }
                    },
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },
        },
        {
            tableName: 'user_feedback',
            timestamps: true,
            indexes: [
                {
                    fields: ['userId'],
                },
                {
                    fields: ['type'],
                },
                {
                    fields: ['feedbackCategory'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['locationId'],
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['priority'],
                },
                {
                    fields: ['assignedTo'],
                },
                {
                    fields: ['rating'],
                },
                {
                    fields: ['followUpRequired'],
                },
                {
                    fields: ['createdAt'],
                },
            ],
            hooks: {
                beforeSave: (feedback) => {
                    // Set response timestamp
                    if (feedback.changed('adminResponse') && feedback.adminResponse && !feedback.responseAt) {
                        feedback.responseAt = new Date();
                    }

                    // Auto-assign priority based on type
                    if (feedback.isNewRecord) {
                        if (feedback.type === 'bug_report') {
                            feedback.priority = feedback.priority || 4; // High priority for bugs
                        } else if (feedback.type === 'feature_request') {
                            feedback.priority = feedback.priority || 2; // Low priority for features
                        }
                    }
                },
            },
        }
    )

    // Instance methods
    UserFeedback.prototype.assign = async function (adminId) {
        this.assignedTo = adminId;
        this.status = 'in_progress';
        await this.save(['assignedTo', 'status']);
    };

    UserFeedback.prototype.respond = async function (adminId, response) {
        this.adminResponse = response;
        this.responseAt = new Date();
        await this.save(['adminResponse', 'responseAt']);
    };

    UserFeedback.prototype.resolve = async function (adminId, resolutionNotes = null) {
        this.status = 'resolved';
        this.resolutionNotes = resolutionNotes;
        await this.save(['status', 'resolutionNotes']);
    };

    UserFeedback.prototype.close = async function () {
        this.status = 'closed';
        await this.save(['status']);
    };

    UserFeedback.prototype.markWontFix = async function (reason) {
        this.status = 'wont_fix';
        this.resolutionNotes = reason;
        await this.save(['status', 'resolutionNotes']);
    };

    UserFeedback.prototype.markDuplicate = async function (originalFeedbackId) {
        this.status = 'duplicate';
        this.metadata.duplicateOf = originalFeedbackId;
        await this.save(['status', 'metadata']);
    };

    UserFeedback.prototype.updatePriority = async function (newPriority) {
        this.priority = newPriority;
        await this.save(['priority']);
    };

    UserFeedback.prototype.addTag = async function (tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            await this.save(['tags']);
        }
    };

    UserFeedback.prototype.removeTag = async function (tag) {
        this.tags = this.tags.filter(t => t !== tag);
        await this.save(['tags']);
    };

    UserFeedback.prototype.isOpen = function () {
        return this.status === 'open' || this.status === 'in_progress';
    };

    UserFeedback.prototype.isClosed = function () {
        return this.status === 'resolved' || this.status === 'closed' || this.status === 'wont_fix';
    };

    UserFeedback.prototype.getPriorityLabel = function () {
        const labels = {
            1: 'Very Low',
            2: 'Low',
            3: 'Medium',
            4: 'High',
            5: 'Critical',
        };
        return labels[this.priority] || 'Unknown';
    };

    // Static methods
    UserFeedback.findByUser = function (userId, includeAnonymous = false) {
        const where = { userId };
        if (!includeAnonymous) {
            where.isAnonymous = false;
        }

        return UserFeedback.findAll({
            where,
            order: [['createdAt', 'DESC']],
        });
    };

    UserFeedback.findByType = function (type, status = null) {
        const where = { type };
        if (status) where.status = status;

        return UserFeedback.findAll({
            where,
            include: [
                {
                    model: sequelize.models.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName'],
                },
                {
                    model: sequelize.models.Admin,
                    as: 'assignee',
                    attributes: ['id', 'firstName', 'lastName'],
                    required: false,
                },
            ],
            order: [['priority', 'DESC'], ['createdAt', 'DESC']],
        });
    };

    UserFeedback.findUnassigned = function (minPriority = 3) {
        return UserFeedback.findAll({
            where: {
                assignedTo: null,
                status: 'open',
                priority: {
                    [sequelize.Sequelize.Op.gte]: minPriority,
                },
            },
            order: [['priority', 'DESC'], ['createdAt', 'ASC']],
        });
    };

    UserFeedback.findByAdmin = function (adminId, statusFilter = null) {
        const where = { assignedTo: adminId };
        if (statusFilter) {
            if (Array.isArray(statusFilter)) {
                where.status = { [sequelize.Sequelize.Op.in]: statusFilter };
            } else {
                where.status = statusFilter;
            }
        }

        return UserFeedback.findAll({
            where,
            include: [
                {
                    model: sequelize.models.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
            order: [['priority', 'DESC'], ['createdAt', 'ASC']],
        });
    };

    UserFeedback.findByTags = function (tags) {
        return UserFeedback.findAll({
            where: {
                tags: {
                    [sequelize.Sequelize.Op.overlap]: tags,
                },
            },
            order: [['createdAt', 'DESC']],
        });
    };

    UserFeedback.findRequiringFollowUp = function () {
        return UserFeedback.findAll({
            where: {
                followUpRequired: true,
                status: { [sequelize.Sequelize.Op.in]: ['open', 'in_progress'] },
            },
            include: [
                {
                    model: sequelize.models.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
                {
                    model: sequelize.models.Admin,
                    as: 'assignee',
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
            order: [['priority', 'DESC'], ['createdAt', 'ASC']],
        });
    };

    UserFeedback.getStatsByType = async function (startDate = null, endDate = null) {
        const where = {};
        
        if (startDate) {
            where.createdAt = { [sequelize.Sequelize.Op.gte]: startDate };
        }
        if (endDate) {
            if (where.createdAt) {
                where.createdAt[sequelize.Sequelize.Op.lte] = endDate;
            } else {
                where.createdAt = { [sequelize.Sequelize.Op.lte]: endDate };
            }
        }

        const stats = await UserFeedback.findAll({
            where,
            attributes: [
                'type',
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('AVG', sequelize.col('userSatisfaction')), 'avgSatisfaction'],
            ],
            group: ['type', 'status'],
            raw: true,
        });

        return stats;
    };

    UserFeedback.getResolutionTime = async function (type = null, status = 'resolved') {
        const where = { status };
        if (type) where.type = type;

        const feedback = await UserFeedback.findAll({
            where,
            attributes: [
                'id',
                'createdAt',
                'responseAt',
                [sequelize.fn('EXTRACT', sequelize.literal("EPOCH FROM (response_at - created_at)")), 'responseTimeSeconds'],
            ],
            raw: true,
        });

        if (feedback.length === 0) return null;

        const avgResponseTime = feedback.reduce((sum, f) => sum + (f.responseTimeSeconds || 0), 0) / feedback.length;

        return {
            averageResponseTimeHours: avgResponseTime / 3600,
            totalResolved: feedback.length,
        };
    };

    // Association method
    UserFeedback.associate = (models) => {
        UserFeedback.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        UserFeedback.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        UserFeedback.belongsTo(models.Location, {
            foreignKey: 'locationId',
            as: 'location',
        });
        UserFeedback.belongsTo(models.Admin, {
            foreignKey: 'assignedTo',
            as: 'assignee',
        });
    };

    return UserFeedback;
};