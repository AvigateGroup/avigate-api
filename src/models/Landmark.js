module.exports = (sequelize, DataTypes) => {
  const Landmark = sequelize.define('Landmark', {
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
          msg: 'Landmark name must be between 2 and 100 characters'
        },
        notEmpty: {
          msg: 'Landmark name cannot be empty'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 300],
          msg: 'Description cannot exceed 300 characters'
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
        },
        notEmpty: {
          msg: 'Address cannot be empty'
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
        },
        notEmpty: {
          msg: 'City cannot be empty'
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
      allowNull: false,
      validate: {
        notNull: {
          msg: 'State is required'
        }
      }
    },
    category: {
      type: DataTypes.ENUM(
        'Market', 'School', 'Hospital', 'Religious', 'Government', 
        'Transport', 'Commercial', 'Residential', 'Entertainment',
        'Tourist', 'Monument', 'Bank', 'Restaurant', 'Hotel'
      ),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Category is required'
        }
      }
    },
    visibility: {
      type: DataTypes.ENUM('High', 'Medium', 'Low'),
      defaultValue: 'Medium',
      allowNull: false,
      validate: {
        isIn: {
          args: [['High', 'Medium', 'Low']],
          msg: 'Visibility must be High, Medium, or Low'
        }
      }
    },
    // Additional landmark details
    operatingHours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidOperatingHours(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Operating hours must be a valid object');
          }
        }
      }
    },
    contactInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidContactInfo(value) {
          if (value && typeof value !== 'object') {
            throw new Error('Contact info must be a valid object');
          }
        }
      }
    },
    amenities: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Amenities must be an array');
          }
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
    referenceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Reference count cannot be negative'
        }
      }
    },
    // User ratings
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: {
          args: 1.0,
          msg: 'Average rating cannot be less than 1.0'
        },
        max: {
          args: 5.0,
          msg: 'Average rating cannot be more than 5.0'
        }
      }
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: {
          args: 0,
          msg: 'Rating count cannot be negative'
        }
      }
    },
    // Status tracking
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    // Creation tracking
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Approval workflow
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'needs_review'),
      defaultValue: 'pending',
      allowNull: false
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Additional metadata
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Images must be an array');
          }
        }
      }
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Tags must be an array');
          }
        }
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'landmarks',
    timestamps: true,
    indexes: [
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['name']
      },
      {
        fields: ['category']
      },
      {
        fields: ['city']
      },
      {
        fields: ['state']
      },
      {
        fields: ['visibility']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['approvalStatus']
      },
      {
        fields: ['searchCount']
      },
      {
        fields: ['averageRating']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['tags'],
        using: 'gin'
      },
      {
        name: 'landmarks_search_text',
        fields: ['name', 'description', 'address'],
        using: 'gin',
        operator: 'gin_trgm_ops'
      }
    ],
    hooks: {
      beforeValidate: (landmark) => {
        // Capitalize and clean text fields
        if (landmark.name) {
          landmark.name = landmark.name.trim();
        }
        
        if (landmark.city) {
          landmark.city = landmark.city.trim().replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
        }
        
        if (landmark.address) {
          landmark.address = landmark.address.trim();
        }
        
        if (landmark.description) {
          landmark.description = landmark.description.trim();
        }
      },
      
      beforeUpdate: (landmark) => {
        // Update approval timestamp
        if (landmark.changed('approvalStatus') && landmark.approvalStatus === 'approved') {
          landmark.approvedAt = new Date();
        }
        
        // Update verification timestamp
        if (landmark.changed('isVerified') && landmark.isVerified) {
          landmark.verifiedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  Landmark.prototype.getDistance = function(lat, lng) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(lat - this.latitude);
    const dLng = this.degToRad(lng - this.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degToRad(this.latitude)) * Math.cos(this.degToRad(lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  Landmark.prototype.degToRad = function(deg) {
    return deg * (Math.PI / 180);
  };

  Landmark.prototype.incrementSearchCount = async function() {
    this.searchCount += 1;
    await this.save({ fields: ['searchCount'] });
  };

  Landmark.prototype.incrementReferenceCount = async function() {
    this.referenceCount += 1;
    await this.save({ fields: ['referenceCount'] });
  };

  Landmark.prototype.addRating = async function(newRating) {
    const currentTotal = (this.averageRating || 0) * this.ratingCount;
    this.ratingCount += 1;
    this.averageRating = (currentTotal + newRating) / this.ratingCount;
    await this.save({ fields: ['averageRating', 'ratingCount'] });
  };

  Landmark.prototype.approve = async function(approverId) {
    this.approvalStatus = 'approved';
    this.approvedBy = approverId;
    this.approvedAt = new Date();
    this.isPublic = true;
    await this.save();
  };

  Landmark.prototype.reject = async function(reason, rejectorId) {
    this.approvalStatus = 'rejected';
    this.rejectionReason = reason;
    this.approvedBy = rejectorId;
    this.isPublic = false;
    await this.save();
  };

  Landmark.prototype.verify = async function(verifierId) {
    this.isVerified = true;
    this.verifiedBy = verifierId;
    this.verifiedAt = new Date();
    await this.save();
  };

  Landmark.prototype.isPopular = function() {
    return this.searchCount >= 50 || this.referenceCount >= 20;
  };

  Landmark.prototype.toJSON = function() {
    const landmark = { ...this.get() };
    
    // Convert coordinates to numbers
    landmark.latitude = parseFloat(landmark.latitude);
    landmark.longitude = parseFloat(landmark.longitude);
    
    // Add computed fields
    landmark.isPopular = this.isPopular();
    
    // Convert rating to number
    if (landmark.averageRating) {
      landmark.averageRating = parseFloat(landmark.averageRating);
    }
    
    return landmark;
  };

  // Class methods
  Landmark.findNearby = function(lat, lng, radiusKm = 5, options = {}) {
    const {
      category = null,
      verified = false,
      limit = 20,
      visibility = null
    } = options;

    let whereClause = {
      isActive: true,
      isPublic: true,
      approvalStatus: 'approved'
    };

    if (category) {
      whereClause.category = category;
    }

    if (verified) {
      whereClause.isVerified = true;
    }

    if (visibility) {
      whereClause.visibility = visibility;
    }

    return sequelize.query(`
      SELECT *, 
        (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * 
        sin(radians(latitude)))) AS distance
      FROM landmarks 
      WHERE is_active = true 
        AND is_public = true 
        AND approval_status = 'approved'
        ${category ? `AND category = '${category}'` : ''}
        ${verified ? 'AND is_verified = true' : ''}
        ${visibility ? `AND visibility = '${visibility}'` : ''}
        AND (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * 
          sin(radians(latitude)))) <= :radius
      ORDER BY distance, search_count DESC
      LIMIT :limit
    `, {
      replacements: { lat, lng, radius: radiusKm, limit },
      type: sequelize.QueryTypes.SELECT,
      model: Landmark,
      mapToModel: true
    });
  };

  Landmark.searchByText = function(query, options = {}) {
    const {
      category = null,
      city = null,
      state = null,
      verified = false,
      limit = 20,
      offset = 0
    } = options;

    const whereClause = {
      isActive: true,
      isPublic: true,
      approvalStatus: 'approved',
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { address: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (category) {
      whereClause.category = category;
    }

    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    if (state) {
      whereClause.state = state;
    }

    if (verified) {
      whereClause.isVerified = true;
    }

    return Landmark.findAndCountAll({
      where: whereClause,
      order: [
        ['searchCount', 'DESC'],
        ['averageRating', 'DESC'],
        ['name', 'ASC']
      ],
      limit,
      offset
    });
  };

  Landmark.findByCategory = function(category, options = {}) {
    const {
      city = null,
      state = null,
      verified = false,
      limit = 50
    } = options;

    const whereClause = {
      category,
      isActive: true,
      isPublic: true,
      approvalStatus: 'approved'
    };

    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    if (state) {
      whereClause.state = state;
    }

    if (verified) {
      whereClause.isVerified = true;
    }

    return Landmark.findAll({
      where: whereClause,
      order: [
        ['searchCount', 'DESC'],
        ['averageRating', 'DESC'],
        ['name', 'ASC']
      ],
      limit
    });
  };

  Landmark.findPopular = function(limit = 10, city = null) {
    const whereClause = {
      isActive: true,
      isPublic: true,
      isVerified: true,
      approvalStatus: 'approved',
      searchCount: { [Op.gte]: 10 }
    };

    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    return Landmark.findAll({
      where: whereClause,
      order: [
        ['searchCount', 'DESC'],
        ['referenceCount', 'DESC'],
        ['averageRating', 'DESC']
      ],
      limit
    });
  };

  Landmark.findPendingApproval = function(limit = 20) {
    return Landmark.findAll({
      where: {
        approvalStatus: 'pending',
        isActive: true
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'reputationScore']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit
    });
  };

  Landmark.getStatistics = async function() {
    const stats = await Landmark.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalLandmarks'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "isVerified" = true THEN 1 END')), 'verifiedLandmarks'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "approvalStatus" = \'approved\' THEN 1 END')), 'approvedLandmarks'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "approvalStatus" = \'pending\' THEN 1 END')), 'pendingLandmarks'],
        [sequelize.fn('AVG', sequelize.col('averageRating')), 'avgRating'],
        [sequelize.fn('SUM', sequelize.col('searchCount')), 'totalSearches']
      ],
      raw: true
    });

    return {
      totalLandmarks: parseInt(stats.totalLandmarks) || 0,
      verifiedLandmarks: parseInt(stats.verifiedLandmarks) || 0,
      approvedLandmarks: parseInt(stats.approvedLandmarks) || 0,
      pendingLandmarks: parseInt(stats.pendingLandmarks) || 0,
      averageRating: parseFloat(stats.avgRating) || 0,
      totalSearches: parseInt(stats.totalSearches) || 0
    };
  };

  Landmark.getCategoryDistribution = async function() {
    return Landmark.findAll({
      where: {
        isActive: true,
        approvalStatus: 'approved'
      },
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });
  };

  return Landmark;
};