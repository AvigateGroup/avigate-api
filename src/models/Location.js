const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('Location', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'Location name must be between 2 and 100 characters'
        }
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: {
          args: 4.0,
          msg: 'Latitude must be within Nigeria boundaries (4.0 to 14.0)'
        },
        max: {
          args: 14.0,
          msg: 'Latitude must be within Nigeria boundaries (4.0 to 14.0)'
        },
        isDecimal: {
          msg: 'Latitude must be a valid decimal number'
        }
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: {
          args: 2.5,
          msg: 'Longitude must be within Nigeria boundaries (2.5 to 15.0)'
        },
        max: {
          args: 15.0,
          msg: 'Longitude must be within Nigeria boundaries (2.5 to 15.0)'
        },
        isDecimal: {
          msg: 'Longitude must be a valid decimal number'
        }
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [5, 200],
          msg: 'Address must be between 5 and 200 characters'
        }
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [2, 50],
          msg: 'City name must be between 2 and 50 characters'
        }
      }
    },
    state: {
      type: DataTypes.ENUM(
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
        'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
        'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
        'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
        'Yobe', 'Zamfara'
      ),
      allowNull: false
    },
    landmarks: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Landmarks must be an array');
          }
        }
      }
    },
    locationType: {
      type: DataTypes.ENUM(
        'bus_stop', 'motor_park', 'train_station', 'taxi_stand', 'market', 
        'school', 'hospital', 'residential', 'commercial', 'landmark', 'other'
      ),
      defaultValue: 'other',
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
    routeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Route count cannot be negative'
        }
      }
    },
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    // Created by (for user-generated locations)
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'locations',
    timestamps: true,
    indexes: [
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['city']
      },
      {
        fields: ['state']
      },
      {
        fields: ['locationType']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['name']
      },
      {
        fields: ['searchCount']
      },
      {
        name: 'locations_search_text',
        fields: ['name', 'address', 'city'],
        using: 'gin',
        operator: 'gin_trgm_ops' // For PostgreSQL full-text search
      }
    ],
    hooks: {
      beforeValidate: (location) => {
        // Capitalize city and format address
        if (location.city) {
          location.city = location.city.trim().replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
        }
        
        if (location.name) {
          location.name = location.name.trim();
        }
        
        if (location.address) {
          location.address = location.address.trim();
        }
      }
    }
  });

  // Instance methods
  Location.prototype.getDistance = function(lat, lng) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(lat - this.latitude);
    const dLng = this.degToRad(lng - this.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degToRad(this.latitude)) * Math.cos(this.degToRad(lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  Location.prototype.degToRad = function(deg) {
    return deg * (Math.PI / 180);
  };

  Location.prototype.incrementSearchCount = async function() {
    this.searchCount += 1;
    await this.save({ fields: ['searchCount'] });
  };

  Location.prototype.incrementRouteCount = async function() {
    this.routeCount += 1;
    await this.save({ fields: ['routeCount'] });
  };

  Location.prototype.toJSON = function() {
    const location = { ...this.get() };
    // Convert latitude and longitude to numbers
    location.latitude = parseFloat(location.latitude);
    location.longitude = parseFloat(location.longitude);
    return location;
  };

  // Class methods
  Location.findByCoordinates = function(lat, lng, tolerance = 0.001) {
    return Location.findOne({
      where: {
        latitude: {
          [Op.between]: [lat - tolerance, lat + tolerance]
        },
        longitude: {
          [Op.between]: [lng - tolerance, lng + tolerance]
        },
        isActive: true
      }
    });
  };

  Location.findNearby = function(lat, lng, radiusKm = 10, limit = 20) {
    // Using Haversine formula for PostgreSQL
    return sequelize.query(`
      SELECT *, 
        (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * 
        sin(radians(latitude)))) AS distance
      FROM locations 
      WHERE is_active = true
      AND (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * 
        sin(radians(latitude)))) <= :radius
      ORDER BY distance
      LIMIT :limit
    `, {
      replacements: { lat, lng, radius: radiusKm, limit },
      type: sequelize.QueryTypes.SELECT,
      model: Location,
      mapToModel: true
    });
  };

  Location.searchByText = function(query, options = {}) {
    const {
      city,
      state,
      locationType,
      limit = 20,
      offset = 0
    } = options;

    const whereClause = {
      isActive: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { address: { [Op.iLike]: `%${query}%` } },
        { city: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    if (state) {
      whereClause.state = state;
    }

    if (locationType) {
      whereClause.locationType = locationType;
    }

    return Location.findAndCountAll({
      where: whereClause,
      order: [['searchCount', 'DESC'], ['name', 'ASC']],
      limit,
      offset
    });
  };

  Location.getMostPopular = function(limit = 10) {
    return Location.findAll({
      where: { isActive: true, isVerified: true },
      order: [['searchCount', 'DESC'], ['routeCount', 'DESC']],
      limit
    });
  };

  Location.getByState = function(state, limit = 50) {
    return Location.findAll({
      where: { state, isActive: true },
      order: [['city', 'ASC'], ['name', 'ASC']],
      limit
    });
  };

  Location.getByCity = function(city, state = null, limit = 50) {
    const whereClause = { 
      city: { [Op.iLike]: `%${city}%` }, 
      isActive: true 
    };
    
    if (state) {
      whereClause.state = state;
    }

    return Location.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit
    });
  };

  // Get locations that need verification
  Location.getPendingVerification = function(limit = 20) {
    return Location.findAll({
      where: { isVerified: false, isActive: true },
      order: [['createdAt', 'DESC']],
      limit,
      include: [{
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['firstName', 'lastName', 'reputationScore']
      }]
    });
  };

  return Location;
};