const { logger } = require('../utils/logger')

// Custom Error Classes (keeping your existing ones)
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = isOperational
        this.name = this.constructor.name

        Error.captureStackTrace(this, this.constructor)
    }
}

class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400)
        this.field = field
        this.name = 'ValidationError'
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401)
        this.name = 'AuthenticationError'
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403)
        this.name = 'AuthorizationError'
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404)
        this.name = 'NotFoundError'
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409)
        this.name = 'ConflictError'
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429)
        this.name = 'RateLimitError'
    }
}

// Error response formatter
const formatErrorResponse = (error, req) => {
    const response = {
        success: false,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
    }

    // Add request ID if available
    if (req.id) {
        response.requestId = req.id
    }

    // Add validation details for validation errors
    if (error.name === 'ValidationError' && error.details) {
        response.details = error.details
    }

    // Add field info for custom validation errors
    if (error.field) {
        response.field = error.field
    }

    // Add development details
    if (process.env.NODE_ENV === 'development') {
        response.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
        }
        
        // Add request context for debugging
        response.debug = {
            body: req.body,
            params: req.params,
            query: req.query,
            headers: {
                'content-type': req.get('Content-Type'),
                'user-agent': req.get('User-Agent'),
                authorization: req.get('Authorization') ? '[REDACTED]' : undefined
            }
        }
    }

    return response
}

// Handle specific error types
const handleSequelizeError = (error) => {
    // Enhanced console logging for Sequelize errors
    console.log('🔍 Sequelize Error Details:')
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)
    
    if (error.sql) {
        console.log('SQL Query:', error.sql)
        console.log('SQL Parameters:', error.parameters)
    }
    
    if (error.original) {
        console.log('Original DB Error:', error.original.message)
        console.log('Original DB Code:', error.original.code)
    }
    
    if (error.errors && error.errors.length > 0) {
        console.log('Validation Errors:')
        error.errors.forEach((err, index) => {
            console.log(`  ${index + 1}. Field: ${err.path}`)
            console.log(`     Message: ${err.message}`)
            console.log(`     Value: ${err.value}`)
            console.log(`     Type: ${err.type}`)
        })
    }
    
    if (error.fields) {
        console.log('Constraint Fields:', error.fields)
    }

    switch (error.name) {
        case 'SequelizeValidationError':
            const validationErrors = error.errors.map((err) => ({
                field: err.path,
                message: err.message,
                value: err.value,
            }))
            return new ValidationError('Validation failed', validationErrors)

        case 'SequelizeUniqueConstraintError':
            const field = error.errors[0]?.path || Object.keys(error.fields || {})[0] || 'field'
            return new ConflictError(`${field} already exists`)

        case 'SequelizeForeignKeyConstraintError':
            return new ValidationError('Invalid reference to related resource')

        case 'SequelizeConnectionError':
        case 'SequelizeConnectionRefusedError':
        case 'SequelizeHostNotFoundError':
            return new AppError('Database connection failed', 503)

        case 'SequelizeTimeoutError':
            return new AppError('Database operation timed out', 504)

        case 'SequelizeDatabaseError':
            // Check for specific database errors
            if (error.original) {
                if (error.original.code === '42703') {
                    return new ValidationError('Invalid database column referenced')
                }
                if (error.original.code === '42P01') {
                    return new AppError('Database table does not exist', 500)
                }
                if (error.original.code === '23505') {
                    return new ConflictError('Duplicate entry found')
                }
            }
            return new AppError('Database error occurred', 500)

        default:
            return new AppError('Database error occurred', 500)
    }
}

const handleJWTError = (error) => {
    console.log('🔍 JWT Error:', error.message)
    switch (error.name) {
        case 'JsonWebTokenError':
            return new AuthenticationError('Invalid token')
        case 'TokenExpiredError':
            return new AuthenticationError('Token expired')
        case 'NotBeforeError':
            return new AuthenticationError('Token not active')
        default:
            return new AuthenticationError('Token verification failed')
    }
}

const handleMulterError = (error) => {
    console.log('🔍 Multer Error:', error.code, error.message)
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            return new ValidationError('File too large')
        case 'LIMIT_FILE_COUNT':
            return new ValidationError('Too many files')
        case 'LIMIT_UNEXPECTED_FILE':
            return new ValidationError('Unexpected file field')
        default:
            return new ValidationError('File upload error')
    }
}

// Main error handler middleware with enhanced logging
const errorHandler = (error, req, res, next) => {
    console.log('=== GLOBAL ERROR HANDLER TRIGGERED ===')
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)
    console.log('Error constructor:', error.constructor.name)
    console.log('Error operational:', error.isOperational)
    console.log('Request URL:', req.originalUrl)
    console.log('Request method:', req.method)
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    console.log('Request params:', req.params)
    console.log('Request query:', req.query)
    console.log('Request IP:', req.ip)
    console.log('User Agent:', req.get('User-Agent'))
    console.log('Authorization header present:', !!req.get('Authorization'))
    if (req.user) {
        console.log('Authenticated user:', req.user.id)
    }
    if (req.admin) {
        console.log('Authenticated admin:', req.admin.id)
    }
    console.log('Error stack:', error.stack)
    console.log('===========================================')

    let appError = error

    // Convert known errors to AppError instances
    if (error.name?.startsWith('Sequelize')) {
        console.log('🏷️ Converting Sequelize error to AppError')
        appError = handleSequelizeError(error)
    } else if (
        error.name?.includes('JsonWebToken') ||
        error.name?.includes('Token')
    ) {
        console.log('🏷️ Converting JWT error to AppError')
        appError = handleJWTError(error)
    } else if (error.code?.startsWith('LIMIT_')) {
        console.log('🏷️ Converting Multer error to AppError')
        appError = handleMulterError(error)
    } else if (error.status === 429) {
        console.log('🏷️ Converting rate limit error to AppError')
        appError = new RateLimitError(error.message)
    } else if (error.type === 'entity.parse.failed') {
        console.log('🏷️ Converting JSON parse error to AppError')
        appError = new ValidationError('Invalid JSON in request body')
    } else if (!error.isOperational) {
        // Handle programming errors
        console.log('🏷️ Converting non-operational error to generic AppError')
        console.log('Original error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            status: error.status
        })
        appError = new AppError('Something went wrong', 500)
    }

    // Enhanced logging
    const logLevel = appError.statusCode >= 500 ? 'error' : 'warn'
    logger[logLevel]('Request error:', {
        message: appError.message,
        statusCode: appError.statusCode,
        stack: appError.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        adminId: req.admin?.id,
        body: req.method !== 'GET' ? req.body : undefined,
        query: req.query,
        params: req.params,
        originalError: {
            name: error.name,
            message: error.message,
            code: error.code,
            sql: error.sql,
            parameters: error.parameters
        }
    })

    // Send error response
    const response = formatErrorResponse(appError, req)
    
    console.log('📤 Sending error response:', JSON.stringify(response, null, 2))
    
    res.status(appError.statusCode || 500).json(response)
}

// Enhanced 404 handler 
const notFoundHandler = (req, res, next) => {
    console.log('=== 404 HANDLER TRIGGERED ===')
    console.log('Requested URL:', req.originalUrl)
    console.log('Method:', req.method)
    console.log('IP:', req.ip)
    console.log('User Agent:', req.get('User-Agent'))
    console.log('=================================')
    
    const error = new NotFoundError(`Route ${req.originalUrl}`)
    next(error)
}

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.log('=== ASYNC HANDLER CAUGHT ERROR ===')
            console.log('Error in async route:', error.message)
            console.log('Route:', req.method, req.originalUrl)
            console.log('================================')
            next(error)
        })
    }
}

// Error logging helper
const logError = (error, context = {}) => {
    console.log('=== MANUAL ERROR LOG ===')
    console.log('Context:', context)
    console.log('Error:', error.message)
    console.log('=======================')
    
    logger.error('Application error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
    })
}

// Validation error helper
const createValidationError = (message, details = null) => {
    const error = new ValidationError(message)
    if (details) {
        error.details = details
    }
    return error
}

// Check if error is operational (safe to show to user)
const isOperationalError = (error) => {
    return error instanceof AppError && error.isOperational
}

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,

    // Middleware
    errorHandler,
    notFoundHandler,
    asyncHandler,

    // Helpers
    logError,
    createValidationError,
    isOperationalError,
    formatErrorResponse,
}