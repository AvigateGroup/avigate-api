const crypto = require('crypto');
const { 
  NIGERIA_BOUNDS, 
  REGEX_PATTERNS, 
  TIME_OF_DAY, 
  VEHICLE_TYPES,
  CURRENCY 
} = require('./constants');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param {number} radians 
 * @returns {number} Degrees
 */
const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Check if coordinates are within Nigeria boundaries
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
const isWithinNigeria = (latitude, longitude) => {
  return latitude >= NIGERIA_BOUNDS.LATITUDE.MIN &&
         latitude <= NIGERIA_BOUNDS.LATITUDE.MAX &&
         longitude >= NIGERIA_BOUNDS.LONGITUDE.MIN &&
         longitude <= NIGERIA_BOUNDS.LONGITUDE.MAX;
};

/**
 * Calculate estimated travel time based on distance and vehicle type
 * @param {number} distance - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle
 * @param {string} trafficCondition - Traffic condition (light, moderate, heavy)
 * @returns {number} Estimated time in minutes
 */
const calculateEstimatedTime = (distance, vehicleType, trafficCondition = 'moderate') => {
  // Average speeds in km/h for different vehicle types in Nigerian traffic
  const baseSpeeds = {
    [VEHICLE_TYPES.WALKING]: 5,
    [VEHICLE_TYPES.OKADA]: 25,
    [VEHICLE_TYPES.KEKE]: 20,
    [VEHICLE_TYPES.TAXI]: 30,
    [VEHICLE_TYPES.BUS]: 25,
    [VEHICLE_TYPES.TRAIN]: 60
  };

  // Traffic multipliers
  const trafficMultipliers = {
    light: 1.2,
    moderate: 1.0,
    heavy: 0.6
  };

  const baseSpeed = baseSpeeds[vehicleType] || 25;
  const adjustedSpeed = baseSpeed * (trafficMultipliers[trafficCondition] || 1.0);
  
  const timeInHours = distance / adjustedSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return Math.max(timeInMinutes, 1); // Minimum 1 minute
};

/**
 * Estimate fare based on distance, vehicle type, and other factors
 * @param {number} distance - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle
 * @param {string} timeOfDay - Time of day category
 * @returns {object} Fare estimate with min and max
 */
const estimateFare = (distance, vehicleType, timeOfDay = 'morning') => {
  // Base rates per kilometer in Naira
  const baseRates = {
    [VEHICLE_TYPES.WALKING]: 0,
    [VEHICLE_TYPES.OKADA]: 80,
    [VEHICLE_TYPES.KEKE]: 60,
    [VEHICLE_TYPES.TAXI]: 120,
    [VEHICLE_TYPES.BUS]: 50,
    [VEHICLE_TYPES.TRAIN]: 40
  };

  // Minimum fares
  const minimumFares = {
    [VEHICLE_TYPES.WALKING]: 0,
    [VEHICLE_TYPES.OKADA]: 100,
    [VEHICLE_TYPES.KEKE]: 100,
    [VEHICLE_TYPES.TAXI]: 200,
    [VEHICLE_TYPES.BUS]: 100,
    [VEHICLE_TYPES.TRAIN]: 50
  };

  // Time of day multipliers
  const timeMultipliers = {
    morning: 1.0,
    afternoon: 1.1,
    evening: 1.2,
    night: 1.3
  };

  const baseRate = baseRates[vehicleType] || 80;
  const minimumFare = minimumFares[vehicleType] || 100;
  const timeMultiplier = timeMultipliers[timeOfDay] || 1.0;

  const baseFare = Math.max(distance * baseRate, minimumFare);
  const adjustedFare = baseFare * timeMultiplier;

  return {
    min: Math.round(adjustedFare * 0.8), // 20% below estimate
    max: Math.round(adjustedFare * 1.2)  // 20% above estimate
  };
};

/**
 * Format Nigerian phone number to international format
 * @param {string} phoneNumber 
 * @returns {string} Formatted phone number
 */
const formatNigerianPhone = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+234' + digits.substring(1);
  } else if (digits.length === 10) {
    return '+234' + digits;
  } else if (digits.length === 13 && digits.startsWith('234')) {
    return '+' + digits;
  } else if (digits.length === 14 && digits.startsWith('234')) {
    return digits;
  }
  
  return phoneNumber; // Return original if format not recognized
};

/**
 * Validate Nigerian phone number
 * @param {string} phoneNumber 
 * @returns {boolean}
 */
const isValidNigerianPhone = (phoneNumber) => {
  return REGEX_PATTERNS.NIGERIAN_PHONE.test(phoneNumber);
};

/**
 * Generate secure random string
 * @param {number} length 
 * @param {string} charset - Character set to use
 * @returns {string}
 */
const generateRandomString = (length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(crypto.randomInt(0, charset.length));
  }
  return result;
};

/**
 * Generate unique share code
 * @returns {string} 8-character alphanumeric code
 */
const generateShareCode = () => {
  return generateRandomString(8);
};

/**
 * Format currency amount in Nigerian Naira
 * @param {number} amount 
 * @param {boolean} includeSymbol - Whether to include currency symbol
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, includeSymbol = true) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return includeSymbol ? `${CURRENCY.SYMBOL}0` : '0';
  }
  
  const formatted = amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return includeSymbol ? `${CURRENCY.SYMBOL}${formatted}` : formatted;
};

/**
 * Get time of day category from hour
 * @param {number} hour - Hour in 24-hour format (0-23)
 * @returns {string} Time of day category
 */
const getTimeOfDay = (hour) => {
  if (hour >= 5 && hour < 12) return TIME_OF_DAY.MORNING;
  if (hour >= 12 && hour < 17) return TIME_OF_DAY.AFTERNOON;
  if (hour >= 17 && hour < 21) return TIME_OF_DAY.EVENING;
  return TIME_OF_DAY.NIGHT;
};

/**
 * Get current time of day
 * @returns {string} Current time of day category
 */
const getCurrentTimeOfDay = () => {
  const now = new Date();
  return getTimeOfDay(now.getHours());
};

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes 
 * @returns {string}
 */
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Calculate percentage change between two values
 * @param {number} oldValue 
 * @param {number} newValue 
 * @returns {number} Percentage change
 */
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Sanitize string for search (remove special characters, normalize)
 * @param {string} str 
 * @returns {string}
 */
const sanitizeForSearch = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Calculate similarity between two strings (simple Levenshtein-like)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity score between 0 and 1
 */
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = sanitizeForSearch(str1);
  const s2 = sanitizeForSearch(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number}
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Generate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page (1-based)
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const generatePaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Validate and parse coordinates
 * @param {string|number} latitude 
 * @param {string|number} longitude 
 * @returns {object|null} Parsed coordinates or null if invalid
 */
const parseCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  if (!isWithinNigeria(lat, lng)) {
    return null;
  }
  
  return { latitude: lat, longitude: lng };
};

/**
 * Generate bounding box for coordinate search
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude  
 * @param {number} radiusKm - Radius in kilometers
 * @returns {object} Bounding box coordinates
 */
const generateBoundingBox = (centerLat, centerLng, radiusKm) => {
  const latDelta = radiusKm / 111; // Approximately 111 km per degree of latitude
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(centerLat)));
  
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta
  };
};

/**
 * Capitalize first letter of each word
 * @param {string} str 
 * @returns {string}
 */
const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Generate slug from string
 * @param {string} str 
 * @returns {string}
 */
const generateSlug = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .trim();
};

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 * @param {any} value 
 * @returns {boolean}
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Deep clone object
 * @param {object} obj 
 * @returns {object}
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(deepClone);
  
  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Retry function with exponential backoff
 * @param {function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise}
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Debounce function
 * @param {function} func 
 * @param {number} wait 
 * @returns {function}
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {function} func 
 * @param {number} limit 
 * @returns {function}
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate UUID v4
 * @returns {string}
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Mask sensitive information
 * @param {string} str 
 * @param {number} visibleChars - Number of characters to show at start and end
 * @returns {string}
 */
const maskSensitiveData = (str, visibleChars = 3) => {
  if (!str || str.length <= visibleChars * 2) return str;
  
  const start = str.substring(0, visibleChars);
  const end = str.substring(str.length - visibleChars);
  const middle = '*'.repeat(Math.max(0, str.length - visibleChars * 2));
  
  return start + middle + end;
};

/**
 * Convert object to query string
 * @param {object} obj 
 * @returns {string}
 */
const objectToQueryString = (obj) => {
  const params = new URLSearchParams();
  
  for (let key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(value => params.append(key, value));
      } else {
        params.append(key, obj[key]);
      }
    }
  }
  
  return params.toString();
};

/**
 * Get age from date of birth
 * @param {Date|string} dateOfBirth 
 * @returns {number}
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format date to Nigerian locale
 * @param {Date|string} date 
 * @param {object} options 
 * @returns {string}
 */
const formatDateNigeria = (date, options = {}) => {
  const dateObj = new Date(date);
  const defaultOptions = {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('en-NG', defaultOptions);
};

/**
 * Check if date is today
 * @param {Date|string} date 
 * @returns {boolean}
 */
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.getDate() === checkDate.getDate() &&
         today.getMonth() === checkDate.getMonth() &&
         today.getFullYear() === checkDate.getFullYear();
};

module.exports = {
  calculateDistance,
  toRadians,
  toDegrees,
  isWithinNigeria,
  calculateEstimatedTime,
  estimateFare,
  formatNigerianPhone,
  isValidNigerianPhone,
  generateRandomString,
  generateShareCode,
  formatCurrency,
  getTimeOfDay,
  getCurrentTimeOfDay,
  formatDuration,
  calculatePercentageChange,
  sanitizeForSearch,
  calculateStringSimilarity,
  levenshteinDistance,
  generatePaginationMeta,
  parseCoordinates,
  generateBoundingBox,
  capitalizeWords,
  generateSlug,
  isEmpty,
  deepClone,
  retryWithBackoff,
  debounce,
  throttle,
  randomInt,
  generateUUID,
  maskSensitiveData,
  objectToQueryString,
  calculateAge,
  formatDateNigeria,
  isToday
};