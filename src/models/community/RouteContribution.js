// models/community/RouteContribution.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const RouteContribution = sequelize.define(
        'RouteContribution',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            contributorId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            contributionType: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [[
                            'new_route', 'route_update', 'route_correction', 
                            'fare_update', 'schedule_update', 'landmark_addition',
                            'route_closure', 'route_deviation', 'new_stop'
                        ]],
                        msg: 'Invalid contribution type',
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
            proposedRoute: {
                type: DataTypes.JSONB,
                allowNull: true,
                defaultValue: null,
                validate: {
                    isValidJSON(value) {
                        if (value !== null && typeof value !== 'object') {
                            throw new Error('Proposed route must be a valid JSON object');
                        }
                    },
                },
            },
            routeName: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    len: {
                        args: [3, 255],
                        msg: 'Route name must be between 3 and 255 characters',
                    },
                },
            },
            routeDescription: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [10, 2000],
                        msg: 'Route description must be between 10 and 2000 characters',
                    },
                },
            },
            startLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            endLocationId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'locations',
                    key: 'id',
                },
            },
            transportMode: {
                type: DataTypes.ENUM('bus', 'taxi', 'keke_napep', 'okada', 'walking', 'car'),
                allowNull: true,
            },
            estimatedFare: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidFareObject(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Estimated fare must be a valid object');
                        }
                        if (value.min && value.max && value.min > value.max) {
                            throw new Error('Minimum fare cannot be greater than maximum fare');
                        }
                    },
                },
            },
            estimatedDuration: {
                type: DataTypes.INTEGER, // in minutes
                allowNull: true,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Estimated duration must be at least 1 minute',
                    },
                    max: {
                        args: [1440], // 24 hours
                        msg: 'Estimated duration cannot exceed 24 hours',
                    },
                },
            },
            routeSteps: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Route steps must be an array');
                        }
                    },
                },
            },
            supportingEvidence: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isValidArray(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Supporting evidence must be an array');
                        }
                    },
                },
            },
            contributorNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Contributor notes cannot exceed 1000 characters',
                    },
                },
            },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected', 'needs_review'),
                allowNull: false,
                defaultValue: 'pending',
            },
            reviewedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            reviewedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            reviewNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Review notes cannot exceed 1000 characters',
                    },
                },
            },
            reputationReward: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Reputation reward cannot be negative',
                    },
                    max: {
                        args: [100],
                        msg: 'Reputation reward cannot exceed 100',
                    },
                },
            },
            qualityScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0.0],
                        msg: 'Quality score must be between 0.0 and 10.0',
                    },
                    max: {
                        args: [10.0],
                        msg: 'Quality score must be between 0.0 and 10.0',
                    },
                },
            },
            communityVotes: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                validate: {
                    isValidVotes(value) {
                        if (typeof value !== 'object' || value === null) {
                            throw new Error('Community votes must be a valid object');
                        }
                    },
                },
            },
            isImplemented: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            implementedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            implementedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'admins',
                    key: 'id',
                },
            },
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
            },
        },
        {
            tableName: 'route_contributions',
            timestamps: true,
            indexes: [
                {
                    fields: ['contributorId'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['contributionType'],
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['reviewedBy'],
                },
                {
                    fields: ['isImplemented'],
                },
                {
                    fields: ['qualityScore'],
                },
                {
                    fields: ['startLocationId'],
                },
                {
                    fields: ['endLocationId'],
                },
                {
                    fields: ['transportMode'],
                },
                {
                    fields: ['createdAt'],
                },
            ],
            hooks: {
                beforeSave: (contribution) => {
                    // Set reviewed timestamp when status changes
                    if (contribution.changed('status') && contribution.status !== 'pending') {
                        if (!contribution.reviewedAt) {
                            contribution.reviewedAt = new Date();
                        }
                    }

                    // Set implemented timestamp
                    if (contribution.changed('isImplemented') && contribution.isImplemented) {
                        if (!contribution.implementedAt) {
                            contribution.implementedAt = new Date();
                        }
                    }
                },
            },
        }
    )

    // Instance methods
    RouteContribution.prototype.approve = async function (adminId, notes = null, reputationReward = 20) {
        this.status = 'approved';
        this.reviewedBy = adminId;
        this.reviewedAt = new Date();
        this.reviewNotes = notes;
        this.reputationReward = reputationReward;

        await this.save();

        // Update contributor's reputation
        const contributor = await sequelize.models.User.findByPk(this.contributorId);
        if (contributor) {
            await contributor.updateReputation(reputationReward);
        }
    };

    RouteContribution.prototype.reject = async function (adminId, reason) {
        this.status = 'rejected';
        this.reviewedBy = adminId;
        this.reviewedAt = new Date();
        this.reviewNotes = reason;

        await this.save();
    };

    RouteContribution.prototype.markAsImplemented = async function (adminId) {
        this.isImplemented = true;
        this.implementedBy = adminId;
        this.implementedAt = new Date();

        await this.save();

        // Give additional reputation bonus for implementation
        const contributor = await sequelize.models.User.findByPk(this.contributorId);
        if (contributor) {
            await contributor.updateReputation(10); // Extra +10 for implementation
        }
    };

    RouteContribution.prototype.addCommunityVote = async function (userId, vote) {
        if (!this.communityVotes) this.communityVotes = {};
        
        this.communityVotes[userId] = {
            vote: vote, // 'helpful' or 'not_helpful'
            votedAt: new Date(),
        };

        // Calculate quality score based on votes
        const votes = Object.values(this.communityVotes);
        const helpfulVotes = votes.filter(v => v.vote === 'helpful').length;
        const totalVotes = votes.length;
        
        if (totalVotes > 0) {
            this.qualityScore = (helpfulVotes / totalVotes) * 10;
        }

        await this.save(['communityVotes', 'qualityScore']);
    };

    RouteContribution.prototype.getVotesSummary = function () {
        if (!this.communityVotes || Object.keys(this.communityVotes).length === 0) {
            return { helpful: 0, notHelpful: 0, total: 0 };
        }

        const votes = Object.values(this.communityVotes);
        return {
            helpful: votes.filter(v => v.vote === 'helpful').length,
            notHelpful: votes.filter(v => v.vote === 'not_helpful').length,
            total: votes.length,
        };
    };

    RouteContribution.prototype.isPending = function () {
        return this.status === 'pending' || this.status === 'needs_review';
    };

    RouteContribution.prototype.isApproved = function () {
        return this.status === 'approved';
    };

    RouteContribution.prototype.isRejected = function () {
        return this.status === 'rejected';
    };

    // Static methods
    RouteContribution.findPending = function (limit = 20) {
        return RouteContribution.findAll({
            where: {
                status: { [sequelize.Sequelize.Op.in]: ['pending', 'needs_review'] },
            },
            include: [
                {
                    model: sequelize.models.User,
                    as: 'contributor',
                    attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                },
                { model: sequelize.models.Route, as: 'route', required: false },
                { model: sequelize.models.Location, as: 'startLocation', required: false },
                { model: sequelize.models.Location, as: 'endLocation', required: false },
            ],
            order: [
                ['qualityScore', 'DESC'],
                ['createdAt', 'ASC'],
            ],
            limit,
        });
    };

    RouteContribution.findByContributor = function (contributorId, status = null) {
        const where = { contributorId };
        if (status) where.status = status;

        return RouteContribution.findAll({
            where,
            include: [
                { model: sequelize.models.Route, as: 'route', required: false },
                { model: sequelize.models.Admin, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'], required: false },
            ],
            order: [['createdAt', 'DESC']],
        });
    };

    RouteContribution.findByType = function (contributionType, status = null) {
        const where = { contributionType };
        if (status) where.status = status;

        return RouteContribution.findAll({
            where,
            include: [
                {
                    model: sequelize.models.User,
                    as: 'contributor',
                    attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    };

    RouteContribution.findHighQuality = function (minQualityScore = 7.0, limit = 10) {
        return RouteContribution.findAll({
            where: {
                qualityScore: {
                    [sequelize.Sequelize.Op.gte]: minQualityScore,
                },
                status: 'approved',
            },
            include: [
                {
                    model: sequelize.models.User,
                    as: 'contributor',
                    attributes: ['id', 'firstName', 'lastName', 'reputationScore'],
                },
            ],
            order: [['qualityScore', 'DESC'], ['createdAt', 'DESC']],
            limit,
        });
    };

    RouteContribution.getStatsByUser = async function (contributorId) {
        const stats = await RouteContribution.findAll({
            where: { contributorId },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('AVG', sequelize.col('qualityScore')), 'avgQualityScore'],
                [sequelize.fn('SUM', sequelize.col('reputationReward')), 'totalReputationEarned'],
            ],
            group: ['status'],
            raw: true,
        });

        const implemented = await RouteContribution.count({
            where: { contributorId, isImplemented: true },
        });

        return {
            byStatus: stats,
            totalImplemented: implemented,
        };
    };

    // Association method
    RouteContribution.associate = (models) => {
        RouteContribution.belongsTo(models.User, {
            foreignKey: 'contributorId',
            as: 'contributor',
        });
        RouteContribution.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        RouteContribution.belongsTo(models.Location, {
            foreignKey: 'startLocationId',
            as: 'startLocation',
        });
        RouteContribution.belongsTo(models.Location, {
            foreignKey: 'endLocationId',
            as: 'endLocation',
        });
        RouteContribution.belongsTo(models.Admin, {
            foreignKey: 'reviewedBy',
            as: 'reviewer',
        });
        RouteContribution.belongsTo(models.Admin, {
            foreignKey: 'implementedBy',
            as: 'implementer',
        });
    };

    return RouteContribution;
};