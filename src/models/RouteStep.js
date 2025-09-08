const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const RouteStep = sequelize.define('RouteStep', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    routeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'routes',
        key: 'id'
      }
    },
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 1,
          msg: 'Step number must be at least 1'
        }
      }
    },
    fromLocationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    toLocationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      },
      validate: {
        notSameAsFrom(value) {
          if (value === this.fromLocationId) {
            throw new Error('To location cannot be the same as from location');
          }
        }
      }
    },
    vehicleType: {
      type: DataTypes.ENUM('bus', 'taxi', 'keke', 'okada', 'train', 'walking'),
      allowNull: false
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [10, 1000],
          msg: 'Instructions must be between 10 and 1000 characters'
        }
      }
    },
    landmarks: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true,
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Landmarks must be an array');
          }
        }
      }
    },
    fareMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: 0,
          msg: 'Minimum fare cannot be negative'
        },
        max: {
          args: 50000,
          msg: 'Minimum fare cannot exceed ₦50,000'
        }
      }
    },
    fareMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: 0,
          msg: 'Maximum fare cannot be negative'
        },
        max: {
          args: 50000,
          msg: 'Maximum fare cannot exceed ₦50,000'
        },
        isGreaterThanMin(value) {
          if (this.fareMin && value < this.fareMin) {
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
          args: 480,
          msg: 'Duration cannot exceed 8 hours (480 minutes)'
        }
      }
    },
    pickupPoint: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [5, 200],
          msg: 'Pickup point must be between 5 and 200 characters'
        }
      }
    },
    dropoffPoint: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [5, 200],
          msg: 'Dropoff point must be between 5 and 200 characters'
        }
      }
    },
    // Additional step details
    distance: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: {
          args: 0,
          msg: 'Distance cannot be negative'
        }
      }
    },
    waitTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Wait time cannot be negative'
        },
        max: {
          args: 120,
          msg: 'Wait time cannot exceed 2 hours (120 minutes)'
        }
      }
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      defaultValue: 'Medium',
      allowNull: false
    },
    // Operating conditions
    operatingHours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        start: '05:00',
        end: '22:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }
    },
    peakHours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        morning: { start: '07:00', end: '09:00' },
        evening: { start: '17:00', end: '19:00' }
      }
    },
    // Crowdsourced data
    crowdsourcedFare: {
      type: DataTypes.JSON,
      defaultValue: { reports: [], average: null, lastUpdated: null },
      allowNull: true
    },
    crowdsourcedDuration: {
      type: DataTypes.JSON,
      defaultValue: { reports: [], average: null, lastUpdated: null },
      allowNull: true
    },
    // Quality metrics
    accuracyScore: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 3.0,
      allowNull: false,
      validate: {
        min: 0,
        max: 5
      }
    },
    reportCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    // Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    }
  }, {
    tableName: 'route_steps',
    timestamps: true,
    indexes: [
      {
        fields: ['routeId']
      },
      {
        fields: ['stepNumber']
      },
      {
        fields: ['routeId', 'stepNumber'],
        unique: true
      },
      {
        fields: ['fromLocationId']
      },
      {
        fields: ['toLocationId']
      },
      {
        fields: ['vehicleType']
      },
      {
        fields: ['fareMin']
      },
      {
        fields: ['fareMax']
      },
      {
        fields: ['estimatedDuration']
      },
      {
        fields: ['difficulty']
      },
      {
        fields: ['accuracyScore']
      },
      {
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: (step) => {
        // Ensure fare range is valid
        if (step.fareMax && step.fareMin && step.fareMax < step.fareMin) {
          step.fareMax = step.fareMin;
        }
        
        // Initialize crowdsourced data
        if (!step.crowdsourcedFare) {
          step.crowdsourcedFare = { reports: [], average: null, lastUpdated: null };
        }
        if (!step.crowdsourcedDuration) {
          step.crowdsourcedDuration = { reports: [], average: null, lastUpdated: null };
        }
      },

      beforeValidate: (step) => {
        // Ensure landmarks is an array
        if (step.landmarks && !Array.isArray(step.landmarks)) {
          step.landmarks = [];
        }
        
        // Ensure tags is an array
        if (step.tags && !Array.isArray(step.tags)) {
          step.tags = [];
        }
      }
    }
  });

  // Instance methods
  RouteStep.prototype.getFareRange = function() {
    if (!this.fareMin && !this.fareMax) return null;
    
    return {
      min: this.fareMin || 0,
      max: this.fareMax || this.fareMin || 0,
      average: this.fareMin && this.fareMax ? 
        Math.round((this.fareMin + this.fareMax) / 2) : 
        (this.fareMin || this.fareMax || 0)
    };
  };

  RouteStep.prototype.addCrowdsourceFareReport = async function(fare, userId, confidence = 3) {
    if (!this.crowdsourcedFare) {
      this.crowdsourcedFare = { reports: [], average: null, lastUpdated: null };
    }

    // Add new report
    this.crowdsourcedFare.reports.push({
      fare,
      userId,
      confidence,
      timestamp: new Date(),
      id: require('uuid').v4()
    });

    // Keep only last 20 reports
    if (this.crowdsourcedFare.reports.length > 20) {
      this.crowdsourcedFare.reports = this.crowdsourcedFare.reports.slice(-20);
    }

    // Calculate weighted average
    const totalWeight = this.crowdsourcedFare.reports.reduce((sum, report) => sum + report.confidence, 0);
    const weightedSum = this.crowdsourcedFare.reports.reduce((sum, report) => 
      sum + (report.fare * report.confidence), 0);
    
    this.crowdsourcedFare.average = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    this.crowdsourcedFare.lastUpdated = new Date();

    this.reportCount += 1;
    await this.save();
  };

  RouteStep.prototype.addCrowdsourceDurationReport = async function(duration, userId, confidence = 3) {
    if (!this.crowdsourcedDuration) {
      this.crowdsourcedDuration = { reports: [], average: null, lastUpdated: null };
    }

    // Add new report
    this.crowdsourcedDuration.reports.push({
      duration,
      userId,
      confidence,
      timestamp: new Date(),
      id: require('uuid').v4()
    });

    // Keep only last 20 reports
    if (this.crowdsourcedDuration.reports.length > 20) {
      this.crowdsourcedDuration.reports = this.crowdsourcedDuration.reports.slice(-20);
    }

    // Calculate weighted average
    const totalWeight = this.crowdsourcedDuration.reports.reduce((sum, report) => sum + report.confidence, 0);
    const weightedSum = this.crowdsourcedDuration.reports.reduce((sum, report) => 
      sum + (report.duration * report.confidence), 0);
    
    this.crowdsourcedDuration.average = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    this.crowdsourcedDuration.lastUpdated = new Date();

    this.reportCount += 1;
    await this.save();
  };

  RouteStep.prototype.updateAccuracyScore = async function(score) {
    // Update accuracy score using weighted average
    const weight = 0.1; // Give new score 10% weight
    this.accuracyScore = (this.accuracyScore * (1 - weight)) + (score * weight);
    await this.save();
  };

  RouteStep.prototype.isOperating = function(time = new Date()) {
    if (!this.operatingHours) return true;

    const currentTime = time.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = time.toLocaleDateString('en-US', { weekday: 'long' });

    return (
      this.operatingHours.days.includes(currentDay) &&
      currentTime >= this.operatingHours.start &&
      currentTime <= this.operatingHours.end
    );
  };

  RouteStep.prototype.isPeakTime = function(time = new Date()) {
    if (!this.peakHours) return false;

    const currentTime = time.toTimeString().slice(0, 5); // HH:MM format

    return (
      (currentTime >= this.peakHours.morning.start && currentTime <= this.peakHours.morning.end) ||
      (currentTime >= this.peakHours.evening.start && currentTime <= this.peakHours.evening.end)
    );
  };

  RouteStep.prototype.getEstimatedFareWithPeak = function(isPeak = false) {
    const baseRange = this.getFareRange();
    if (!baseRange) return null;

    if (isPeak) {
      // Increase fare by 20-30% during peak hours
      const multiplier = 1.25;
      return {
        min: Math.round(baseRange.min * multiplier),
        max: Math.round(baseRange.max * multiplier),
        average: Math.round(baseRange.average * multiplier),
        isPeakRate: true
      };
    }

    return { ...baseRange, isPeakRate: false };
  };

  RouteStep.prototype.addLandmark = async function(landmark) {
    if (!this.landmarks) this.landmarks = [];
    if (!this.landmarks.includes(landmark)) {
      this.landmarks.push(landmark);
      await this.save();
    }
  };

  RouteStep.prototype.removeLandmark = async function(landmark) {
    if (this.landmarks && this.landmarks.includes(landmark)) {
      this.landmarks = this.landmarks.filter(l => l !== landmark);
      await this.save();
    }
  };

  RouteStep.prototype.toJSON = function() {
    const step = { ...this.get() };
    
    // Add computed fields
    step.fareRange = this.getFareRange();
    step.isCurrentlyOperating = this.isOperating();
    step.isCurrentlyPeak = this.isPeakTime();
    step.estimatedFareWithPeak = this.getEstimatedFareWithPeak(step.isCurrentlyPeak);
    
    return step;
  };

  // Class methods
  RouteStep.getStepsByRoute = function(routeId) {
    return RouteStep.findAll({
      where: { routeId, isActive: true },
      order: [['stepNumber', 'ASC']]
    });
  };

  RouteStep.getStepsByVehicleType = function(vehicleType, options = {}) {
    return RouteStep.findAll({
      where: {
        vehicleType,
        isActive: true
      },
      order: [['accuracyScore', 'DESC']],
      limit: options.limit || 50
    });
  };

  RouteStep.getStepsNeedingUpdate = function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return RouteStep.findAll({
      where: {
        isActive: true,
        [sequelize.Op.or]: [
          { updatedAt: { [sequelize.Op.lt]: cutoffDate } },
          { reportCount: { [sequelize.Op.lt]: 5 } }
        ]
      },
      order: [['updatedAt', 'ASC']],
      limit: 100
    });
  };

  RouteStep.validateStepSequence = function(steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return { isValid: false, error: 'Steps array is required' };
    }

    // Check step numbers are sequential starting from 1
    const stepNumbers = steps.map(step => step.stepNumber).sort((a, b) => a - b);
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        return { 
          isValid: false, 
          error: `Step numbers must be sequential starting from 1. Missing step ${i + 1}` 
        };
      }
    }

    // Check that each step's toLocation matches the next step's fromLocation
    const sortedSteps = steps.sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      if (sortedSteps[i].toLocationId !== sortedSteps[i + 1].fromLocationId) {
        return {
          isValid: false,
          error: `Step ${i + 1}'s destination must match step ${i + 2}'s origin`
        };
      }
    }

    return { isValid: true };
  };

  RouteStep.calculateRouteTotals = function(steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return { totalDuration: 0, totalFareMin: 0, totalFareMax: 0 };
    }

    return steps.reduce((totals, step) => {
      totals.totalDuration += step.estimatedDuration || 0;
      totals.totalFareMin += step.fareMin || 0;
      totals.totalFareMax += step.fareMax || step.fareMin || 0;
      return totals;
    }, { totalDuration: 0, totalFareMin: 0, totalFareMax: 0 });
  };

  return RouteStep;
};