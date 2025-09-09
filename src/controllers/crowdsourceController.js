const { Route, RouteStep, Location, User, FareFeedback } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { 
  AppError, 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  AuthorizationError,
  AuthenticationError
} = require('../middleware/errorHandler');

const crowdsourceController = {
  // Submit route update (crowdsourced improvements)
  submitRouteUpdate: async (req, res) => {
    try {
      const { 
        routeId, 
        updateType, 
        newValue, 
        comments, 
        confidence = 3 
      } = req.body;

      // Validate route exists
      const route = await Route.findOne({
        where: { id: routeId, isActive: true }
      });

      if (!route) {
        throw new NotFoundError('Route');
      }

      // Validate update type and value
      const validUpdateTypes = ['fare', 'duration', 'availability', 'condition'];
      if (!validUpdateTypes.includes(updateType)) {
        throw new ValidationError('Invalid update type');
      }

      // Process the update based on type
      let updateData = {
        type: updateType,
        value: newValue,
        comments,
        confidence,
        contributorId: req.user ? req.user.id : null,
        contributorReputation: req.user ? req.user.reputationScore : 0,
        timestamp: new Date(),
        ip: req.ip
      };

      // Update route's crowdsourced data
      const currentCrowdsourcedData = route.crowdsourcedData || {};
      const updates = currentCrowdsourcedData.updates || [];
      
      updates.push(updateData);

      // Keep only last 50 updates to prevent data bloat
      if (updates.length > 50) {
        updates.splice(0, updates.length - 50);
      }

      // Calculate new aggregate values based on updates
      const aggregatedData = calculateAggregatedData(updates, updateType, newValue);

      const newCrowdsourcedData = {
        ...currentCrowdsourcedData,
        updates,
        lastUpdated: new Date(),
        contributorCount: (currentCrowdsourcedData.contributorCount || 0) + 1,
        confidence: calculateOverallConfidence(updates),
        ...aggregatedData
      };

      // Update the route with new crowdsourced data
      await route.update({ crowdsourcedData: newCrowdsourcedData });

      // Update user reputation if authenticated
      if (req.user) {
        const reputationGain = confidence >= 4 ? 8 : 5; // Higher gain for confident updates
        await req.user.updateReputation(reputationGain);
      }

      logger.info(`Route update submitted: ${updateType}`, {
        routeId,
        updateType,
        userId: req.user?.id,
        confidence,
        newValue
      });

      res.status(201).json({
        success: true,
        message: 'Route update submitted successfully',
        data: {
          update: updateData,
          routeId,
          newCrowdsourcedData: {
            confidence: newCrowdsourcedData.confidence,
            contributorCount: newCrowdsourcedData.contributorCount,
            lastUpdated: newCrowdsourcedData.lastUpdated
          }
        }
      });

    } catch (error) {
      logger.error('Route update submission error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit route update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Submit fare report with detailed information
  submitFareReport: async (req, res) => {
    try {
      const { 
        routeStepId, 
        actualFarePaid, 
        vehicleTypeUsed, 
        dateOfTravel, 
        timeOfDay, 
        trafficCondition, 
        weatherCondition 
      } = req.body;

      // Validate route step exists
      const routeStep = await RouteStep.findOne({
        where: { id: routeStepId },
        include: [{ model: Route, as: 'route' }]
      });

      if (!routeStep) {
        throw new NotFoundError('Route step');
      }

      // Check if user already reported fare for this step recently
      if (req.user) {
        const recentReport = await FareFeedback.findOne({
          where: {
            userId: req.user.id,
            routeStepId,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
            }
          }
        });

        if (recentReport) {
          throw new ConflictError('You have already reported fare for this route step in the last 6 hours');
        }
      }

      // Validate travel date is not in the future
      const travelDate = new Date(dateOfTravel);
      if (travelDate > new Date()) {
        throw new ValidationError('Travel date cannot be in the future');
      }

      // Create detailed fare feedback
      const fareReport = await FareFeedback.create({
        userId: req.user ? req.user.id : null,
        routeStepId,
        actualFarePaid,
        vehicleTypeUsed,
        dateOfTravel: travelDate,
        rating: calculateFareRating(actualFarePaid, routeStep.fareMin, routeStep.fareMax),
        comments: `Fare: ₦${actualFarePaid}, Time: ${timeOfDay}, Traffic: ${trafficCondition || 'N/A'}, Weather: ${weatherCondition || 'N/A'}`
      });

      // Update route step fare estimates based on recent reports
      await updateFareEstimates(routeStep, actualFarePaid);

      // Update user reputation
      if (req.user) {
        await req.user.updateReputation(5); // +5 for fare reporting
      }

      logger.info(`Fare report submitted: ₦${actualFarePaid}`, {
        fareReportId: fareReport.id,
        routeStepId,
        userId: req.user?.id,
        vehicleType: vehicleTypeUsed,
        timeOfDay
      });

      res.status(201).json({
        success: true,
        message: 'Fare report submitted successfully',
        data: {
          fareReport,
          routeStepId,
          estimatedRating: fareReport.rating
        }
      });

    } catch (error) {
      logger.error('Fare report submission error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit fare report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Submit new route suggestion
  submitNewRoute: async (req, res) => {
    const transaction = await Route.sequelize.transaction();
    
    try {
      const { 
        startLocationId, 
        endLocationId, 
        vehicleTypes, 
        estimatedFareMin, 
        estimatedFareMax, 
        estimatedDuration, 
        description, 
        steps, 
        confidence = 3 
      } = req.body;

      if (!req.user) {
        throw new AuthenticationError('Authentication required to suggest new routes');
      }

      // Check user reputation for route creation
      if (req.user.reputationScore < 50) {
        throw new AuthorizationError('Minimum reputation score of 50 required to suggest new routes');
      }

      // Validate locations exist
      const startLocation = await Location.findByPk(startLocationId);
      const endLocation = await Location.findByPk(endLocationId);

      if (!startLocation || !endLocation) {
        throw new NotFoundError('Start or end location not found');
      }

      // Check if similar route already exists
      const existingRoute = await Route.findOne({
        where: {
          startLocationId,
          endLocationId,
          isActive: true
        }
      });

      if (existingRoute) {
        throw new ConflictError('A route between these locations already exists. Consider updating the existing route instead.');
      }

      // Validate steps
      if (!steps || steps.length === 0) {
        throw new ValidationError('At least one route step is required');
      }

      // Create route with crowdsourced flag
      const route = await Route.create({
        startLocationId,
        endLocationId,
        vehicleTypes,
        estimatedFareMin,
        estimatedFareMax,
        estimatedDuration,
        difficulty: 'Medium', // Default for suggested routes
        createdBy: req.user.id,
        isActive: false, // Require approval for crowdsourced routes
        crowdsourcedData: {
          isSuggestion: true,
          description,
          confidence,
          contributorCount: 1,
          suggestionDate: new Date(),
          needsApproval: true
        }
      }, { transaction });

      // Create route steps
      const routeSteps = await Promise.all(
        steps.map(step => RouteStep.create({
          routeId: route.id,
          stepNumber: step.stepNumber,
          fromLocationId: step.fromLocationId,
          toLocationId: step.toLocationId,
          vehicleType: step.vehicleType,
          instructions: step.instructions,
          landmarks: step.landmarks || [],
          fareMin: step.fareMin,
          fareMax: step.fareMax,
          estimatedDuration: step.estimatedDuration,
          pickupPoint: step.pickupPoint,
          dropoffPoint: step.dropoffPoint
        }, { transaction }))
      );

      // Update user reputation for route suggestion
      await req.user.updateReputation(15); // +15 for suggesting a route

      await transaction.commit();

      logger.info(`New route suggested: ${startLocation.name} to ${endLocation.name}`, {
        routeId: route.id,
        userId: req.user.id,
        confidence,
        stepsCount: routeSteps.length
      });

      res.status(201).json({
        success: true,
        message: 'New route suggestion submitted successfully. It will be reviewed before activation.',
        data: {
          route: {
            id: route.id,
            startLocation: startLocation.name,
            endLocation: endLocation.name,
            status: 'pending_approval',
            confidence
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('New route suggestion error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit route suggestion',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get user's contributions
  getMyContributions: async (req, res) => {
    try {
      const { limit = 20, offset = 0, type } = req.query;

      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Get fare reports
      const fareReports = await FareFeedback.findAll({
        where: { userId: req.user.id },
        include: [{
          model: RouteStep,
          as: 'routeStep',
          include: [
            { model: Route, as: 'route' },
            { model: Location, as: 'fromLocation' },
            { model: Location, as: 'toLocation' }
          ]
        }],
        order: [['createdAt', 'DESC']],
        limit: type === 'fares' ? Math.min(parseInt(limit), 50) : 10
      });

      // Get created routes
      const createdRoutes = await Route.findAll({
        where: { createdBy: req.user.id },
        include: [
          { model: Location, as: 'startLocation' },
          { model: Location, as: 'endLocation' }
        ],
        order: [['createdAt', 'DESC']],
        limit: type === 'routes' ? Math.min(parseInt(limit), 50) : 5
      });

      // Get route updates from crowdsourced data
      const routeUpdates = await Route.findAll({
        where: {
          crowdsourcedData: {
            [Op.contains]: { updates: [{ contributorId: req.user.id }] }
          }
        },
        include: [
          { model: Location, as: 'startLocation' },
          { model: Location, as: 'endLocation' }
        ],
        order: [['updatedAt', 'DESC']],
        limit: type === 'updates' ? Math.min(parseInt(limit), 50) : 5
      });

      // Calculate contribution statistics
      const stats = {
        totalFareReports: fareReports.length,
        totalRoutes: createdRoutes.length,
        totalUpdates: routeUpdates.length,
        currentReputation: req.user.reputationScore,
        totalContributions: req.user.totalContributions
      };

      res.json({
        success: true,
        message: 'Your contributions retrieved successfully',
        data: {
          stats,
          contributions: {
            fareReports: fareReports.slice(0, type === 'fares' ? parseInt(limit) : 5),
            createdRoutes: createdRoutes.slice(0, type === 'routes' ? parseInt(limit) : 5),
            routeUpdates: routeUpdates.slice(0, type === 'updates' ? parseInt(limit) : 5)
          }
        }
      });

    } catch (error) {
      logger.error('Get contributions error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get contributions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get pending route suggestions (for admins)
  getPendingSuggestions: async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;

      // Check if user has admin privileges
      if (!req.user || req.user.reputationScore < 500) {
        throw new AuthorizationError('Admin privileges required');
      }

      const suggestions = await Route.findAndCountAll({
        where: {
          isActive: false,
          crowdsourcedData: {
            [Op.contains]: { needsApproval: true }
          }
        },
        include: [
          { model: Location, as: 'startLocation' },
          { model: Location, as: 'endLocation' },
          { 
            model: User, 
            as: 'creator',
            attributes: ['firstName', 'lastName', 'reputationScore']
          },
          {
            model: RouteStep,
            as: 'steps',
            order: [['stepNumber', 'ASC']]
          }
        ],
        order: [['createdAt', 'ASC']], // Oldest first
        limit: Math.min(parseInt(limit), 50),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        message: 'Pending route suggestions retrieved successfully',
        data: {
          suggestions: suggestions.rows,
          pagination: {
            total: suggestions.count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: suggestions.count > (parseInt(offset) + parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Get pending suggestions error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get pending suggestions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Approve or reject route suggestion
  reviewSuggestion: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body; // action: 'approve' or 'reject'

      // Check if user has admin privileges
      if (!req.user || req.user.reputationScore < 500) {
        throw new AuthorizationError('Admin privileges required');
      }

      if (!['approve', 'reject'].includes(action)) {
        throw new ValidationError('Action must be either "approve" or "reject"');
      }

      const route = await Route.findByPk(id, {
        include: [
          { model: User, as: 'creator' },
          { model: Location, as: 'startLocation' },
          { model: Location, as: 'endLocation' }
        ]
      });

      if (!route) {
        throw new NotFoundError('Route suggestion');
      }

      if (!route.crowdsourcedData?.needsApproval) {
        throw new ValidationError('This route does not need approval');
      }

      if (action === 'approve') {
        // Approve the route
        const updatedCrowdsourcedData = {
          ...route.crowdsourcedData,
          needsApproval: false,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          reviewComments: comments
        };

        await route.update({
          isActive: true,
          crowdsourcedData: updatedCrowdsourcedData
        });

        // Give bonus reputation to the creator
        if (route.creator) {
          await route.creator.updateReputation(25); // +25 bonus for approved route
        }

        logger.info(`Route suggestion approved: ${id}`, {
          routeId: id,
          approvedBy: req.user.id,
          creatorId: route.createdBy
        });

      } else {
        // Reject the route
        const updatedCrowdsourcedData = {
          ...route.crowdsourcedData,
          needsApproval: false,
          rejectedBy: req.user.id,
          rejectedAt: new Date(),
          reviewComments: comments
        };

        await route.update({
          crowdsourcedData: updatedCrowdsourcedData
        });

        logger.info(`Route suggestion rejected: ${id}`, {
          routeId: id,
          rejectedBy: req.user.id,
          creatorId: route.createdBy,
          reason: comments
        });
      }

      res.json({
        success: true,
        message: `Route suggestion ${action}d successfully`,
        data: {
          routeId: id,
          action,
          reviewedBy: req.user.id,
          comments
        }
      });

    } catch (error) {
      logger.error('Route suggestion review error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to review suggestion',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get crowdsourcing statistics
  getStats: async (req, res) => {
    try {
      const totalFareReports = await FareFeedback.count();
      const totalSuggestions = await Route.count({
        where: {
          crowdsourcedData: {
            [Op.contains]: { isSuggestion: true }
          }
        }
      });

      const pendingSuggestions = await Route.count({
        where: {
          isActive: false,
          crowdsourcedData: {
            [Op.contains]: { needsApproval: true }
          }
        }
      });

      const topContributors = await User.findAll({
        order: [['totalContributions', 'DESC']],
        limit: 10,
        attributes: ['firstName', 'lastName', 'reputationScore', 'totalContributions']
      });

      const recentActivity = await FareFeedback.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        attributes: ['createdAt'],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        message: 'Crowdsourcing statistics retrieved successfully',
        data: {
          overview: {
            totalFareReports,
            totalSuggestions,
            pendingSuggestions,
            approvedSuggestions: totalSuggestions - pendingSuggestions
          },
          recentActivity: {
            lastWeekReports: recentActivity.length,
            averagePerDay: (recentActivity.length / 7).toFixed(1)
          },
          topContributors: topContributors.map(user => ({
            name: `${user.firstName} ${user.lastName}`,
            reputation: user.reputationScore,
            contributions: user.totalContributions
          }))
        }
      });

    } catch (error) {
      logger.error('Crowdsourcing stats error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get crowdsourcing statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Helper functions
const calculateAggregatedData = (updates, updateType, newValue) => {
  const recentUpdates = updates.filter(update => 
    update.type === updateType && 
    new Date(update.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  );

  if (recentUpdates.length === 0) return {};

  switch (updateType) {
    case 'fare':
      const avgFare = recentUpdates.reduce((sum, update) => sum + update.value, 0) / recentUpdates.length;
      return { averageFare: Math.round(avgFare) };
    case 'duration':
      const avgDuration = recentUpdates.reduce((sum, update) => sum + update.value, 0) / recentUpdates.length;
      return { averageDuration: Math.round(avgDuration) };
    default:
      return {};
  }
};

const calculateOverallConfidence = (updates) => {
  if (updates.length === 0) return 1;
  
  const recentUpdates = updates.filter(update => 
    new Date(update.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  if (recentUpdates.length === 0) return 1;
  
  const weightedSum = recentUpdates.reduce((sum, update) => {
    const weight = (update.contributorReputation || 100) / 100;
    return sum + (update.confidence * weight);
  }, 0);
  
  const totalWeight = recentUpdates.reduce((sum, update) => {
    return sum + ((update.contributorReputation || 100) / 100);
  }, 0);
  
  return Math.min(5, Math.max(1, weightedSum / totalWeight));
};

const calculateFareRating = (actualFare, fareMin, fareMax) => {
  if (!fareMin || !fareMax) return 3; // Neutral rating if no estimates
  
  const midPoint = (fareMin + fareMax) / 2;
  const tolerance = (fareMax - fareMin) / 4;
  
  if (actualFare <= midPoint - tolerance) return 5; // Great value
  if (actualFare <= midPoint + tolerance) return 4; // Good value
  if (actualFare <= fareMax) return 3; // Expected
  if (actualFare <= fareMax * 1.2) return 2; // Expensive
  return 1; // Very expensive
};

const updateFareEstimates = async (routeStep, actualFare) => {
  // Get recent fare reports for this step
  const recentReports = await FareFeedback.findAll({
    where: {
      routeStepId: routeStep.id,
      createdAt: {
        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  if (recentReports.length >= 3) {
    const fares = recentReports.map(report => report.actualFarePaid);
    const newFareMin = Math.min(...fares);
    const newFareMax = Math.max(...fares);
    
    // Only update if there's significant change
    const currentRange = (routeStep.fareMax || 0) - (routeStep.fareMin || 0);
    const newRange = newFareMax - newFareMin;
    
    if (Math.abs(newRange - currentRange) > currentRange * 0.2) {
      await routeStep.update({
        fareMin: newFareMin,
        fareMax: newFareMax
      });
    }
  }
};

module.exports = crowdsourceController;