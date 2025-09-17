const winston = require('winston')
const path = require('path')

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
}

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
}

// Add colors to winston
winston.addColors(colors)

// Function to determine log level
const level = () => {
    return 'warn'
}

// Function to determine log directory
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')

// Ensure log directory exists
const fs = require('fs')
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
}

// Define custom format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
)

// Create transports array
const transports = [
    // Console transport
    new winston.transports.Console({
        level: level(),
        format: format,
    }),
]

// Add file transports if LOG_DIR is specified
if (process.env.LOG_DIR) {
    transports.push(
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
        }),

        // Access log file for HTTP requests
        new winston.transports.File({
            filename: path.join(logDir, 'access.log'),
            level: 'http',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        })
    )
}

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,
})

// Create specialized loggers for different purposes
const createSpecializedLogger = (service) => {
    return logger.child({ service })
}

// HTTP request logger
const httpLogger = (req, res, next) => {
    const start = Date.now()

    res.on('finish', () => {
        const duration = Date.now() - start
        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user ? req.user.id : 'anonymous',
        }

        if (res.statusCode >= 400) {
            logger.warn('HTTP Request', logData)
        } else {
            logger.http('HTTP Request', logData)
        }
    })

    next()
}

// Database query logger
const dbLogger = {
    query: (sql, timing) => {
        logger.debug('DB Query', {
            sql: sql.slice(0, 100) + (sql.length > 100 ? '...' : ''),
            duration: timing ? `${timing}ms` : undefined,
        })
    },

    error: (error, sql) => {
        logger.error('DB Error', {
            error: error.message,
            sql: sql
                ? sql.slice(0, 100) + (sql.length > 100 ? '...' : '')
                : undefined,
        })
    },
}

// Auth logger
const authLogger = createSpecializedLogger('auth')

// Route logger
const routeLogger = createSpecializedLogger('routes')

// Service logger
const serviceLogger = createSpecializedLogger('services')

// Error logger with context
const logError = (error, context = {}) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
    }

    logger.error('Application Error', errorInfo)
}

// Log application startup
const logStartup = (port) => {
    logger.info('='.repeat(50))
    logger.info('🚀 Avigate API Server Starting...')
    logger.info(`📍 Port: ${port}`)
    logger.info(`📝 Log Level: ${level()}`)
    logger.info(`⏰ Started at: ${new Date().toISOString()}`)
    logger.info('='.repeat(50))
}

// Log graceful shutdown
const logShutdown = () => {
    logger.info('='.repeat(50))
    logger.info('🛑 Graceful shutdown initiated...')
    logger.info(`⏰ Shutdown at: ${new Date().toISOString()}`)
    logger.info('='.repeat(50))
}

// Performance logger
const performanceLogger = {
    time: (label) => {
        const start = process.hrtime()
        return {
            end: () => {
                const diff = process.hrtime(start)
                const duration = diff[0] * 1000 + diff[1] * 1e-6
                logger.debug(`Performance: ${label}`, {
                    duration: `${duration.toFixed(2)}ms`,
                })
                return duration
            },
        }
    },
}

// Security logger
const securityLogger = {
    suspiciousActivity: (activity, req) => {
        logger.warn('Security Alert', {
            activity,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            userId: req.user ? req.user.id : 'anonymous',
            timestamp: new Date().toISOString(),
        })
    },

    failedAuth: (email, ip, reason) => {
        logger.warn('Failed Authentication', {
            email,
            ip,
            reason,
            timestamp: new Date().toISOString(),
        })
    },

    rateLimitHit: (ip, endpoint, userId) => {
        logger.warn('Rate Limit Exceeded', {
            ip,
            endpoint,
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
        })
    },
}

module.exports = {
    logger,
    httpLogger,
    dbLogger,
    authLogger,
    routeLogger,
    serviceLogger,
    performanceLogger,
    securityLogger,
    logError,
    logStartup,
    logShutdown,
    createSpecializedLogger,
}

// Export the main logger as default
module.exports.default = logger