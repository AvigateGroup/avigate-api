'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      googleId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      profilePicture: {
        type: Sequelize.STRING,
        allowNull: true
      },
      preferredLanguage: {
        type: Sequelize.ENUM('English', 'Hausa', 'Igbo', 'Yoruba', 'Pidgin'),
        defaultValue: 'English',
        allowNull: false
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refreshTokenExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      passwordResetToken: {
        type: Sequelize.STRING,
        allowNull: true
      },
      passwordResetExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reputationScore: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
        allowNull: false
      },
      totalContributions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      state: {
        type: Sequelize.STRING,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Admins table
    await queryInterface.createTable('admins', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('super_admin', 'admin', 'moderator', 'analyst'),
        defaultValue: 'admin',
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      totpSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      totpEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      totpBackupCodes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastLoginIP: {
        type: Sequelize.STRING,
        allowNull: true
      },
      failedLoginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      lockedUntil: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refreshTokenExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      lastModifiedBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Locations table
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false
      },
      state: {
        type: Sequelize.ENUM(
          'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
          'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
          'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
          'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
          'Yobe', 'Zamfara'
        ),
        allowNull: false
      },
      landmarks: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      locationType: {
        type: Sequelize.ENUM(
          'bus_stop', 'motor_park', 'train_station', 'taxi_stand', 'market', 
          'school', 'hospital', 'residential', 'commercial', 'landmark', 'other'
        ),
        defaultValue: 'other',
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      searchCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      routeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Routes table
    await queryInterface.createTable('routes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      startLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      endLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      vehicleTypes: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      estimatedFareMin: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estimatedFareMax: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('Easy', 'Medium', 'Hard'),
        defaultValue: 'Medium',
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      crowdsourcedData: {
        type: Sequelize.JSON,
        defaultValue: {},
        allowNull: true
      },
      searchCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      averageRating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
        allowNull: false
      },
      totalRatings: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lastUpdatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Route Steps table
    await queryInterface.createTable('route_steps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      routeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'routes',
          key: 'id'
        }
      },
      stepNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      fromLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      toLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      vehicleType: {
        type: Sequelize.ENUM('bus', 'taxi', 'keke', 'okada', 'train', 'walking'),
        allowNull: false
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      landmarks: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true
      },
      fareMin: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      fareMax: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      pickupPoint: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dropoffPoint: {
        type: Sequelize.STRING,
        allowNull: false
      },
      distance: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      waitTime: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('Easy', 'Medium', 'Hard'),
        defaultValue: 'Medium',
        allowNull: false
      },
      operatingHours: {
        type: Sequelize.JSON,
        allowNull: true
      },
      peakHours: {
        type: Sequelize.JSON,
        allowNull: true
      },
      crowdsourcedFare: {
        type: Sequelize.JSON,
        defaultValue: { reports: [], average: null, lastUpdated: null },
        allowNull: true
      },
      crowdsourcedDuration: {
        type: Sequelize.JSON,
        defaultValue: { reports: [], average: null, lastUpdated: null },
        allowNull: true
      },
      accuracyScore: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 3.0,
        allowNull: false
      },
      reportCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create User Directions table
    await queryInterface.createTable('user_directions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      startLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      endLocationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      routeData: {
        type: Sequelize.JSON,
        allowNull: false
      },
      totalEstimatedFare: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      totalEstimatedDuration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      shareCode: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Fare Feedback table
    await queryInterface.createTable('fare_feedback', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      routeStepId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'route_steps',
          key: 'id'
        }
      },
      actualFarePaid: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      vehicleTypeUsed: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dateOfTravel: {
        type: Sequelize.DATE,
        allowNull: false
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Landmarks table
    await queryInterface.createTable('landmarks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM(
          'Market', 'School', 'Hospital', 'Religious', 'Government', 
          'Transport', 'Commercial', 'Residential', 'Entertainment'
        ),
        allowNull: false
      },
      visibility: {
        type: Sequelize.ENUM('High', 'Medium', 'Low'),
        defaultValue: 'Medium',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Analytics tables
    await queryInterface.createTable('user_analytics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true
      },
      totalUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      newUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      activeUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      verifiedUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      dailyActiveUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      weeklyActiveUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      monthlyActiveUsers: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      dayOneRetention: {
        type: Sequelize.DECIMAL(5, 4),
        defaultValue: 0,
        allowNull: false
      },
      daySevenRetention: {
        type: Sequelize.DECIMAL(5, 4),
        defaultValue: 0,
        allowNull: false
      },
      dayThirtyRetention: {
        type: Sequelize.DECIMAL(5, 4),
        defaultValue: 0,
        allowNull: false
      },
      avgSessionDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      avgSearchesPerUser: {
        type: Sequelize.DECIMAL(8, 2),
        defaultValue: 0,
        allowNull: false
      },
      avgRoutesPerUser: {
        type: Sequelize.DECIMAL(8, 2),
        defaultValue: 0,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create Audit Logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      adminId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'admins',
          key: 'id'
        }
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false
      },
      resourceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      changes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      oldValues: {
        type: Sequelize.JSON,
        allowNull: true
      },
      newValues: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      method: {
        type: Sequelize.STRING,
        allowNull: true
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['phoneNumber']);
    await queryInterface.addIndex('users', ['isActive']);
    await queryInterface.addIndex('users', ['state']);
    await queryInterface.addIndex('users', ['reputationScore']);

    await queryInterface.addIndex('admins', ['email']);
    await queryInterface.addIndex('admins', ['role']);
    await queryInterface.addIndex('admins', ['isActive']);

    await queryInterface.addIndex('locations', ['latitude', 'longitude']);
    await queryInterface.addIndex('locations', ['city']);
    await queryInterface.addIndex('locations', ['state']);
    await queryInterface.addIndex('locations', ['isActive']);
    await queryInterface.addIndex('locations', ['searchCount']);

    await queryInterface.addIndex('routes', ['startLocationId']);
    await queryInterface.addIndex('routes', ['endLocationId']);
    await queryInterface.addIndex('routes', ['startLocationId', 'endLocationId']);
    await queryInterface.addIndex('routes', ['isActive']);
    await queryInterface.addIndex('routes', ['averageRating']);

    await queryInterface.addIndex('route_steps', ['routeId']);
    await queryInterface.addIndex('route_steps', ['routeId', 'stepNumber'], { unique: true });
    await queryInterface.addIndex('route_steps', ['vehicleType']);

    await queryInterface.addIndex('user_directions', ['shareCode'], { unique: true });
    await queryInterface.addIndex('user_directions', ['createdBy']);
    await queryInterface.addIndex('user_directions', ['isPublic']);

    await queryInterface.addIndex('fare_feedback', ['userId']);
    await queryInterface.addIndex('fare_feedback', ['routeStepId']);
    await queryInterface.addIndex('fare_feedback', ['dateOfTravel']);

    await queryInterface.addIndex('audit_logs', ['adminId']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource']);
    await queryInterface.addIndex('audit_logs', ['severity']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to avoid foreign key conflicts
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('user_analytics');
    await queryInterface.dropTable('landmarks');
    await queryInterface.dropTable('fare_feedback');
    await queryInterface.dropTable('user_directions');
    await queryInterface.dropTable('route_steps');
    await queryInterface.dropTable('routes');
    await queryInterface.dropTable('locations');
    await queryInterface.dropTable('admins');
    await queryInterface.dropTable('users');
  }
};