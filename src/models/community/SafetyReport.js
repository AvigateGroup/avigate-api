// models/community/SafetyReport.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
    const SafetyReport = sequelize.define(
        'SafetyReport',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            reportedBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
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
            routeId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'routes',
                    key: 'id',
                },
            },
            latitude: {
                type: DataTypes.DECIMAL(10, 8),
                allowNull: true,
                validate: {
                    min: {
                        args: [-90],
                        msg: 'Latitude must be between -90 and 90',
                    },
                    max: {
                        args: [90],
                        msg: 'Latitude must be between -90 and 90',
                    },
                },
            },
            longitude: {
                type: DataTypes.DECIMAL(11, 8),
                allowNull: true,
                validate: {
                    min: {
                        args: [-180],
                        msg: 'Longitude must be between -180 and 180',
                    },
                    max: {
                        args: [180],
                        msg: 'Longitude must be between -180 and 180',
                    },
                },
            },
            safetyLevel: {
                type: DataTypes.ENUM('very_safe', 'safe', 'moderate', 'unsafe', 'very_unsafe'),
                allowNull: false,
            },
            incidentType: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Incident type cannot be empty',
                    },
                    isIn: {
                        args: [[
                            'theft', 'robbery', 'accident', 'harassment', 'violence',
                            'vandalism', 'scam', 'poor_lighting', 'road_condition',
                            'vehicle_breakdown', 'fare_dispute', 'other'
                        ]],
                        msg: 'Invalid incident type',
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
                        args: [20, 2000],
                        msg: 'Description must be between 20 and 2000 characters',
                    },
                },
            },
            timeOfIncident: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            isAnonymous: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            verifiedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            verificationScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                defaultValue: 5.0,
                validate: {
                    min: {
                        args: [0.0],
                        msg: 'Verification score must be between 0.0 and 10.0',
                    },
                    max: {
                        args: [10.0],
                        msg: 'Verification score must be between 0.0 and 10.0',
                    },
                },
            },
            severity: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Severity must be between 1 and 5',
                    },
                    max: {
                        args: [5],
                        msg: 'Severity must be between 1 and 5',
                    },
                },
            },
            affectsTransport: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            transportModes: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            recommendedAction: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            officialResponse: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            statusUpdates: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            relatedReports: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            upvotes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Upvotes cannot be negative',
                    },
                },
            },
            downvotes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Downvotes cannot be negative',
                    },
                },
            },
            isResolved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            resolvedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            resolvedBy: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            attachments: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
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
            tableName: 'safety_reports',
            timestamps: true,
            indexes: [
                {
                    fields: ['reportedBy'],
                },
                {
                    fields: ['locationId'],
                },
                {
                    fields: ['routeId'],
                },
                {
                    fields: ['safetyLevel'],
                },
                {
                    fields: ['incidentType'],
                },
                {
                    fields: ['severity'],
                },
                {
                    fields: ['isVerified'],
                },
                {
                    fields: ['isResolved'],
                },
                {
                    fields: ['timeOfIncident'],
                },
                {
                    fields: ['affectsTransport'],
                },
                {
                    fields: ['latitude', 'longitude'],
                },
            ],
        }
    )

    // Instance methods
    SafetyReport.prototype.addStatusUpdate = async function (update, updatedBy = null) {
        this.statusUpdates.push({
            update,
            updatedBy,
            updatedAt: new Date(),
        });
        await this.save(['statusUpdates']);
    };

    SafetyReport.prototype.markResolved = async function (resolvedBy = null, resolution = null) {
        this.isResolved = true;
        this.resolvedAt = new Date();
        this.resolvedBy = resolvedBy;
        
        if (resolution) {
            await this.addStatusUpdate(`Resolved: ${resolution}`, resolvedBy);
        }
        
        await this.save(['isResolved', 'resolvedAt', 'resolvedBy']);
    };

    SafetyReport.prototype.getSeverityDescription = function () {
        const descriptions = {
            1: 'Minor',
            2: 'Low',
            3: 'Moderate',
            4: 'High',
            5: 'Critical'
        };
        return descriptions[this.severity] || 'Unknown';
    };

    SafetyReport.prototype.getCredibilityScore = function () {
        // Simple scoring based on verification and votes
        let score = 50; // Base score
        
        if (this.isVerified) score += 30;
        score += Math.min(this.upvotes * 2, 20);
        score -= Math.min(this.downvotes * 3, 30);
        
        return Math.max(0, Math.min(100, score));
    };

    // Static methods
    SafetyReport.findByLocation = function (locationId, resolved = false) {
        return SafetyReport.findAll({
            where: {
                locationId,
                isResolved: resolved,
            },
            order: [['severity', 'DESC'], ['createdAt', 'DESC']],
        });
    };

    SafetyReport.findByIncidentType = function (incidentType, limit = 20) {
        return SafetyReport.findAll({
            where: {
                incidentType,
                isResolved: false,
            },
            order: [['severity', 'DESC'], ['createdAt', 'DESC']],
            limit,
        });
    };

    SafetyReport.findHighSeverity = function (minSeverity = 4, limit = 10) {
        return SafetyReport.findAll({
            where: {
                severity: {
                    [sequelize.Sequelize.Op.gte]: minSeverity,
                },
                isResolved: false,
            },
            order: [['severity', 'DESC'], ['createdAt', 'DESC']],
            limit,
        });
    };

    SafetyReport.findInArea = function (centerLat, centerLng, radiusKm = 5) {
        return SafetyReport.findAll({
            where: sequelize.literal(`
                ST_DWithin(
                    ST_MakePoint(longitude, latitude)::geography,
                    ST_MakePoint(${centerLng}, ${centerLat})::geography,
                    ${radiusKm * 1000}
                )
            `),
            order: [['severity', 'DESC'], ['createdAt', 'DESC']],
        });
    };

    // Association method
    SafetyReport.associate = (models) => {
        SafetyReport.belongsTo(models.User, {
            foreignKey: 'reportedBy',
            as: 'reporter',
        });
        SafetyReport.belongsTo(models.Location, {
            foreignKey: 'locationId',
            as: 'location',
        });
        SafetyReport.belongsTo(models.Route, {
            foreignKey: 'routeId',
            as: 'route',
        });
        SafetyReport.belongsTo(models.User, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
        SafetyReport.belongsTo(models.User, {
            foreignKey: 'resolvedBy',
            as: 'resolver',
        });
    };

    return SafetyReport;
};