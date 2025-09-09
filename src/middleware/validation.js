const { authValidators, locationValidators, routeValidators, directionValidators, crowdsourceValidators, landmarkValidators, queryValidators, customValidators } = require('../utils/validators');
const logger = require('../utils/logger');

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      allowUnknown: false
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value,
        type: detail.type
      }));
      
      logger.warn('Validation failed', {
        endpoint: req.originalUrl,
        method: req.method,
        source,
        errors,
        userId: req.user?.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Replace the source data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Validate multiple sources (body, query, params)
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    Object.keys(schemas).forEach(source => {
      const schema = schemas[source];
      const data = req[source];
      
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      
      if (error) {
        const sourceErrors = error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
          value: detail.context?.value,
          type: detail.type
        }));
        errors.push(...sourceErrors);
      } else {
        req[source] = value;
      }
    });
    
    if (errors.length > 0) {
      logger.warn('Multi-source validation failed', {
        endpoint: req.originalUrl,
        method: req.method,
        errors,
        userId: req.user?.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Custom validation for Nigerian coordinates
const validateNigerianCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (latitude && longitude) {
    if (!customValidators.isWithinNigeria(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates must be within Nigeria boundaries',
        errors: [{
          field: 'coordinates',
          message: 'Latitude must be between 4.0-14.0 and longitude between 2.5-15.0',
          value: { latitude, longitude }
        }]
      });
    }
  }
  
  next();
};

// Validate Nigerian phone number format
const validateNigerianPhone = (req, res, next) => {
  const { phoneNumber } = req.body;
  
  if (phoneNumber && !customValidators.isValidNigerianPhone(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Nigerian phone number format',
      errors: [{
        field: 'phoneNumber',
        message: 'Phone number must be a valid Nigerian number (e.g., +2348012345678)',
        value: phoneNumber
      }]
    });
  }
  
  next();
};

// Validate fare range logic
const validateFareRange = (req, res, next) => {
  const { estimatedFareMin, estimatedFareMax, fareMin, fareMax } = req.body;
  
  // Check estimated fare range
  if (estimatedFareMin && estimatedFareMax) {
    if (!customValidators.isValidFareRange(estimatedFareMin, estimatedFareMax)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fare range',
        errors: [{
          field: 'fareRange',
          message: 'Maximum fare must be greater than or equal to minimum fare',
          value: { min: estimatedFareMin, max: estimatedFareMax }
        }]
      });
    }
  }
  
  // Check step fare range
  if (fareMin && fareMax) {
    if (!customValidators.isValidFareRange(fareMin, fareMax)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step fare range',
        errors: [{
          field: 'stepFareRange',
          message: 'Maximum fare must be greater than or equal to minimum fare',
          value: { min: fareMin, max: fareMax }
        }]
      });
    }
  }
  
  next();
};

// Validate route steps sequence
const validateRouteSteps = (req, res, next) => {
  const { steps } = req.body;
  
  if (steps && Array.isArray(steps)) {
    if (!customValidators.validateRouteSteps(steps)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route steps sequence',
        errors: [{
          field: 'steps',
          message: 'Step numbers must be sequential starting from 1',
          value: steps.map(step => step.stepNumber)
        }]
      });
    }
  }
  
  next();
};

// Validate share code format
const validateShareCode = (req, res, next) => {
  const { shareCode } = req.params;
  
  if (shareCode && !customValidators.isValidShareCode(shareCode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid share code format',
      errors: [{
        field: 'shareCode',
        message: 'Share code must be 8 characters long and contain only letters and numbers',
        value: shareCode
      }]
    });
  }
  
  next();
};

// Sanitize user input to prevent XSS
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      Object.keys(obj).forEach(key => {
        sanitized[key] = sanitize(obj[key]);
      });
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};

// Validate file uploads
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
    maxSize = 5 * 1024 * 1024, // 5MB
    required = false
  } = options;
  
  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        message: 'File upload is required',
        errors: [{
          field: 'file',
          message: 'Please upload a file'
        }]
      });
    }
    
    if (req.file) {
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type',
          errors: [{
            field: 'file',
            message: `Allowed types: ${allowedTypes.join(', ')}`,
            value: req.file.mimetype
          }]
        });
      }
      
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File too large',
          errors: [{
            field: 'file',
            message: `Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
            value: `${Math.round(req.file.size / 1024 / 1024)}MB`
          }]
        });
      }
    }
    
    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invalid page number',
      errors: [{
        field: 'page',
        message: 'Page must be a positive integer',
        value: page
      }]
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Invalid limit',
      errors: [{
        field: 'limit',
        message: 'Limit must be between 1 and 100',
        value: limit
      }]
    });
  }
  
  if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sort order',
      errors: [{
        field: 'sortOrder',
        message: 'Sort order must be "asc" or "desc"',
        value: sortOrder
      }]
    });
  }
  
  // Add parsed values to request
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    sortBy,
    sortOrder: sortOrder.toLowerCase()
  };
  
  next();
};

// Pre-defined validation middleware for common use cases
const validationMiddleware = {
  // Authentication validations
  validateRegister: validate(authValidators.register),
  validateLogin: validate(authValidators.login),
  validateGoogleAuth: validate(authValidators.googleAuth),
  validateUpdateProfile: validate(authValidators.updateProfile),
  validateRefreshToken: validate(authValidators.refreshToken),
  
  // Location validations
  validateCreateLocation: [
    validate(locationValidators.create),
    validateNigerianCoordinates
  ],
  validateUpdateLocation: validate(locationValidators.update),
  validateLocationSearch: validate(locationValidators.search, 'query'),
  validateNearbyLocations: validate(locationValidators.nearby, 'query'),
  
  // Route validations
  validateCreateRoute: [
    validate(routeValidators.create),
    validateFareRange,
    validateRouteSteps
  ],
  validateUpdateRoute: [
    validate(routeValidators.update),
    validateFareRange
  ],
  validateRouteSearch: validate(routeValidators.search, 'query'),
  validateRouteFeedback: validate(routeValidators.feedback),
  
  // Direction validations
  validateCreateDirection: validate(directionValidators.create),
  validateUpdateDirection: validate(directionValidators.update),
  validateShareCode: [validate(directionValidators.shareCode, 'params'), validateShareCode],
  
  // Crowdsourcing validations
  validateRouteUpdate: validate(crowdsourceValidators.routeUpdate),
  validateFareReport: validate(crowdsourceValidators.fareReport),
  validateNewRoute: [
    validate(crowdsourceValidators.newRoute),
    validateFareRange,
    validateRouteSteps
  ],
  
  // Landmark validations
  validateCreateLandmark: [
    validate(landmarkValidators.create),
    validateNigerianCoordinates
  ],
  validateUpdateLandmark: validate(landmarkValidators.update),
  
  // Query validations
  validatePagination,
  validateId: validate(queryValidators.id, 'params'),
  
  // General validations
  sanitizeInput,
  validateNigerianPhone,
  validateFileUpload
};

module.exports = {
  validate,
  validateMultiple,
  validateNigerianCoordinates,
  validateNigerianPhone,
  validateFareRange,
  validateRouteSteps,
  validateShareCode,
  sanitizeInput,
  validateFileUpload,
  validatePagination,
  validationMiddleware
};