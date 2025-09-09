const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Avigate API',
      version: '1.0.0',
      description: `
        A comprehensive backend API for the Avigate mobile application - helping users navigate Nigerian cities using local transportation systems.
        
        ## Features
        - User authentication with JWT and Google OAuth
        - Location search and management
        - Route planning and sharing
        - Crowdsourced transportation data
        - Real-time fare information
        - Multi-language support
        
        ## Authentication
        Most endpoints require authentication using Bearer tokens. Include your JWT token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API endpoints are rate-limited based on user reputation:
        - New users: Lower limits
        - High reputation users: Higher limits
        - See individual endpoint documentation for specific limits
        
        ## Error Handling
        All endpoints return consistent error responses with the following structure:
        \`\`\`json
        {
          "success": false,
          "message": "Error description",
          "timestamp": "2024-01-01T00:00:00.000Z",
          "path": "/api/v1/endpoint",
          "method": "POST"
        }
        \`\`\`
      `,
      contact: {
        name: 'Avigate Team',
        email: 'support@avigate.com',
        url: 'https://avigate.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.avigate.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login or registration'
        },
        googleOAuth: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
              tokenUrl: 'https://oauth2.googleapis.com/token',
              scopes: {
                'profile': 'Access to user profile information',
                'email': 'Access to user email address'
              }
            }
          }
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Indicates if the request was successful'
            },
            message: {
              type: 'string',
              example: 'An error occurred',
              description: 'Human-readable error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'ISO timestamp of when the error occurred'
            },
            path: {
              type: 'string',
              example: '/api/v1/users',
              description: 'API endpoint where the error occurred'
            },
            method: {
              type: 'string',
              example: 'POST',
              description: 'HTTP method used'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that caused validation error'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message'
                  },
                  value: {
                    type: 'string',
                    description: 'Invalid value provided'
                  }
                }
              },
              description: 'Detailed validation errors (for 400 responses)'
            }
          }
        },
        ValidationError: {
          allOf: [
            { $ref: '#/components/schemas/Error' },
            {
              type: 'object',
              properties: {
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          ]
        },
        Coordinates: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: {
              type: 'number',
              format: 'double',
              minimum: 4.0,
              maximum: 14.0,
              example: 6.5244,
              description: 'Latitude coordinate (within Nigeria boundaries)'
            },
            longitude: {
              type: 'number',
              format: 'double',
              minimum: 2.5,
              maximum: 15.0,
              example: 3.3792,
              description: 'Longitude coordinate (within Nigeria boundaries)'
            }
          }
        },
        NigerianStates: {
          type: 'string',
          enum: [
            'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 
            'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 
            'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 
            'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 
            'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 
            'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
          ],
          example: 'Lagos'
        },
        VehicleTypes: {
          type: 'string',
          enum: ['bus', 'taxi', 'keke', 'okada', 'train', 'walking'],
          example: 'bus',
          description: 'Type of transportation vehicle'
        },
        Languages: {
          type: 'string',
          enum: ['English', 'Hausa', 'Igbo', 'Yoruba', 'Pidgin'],
          example: 'English',
          description: 'Supported languages for the application'
        },
        Difficulty: {
          type: 'string',
          enum: ['Easy', 'Medium', 'Hard'],
          example: 'Medium',
          description: 'Route difficulty level'
        },
        PhoneNumber: {
          type: 'string',
          pattern: '^(\\+234|234|0)(70|80|81|90|91)[0-9]{8}$',
          example: '+2348012345678',
          description: 'Valid Nigerian phone number'
        },
        UUID: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'Universally unique identifier'
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              example: 1,
              description: 'Page number'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              example: 20,
              description: 'Number of items per page'
            },
            total: {
              type: 'integer',
              example: 150,
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              example: 8,
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Whether there are more pages'
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Whether there are previous pages'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indicates if the request was successful'
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            pagination: {
              $ref: '#/components/schemas/Pagination'
            }
          }
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'phoneNumber'],
          properties: {
            id: {
              $ref: '#/components/schemas/UUID'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'John',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'Doe',
              description: 'User last name'
            },
            phoneNumber: {
              $ref: '#/components/schemas/PhoneNumber'
            },
            profilePicture: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/avatar.jpg',
              description: 'URL to user profile picture'
            },
            preferredLanguage: {
              $ref: '#/components/schemas/Languages'
            },
            isVerified: {
              type: 'boolean',
              example: true,
              description: 'Email verification status'
            },
            reputationScore: {
              type: 'integer',
              minimum: 0,
              example: 150,
              description: 'User reputation score for crowdsourcing'
            },
            totalContributions: {
              type: 'integer',
              minimum: 0,
              example: 25,
              description: 'Total user contributions to the platform'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        Location: {
          type: 'object',
          required: ['id', 'name', 'latitude', 'longitude', 'address', 'city', 'state'],
          properties: {
            id: {
              $ref: '#/components/schemas/UUID'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Ikeja Bus Stop',
              description: 'Location name'
            },
            latitude: {
              type: 'number',
              format: 'double',
              minimum: 4.0,
              maximum: 14.0,
              example: 6.5951
            },
            longitude: {
              type: 'number',
              format: 'double',
              minimum: 2.5,
              maximum: 15.0,
              example: 3.3378
            },
            address: {
              type: 'string',
              minLength: 5,
              maxLength: 200,
              example: 'Ikeja Bus Stop, Allen Avenue, Ikeja',
              description: 'Full address of the location'
            },
            city: {
              type: 'string',
              example: 'Ikeja',
              description: 'City name'
            },
            state: {
              $ref: '#/components/schemas/NigerianStates'
            },
            landmarks: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Allen Roundabout', 'Ikeja Shopping Mall'],
              description: 'Notable landmarks near this location'
            },
            locationType: {
              type: 'string',
              enum: ['bus_stop', 'motor_park', 'train_station', 'taxi_stand', 'market', 'school', 'hospital', 'residential', 'commercial', 'landmark', 'other'],
              example: 'bus_stop',
              description: 'Type of location'
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the location is active'
            },
            isVerified: {
              type: 'boolean',
              example: true,
              description: 'Whether the location has been verified'
            },
            searchCount: {
              type: 'integer',
              minimum: 0,
              example: 150,
              description: 'Number of times this location has been searched'
            },
            routeCount: {
              type: 'integer',
              minimum: 0,
              example: 25,
              description: 'Number of routes using this location'
            }
          }
        },
        Route: {
          type: 'object',
          required: ['id', 'startLocationId', 'endLocationId', 'vehicleTypes', 'estimatedFareMin', 'estimatedFareMax', 'estimatedDuration'],
          properties: {
            id: {
              $ref: '#/components/schemas/UUID'
            },
            startLocationId: {
              $ref: '#/components/schemas/UUID'
            },
            endLocationId: {
              $ref: '#/components/schemas/UUID'
            },
            vehicleTypes: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/VehicleTypes'
              },
              example: ['bus', 'taxi'],
              description: 'Available vehicle types for this route'
            },
            estimatedFareMin: {
              type: 'integer',
              minimum: 0,
              example: 200,
              description: 'Minimum estimated fare in Naira'
            },
            estimatedFareMax: {
              type: 'integer',
              minimum: 0,
              example: 300,
              description: 'Maximum estimated fare in Naira'
            },
            estimatedDuration: {
              type: 'integer',
              minimum: 0,
              example: 45,
              description: 'Estimated duration in minutes'
            },
            difficulty: {
              $ref: '#/components/schemas/Difficulty'
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the route is active'
            },
            createdBy: {
              $ref: '#/components/schemas/UUID'
            },
            startLocation: {
              $ref: '#/components/schemas/Location'
            },
            endLocation: {
              $ref: '#/components/schemas/Location'
            },
            steps: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/RouteStep'
              }
            }
          }
        },
        RouteStep: {
          type: 'object',
          required: ['id', 'routeId', 'stepNumber', 'fromLocationId', 'toLocationId', 'vehicleType', 'instructions', 'pickupPoint', 'dropoffPoint'],
          properties: {
            id: {
              $ref: '#/components/schemas/UUID'
            },
            routeId: {
              $ref: '#/components/schemas/UUID'
            },
            stepNumber: {
              type: 'integer',
              minimum: 1,
              example: 1,
              description: 'Step order in the route'
            },
            fromLocationId: {
              $ref: '#/components/schemas/UUID'
            },
            toLocationId: {
              $ref: '#/components/schemas/UUID'
            },
            vehicleType: {
              $ref: '#/components/schemas/VehicleTypes'
            },
            instructions: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              example: 'Take the blue BRT bus from Ikeja to CMS',
              description: 'Step-by-step instructions'
            },
            landmarks: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['National Theatre', 'Tafawa Balewa Square'],
              description: 'Landmarks along this step'
            },
            fareMin: {
              type: 'integer',
              minimum: 0,
              example: 100,
              description: 'Minimum fare for this step in Naira'
            },
            fareMax: {
              type: 'integer',
              minimum: 0,
              example: 150,
              description: 'Maximum fare for this step in Naira'
            },
            estimatedDuration: {
              type: 'integer',
              minimum: 0,
              example: 20,
              description: 'Estimated duration for this step in minutes'
            },
            pickupPoint: {
              type: 'string',
              minLength: 5,
              maxLength: 200,
              example: 'Ikeja Bus Stop, Platform 3',
              description: 'Where to board the vehicle'
            },
            dropoffPoint: {
              type: 'string',
              minLength: 5,
              maxLength: 200,
              example: 'CMS Bus Stop, Platform 1',
              description: 'Where to alight from the vehicle'
            }
          }
        }
      },
      responses: {
        Success: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        BadRequest: {
          description: 'Bad request - validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Authentication required',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/protected-endpoint',
                method: 'GET'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Insufficient permissions',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/admin-endpoint',
                method: 'POST'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/users/nonexistent-id',
                method: 'GET'
              }
            }
          }
        },
        Conflict: {
          description: 'Conflict - resource already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Email already exists',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/auth/register',
                method: 'POST'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Rate limit exceeded, please try again later',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/search',
                method: 'GET'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/any-endpoint',
                method: 'POST'
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        SortByParam: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          required: false,
          schema: {
            type: 'string'
          }
        },
        SortOrderParam: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        },
        UUIDParam: {
          name: 'id',
          in: 'path',
          description: 'Resource UUID',
          required: true,
          schema: {
            $ref: '#/components/schemas/UUID'
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and profile management'
      },
      {
        name: 'Locations',
        description: 'Location search and management'
      },
      {
        name: 'Routes',
        description: 'Route planning and management'
      },
      {
        name: 'Directions',
        description: 'Shareable directions and route sharing'
      },
      {
        name: 'Crowdsourcing',
        description: 'User-contributed data and feedback'
      },
      {
        name: 'Analytics',
        description: 'Usage analytics and reporting'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Add custom styling and configuration
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2196F3; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; }
    .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
  `,
  customSiteTitle: 'Avigate API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelExpandDepth: 3,
    defaultModelsExpandDepth: 1,
    tryItOutEnabled: true
  }
};

module.exports = { swaggerSpec, swaggerOptions };