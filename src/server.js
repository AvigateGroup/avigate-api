//server.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')

// Load environment variables first
require('dotenv').config()

const { sequelize } = require('./models')
const { syncDatabase } = require('./models')
const { logger } = require('./utils/logger')
const { errorHandler, notFoundHandler, logError } = require('./middleware/errorHandler')
const redisService = require('./services/cache/redisService')
const pushNotificationService = require('./services/notification/pushNotificationService')

// Import routes
const userAuthRoutes = require('./routes/user/userAuthRoute')
const adminAuthRoutes = require('./routes/admin/adminAuthRoutes')
const adminUserManagementRoutes = require('./routes/admin/userManagement')
const navigationRoutes = require('./routes/user/navigation')
const directionsRoutes = require('./routes/user/directions')
const communityRoutes = require('./routes/user/community')
const fareRoutes = require('./routes/user/fares')

const app = express()
const PORT = process.env.PORT || 3000

// Service health tracking
const serviceHealth = {
    database: false,
    redis: false,
    pushNotifications: false,
    server: false
}

console.log('=== AVIGATE SERVER STARTUP ===')
console.log('Environment:', process.env.NODE_ENV)
console.log('Port:', PORT)
console.log('Database URL present:', !!process.env.DATABASE_URL)
console.log('Redis URL present:', !!process.env.REDIS_URL)
console.log('DB Host:', process.env.DB_HOST)
console.log('DB Name:', process.env.DB_NAME)
console.log('===============================')

// Request logging middleware (before other middleware)
app.use((req, res, next) => {
    console.log(`=== ${req.method} ${req.url} ===`)
    console.log('Headers:', {
        'content-type': req.get('Content-Type'),
        'user-agent': req.get('User-Agent'),
        'authorization': req.get('Authorization') ? '[PRESENT]' : '[MISSING]'
    })
    if (Object.keys(req.query).length > 0) {
        console.log('Query params:', req.query)
    }
    next()
})

app.use(cookieParser())

// CORS configuration
console.log('Setting up CORS...')
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true)
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://avigate.co',
            'https://www.avigate.co',
            'https://app.avigate.co',
            'https://admin.avigate.co',
        ]
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            logger.warn(`CORS blocked origin: ${origin}`)
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
        'Authorization', 'X-User-Latitude', 'X-User-Longitude', 
        'X-Location-Accuracy', 'X-Device-Info'
    ],
}

app.use(cors(corsOptions))

// Security middleware
console.log('Setting up security middleware...')
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.qrserver.com"],
        },
    },
    crossOriginEmbedderPolicy: false,
}))

// Body parsing middleware
console.log('Setting up body parsing...')
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        console.log(`Request body size: ${buf.length} bytes`)
    }
}))

app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(compression())

// Enhanced morgan logging
app.use(
    morgan('combined', {
        stream: {
            write: (msg) => {
                logger.info(msg.trim())
                console.log('Morgan:', msg.trim())
            },
        },
    })
)

// Global rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

app.use(globalLimiter)

// Request timing middleware
app.use((req, res, next) => {
    req.startTime = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - req.startTime
        console.log(`Request completed in ${duration}ms`)
    })
    next()
})

// Session ID middleware
app.use((req, res, next) => {
    if (!req.sessionID) {
        req.sessionID = req.headers['x-session-id'] || 
                       `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    next()
})

// Enhanced health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested')
    
    const healthStatus = {
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: serviceHealth.database ? 'connected' : 'disconnected',
            redis: serviceHealth.redis ? 'connected' : 'disconnected',
            pushNotifications: serviceHealth.pushNotifications ? 'initialized' : 'not initialized',
            server: serviceHealth.server ? 'running' : 'starting'
        },
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
        }
    }
    
    // Return 503 if critical services are down
    const allServicesHealthy = serviceHealth.database && serviceHealth.server
    const statusCode = allServicesHealthy ? 200 : 503
    
    res.status(statusCode).json(healthStatus)
})

// Readiness check (for container orchestration)
app.get('/ready', (req, res) => {
    const isReady = serviceHealth.database && serviceHealth.server
    
    if (isReady) {
        res.status(200).json({ ready: true, message: 'Server is ready to accept traffic' })
    } else {
        res.status(503).json({ ready: false, message: 'Server is not ready yet' })
    }
})

// API routes with logging
console.log('Setting up API routes...')

app.use('/api/v1/user/auth', (req, res, next) => {
    console.log('User auth route hit:', req.method, req.url)
    next()
}, userAuthRoutes)

app.use('/api/v1/navigation', (req, res, next) => {
    console.log('Navigation route hit:', req.method, req.url)
    next()
}, navigationRoutes)

app.use('/api/v1/community', (req, res, next) => {
    console.log('Community route hit:', req.method, req.url)
    next()
}, communityRoutes)

app.use('/api/v1/directions', (req, res, next) => {
    console.log('Directions route hit:', req.method, req.url)
    next()
}, directionsRoutes)

app.use('/api/v1/fares', (req, res, next) => {
    console.log('Fares route hit:', req.method, req.url)
    next()
}, fareRoutes)

app.use('/api/v1/admin/auth', (req, res, next) => {
    console.log('Admin auth route hit:', req.method, req.url)
    next()
}, adminAuthRoutes)

app.use('/api/v1/admin/user', (req, res, next) => {
    console.log('Admin user management route hit:', req.method, req.url)
    next()
}, adminUserManagementRoutes)

// 404 handler
console.log('Setting up 404 handler...')
app.use('*', notFoundHandler)

// Global error handler (MUST be last)
console.log('Setting up global error handler...')
app.use(errorHandler)

// Initialize all services
const initializeServices = async () => {
    const services = []
    
    // 1. Database connection
    services.push({
        name: 'Database',
        init: async () => {
            console.log('=== DATABASE CONNECTION ===')
            await sequelize.authenticate()
            serviceHealth.database = true
            
            const dbName = sequelize.config.database
            const dbHost = sequelize.config.host
            const dbPort = sequelize.config.port
            console.log(`✅ Connected to: ${dbName} on ${dbHost}:${dbPort}`)
            logger.info(`Database connected: ${dbName} on ${dbHost}:${dbPort}`)
            
            // Sync database in development
            if (process.env.NODE_ENV === 'development' && process.env.SYNC_DATABASE === 'true') {
                console.log('Syncing database models...')
                await syncDatabase()
                console.log('✅ Database models synced')
                logger.info('Database models synced successfully')
            }
        }
    })
    
    // 2. Redis connection
    services.push({
        name: 'Redis',
        init: async () => {
            console.log('=== REDIS CONNECTION ===')
            
            if (!process.env.REDIS_URL) {
                console.log('⚠️  Redis URL not configured, skipping Redis connection')
                logger.warn('Redis URL not configured')
                return
            }
            
            await redisService.connect()
            serviceHealth.redis = true
            console.log('✅ Redis connected successfully')
            logger.info('Redis connected successfully')
        },
        optional: true
    })
    
    // 3. Push notification service
    services.push({
        name: 'Push Notifications',
        init: async () => {
            console.log('=== PUSH NOTIFICATIONS ===')
            
            // Check if push notification credentials are configured
            if (!process.env.FCM_SERVER_KEY && !process.env.FIREBASE_PROJECT_ID) {
                console.log('⚠️  Push notification credentials not configured, skipping initialization')
                logger.warn('Push notification credentials not configured')
                return
            }
            
            await pushNotificationService.initialize()
            serviceHealth.pushNotifications = true
            console.log('✅ Push notifications initialized')
            logger.info('Push notification service initialized')
        },
        optional: true
    })
    
    // Initialize services sequentially
    for (const service of services) {
        try {
            await service.init()
        } catch (error) {
            console.error(`❌ Failed to initialize ${service.name}:`, error.message)
            logger.error(`Failed to initialize ${service.name}:`, error)
            
            // If service is not optional, throw error to stop startup
            if (!service.optional) {
                throw error
            }
        }
    }
}

// Start server
const startServer = async () => {
    try {
        // Initialize all services
        await initializeServices()
        
        console.log('=== SERVER STARTUP ===')
        console.log('Starting Express server...')
        
        // Start server
        const server = app.listen(PORT, () => {
            serviceHealth.server = true
            
            console.log('✅ Avigate API server started successfully')
            console.log(`🚀 Server running on port ${PORT}`)
            console.log(`🏥 Health check: http://localhost:${PORT}/health`)
            console.log(`🔍 Readiness check: http://localhost:${PORT}/ready`)
            console.log(`🌐 Environment: ${process.env.NODE_ENV}`)
            console.log('======================')
            
            logger.info(`Avigate API server running on port ${PORT}`)
            logger.info(`Environment: ${process.env.NODE_ENV}`)
        })

        // Handle server errors
        server.on('error', (error) => {
            console.error('=== SERVER ERROR ===')
            console.error('Server failed to start:', error.message)
            console.error('Error code:', error.code)
            console.error('Error stack:', error.stack)
            console.error('===================')
            
            logError(error, { context: 'server_startup' })
            process.exit(1)
        })

        // Handle server listening errors (like port already in use)
        server.on('listening', () => {
            console.log('✅ Server is now listening for requests')
        })

        return server
    } catch (error) {
        console.error('=== STARTUP FAILED ===')
        console.error('Failed to start server:', error.message)
        console.error('Error name:', error.name)
        console.error('Error code:', error.code)
        console.error('Full error:', error)
        console.error('==================')
        
        logger.error('Failed to start server:', error.message)
        logger.error('Full error:', error)
        process.exit(1)
    }
}

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n=== GRACEFUL SHUTDOWN (${signal}) ===`)
    logger.info(`${signal} received. Shutting down gracefully...`)
    
    // Mark server as not healthy
    serviceHealth.server = false
    
    const shutdownSteps = []
    
    // 1. Stop accepting new connections (if server exists)
    shutdownSteps.push({
        name: 'Server',
        action: async () => {
            console.log('Stopping server from accepting new connections...')
            // The server will be closed by the caller
            console.log('✅ Server stopped accepting new connections')
        }
    })
    
    // 2. Close push notification service
    if (serviceHealth.pushNotifications) {
        shutdownSteps.push({
            name: 'Push Notifications',
            action: async () => {
                console.log('Shutting down push notification service...')
                await pushNotificationService.shutdown()
                serviceHealth.pushNotifications = false
                console.log('✅ Push notification service shut down')
                logger.info('Push notification service shut down')
            }
        })
    }
    
    // 3. Close Redis connection
    if (serviceHealth.redis) {
        shutdownSteps.push({
            name: 'Redis',
            action: async () => {
                console.log('Closing Redis connection...')
                await redisService.disconnect()
                serviceHealth.redis = false
                console.log('✅ Redis connection closed')
                logger.info('Redis connection closed')
            }
        })
    }
    
    // 4. Close database connection
    if (serviceHealth.database) {
        shutdownSteps.push({
            name: 'Database',
            action: async () => {
                console.log('Closing database connection...')
                await sequelize.close()
                serviceHealth.database = false
                console.log('✅ Database connection closed')
                logger.info('Database connection closed')
            }
        })
    }
    
    // Execute shutdown steps
    for (const step of shutdownSteps) {
        try {
            await step.action()
        } catch (error) {
            console.error(`❌ Error shutting down ${step.name}:`, error.message)
            logger.error(`Error shutting down ${step.name}:`, error)
        }
    }
    
    console.log('✅ Graceful shutdown completed')
    console.log('===========================')
    
    // Give logger time to flush
    setTimeout(() => {
        process.exit(0)
    }, 500)
}

// Process signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('=== UNHANDLED PROMISE REJECTION ===')
    console.error('Promise:', promise)
    console.error('Reason:', reason)
    console.error('Reason stack:', reason?.stack)
    console.error('==================================')
    
    logger.error('Unhandled Rejection at:', promise)
    logger.error('Reason:', reason)
    logger.error('Stack:', reason?.stack)
    
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION')
    }
})

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('=== UNCAUGHT EXCEPTION ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    console.error('=========================')
    
    logger.error('Uncaught Exception:', error.message)
    logger.error('Stack:', error.stack)
    
    // Uncaught exceptions are serious, always exit
    gracefulShutdown('UNCAUGHT_EXCEPTION')
})

// Log startup completion
console.log('Server configuration completed, starting services...')

// Start the server
startServer()

module.exports = app