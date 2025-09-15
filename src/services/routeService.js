const { Route, RouteStep, Location, User, FareFeedback } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');
const { calculateDistance, calculateEstimatedTime } = require('../utils/helpers');
const { VEHICLE_TYPES, ROUTE_DIFFICULTY } = require('../utils/constants');

const routeService = {
  /**
   * Search for routes between two locations
   */
  searchRoutes: async (fromLocationId, toLocationId, options = {}) => {
    try {
      const {
        vehicleTypes = [],
        maxFare = null,
        maxDuration = null,
        difficulty = [],
        limit = 10,
        offset = 0,
        sortBy = 'estimatedDuration',
        sortOrder = 'ASC'
      } = options;

      const whereClause = {
        startLocationId: fromLocationId,
        endLocationId: toLocationId,
        isActive: true
      };

      // Filter by vehicle types
      if (vehicleTypes.length > 0) {
        whereClause.vehicleTypes = {
          [Op.overlap]: vehicleTypes
        };
      }

      // Filter by maximum fare
      if (maxFare) {
        whereClause.estimatedFareMin = {
          [Op.lte]: maxFare
        };
      }

      // Filter by maximum duration
      if (maxDuration) {
        whereClause.estimatedDuration = {
          [Op.lte]: maxDuration
        };
      }

      // Filter by difficulty
      if (difficulty.length > 0) {
        whereClause.difficulty = {
          [Op.in]: difficulty
        };
      }

      const routes = await Route.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Location,
            as: 'startLocation',
            attributes: ['id', 'name', 'latitude', 'longitude', 'address']
          },
          {
            model: Location,
            as: 'endLocation',
            attributes: ['id', 'name', 'latitude', 'longitude', 'address']
          },
          {
            model: RouteStep,
            as: 'steps',
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
            ],
            order: [['stepNumber', 'ASC']]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'reputationScore']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit,
        offset
      });

      // Calculate additional metrics for each route
      const enrichedRoutes = await Promise.all(routes.rows.map(async (route) => {
        const routeData = route.toJSON();
        
        // Get recent fare feedback
        const recentFeedback = await routeService.getRouteFeedbackSummary(route.id);
        
        // Calculate reliability score based on feedback
        const reliabilityScore = routeService.calculateReliabilityScore(recentFeedback);
        
        return {
          ...routeData,
          recentFeedback,
          reliabilityScore,
          totalSteps: routeData.steps.length
        };
      }));

      return {
        routes: enrichedRoutes,
        total: routes.count,
        hasMore: offset + limit < routes.count
      };

    } catch (error) {
      logger.error('Route search error:', error);
      throw error;
    }
  },

  /**
   * Create a new route with steps
   */
  createRoute: async (routeData, userId) => {
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
      } = routeData;

      // Validate that start and end locations exist
      const [startLocation, endLocation] = await Promise.all([
        Location.findByPk(startLocationId),
        Location.findByPk(endLocationId)
      ]);

      if (!startLocation || !endLocation) {
        throw new Error('Start or end location not found');
      }

      // Calculate direct distance for validation
      const directDistance = calculateDistance(
        startLocation.latitude,
        startLocation.longitude,
        endLocation.latitude,
        endLocation.longitude
      );

      // Create the route
      const route = await Route.create({
        startLocationId,
        endLocationId,
        vehicleTypes,
        estimatedFareMin,
        estimatedFareMax,
        estimatedDuration,
        difficulty,
        directDistance,
        createdBy: userId,
        crowdsourcedData: {
          createdAt: new Date(),
          confidence: 3 // Default confidence level
        }
      });

      // Create route steps
      if (steps && steps.length > 0) {
        const routeSteps = steps.map((step, index) => ({
          ...step,
          routeId: route.id,
          stepNumber: index + 1
        }));

        await RouteStep.bulkCreate(routeSteps);
      }

      // Update location route counts
      await Promise.all([
        startLocation.incrementRouteCount(),
        endLocation.incrementRouteCount()
      ]);

      // Update user reputation for creating a route
      const creator = await User.findByPk(userId);
      if (creator) {
        await creator.updateReputation(5); // +5 points for creating a route
      }

      return route.id;

    } catch (error) {
      logger.error('Route creation error:', error);
      throw error;
    }
  },

  /**
   * Get route details with all related data
   */
  getRouteDetails: async (routeId) => {
    try {
      const route = await Route.findByPk(routeId, {
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
            include: [
              {
                model: Location,
                as: 'fromLocation'
              },
              {
                model: Location,
                as: 'toLocation'
              }
            ],
            order: [['stepNumber', 'ASC']]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'reputationScore']
          }
        ]
      });

      if (!route) {
        return null;
      }

      // Get feedback summary
      const feedbackSummary = await routeService.getRouteFeedbackSummary(routeId);
      
      // Calculate metrics
      const reliabilityScore = routeService.calculateReliabilityScore(feedbackSummary);
      
      return {
        ...route.toJSON(),
        feedbackSummary,
        reliabilityScore
      };

    } catch (error) {
      logger.error('Get route details error:', error);
      throw error;
    }
  },

  /**
   * Get feedback summary for a route
   */
  getRouteFeedbackSummary: async (routeId) => {
    try {
      const route = await Route.findByPk(routeId, {
        include: [{
          model: RouteStep,
          as: 'steps',
          include: [{
            model: FareFeedback,
            as: 'feedbacks',
            where: {
              createdAt: {
                [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            required: false
          }]
        }]
      });

      if (!route) {
        return null;
      }

      const allFeedbacks = route.steps.reduce((acc, step) => {
        return acc.concat(step.feedbacks || []);
      }, []);

      if (allFeedbacks.length === 0) {
        return {
          totalFeedbacks: 0,
          averageRating: null,
          averageFare: null,
          lastUpdated: null
        };
      }

      const totalFeedbacks = allFeedbacks.length;
      const averageRating = allFeedbacks.reduce((sum, fb) => sum + fb.rating, 0) / totalFeedbacks;
      const averageFare = allFeedbacks.reduce((sum, fb) => sum + fb.actualFarePaid, 0) / totalFeedbacks;
      const lastUpdated = Math.max(...allFeedbacks.map(fb => new Date(fb.createdAt).getTime()));

      return {
        totalFeedbacks,
        averageRating: Math.round(averageRating * 10) / 10,
        averageFare: Math.round(averageFare),
        lastUpdated: new Date(lastUpdated),
        recentTrends: routeService.calculateRecentTrends(allFeedbacks)
      };

    } catch (error) {
      logger.error('Get route feedback summary error:', error);
      throw error;
    }
  },

  /**
   * Calculate route reliability score
   */
  calculateReliabilityScore: (feedbackSummary) => {
    if (!feedbackSummary || feedbackSummary.totalFeedbacks === 0) {
      return 50; // Default score for routes without feedback
    }

    const { averageRating, totalFeedbacks } = feedbackSummary;
    
    // Base score from average rating (1-5 scale converted to 0-100)
    const ratingScore = ((averageRating - 1) / 4) * 100;
    
    // Confidence factor based on number of feedbacks
    const confidenceFactor = Math.min(totalFeedbacks / 10, 1); // Max confidence at 10+ feedbacks
    
    // Calculate final score
    const reliabilityScore = (ratingScore * confidenceFactor) + (50 * (1 - confidenceFactor));
    
    return Math.round(reliabilityScore);
  },

  /**
   * Calculate recent trends in feedback
   */
  calculateRecentTrends: (feedbacks) => {
    if (feedbacks.length < 2) {
      return { faretrend: 'stable', ratingTrend: 'stable' };
    }

    // Sort by date
    const sortedFeedbacks = feedbacks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Split into recent and older feedback
    const midpoint = Math.floor(sortedFeedbacks.length / 2);
    const olderFeedbacks = sortedFeedbacks.slice(0, midpoint);
    const recentFeedbacks = sortedFeedbacks.slice(midpoint);

    // Calculate averages
    const olderAvgFare = olderFeedbacks.reduce((sum, fb) => sum + fb.actualFarePaid, 0) / olderFeedbacks.length;
    const recentAvgFare = recentFeedbacks.reduce((sum, fb) => sum + fb.actualFarePaid, 0) / recentFeedbacks.length;
    
    const olderAvgRating = olderFeedbacks.reduce((sum, fb) => sum + fb.rating, 0) / olderFeedbacks.length;
    const recentAvgRating = recentFeedbacks.reduce((sum, fb) => sum + fb.rating, 0) / recentFeedbacks.length;

    // Determine trends
    const fareThreshold = olderAvgFare * 0.1; // 10% change threshold
    const ratingThreshold = 0.3; // 0.3 point change threshold

    const fareChange = recentAvgFare - olderAvgFare;
    const ratingChange = recentAvgRating - olderAvgRating;

    return {
      faretrend: Math.abs(fareChange) < fareThreshold ? 'stable' : 
                 fareChange > 0 ? 'increasing' : 'decreasing',
      ratingTrend: Math.abs(ratingChange) < ratingThreshold ? 'stable' : 
                   ratingChange > 0 ? 'improving' : 'declining',
      fareChangePercent: Math.round((fareChange / olderAvgFare) * 100),
      ratingChangePoints: Math.round(ratingChange * 10) / 10
    };
  },

  /**
   * Find alternative routes
   */
  findAlternativeRoutes: async (fromLocationId, toLocationId, excludeRouteId = null) => {
    try {
      const whereClause = {
        startLocationId: fromLocationId,
        endLocationId: toLocationId,
        isActive: true
      };

      if (excludeRouteId) {
        whereClause.id = { [Op.ne]: excludeRouteId };
      }

      const routes = await Route.findAll({
        where: whereClause,
        include: [
          {
            model: Location,
            as: 'startLocation',
            attributes: ['id', 'name', 'latitude', 'longitude']
          },
          {
            model: Location,
            as: 'endLocation',
            attributes: ['id', 'name', 'latitude', 'longitude']
          }
        ],
        order: [['estimatedDuration', 'ASC']],
        limit: 5
      });

      return routes;

    } catch (error) {
      logger.error('Find alternative routes error:', error);
      throw error;
    }
  },

  /**
   * Get popular routes
   */
  getPopularRoutes: async (limit = 10) => {
    try {
      // This would typically use a view count or usage statistics
      // For now, we'll use creation date and feedback count as proxies
      const routes = await Route.findAll({
        where: { isActive: true },
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
          },
          {
            model: User,
            as: 'creator',
            attributes: ['firstName', 'lastName', 'reputationScore']
          }
        ],
        order: [
          ['createdAt', 'DESC'], // More recent routes first
          ['estimatedDuration', 'ASC'] // Faster routes preferred
        ],
        limit
      });

      return routes;

    } catch (error) {
      logger.error('Get popular routes error:', error);
      throw error;
    }
  },

  /**
   * Update route with crowdsourced data
   */
  updateRouteWithCrowdsourcedData: async (routeId, updateData, userId) => {
    try {
      const route = await Route.findByPk(routeId);
      if (!route) {
        throw new Error('Route not found');
      }

      const { updateType, newValue, confidence = 3, comments } = updateData;

      // Prepare update based on type
      const updates = {};
      const crowdsourcedData = route.crowdsourcedData || {};

      switch (updateType) {
        case 'fare':
          // Update fare estimates based on recent reports
          updates.estimatedFareMin = Math.min(route.estimatedFareMin, newValue);
          updates.estimatedFareMax = Math.max(route.estimatedFareMax, newValue);
          break;
        
        case 'duration':
          // Update duration estimate
          updates.estimatedDuration = newValue;
          break;
        
        case 'availability':
          // Update route availability
          updates.isActive = newValue;
          break;
      }

      // Update crowdsourced data tracking
      crowdsourcedData.lastUpdate = new Date();
      crowdsourcedData.lastUpdatedBy = userId;
      crowdsourcedData.totalUpdates = (crowdsourcedData.totalUpdates || 0) + 1;
      crowdsourcedData.averageConfidence = (
        ((crowdsourcedData.averageConfidence || 3) * (crowdsourcedData.totalUpdates - 1) + confidence) /
        crowdsourcedData.totalUpdates
      );

      if (comments) {
        crowdsourcedData.recentComments = crowdsourcedData.recentComments || [];
        crowdsourcedData.recentComments.unshift({
          comment: comments,
          userId,
          createdAt: new Date(),
          updateType
        });
        // Keep only last 10 comments
        crowdsourcedData.recentComments = crowdsourcedData.recentComments.slice(0, 10);
      }

      updates.crowdsourcedData = crowdsourcedData;

      // Update the route
      await route.update(updates);

      // Update user reputation for contributing
      const user = await User.findByPk(userId);
      if (user) {
        await user.updateReputation(2); // +2 points for crowdsourced update
      }

      return route;

    } catch (error) {
      logger.error('Update route with crowdsourced data error:', error);
      throw error;
    }
  },

  /**
   * Get route statistics
   */
  getRouteStatistics: async (routeId) => {
    try {
      const route = await Route.findByPk(routeId, {
        include: [{
          model: RouteStep,
          as: 'steps',
          include: [{
            model: FareFeedback,
            as: 'feedbacks'
          }]
        }]
      });

      if (!route) {
        return null;
      }

      const allFeedbacks = route.steps.reduce((acc, step) => {
        return acc.concat(step.feedbacks || []);
      }, []);

      const stats = {
        totalFeedbacks: allFeedbacks.length,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averageFare: 0,
        fareRange: { min: null, max: null },
        vehicleTypeUsage: {},
        timeOfDayUsage: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        dayOfWeekUsage: {}
      };

      if (allFeedbacks.length > 0) {
        // Calculate rating statistics
        stats.averageRating = allFeedbacks.reduce((sum, fb) => sum + fb.rating, 0) / allFeedbacks.length;
        allFeedbacks.forEach(fb => {
          stats.ratingDistribution[fb.rating]++;
        });

        // Calculate fare statistics
        const fares = allFeedbacks.map(fb => fb.actualFarePaid);
        stats.averageFare = fares.reduce((sum, fare) => sum + fare, 0) / fares.length;
        stats.fareRange.min = Math.min(...fares);
        stats.fareRange.max = Math.max(...fares);

        // Vehicle type usage
        allFeedbacks.forEach(fb => {
          const vehicle = fb.vehicleTypeUsed;
          stats.vehicleTypeUsage[vehicle] = (stats.vehicleTypeUsage[vehicle] || 0) + 1;
        });

        // Time patterns (if available in feedback)
        allFeedbacks.forEach(fb => {
          const date = new Date(fb.dateOfTravel);
          const hour = date.getHours();
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

          // Time of day
          if (hour >= 5 && hour < 12) stats.timeOfDayUsage.morning++;
          else if (hour >= 12 && hour < 17) stats.timeOfDayUsage.afternoon++;
          else if (hour >= 17 && hour < 21) stats.timeOfDayUsage.evening++;
          else stats.timeOfDayUsage.night++;

          // Day of week
          stats.dayOfWeekUsage[dayOfWeek] = (stats.dayOfWeekUsage[dayOfWeek] || 0) + 1;
        });
      }

      return stats;

    } catch (error) {
      logger.error('Get route statistics error:', error);
      throw error;
    }
  }
};

module.exports = routeService;