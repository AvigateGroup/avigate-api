const { Route, RouteStep, Location, User, FareFeedback } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { 
  AppError, 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  AuthorizationError 
} = require('../middleware/errorHandler');

const routeController = {
  // Create a new route with steps
  create: async (req, res) => {
    const transaction = await Route.sequelize.transaction();
    
    try {
      const { 
        startLocationId, 
        endLocationId, 
        vehicleTypes, 
        estimatedFareMin, 
        estimatedFareMax, 
        estimatedDuration, 
        difficulty = 'Medium',
        steps 
      } = req.body;

      // Validate locations exist
      const startLocation = await Location.findByPk(startLocationId);
      const endLocation = await Location.findByPk(endLocationId);

      if (!startLocation || !endLocation) {
        throw new NotFoundError('Start or end location not found');
      }

      if (startLocationId === endLocationId) {
        throw new ValidationError('Start and end locations cannot be the same');
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
        throw new ConflictError('A route between these locations already exists');
      }

      // Validate route steps
      if (!steps || steps.length === 0) {
        throw new ValidationError('At least one route step is required');
      }

      // Validate step sequence
      const stepNumbers = steps.map(step => step.stepNumber).sort((a, b) => a - b);
      for (let i = 0; i < stepNumbers.length; i++) {
        if (stepNumbers[i] !== i + 1) {
          throw new ValidationError('Route steps must be sequential starting from 1');
        }
      }

      // Create the route
      const route = await Route.create({
        startLocationId,
        endLocationId,
        vehicleTypes,
        estimatedFareMin,
        estimatedFareMax,
        estimatedDuration,
        difficulty,
        createdBy: req.user ? req.user.id : null,
        crowdsourcedData: {
          contributorCount: 1,
          lastUpdated: new Date(),
          confidence: req.user ? Math.min(req.user.reputationScore / 100, 5) : 1
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

      // Update location route counts
      await startLocation.incrementRouteCount();
      await endLocation.incrementRouteCount();

      // Update user reputation
      if (req.user) {
        await req.user.updateReputation(20); // +20 for creating a route
      }

      await transaction.commit();

      logger.info(`Route created from ${startLocation.name} to ${endLocation.name}`, {
        routeId: route.id,
        userId: req.user?.id,
        stepsCount: routeSteps.length
      });

      // Fetch complete route with associations
      const completeRoute = await Route.findByPk(route.id, {
        include: [
          { model: Location, as: 'startLocation' },
          { model: Location, as: 'endLocation' },
          { 
            model: RouteStep, 
            as: 'steps',
            order: [['stepNumber', 'ASC']],
            include: [
              { model: Location, as: 'fromLocation' },
              { model: Location, as: 'toLocation' }
            ]
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Route created successfully',
        data: {
          route: completeRoute
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Route creation error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create route',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Search routes between locations
  search: async (req, res) => {
    try {
      const { 
        from, 
        to, 
        vehicleTypes, 
        maxFare, 
        maxDuration, 
        difficulty, 
        limit = 10 
      } = req.query;

      if (!from || !to) {
        throw new ValidationError('From and to location IDs are required');
      }

      // Build search criteria
      let whereClause = {
        startLocationId: from,
        endLocationId: to,
        isActive: true
      };

      if (vehicleTypes && vehicleTypes.length > 0) {
        whereClause.vehicleTypes = {
          [Op.overlap]: Array.isArray(vehicleTypes) ? vehicleTypes : [vehicleTypes]
        };
      }

      if (maxFare) {
        whereClause.estimatedFareMax = { [Op.lte]: parseInt(maxFare) };
      }

      if (maxDuration) {
        whereClause.estimatedDuration = { [Op.lte]: parseInt(maxDuration) };
      }

      if (difficulty && difficulty.length > 0) {
        whereClause.difficulty = {
          [Op.in]: Array.isArray(difficulty) ? difficulty : [difficulty]
        };
      }

      const routes = await Route.findAll({
        where: whereClause,
        include: [
          { 
            model: Location, 
            as: 'startLocation',
            attributes: ['id', 'name', 'latitude', 'longitude', 'address', 'city', 'state']
          },
          { 
            model: Location, 
            as: 'endLocation',
            attributes: ['id', 'name', 'latitude', 'longitude', 'address', 'city', 'state']
          },
          { 
            model: RouteStep, 
            as: 'steps',
            order: [['stepNumber', 'ASC']],
            include: [
              { 
                model: Location, 
                as: 'fromLocation',
                attributes: ['id', 'name', 'latitude', 'longitude']
              },
              { 
                model: Location, 
                as: 'toLocation',
                attributes: ['id', 'name', 'latitude', 'longitude']
              }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName', 'reputationScore'],
            required: false
          }
        ],
        order: [
          ['crowdsourcedData', 'DESC'], // Routes with higher confidence first
          ['estimatedFareMin', 'ASC'],
          ['estimatedDuration', 'ASC']
        ],
        limit: Math.min(parseInt(limit), 20)
      });

      // Calculate route popularity and add metadata
      const routesWithMetadata = routes.map(route => {
        const routeData = route.toJSON();
        routeData.metadata = {
          totalSteps: routeData.steps.length,
          vehicleChanges: routeData.steps.filter((step, index) => 
            index > 0 && step.vehicleType !== routeData.steps[index - 1].vehicleType
          ).length,
          confidence: routeData.crowdsourcedData?.confidence || 1,
          popularity: 'medium' // You can calculate this based on usage stats
        };
        return routeData;
      });

      res.json({
        success: true,
        message: 'Route search completed successfully',
        data: {
          routes: routesWithMetadata,
          count: routes.length,
          searchCriteria: {
            from,
            to,
            vehicleTypes,
            maxFare,
            maxDuration,
            difficulty
          }
        }
      });

    } catch (error) {
      logger.error('Route search error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Route search failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get route by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const route = await Route.findOne({
        where: { id, isActive: true },
        include: [
          { 
            model: Location, 
            as: 'startLocation'
          },
          { 
            model: Location, 
            as: 'endLocation'
          },
          { 
            model: RouteStep, 
            as: 'steps',
            order: [['stepNumber', 'ASC']],
            include: [
              { model: Location, as: 'fromLocation' },
              { model: Location, as: 'toLocation' }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName', 'reputationScore'],
            required: false
          }
        ]
      });

      if (!route) {
        throw new NotFoundError('Route');
      }

      // Get recent feedback for this route
      const recentFeedback = await FareFeedback.findAll({
        include: [{
          model: RouteStep,
          as: 'routeStep',
          where: { routeId: id }
        }],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Calculate average ratings and fares
      const feedbackStats = {
        totalFeedback: recentFeedback.length,
        averageRating: recentFeedback.length > 0 ? 
          (recentFeedback.reduce((sum, fb) => sum + fb.rating, 0) / recentFeedback.length).toFixed(1) : null,
        averageFare: recentFeedback.length > 0 ?
          (recentFeedback.reduce((sum, fb) => sum + fb.actualFarePaid, 0) / recentFeedback.length).toFixed(2) : null
      };

      res.json({
        success: true,
        message: 'Route retrieved successfully',
        data: {
          route,
          feedbackStats,
          recentFeedback: recentFeedback.slice(0, 5) // Only show 5 most recent
        }
      });

    } catch (error) {
      logger.error('Get route error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get route',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update route
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        vehicleTypes, 
        estimatedFareMin, 
        estimatedFareMax, 
        estimatedDuration, 
        difficulty, 
        isActive 
      } = req.body;

      const route = await Route.findOne({
        where: { id, isActive: true }
      });

      if (!route) {
        throw new NotFoundError('Route');
      }

      // Check permissions
      const canEdit = !req.user || 
                     route.createdBy === req.user.id || 
                     req.user.reputationScore >= 300;

      if (!canEdit) {
        throw new AuthorizationError('Insufficient permissions to edit this route');
      }

      // Update fields
      const updates = {};
      if (vehicleTypes) updates.vehicleTypes = vehicleTypes;
      if (estimatedFareMin) updates.estimatedFareMin = estimatedFareMin;
      if (estimatedFareMax) updates.estimatedFareMax = estimatedFareMax;
      if (estimatedDuration) updates.estimatedDuration = estimatedDuration;
      if (difficulty) updates.difficulty = difficulty;
      if (typeof isActive === 'boolean' && req.user?.reputationScore >= 500) {
        updates.isActive = isActive;
      }

      // Update crowdsourced data
      if (Object.keys(updates).length > 0) {
        updates.crowdsourcedData = {
          ...route.crowdsourcedData,
          lastUpdated: new Date(),
          contributorCount: (route.crowdsourcedData?.contributorCount || 0) + 1
        };
      }

      await route.update(updates);

      // Update user reputation if not their own route
      if (req.user && route.createdBy !== req.user.id) {
        await req.user.updateReputation(5); // +5 for improving a route
      }

      logger.info(`Route updated: ${id}`, {
        routeId: id,
        userId: req.user?.id,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Route updated successfully',
        data: {
          route: route.toJSON()
        }
      });

    } catch (error) {
      logger.error('Route update error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update route',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Submit feedback for a route
  submitFeedback: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        routeStepId, 
        actualFarePaid, 
        vehicleTypeUsed, 
        dateOfTravel, 
        rating, 
        comments 
      } = req.body;

      // Validate route exists
      const route = await Route.findOne({
        where: { id, isActive: true }
      });

      if (!route) {
        throw new NotFoundError('Route');
      }

      // Validate route step belongs to this route
      const routeStep = await RouteStep.findOne({
        where: { id: routeStepId, routeId: id }
      });

      if (!routeStep) {
        throw new ValidationError('Route step does not belong to this route');
      }

      // Check if user already gave feedback for this step recently
      if (req.user) {
        const recentFeedback = await FareFeedback.findOne({
          where: {
            userId: req.user.id,
            routeStepId,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        });

        if (recentFeedback) {
          throw new ConflictError('You have already provided feedback for this route step in the last 24 hours');
        }
      }

      // Create feedback
      const feedback = await FareFeedback.create({
        userId: req.user ? req.user.id : null,
        routeStepId,
        actualFarePaid,
        vehicleTypeUsed,
        dateOfTravel: new Date(dateOfTravel),
        rating,
        comments
      });

      // Update user reputation
      if (req.user) {
        await req.user.updateReputation(3); // +3 for providing feedback
      }

      // Update route crowdsourced data with new feedback
      const updatedCrowdsourcedData = {
        ...route.crowdsourcedData,
        lastFeedback: new Date(),
        feedbackCount: (route.crowdsourcedData?.feedbackCount || 0) + 1
      };

      await route.update({ crowdsourcedData: updatedCrowdsourcedData });

      logger.info(`Feedback submitted for route ${id}`, {
        feedbackId: feedback.id,
        routeId: id,
        routeStepId,
        userId: req.user?.id,
        rating
      });

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          feedback
        }
      });

    } catch (error) {
      logger.error('Route feedback error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit feedback',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get popular routes
  getPopular: async (req, res) => {
    try {
      const { limit = 10, state, city } = req.query;
      const maxLimit = Math.min(parseInt(limit), 20);

      let whereClause = { isActive: true };
      let locationFilter = {};

      if (state || city) {
        if (state) locationFilter.state = state;
        if (city) locationFilter.city = { [Op.iLike]: `%${city}%` };
      }

      const routes = await Route.findAll({
        where: whereClause,
        include: [
          { 
            model: Location, 
            as: 'startLocation',
            where: Object.keys(locationFilter).length > 0 ? locationFilter : undefined,
            attributes: ['id', 'name', 'city', 'state']
          },
          { 
            model: Location, 
            as: 'endLocation',
            attributes: ['id', 'name', 'city', 'state']
          }
        ],
        order: [
          [Route.sequelize.literal('(crowdsourced_data->>\'feedbackCount\')::int'), 'DESC'],
          [Route.sequelize.literal('(crowdsourced_data->>\'confidence\')::float'), 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: maxLimit
      });

      res.json({
        success: true,
        message: 'Popular routes retrieved successfully',
        data: {
          routes,
          count: routes.length
        }
      });

    } catch (error) {
      logger.error('Get popular routes error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get popular routes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete route (soft delete)
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const route = await Route.findOne({
        where: { id, isActive: true }
      });

      if (!route) {
        throw new NotFoundError('Route');
      }

      // Check permissions
      const canDelete = !req.user || 
                       route.createdBy === req.user.id || 
                       req.user.reputationScore >= 1000;

      if (!canDelete) {
        throw new AuthorizationError('Insufficient permissions to delete this route');
      }

      // Soft delete
      await route.update({ isActive: false });

      logger.info(`Route deleted: ${id}`, {
        routeId: id,
        userId: req.user?.id
      });

      res.json({
        success: true,
        message: 'Route deleted successfully'
      });

    } catch (error) {
      logger.error('Route deletion error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to delete route',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get route statistics
  getStats: async (req, res) => {
    try {
      const totalRoutes = await Route.count({ where: { isActive: true } });
      
      const routesByDifficulty = await Route.findAll({
        attributes: [
          'difficulty',
          [Route.sequelize.fn('COUNT', Route.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['difficulty']
      });

      const routesByVehicleType = await Route.findAll({
        attributes: [
          [Route.sequelize.fn('UNNEST', Route.sequelize.col('vehicleTypes')), 'vehicleType'],
          [Route.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: { isActive: true },
        group: [Route.sequelize.fn('UNNEST', Route.sequelize.col('vehicleTypes'))],
        raw: true
      });

      const avgFareRange = await Route.findOne({
        attributes: [
          [Route.sequelize.fn('AVG', Route.sequelize.col('estimatedFareMin')), 'avgMinFare'],
          [Route.sequelize.fn('AVG', Route.sequelize.col('estimatedFareMax')), 'avgMaxFare'],
          [Route.sequelize.fn('AVG', Route.sequelize.col('estimatedDuration')), 'avgDuration']
        ],
        where: { isActive: true },
        raw: true
      });

      res.json({
        success: true,
        message: 'Route statistics retrieved successfully',
        data: {
          totalRoutes,
          routesByDifficulty: routesByDifficulty.map(stat => ({
            difficulty: stat.difficulty,
            count: parseInt(stat.dataValues.count)
          })),
          routesByVehicleType: routesByVehicleType.map(stat => ({
            vehicleType: stat.vehicleType,
            count: parseInt(stat.count)
          })),
          averages: {
            minFare: parseFloat(avgFareRange.avgMinFare || 0).toFixed(2),
            maxFare: parseFloat(avgFareRange.avgMaxFare || 0).toFixed(2),
            duration: parseFloat(avgFareRange.avgDuration || 0).toFixed(0) + ' minutes'
          }
        }
      });

    } catch (error) {
      logger.error('Route stats error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get route statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get my routes (user's created routes)
  getMyRoutes: async (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;

      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const routes = await Route.findAndCountAll({
        where: { 
          createdBy: req.user.id,
          isActive: true 
        },
        include: [
          { 
            model: Location, 
            as: 'startLocation',
            attributes: ['id', 'name', 'city', 'state']
          },
          { 
            model: Location, 
            as: 'endLocation',
            attributes: ['id', 'name', 'city', 'state']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: Math.min(parseInt(limit), 50),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        message: 'Your routes retrieved successfully',
        data: {
          routes: routes.rows,
          pagination: {
            total: routes.count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: routes.count > (parseInt(offset) + parseInt(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Get my routes error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get your routes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = routeController;