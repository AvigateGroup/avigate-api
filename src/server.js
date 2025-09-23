const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const cookieParser = require('cookie-parser')

// Load environment variables first
require('dotenv').config()

const { sequelize } = require('./models')
const { logger } = require('./utils/logger')
const { errorHandler, notFoundHandler, logError } = require('./middleware/errorHandler')

// Import routes
const userAuthRoutes = require('./routes/user/userAuthRoute')
const locationRoutes = require('./routes/locations')
const routeRoutes = require('./routes/routes')
const directionRoutes = require('./routes/directions')
const crowdsourceRoutes = require('./routes/crowdsource')
const adminAuthRoutes = require('./routes/admin/adminAuthRoutes')
const adminUserManagementRoutes = require('./routes/admin/userManagement')

const app = express()
const PORT = process.env.PORT || 3000

console.log('=== AVIGATE SERVER STARTUP ===')
console.log('Environment:', process.env.NODE_ENV)
console.log('Port:', PORT)
console.log('Database URL present:', !!process.env.DATABASE_URL)
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

app.use(cookieParser());

// CORS should be before helmet for correct headers
console.log('Setting up CORS...')
app.use(
    cors({
        origin:
            process.env.NODE_ENV === 'production'
                ? ['https://your-frontend-domain.com'] // Replace with your actual domain
                : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    })
)

// Security middleware
console.log('Setting up security middleware...')
app.use(helmet())

// Body parsing middleware with error handling
console.log('Setting up body parsing...')
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        // Log request body size for debugging
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
                // Also log to console in development
                if (process.env.NODE_ENV === 'development') {
                    console.log('Morgan:', msg.trim())
                }
            },
        },
    })
)

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
    console.log('Health check requested')
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    })
})

// API routes with logging
console.log('Setting up API routes...')

app.use('/api/v1/user/auth', (req, res, next) => {
    console.log('User auth route hit:', req.method, req.url)
    next()
}, userAuthRoutes)

app.use('/api/v1/locations', (req, res, next) => {
    console.log('Locations route hit:', req.method, req.url)
    next()
}, locationRoutes)

app.use('/api/v1/routes', (req, res, next) => {
    console.log('Routes route hit:', req.method, req.url)
    next()
}, routeRoutes)

app.use('/api/v1/directions', (req, res, next) => {
    console.log('Directions route hit:', req.method, req.url)
    next()
}, directionRoutes)

app.use('/api/v1/crowdsource', (req, res, next) => {
    console.log('Crowdsource route hit:', req.method, req.url)
    next()
}, crowdsourceRoutes)

app.use('/api/v1/admin/auth', (req, res, next) => {
    console.log('Admin auth route hit:', req.method, req.url)
    next()
}, adminAuthRoutes)

app.use('/api/v1/admin/user', (req, res, next) => {
    console.log('Admin user management route hit:', req.method, req.url)
    next()
}, adminUserManagementRoutes)

// 404 handler (MUST be before the error handler)
console.log('Setting up 404 handler...')
app.use('*', notFoundHandler)

// Global error handler (MUST be last)
console.log('Setting up global error handler...')
app.use(errorHandler)

// Database connection and server startup
const startServer = async () => {
    try {
        console.log('=== DATABASE CONNECTION ===')
        console.log('Attempting to connect to database...')
        
        // Test database connection with enhanced logging
        await sequelize.authenticate()
        console.log('✅ Database connection established successfully')
        logger.info('Database connection established successfully')
        
        // Log database info
        const dbName = sequelize.config.database
        const dbHost = sequelize.config.host
        const dbPort = sequelize.config.port
        console.log(`Connected to: ${dbName} on ${dbHost}:${dbPort}`)

        console.log('=== SERVER STARTUP ===')
        console.log('Starting Express server...')
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log('✅ Avigate API server started successfully')
            console.log(`🚀 Server running on port ${PORT}`)
            console.log(`🏥 Health check: http://localhost:${PORT}/health`)
            console.log(`🌐 Environment: ${process.env.NODE_ENV}`)
            console.log('======================')
            
            logger.info(`Avigate API server running on port ${PORT}`)
            logger.info(`Health check available at http://localhost:${PORT}/health`)
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

// Enhanced graceful shutdown handlers
const gracefulShutdown = async (signal) => {
    console.log(`=== GRACEFUL SHUTDOWN (${signal}) ===`)
    logger.info(`${signal} received. Shutting down gracefully...`)
    
    try {
        console.log('Closing database connection...')
        await sequelize.close()
        console.log('✅ Database connection closed')
        logger.info('Database connection closed')
        
        console.log('✅ Graceful shutdown completed')
        console.log('===========================')
        process.exit(0)
    } catch (error) {
        console.error('❌ Error during shutdown:', error)
        logger.error('Error during shutdown:', error)
        process.exit(1)
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Enhanced error handlers for unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('=== UNHANDLED PROMISE REJECTION ===')
    console.error('Promise:', promise)
    console.error('Reason:', reason)
    console.error('Reason stack:', reason?.stack)
    console.error('==================================')
    
    logger.error('Unhandled Rejection at:', promise)
    logger.error('Reason:', reason)
    logger.error('Stack:', reason?.stack)
    
    // Give the logger time to write before exiting
    setTimeout(() => {
        process.exit(1)
    }, 1000)
})

process.on('uncaughtException', (error) => {
    console.error('=== UNCAUGHT EXCEPTION ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    console.error('=========================')
    
    logger.error('Uncaught Exception:', error.message)
    logger.error('Stack:', error.stack)
    
    // Give the logger time to write before exiting
    setTimeout(() => {
        process.exit(1)
    }, 1000)
})

// Log startup completion
console.log('Server configuration completed, starting...')

// Start the server
startServer()

module.exports = app