const { Location, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { NIGERIA_BOUNDS } = require('../utils/validators');
const { calculateDistance, formatLocationResponse } = require('../utils/helpers');

const locationService = {
  /**
   * Create a new location
   * @param {Object} locationData - Location data
   * @param {string} userId - User creating the location
   * @returns {Promise<Object>} Created location
   */
  async createLocation(locationData, userId = null) {
    try {
      const location = await Location.create({
        ...locationData,
        createdBy: userId,
        isVerified: false // New locations need verification
      });

      logger.info(`Location created: ${location.name}`, {
        locationId: location.id,
        userId,
        coordinates: [location.latitude, location.longitude]
      });

      return formatLocationResponse(location);
    } catch (error) {
      logger.error('Error creating location:', error);
      throw error;
    }
  },

  /**
   * Search locations by text query
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchLocations(searchParams) {
    try {
      const {
        q,
        city,
        state,
        locationType,
        lat,
        lng,
        radius = 10,
        limit = 20,
        offset = 0,
        sortBy = 'relevance'
      } = searchParams;

      let whereClause = { isActive: true };
      let orderClause = [];

      // Text search
      if (q) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${q}%` } },
          { address: { [Op.iLike]: `%${q}%` } },
          { city: { [Op.iLike]: `%${q}%` } }
        ];
      }

      // Filter by city
      if (city) {
        whereClause.city = { [Op.iLike]: `%${city}%` };
      }

      // Filter by state
      if (state) {
        whereClause.state = state;
      }

      // Filter by location type
      if (locationType) {
        whereClause.locationType = locationType;
      }

      // Sorting
      switch (sortBy) {
        case 'popularity':
          orderClause = [['searchCount', 'DESC'], ['routeCount', 'DESC']];
          break;
        case 'recent':
          orderClause = [['createdAt', 'DESC']];
          break;
        case 'alphabetical':
          orderClause = [['name', 'ASC']];
          break;
        case 'relevance':
        default:
          orderClause = [['searchCount', 'DESC'], ['name', 'ASC']];
      }

      const { count, rows } = await Location.findAndCountAll({
        where: whereClause,
        order: orderClause,
        limit,
        offset,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'reputationScore'],
          required: false
        }]
      });

      // If coordinates provided, calculate distances and sort by distance
      let locations = rows;
      if (lat && lng) {
        locations = locations.map(location => {
          const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
          return {
          ...location.toJSON(),
          distance: parseFloat(distance.toFixed(2))
          };
        });

        // Filter by radius if specified
        if (radius) {
          locations = locations.filter(location => location.distance <= radius);
        }

        // Sort by distance if no other sorting specified
        if (sortBy === 'relevance' || sortBy === 'distance') {
          locations.sort((a, b) => a.distance - b.distance);
        }
      }

      return {
        locations: locations.map(formatLocationResponse),
        pagination: {
          total: count,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(count / limit)
        },
        searchParams: {
          query: q,
          city,
          state,
          locationType,
          coordinates: lat && lng ? { lat, lng, radius } : null
        }
      };
    } catch (error) {
      logger.error('Error searching locations:', error);
      throw error;
    }
  },

  /**
   * Find nearby locations
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Nearby locations
   */
  async findNearbyLocations(lat, lng, radiusKm = 10, limit = 20) {
    try {
      const locations = await Location.findNearby(lat, lng, radiusKm, limit);
      
      return locations.map(location => ({
        ...formatLocationResponse(location),
        distance: parseFloat(location.dataValues.distance?.toFixed(2) || 0)
      }));
    } catch (error) {
      logger.error('Error finding nearby locations:', error);
      throw error;
    }
  },

  /**
   * Get location by ID
   * @param {string} locationId - Location ID
   * @param {string} userId - User requesting the location (for analytics)
   * @returns {Promise<Object>} Location details
   */
  async getLocationById(locationId, userId = null) {
    try {
      const location = await Location.findByPk(locationId, {
        include: [{
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'reputationScore']
        }]
      });

      if (!location) {
        throw new Error('Location not found');
      }

      if (!location.isActive) {
        throw new Error('Location is not available');
      }

      // Increment search count (async, don't wait)
      location.incrementSearchCount().catch(error => {
        logger.warn('Failed to increment search count:', error);
      });

      // Log location access for analytics
      if (userId) {
        logger.info('Location accessed', {
          locationId,
          userId,
          locationName: location.name
        });
      }

      return formatLocationResponse(location);
    } catch (error) {
      logger.error('Error getting location by ID:', error);
      throw error;
    }
  },

  /**
   * Update location
   * @param {string} locationId - Location ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User updating the location
   * @returns {Promise<Object>} Updated location
   */
  async updateLocation(locationId, updateData, userId) {
    try {
      const location = await Location.findByPk(locationId);

      if (!location) {
        throw new Error('Location not found');
      }

      // Check if user can update this location
      const canUpdate = location.createdBy === userId || 
                       await this.canUserModerateLocations(userId);

      if (!canUpdate) {
        throw new Error('Insufficient permissions to update location');
      }

      await location.update(updateData);

      logger.info(`Location updated: ${location.name}`, {
        locationId,
        userId,
        changes: Object.keys(updateData)
      });

      return formatLocationResponse(location);
    } catch (error) {
      logger.error('Error updating location:', error);
      throw error;
    }
  },

  /**
   * Get popular locations
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Popular locations
   */
  async getPopularLocations(filters = {}) {
    try {
      const { state, city, locationType, limit = 10 } = filters;
      
      let whereClause = { isActive: true, isVerified: true };

      if (state) whereClause.state = state;
      if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
      if (locationType) whereClause.locationType = locationType;

      const locations = await Location.findAll({
        where: whereClause,
        order: [
          ['searchCount', 'DESC'],
          ['routeCount', 'DESC'],
          ['name', 'ASC']
        ],
        limit
      });

      return locations.map(formatLocationResponse);
    } catch (error) {
      logger.error('Error getting popular locations:', error);
      throw error;
    }
  },

  /**
   * Get locations by state
   * @param {string} state - Nigerian state
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Locations in state
   */
  async getLocationsByState(state, limit = 50) {
    try {
      const locations = await Location.getByState(state, limit);
      return locations.map(formatLocationResponse);
    } catch (error) {
      logger.error('Error getting locations by state:', error);
      throw error;
    }
  },

  /**
   * Get locations by city
   * @param {string} city - City name
   * @param {string} state - State (optional)
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Locations in city
   */
  async getLocationsByCity(city, state = null, limit = 50) {
    try {
      const locations = await Location.getByCity(city, state, limit);
      return locations.map(formatLocationResponse);
    } catch (error) {
      logger.error('Error getting locations by city:', error);
      throw error;
    }
  },

  /**
   * Suggest location names based on partial input
   * @param {string} query - Partial location name
   * @param {number} limit - Maximum suggestions
   * @returns {Promise<Array>} Location suggestions
   */
  async suggestLocations(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const locations = await Location.findAll({
        where: {
          isActive: true,
          name: { [Op.iLike]: `${query}%` }
        },
        order: [['searchCount', 'DESC'], ['name', 'ASC']],
        limit,
        attributes: ['id', 'name', 'city', 'state', 'locationType']
      });

      return locations.map(location => ({
        id: location.id,
        name: location.name,
        city: location.city,
        state: location.state,
        type: location.locationType,
        fullName: `${location.name}, ${location.city}, ${location.state}`
      }));
    } catch (error) {
      logger.error('Error suggesting locations:', error);
      throw error;
    }
  },

  /**
   * Validate location coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} Is valid Nigerian coordinates
   */
  validateCoordinates(lat, lng) {
    return lat >= NIGERIA_BOUNDS.lat.min && lat <= NIGERIA_BOUNDS.lat.max &&
           lng >= NIGERIA_BOUNDS.lng.min && lng <= NIGERIA_BOUNDS.lng.max;
  },

  /**
   * Check if location already exists
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} tolerance - Coordinate tolerance
   * @returns {Promise<Object|null>} Existing location or null
   */
  async findDuplicateLocation(lat, lng, tolerance = 0.001) {
    try {
      return await Location.findByCoordinates(lat, lng, tolerance);
    } catch (error) {
      logger.error('Error checking for duplicate location:', error);
      throw error;
    }
  },

  /**
   * Get locations pending verification
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Unverified locations
   */
  async getPendingVerification(limit = 20) {
    try {
      return await Location.getPendingVerification(limit);
    } catch (error) {
      logger.error('Error getting pending verification locations:', error);
      throw error;
    }
  },

  /**
   * Verify location
   * @param {string} locationId - Location ID
   * @param {string} moderatorId - Moderator user ID
   * @returns {Promise<Object>} Verified location
   */
  async verifyLocation(locationId, moderatorId) {
    try {
      const location = await Location.findByPk(locationId);

      if (!location) {
        throw new Error('Location not found');
      }

      // Check moderator permissions
      const canModerate = await this.canUserModerateLocations(moderatorId);
      if (!canModerate) {
        throw new Error('Insufficient permissions to verify location');
      }

      await location.update({ isVerified: true });

      // Award reputation to location creator
      if (location.createdBy) {
        const creator = await User.findByPk(location.createdBy);
        if (creator) {
          await creator.updateReputation(10); // Award 10 points for verified location
        }
      }

      logger.info(`Location verified: ${location.name}`, {
        locationId,
        moderatorId
      });

      return formatLocationResponse(location);
    } catch (error) {
      logger.error('Error verifying location:', error);
      throw error;
    }
  },

  /**
   * Check if user can moderate locations
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Can moderate
   */
  async canUserModerateLocations(userId) {
    try {
      const user = await User.findByPk(userId);
      return user && user.reputationScore >= 500; // High reputation users can moderate
    } catch (error) {
      return false;
    }
  },

  /**
   * Get location statistics
   * @returns {Promise<Object>} Location statistics
   */
  async getLocationStats() {
    try {
      const stats = await Location.findAll({
        attributes: [
          [Location.sequelize.fn('COUNT', Location.sequelize.col('id')), 'total'],
          [Location.sequelize.fn('COUNT', Location.sequelize.literal('CASE WHEN "isVerified" = true THEN 1 END')), 'verified'],
          [Location.sequelize.fn('COUNT', Location.sequelize.literal('CASE WHEN "isActive" = true THEN 1 END')), 'active'],
          [Location.sequelize.fn('COUNT', Location.sequelize.literal('CASE WHEN "createdAt" >= NOW() - INTERVAL \'7 days\' THEN 1 END')), 'recentlyAdded']
        ]
      });

      const stateStats = await Location.findAll({
        attributes: [
          'state',
          [Location.sequelize.fn('COUNT', Location.sequelize.col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['state'],
        order: [[Location.sequelize.fn('COUNT', Location.sequelize.col('id')), 'DESC']]
      });

      return {
        overview: stats[0]?.dataValues || {},
        byState: stateStats.map(stat => stat.dataValues)
      };
    } catch (error) {
      logger.error('Error getting location statistics:', error);
      throw error;
    }
  }
};

module.exports = locationService;