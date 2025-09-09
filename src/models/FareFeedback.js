const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const FareFeedback = sequelize.define('FareFeedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      validate: {
        notNull: {
          msg: 'User ID is required'
        },
        isUUID: {
          args: 4,
          msg: 'User ID must be a valid UUID'
        }
      }
    },
    routeStepId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'route_steps',
        key: 'id'
      },
      validate: {
        notNull: {
          msg: 'Route step ID is required'
        },
        isUUID: {
          args: 4,
          msg: 'Route step ID must be a valid UUID'
        }
      }
    },
    actualFarePaid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Actual fare paid cannot be negative'
        },
        max: {
          args: 50000,
          msg: 'Actual fare paid cannot exceed ₦50,000'
        },
        isInt: {
          msg: 'Actual fare paid must be an integer'
        }
      }
    },
    vehicleTypeUsed: {
      type: DataTypes.ENUM('bus', 'taxi', 'keke', 'okada', 'train', 'walking'),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Vehicle type used is required'
        },
        isIn: {
          args: [['bus', 'taxi', 'keke', 'okada', 'train', 'walking']],
          msg: 'Invalid vehicle type'
        }
      }
    },
    dateOfTravel: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Date of travel is required'
        },
        isDate: {
          msg: 'Date of travel must be a valid date'
        },
        isNotFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('Date of travel cannot be in the future');
          }
        },
        isRecentEnough(value) {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          if (new Date(value) < oneYearAgo) {
            throw new Error('Date of travel cannot be more than one year ago');
          }
        }
      }
    },
    timeOfDay: {
      type: DataTypes.ENUM('morning', 'afternoon', 'evening', 'night'),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Time of day is required'
        },
        isIn: {
          args: [['morning', 'afternoon', 'evening', 'night']],
          msg: 'Invalid time of day'
        }
      }
    },
    actualDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: 1,
          msg: 'Actual duration must be at least 1 minute'
        },
        max: {
          args: 480,
          msg: 'Actual duration cannot exceed 8 hours (480 minutes)'
        },
        isInt: {
          msg: 'Actual duration must be an integer'
        }
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 1,
          msg: 'Rating must be at least 1'
        },
        max: {
          args: 5,
          msg: 'Rating cannot exceed 5'
        },
        isInt: {
          msg: 'Rating must be an integer'
        }
      }
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Comments cannot exceed 500 characters'
        }
      }
    },
    // Additional context fields
    trafficCondition: {
      type: DataTypes.ENUM('light', 'moderate', 'heavy'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['light', 'moderate', 'heavy']],
          msg: 'Invalid traffic condition'
        }
      }
    },
    weatherCondition: {
      type: DataTypes.ENUM('clear', 'rainy', 'cloudy', 'stormy'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['clear', 'rainy', 'cloudy', 'stormy']],
          msg: 'Invalid weather condition'
        }
      }
    },
    dayOfWeek: {
      type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Day of week is required'
        }
      }
    },
    isHoliday: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    passengerCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: 1,
          msg: 'Passenger count must be at least 1'
        },
        max: {
          args: 10,
          msg: 'Passenger count cannot exceed 10'
        },
        isInt: {
          msg: 'Passenger count must be an integer'
        }
      }
    },
    // Quality and verification
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
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
    confidenceScore: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Confidence score cannot be negative'
        },
        max: {
          args: 100,
          msg: 'Confidence score cannot exceed 100'
        }
      }
    },
    // Flagging system
    isFlagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    flagReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    flaggedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    flaggedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    // Additional metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'fare_feedbacks',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['routeStepId']
      },
      {
        fields: ['dateOfTravel']
      },
      {
        fields: ['vehicleTypeUsed']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['timeOfDay']
      },
      {
        fields: ['trafficCondition']
      },
      {
        fields: ['weatherCondition']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['isFlagged']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['confidenceScore']
      },
      {
        fields: ['actualFarePaid']
      },
      {
        fields: ['userId', 'routeStepId', 'dateOfTravel'],
        unique: true,
        name: 'unique_user_step_date_feedback'
      }
    ],
    hooks: {
      beforeCreate: (feedback) => {
        // Auto-detect day of week from date
        const date = new Date(feedback.dateOfTravel);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        feedback.dayOfWeek = days[date.getDay()];
        
        // Clean up comments
        if (feedback.comments) {
          feedback.comments = feedback.comments.trim();
        }
      },
      
      beforeUpdate: (feedback) => {
        // Update verification timestamp
        if (feedback.changed('isVerified') && feedback.isVerified) {
          feedback.verifiedAt = new Date();
        }
        
        // Update flag timestamp
        if (feedback.changed('isFlagged') && feedback.isFlagged) {
          feedback.flaggedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  FareFeedback.prototype.verify = async function(verifierId) {
    this.isVerified = true;
    this.verifiedBy = verifierId;
    this.verifiedAt = new Date();
    this.confidenceScore = Math.min(this.confidenceScore + 20, 100);
    await this.save();
  };

  FareFeedback.prototype.flag = async function(reason, flaggerId) {
    this.isFlagged = true;
    this.flagReason = reason;
    this.flaggedBy = flaggerId;
    this.flaggedAt = new Date();
    this.confidenceScore = Math.max(this.confidenceScore - 50, 0);
    await this.save();
  };

  FareFeedback.prototype.unflag = async function() {
    this.isFlagged = false;
    this.flagReason = null;
    this.flaggedBy = null;
    this.flaggedAt = null;
    this.confidenceScore = Math.min(this.confidenceScore + 25, 100);
    await this.save();
  };

  FareFeedback.prototype.isReliable = function() {
    return !this.isFlagged && this.confidenceScore >= 70 && this.isActive;
  };

  FareFeedback.prototype.getFormattedFare = function() {
    return {
      amount: this.actualFarePaid,
      currency: 'NGN',
      formatted: `₦${this.actualFarePaid.toLocaleString()}`
    };
  };

  FareFeedback.prototype.getDurationComparison = function(estimatedDuration) {
    if (!this.actualDuration || !estimatedDuration) return null;
    
    const difference = this.actualDuration - estimatedDuration;
    const percentageDiff = (difference / estimatedDuration) * 100;
    
    return {
      actual: this.actualDuration,
      estimated: estimatedDuration,
      difference,
      percentageDiff: Math.round(percentageDiff),
      status: difference > 0 ? 'longer' : difference < 0 ? 'shorter' : 'accurate'
    };
  };

  FareFeedback.prototype.toJSON = function() {
    const feedback = { ...this.get() };
    
    // Add computed fields
    feedback.formattedFare = this.getFormattedFare();
    feedback.isReliable = this.isReliable();
    
    return feedback;
  };

  // Class methods
  FareFeedback.findByRouteStep = function(routeStepId, options = {}) {
    const {
      verified = false,
      active = true,
      limit = 50,
      offset = 0,
      vehicleType = null,
      timeframe = null
    } = options;
    
    const whereClause = { routeStepId };
    
    if (verified) {
      whereClause.isVerified = true;
    }
    
    if (active) {
      whereClause.isActive = true;
      whereClause.isFlagged = false;
    }
    
    if (vehicleType) {
      whereClause.vehicleTypeUsed = vehicleType;
    }
    
    if (timeframe) {
      const date = new Date();
      switch (timeframe) {
        case '7days':
          date.setDate(date.getDate() - 7);
          break;
        case '30days':
          date.setDate(date.getDate() - 30);
          break;
        case '90days':
          date.setDate(date.getDate() - 90);
          break;
      }
      whereClause.dateOfTravel = { [Op.gte]: date };
    }
    
    return FareFeedback.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'reputationScore']
        }
      ],
      order: [['dateOfTravel', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset
    });
  };

  FareFeedback.findByUser = function(userId, options = {}) {
    const { limit = 20, offset = 0, active = true } = options;
    
    const whereClause = { userId };
    if (active) {
      whereClause.isActive = true;
    }
    
    return FareFeedback.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.RouteStep,
          as: 'routeStep',
          include: [
            {
              model: sequelize.models.Route,
              as: 'route',
              include: [
                {
                  model: sequelize.models.Location,
                  as: 'startLocation',
                  attributes: ['name', 'city']
                },
                {
                  model: sequelize.models.Location,
                  as: 'endLocation',
                  attributes: ['name', 'city']
                }
              ]
            }
          ]
        }
      ],
      order: [['dateOfTravel', 'DESC']],
      limit,
      offset
    });
  };

  FareFeedback.getAverageByRouteStep = function(routeStepId, options = {}) {
    const { vehicleType = null, timeframe = '30days' } = options;
    
    const whereClause = {
      routeStepId,
      isActive: true,
      isFlagged: false,
      confidenceScore: { [Op.gte]: 70 }
    };
    
    if (vehicleType) {
      whereClause.vehicleTypeUsed = vehicleType;
    }
    
    // Add timeframe filter
    const date = new Date();
    switch (timeframe) {
      case '7days':
        date.setDate(date.getDate() - 7);
        break;
      case '30days':
        date.setDate(date.getDate() - 30);
        break;
      case '90days':
        date.setDate(date.getDate() - 90);
        break;
    }
    whereClause.dateOfTravel = { [Op.gte]: date };
    
    return FareFeedback.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('AVG', sequelize.col('actualFarePaid')), 'avgFare'],
        [sequelize.fn('MIN', sequelize.col('actualFarePaid')), 'minFare'],
        [sequelize.fn('MAX', sequelize.col('actualFarePaid')), 'maxFare'],
        [sequelize.fn('AVG', sequelize.col('actualDuration')), 'avgDuration'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'feedbackCount']
      ],
      raw: true
    });
  };

  FareFeedback.getFareStatsByVehicleType = function(routeStepId) {
    return FareFeedback.findAll({
      where: {
        routeStepId,
        isActive: true,
        isFlagged: false
      },
      attributes: [
        'vehicleTypeUsed',
        [sequelize.fn('AVG', sequelize.col('actualFarePaid')), 'avgFare'],
        [sequelize.fn('MIN', sequelize.col('actualFarePaid')), 'minFare'],
        [sequelize.fn('MAX', sequelize.col('actualFarePaid')), 'maxFare'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['vehicleTypeUsed'],
      raw: true
    });
  };

  FareFeedback.getPendingVerification = function(limit = 20) {
    return FareFeedback.findAll({
      where: {
        isVerified: false,
        isFlagged: false,
        isActive: true,
        confidenceScore: { [Op.gte]: 50 }
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'reputationScore']
        },
        {
          model: sequelize.models.RouteStep,
          as: 'routeStep',
          attributes: ['vehicleType', 'pickupPoint', 'dropoffPoint']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit
    });
  };

  FareFeedback.getStatistics = async function() {
    const stats = await FareFeedback.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalFeedback'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "isVerified" = true THEN 1 END')), 'verifiedFeedback'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "isFlagged" = true THEN 1 END')), 'flaggedFeedback'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('AVG', sequelize.col('actualFarePaid')), 'avgFare'],
        [sequelize.fn('AVG', sequelize.col('confidenceScore')), 'avgConfidence']
      ],
      raw: true
    });

    return {
      totalFeedback: parseInt(stats.totalFeedback) || 0,
      verifiedFeedback: parseInt(stats.verifiedFeedback) || 0,
      flaggedFeedback: parseInt(stats.flaggedFeedback) || 0,
      averageRating: parseFloat(stats.avgRating) || 0,
      averageFare: parseFloat(stats.avgFare) || 0,
      averageConfidence: parseFloat(stats.avgConfidence) || 0
    };
  };

  FareFeedback.cleanupOldFeedback = async function(daysOld = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const count = await FareFeedback.count({
      where: {
        dateOfTravel: { [Op.lt]: cutoffDate },
        isActive: true
      }
    });
    
    await FareFeedback.update(
      { isActive: false },
      {
        where: {
          dateOfTravel: { [Op.lt]: cutoffDate },
          isActive: true
        }
      }
    );
    
    return count;
  };

  return FareFeedback;
};