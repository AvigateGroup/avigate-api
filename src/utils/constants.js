// Application-wide constants

// Vehicle types supported in Nigeria
const VEHICLE_TYPES = {
  BUS: 'bus',
  TAXI: 'taxi',
  KEKE: 'keke',
  OKADA: 'okada',
  TRAIN: 'train',
  WALKING: 'walking'
};

// Route difficulty levels
const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard'
};

// Nigerian states
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

// Major Nigerian cities by state
const MAJOR_CITIES = {
  'Lagos': ['Lagos', 'Ikeja', 'Ikorodu', 'Epe', 'Badagry'],
  'FCT': ['Abuja', 'Gwagwalada', 'Kuje', 'Bwari'],
  'Kano': ['Kano', 'Wudil', 'Gwarzo'],
  'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Okrika'],
  'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin'],
  'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan'],
  'Anambra': ['Awka', 'Onitsha', 'Nnewi'],
  'Plateau': ['Jos', 'Bukuru', 'Shendam'],
  'Delta': ['Asaba', 'Warri', 'Sapele', 'Ughelli'],
  'Edo': ['Benin City', 'Auchi', 'Ekpoma'],
  'Enugu': ['Enugu', 'Nsukka', 'Oji River'],
  'Imo': ['Owerri', 'Orlu', 'Okigwe'],
  'Abia': ['Umuahia', 'Aba', 'Arochukwu'],
  'Cross River': ['Calabar', 'Ogoja', 'Ikom'],
  'Akwa Ibom': ['Uyo', 'Ikot Ekpene', 'Eket'],
  'Bayelsa': ['Yenagoa', 'Sagbama', 'Brass'],
  'Benue': ['Makurdi', 'Gboko', 'Otukpo'],
  'Borno': ['Maiduguri', 'Biu', 'Dikwa'],
  'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke'],
  'Gombe': ['Gombe', 'Billiri', 'Kaltungo'],
  'Taraba': ['Jalingo', 'Wukari', 'Bali'],
  'Adamawa': ['Yola', 'Mubi', 'Numan'],
  'Bauchi': ['Bauchi', 'Azare', 'Misau'],
  'Jigawa': ['Dutse', 'Hadejia', 'Gumel'],
  'Katsina': ['Katsina', 'Daura', 'Funtua'],
  'Kebbi': ['Birnin Kebbi', 'Argungu', 'Yauri'],
  'Kogi': ['Lokoja', 'Okene', 'Idah'],
  'Kwara': ['Ilorin', 'Offa', 'Omu-Aran'],
  'Nasarawa': ['Lafia', 'Keffi', 'Akwanga'],
  'Niger': ['Minna', 'Bida', 'Kontagora'],
  'Ogun': ['Abeokuta', 'Sagamu', 'Ijebu Ode'],
  'Ondo': ['Akure', 'Ondo', 'Owo'],
  'Osun': ['Osogbo', 'Ile-Ife', 'Ilesa'],
  'Ekiti': ['Ado-Ekiti', 'Ikere', 'Emure'],
  'Sokoto': ['Sokoto', 'Tambuwal', 'Gwadabawa'],
  'Yobe': ['Damaturu', 'Gashua', 'Nguru'],
  'Zamfara': ['Gusau', 'Kaura Namoda', 'Anka']
};

// Location types
const LOCATION_TYPES = {
  BUS_STOP: 'bus_stop',
  MOTOR_PARK: 'motor_park',
  TRAIN_STATION: 'train_station',
  TAXI_STAND: 'taxi_stand',
  MARKET: 'market',
  SCHOOL: 'school',
  HOSPITAL: 'hospital',
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  LANDMARK: 'landmark',
  OTHER: 'other'
};

// Landmark categories
const LANDMARK_CATEGORIES = {
  MARKET: 'Market',
  SCHOOL: 'School',
  HOSPITAL: 'Hospital',
  RELIGIOUS: 'Religious',
  GOVERNMENT: 'Government',
  TRANSPORT: 'Transport',
  COMMERCIAL: 'Commercial',
  RESIDENTIAL: 'Residential',
  ENTERTAINMENT: 'Entertainment'
};

// Notification types
const NOTIFICATION_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  ROUTE_SHARE: 'route_share',
  CONTRIBUTION: 'contribution',
  REPUTATION_MILESTONE: 'reputation_milestone',
  ROUTE_VERIFICATION: 'route_verification'
};

// User reputation milestones
const REPUTATION_MILESTONES = [
  50,   // Basic contributor
  100,  // Regular contributor
  200,  // Trusted contributor
  500,  // Community moderator
  1000, // Expert contributor
  2000, // Super contributor
  5000  // Community leader
];

// Reputation actions and points
const REPUTATION_ACTIONS = {
  ROUTE_CREATED: 5,
  ROUTE_VERIFIED: 10,
  FEEDBACK_SUBMITTED: 2,
  LOCATION_CREATED: 3,
  LOCATION_VERIFIED: 8,
  HELPFUL_CONTRIBUTION: 1,
  ROUTE_SHARED: 1,
  PROFILE_COMPLETED: 5
};

// Rate limiting configurations
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5
  },
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20
  },
  CREATE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10
  },
  CROWDSOURCE: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5
  }
};

// Search and pagination defaults
const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  OFFSET: 0
};

// Coordinate validation bounds for Nigeria
const NIGERIA_COORDINATES = {
  LATITUDE: {
    MIN: 4.0,
    MAX: 14.0
  },
  LONGITUDE: {
    MIN: 2.5,
    MAX: 15.0
  }
};

// Distance calculations
const DISTANCE_CONSTANTS = {
  EARTH_RADIUS_KM: 6371,
  DEFAULT_SEARCH_RADIUS: 10, // km
  MAX_SEARCH_RADIUS: 100 // km
};

// Fare estimation constants (in Naira)
const FARE_CONSTANTS = {
  MIN_FARE: 50,
  MAX_FARE: 10000,
  AVERAGE_FARE_PER_KM: {
    [VEHICLE_TYPES.BUS]: 30,
    [VEHICLE_TYPES.TAXI]: 100,
    [VEHICLE_TYPES.KEKE]: 50,
    [VEHICLE_TYPES.OKADA]: 40,
    [VEHICLE_TYPES.TRAIN]: 80,
    [VEHICLE_TYPES.WALKING]: 0
  }
};

// Time and duration constants
const TIME_CONSTANTS = {
  DEFAULT_TRANSFER_TIME: 15, // minutes
  MAX_ROUTE_DURATION: 1440, // 24 hours in minutes
  AVERAGE_SPEED_KMH: {
    [VEHICLE_TYPES.BUS]: 25,
    [VEHICLE_TYPES.TAXI]: 35,
    [VEHICLE_TYPES.KEKE]: 20,
    [VEHICLE_TYPES.OKADA]: 30,
    [VEHICLE_TYPES.TRAIN]: 45,
    [VEHICLE_TYPES.WALKING]: 5
  }
};

// Share code configuration
const SHARE_CODE_CONFIG = {
  LENGTH: 8,
  CHARACTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  EXPIRY_DAYS: 30
};

// File upload constants
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  UPLOAD_PATH: 'uploads/',
  TEMP_PATH: 'temp/'
};

// API response status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug'
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Regular expressions for validation
const REGEX_PATTERNS = {
  NIGERIAN_PHONE: /^(\+234|234|0)(70|80|81|90|91)[0-9]{8}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SHARE_CODE: /^[A-Z0-9]{8}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// Error messages
const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid Nigerian phone number',
    INVALID_COORDINATES: 'Coordinates must be within Nigeria boundaries',
    PASSWORD_TOO_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and number',
    INVALID_VEHICLE_TYPE: 'Invalid vehicle type selected',
    INVALID_STATE: 'Invalid Nigerian state',
    FARE_RANGE_INVALID: 'Maximum fare must be greater than minimum fare'
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Access token has expired',
    TOKEN_INVALID: 'Invalid access token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
    ACCOUNT_DEACTIVATED: 'Account has been deactivated'
  },
  NOT_FOUND: {
    USER: 'User not found',
    LOCATION: 'Location not found',
    ROUTE: 'Route not found',
    DIRECTION: 'Direction not found'
  },
  CONFLICT: {
    EMAIL_EXISTS: 'Email already exists',
    PHONE_EXISTS: 'Phone number already exists',
    LOCATION_EXISTS: 'Location already exists at these coordinates'
  },
  RATE_LIMIT: {
    GENERAL: 'Too many requests. Please try again later',
    AUTH: 'Too many authentication attempts. Please try again later',
    SEARCH: 'Search rate limit exceeded. Please try again later',
    CREATE: 'Content creation limit exceeded. Please try again later'
  }
};

// Success messages
const SUCCESS_MESSAGES = {
  AUTH: {
    REGISTRATION_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully'
  },
  LOCATION: {
    CREATED: 'Location created successfully',
    UPDATED: 'Location updated successfully',
    VERIFIED: 'Location verified successfully'
  },
  ROUTE: {
    CREATED: 'Route created successfully',
    UPDATED: 'Route updated successfully',
    FEEDBACK_SUBMITTED: 'Feedback submitted successfully'
  },
  DIRECTION: {
    CREATED: 'Direction created successfully',
    SHARED: 'Direction shared successfully'
  }
};

// Time zones
const TIME_ZONES = {
  NIGERIA: 'Africa/Lagos'
};

// Languages supported
const SUPPORTED_LANGUAGES = {
  ENGLISH: 'English',
  HAUSA: 'Hausa',
  IGBO: 'Igbo',
  YORUBA: 'Yoruba',
  PIDGIN: 'Pidgin'
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password_reset',
  ROUTE_SHARE: 'route_share',
  CONTRIBUTION_THANKS: 'contribution_thanks'
};

// Export all constants
module.exports = {
  VEHICLE_TYPES,
  DIFFICULTY_LEVELS,
  NIGERIAN_STATES,
  MAJOR_CITIES,
  LOCATION_TYPES,
  LANDMARK_CATEGORIES,
  NOTIFICATION_TYPES,
  REPUTATION_MILESTONES,
  REPUTATION_ACTIONS,
  RATE_LIMITS,
  PAGINATION_DEFAULTS,
  NIGERIA_COORDINATES,
  DISTANCE_CONSTANTS,
  FARE_CONSTANTS,
  TIME_CONSTANTS,
  SHARE_CODE_CONFIG,
  FILE_UPLOAD,
  HTTP_STATUS,
  LOG_LEVELS,
  CACHE_TTL,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  TIME_ZONES,
  SUPPORTED_LANGUAGES,
  EMAIL_TEMPLATES
};