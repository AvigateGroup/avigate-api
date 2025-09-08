const logger = require('../utils/logger');

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error response formatter
const formatErrorResponse = (error, req) => {
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  // Add validation details for validation errors
  if (error.name === 'ValidationError' && error.details) {
    response.details = error.details;
  }

  // Add field info for custom validation errors
  if (error.field) {
    response.field = error.field;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

// Handle specific error types
const handleSequelizeError = (error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return new ValidationError('Validation failed', validationErrors);

    case 'SequelizeUniqueConstraintError':
      const field = error.errors[0]?.path || 'field';
      return new ConflictError(`${field} already exists`);

    case 'SequelizeForeignKeyConstraintError':
      return new ValidationError('Invalid reference to related resource');

    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeHostNotFoundError':
      return new AppError('Database connection failed', 503);

    case 'SequelizeTimeoutError':
      return new AppError('Database operation timed out', 504);

    default:
      return new AppError('Database error occurred', 500);
  }
};

const handleJWTError = (error) => {
  switch (error.name) {
    case 'JsonWebTokenError':
      return new AuthenticationError('Invalid token');
    case 'TokenExpiredError':
      return new AuthenticationError('Token expired');
    case 'NotBeforeError':
      return new AuthenticationError('Token not active');
    default:
      return new AuthenticationError('Token verification failed');
  }
};

const handleMulterError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new ValidationError('File too large');
    case 'LIMIT_FILE_COUNT':
      return new ValidationError('Too many files');
    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('Unexpected file field');
    default:
      return new ValidationError('File upload error');
  }
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  let appError = error;

  // Convert known errors to AppError instances
  if (error.name?.startsWith('Sequelize')) {
    appError = handleSequelizeError(error);
  } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
    appError = handleJWTError(error);
  } else if (error.code?.startsWith('LIMIT_')) {
    appError = handleMulterError(error);
  } else if (error.status === 429) {
    appError = new RateLimitError(error.message);
  } else if (!error.isOperational) {
    // Handle programming errors
    appError = new AppError('Something went wrong', 500);
  }

  // Log error
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error:', {
    message: appError.message,
    statusCode: appError.statusCode,
    stack: appError.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Send error response
  const response = formatErrorResponse(appError, req);
  res.status(appError.statusCode || 500).json(response);
};

// 404 handler (should be used before the general error handler)
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error logging helper
const logError = (error, context = {}) => {
  logger.error('Application error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

// Validation error helper
const createValidationError = (message, details = null) => {
  const error = new ValidationError(message);
  if (details) {
    error.details = details;
  }
  return error;
};

// Check if error is operational (safe to show to user)
const isOperationalError = (error) => {
  return error instanceof AppError && error.isOperational;
};

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
  formatErrorResponse
};