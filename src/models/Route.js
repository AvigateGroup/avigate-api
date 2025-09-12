module.exports = (sequelize, DataTypes) => {
  const Route = sequelize.define('Route', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    startLocationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    endLocationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      },
      validate: {
        notSameAsStart(value) {
          if (value === this.startLocationId) {
            throw new Error('End location cannot be the same as start location');
          }
        }
      }
    },
    vehicleTypes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidVehicleTypes(value) {
          const validTypes = ['bus', 'taxi', 'keke', 'okada', 'train'];
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('At least one vehicle type is required');
          }
          const invalidTypes = value.filter(type => !validTypes.includes(type));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid vehicle types: ${invalidTypes.join(', ')}`);
          }
        }
      }
    },
    estimatedFareMin: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Minimum fare cannot be negative'
        },
        max: {
          args: 100000,
          msg: 'Minimum fare cannot exceed ₦100,000'
        }
      }
    },
    estimatedFareMax: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Maximum fare cannot be negative'
        },
        max: {
          args: 100000,
          msg: 'Maximum fare cannot exceed ₦100,000'
        },
        isGreaterThanMin(value) {
          if (value < this.estimatedFareMin) {
            throw new Error('Maximum fare must be greater than or equal to minimum fare');
          }
        }
      }
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 1,
          msg: 'Duration must be at least 1 minute'
        },
        max: {
          args: 1440,
          msg: 'Duration cannot exceed 24 hours (1440 minutes)'
        }
      }
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      defaultValue: 'Medium',
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Crowdsourced data aggregation
    crowdsourcedData: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    },
    // Usage statistics
    searchCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Search count cannot be negative'
        }
      }
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Usage count cannot be negative'
        }
      }
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Rating cannot be negative'
        },
        max: {
          args: 5,
          msg: 'Rating cannot exceed 5'
        }
      }
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Additional metadata
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'routes',
    timestamps: true,
    indexes: [
      {
        fields: ['startLocationId']
      },
      {
        fields: ['endLocationId']
      },
      {
        fields: ['startLocationId', 'endLocationId']
      },
      {
        fields: ['vehicleTypes'],
        using: 'gin'
      },
      {
        fields: ['estimatedFareMin']
      },
      {
        fields: ['estimatedFareMax']
      },
      {
        fields: ['estimatedDuration']
      },
      {
        fields: ['difficulty']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['searchCount']
      },
      {
        fields: ['averageRating']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (route) => {
        // Ensure fare range is valid
        if (route.estimatedFareMax < route.estimatedFareMin) {
          route.estimatedFareMax = route.estimatedFareMin;
        }
        
        // Initialize crowdsourced data structure
        if (!route.crowdsourcedData) {
          route.crowdsourcedData = {
            fareReports: [],
            durationReports: [],
            conditionReports: [],
            lastUpdated: new Date()
          };
        }
      },
      
      beforeUpdate: (route) => {
        // Update lastUpdatedBy if route data changed
        if (route.changed() && !route.changed('lastUpdatedBy')) {
          route.lastUpdatedBy = route.lastUpdatedBy || route.createdBy;
        }
      }
    }
  });

  // Instance methods
  Route.prototype.incrementSearchCount = async function() {
    this.searchCount += 1;
    await this.save({ fields: ['searchCount'] });
  };

  Route.prototype.incrementUsageCount = async function() {
    this.usageCount += 1;
    await this.save({ fields: ['usageCount'] });
  };

  Route.prototype.updateRating = async function(newRating) {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = totalScore / this.totalRatings;
    await this.save({ fields: ['averageRating', 'totalRatings'] });
  };

  Route.prototype.addCrowdsourceData = async function(type, data) {
    if (!this.crowdsourcedData) {
      this.crowdsourcedData = {
        fareReports: [],
        durationReports: [],
        conditionReports: [],
        lastUpdated: new Date()
      };
    }

    const reportKey = `${type}Reports`;
    if (this.crowdsourcedData[reportKey]) {
      this.crowdsourcedData[reportKey].push({
        ...data,
        timestamp: new Date(),
        id: require('uuid').v4()
      });

      // Keep only last 50 reports per type
      if (this.crowdsourcedData[reportKey].length > 50) {
        this.crowdsourcedData[reportKey] = this.crowdsourcedData[reportKey].slice(-50);
      }
    }

    this.crowdsourcedData.lastUpdated = new Date();
    await this.save({ fields: ['crowdsourcedData'] });
  };

  Route.prototype.getCrowdsourceAverage = function(type) {
    if (!this.crowdsourcedData || !this.crowdsourcedData[`${type}Reports`]) {
      return null;
    }

    const reports = this.crowdsourcedData[`${type}Reports`];
    if (reports.length === 0) return null;

    const sum = reports.reduce((acc, report) => acc + (report.value || 0), 0);
    return sum / reports.length;
  };

  Route.prototype.verify = async function(verifiedBy) {
    this.isVerified = true;
    this.verifiedBy = verifiedBy;
    this.verifiedAt = new Date();
    await this.save();
  };

  Route.prototype.addTag = async function(tag) {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      await this.save({ fields: ['tags'] });
    }
  };

  Route.prototype.removeTag = async function(tag) {
    if (this.tags && this.tags.includes(tag)) {
      this.tags = this.tags.filter(t => t !== tag);
      await this.save({ fields: ['tags'] });
    }
  };

  Route.prototype.getEstimatedFareRange = function() {
    return {
      min: this.estimatedFareMin,
      max: this.estimatedFareMax,
      average: Math.round((this.estimatedFareMin + this.estimatedFareMax) / 2)
    };
  };

  Route.prototype.toJSON = function() {
    const route = { ...this.get() };
    
    // Add computed fields
    route.fareRange = this.getEstimatedFareRange();
    route.crowdsourceAverages = {
      fare: this.getCrowdsourceAverage('fare'),
      duration: this.getCrowdsourceAverage('duration')
    };
    
    return route;
  };

  // Class methods
  Route.findByLocations = function(startLocationId, endLocationId, options = {}) {
    const whereClause = {
      startLocationId,
      endLocationId,
      isActive: true
    };

    if (options.verified) {
      whereClause.isVerified = true;
    }

    return Route.findAll({
      where: whereClause,
      include: options.include || [],
      order: options.order || [['averageRating', 'DESC'], ['searchCount', 'DESC']]
    });
  };

  Route.searchRoutes = function(options = {}) {
    const {
      startLocationId,
      endLocationId,
      vehicleTypes,
      maxFare,
      maxDuration,
      difficulty,
      verified = false,
      limit = 10,
      offset = 0
    } = options;

    const whereClause = {
      isActive: true
    };

    if (startLocationId) whereClause.startLocationId = startLocationId;
    if (endLocationId) whereClause.endLocationId = endLocationId;
    if (verified) whereClause.isVerified = true;
    if (maxFare) whereClause.estimatedFareMax = { [Op.lte]: maxFare };
    if (maxDuration) whereClause.estimatedDuration = { [Op.lte]: maxDuration };
    if (difficulty && Array.isArray(difficulty)) whereClause.difficulty = { [Op.in]: difficulty };

    // Handle vehicle types JSON search
    if (vehicleTypes && Array.isArray(vehicleTypes)) {
      whereClause[Op.and] = vehicleTypes.map(type => 
        sequelize.literal(`"vehicleTypes"::jsonb ? '${type}'`)
      );
    }

    return Route.findAndCountAll({
      where: whereClause,
      order: [
        ['isVerified', 'DESC'],
        ['averageRating', 'DESC'],
        ['searchCount', 'DESC']
      ],
      limit,
      offset
    });
  };

  Route.getPopularRoutes = function(limit = 10) {
    return Route.findAll({
      where: { isActive: true, isVerified: true },
      order: [
        ['searchCount', 'DESC'],
        ['usageCount', 'DESC'],
        ['averageRating', 'DESC']
      ],
      limit
    });
  };

  Route.getRoutesByCreator = function(userId, options = {}) {
    return Route.findAll({
      where: {
        createdBy: userId,
        isActive: true
      },
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0
    });
  };

  Route.getRoutesByVehicleType = function(vehicleType, options = {}) {
    return Route.findAll({
      where: {
        [Op.and]: [
          { isActive: true },
          sequelize.literal(`"vehicleTypes"::jsonb ? '${vehicleType}'`)
        ]
      },
      order: [['averageRating', 'DESC']],
      limit: options.limit || 20
    });
  };

  Route.getRoutesNeedingVerification = function(limit = 20) {
    return Route.findAll({
      where: {
        isActive: true,
        isVerified: false
      },
      order: [['createdAt', 'ASC']],
      limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'reputationScore']
        }
      ]
    });
  };

  Route.getRouteAnalytics = function(timeframe = '30d') {
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return sequelize.query(`
      SELECT 
        COUNT(*) as total_routes,
        COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_routes,
        AVG("averageRating") as avg_rating,
        SUM("searchCount") as total_searches,
        SUM("usageCount") as total_usage,
        json_agg(DISTINCT unnest("vehicleTypes")) as popular_vehicle_types
      FROM routes 
      WHERE "isActive" = true 
      AND "createdAt" >= :startDate
    `, {
      replacements: { startDate },
      type: sequelize.QueryTypes.SELECT
    });
  };

  return Route;
};