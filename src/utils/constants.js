// Application constants for Avigate Backend API

// Vehicle types supported in Nigeria
const VEHICLE_TYPES = {
    BUS: 'bus',
    TAXI: 'taxi',
    KEKE: 'keke', // Tricycle (Keke NAPEP)
    OKADA: 'okada', // Motorcycle taxi
    TRAIN: 'train',
    WALKING: 'walking',
}

// Route difficulty levels
const ROUTE_DIFFICULTY = {
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
}

// User languages supported
const SUPPORTED_LANGUAGES = {
    ENGLISH: 'English',
    HAUSA: 'Hausa',
    IGBO: 'Igbo',
    YORUBA: 'Yoruba',
    PIDGIN: 'Pidgin',
}

// Nigerian states
const NIGERIAN_STATES = [
    'Abia',
    'Adamawa',
    'Akwa Ibom',
    'Anambra',
    'Bauchi',
    'Bayelsa',
    'Benue',
    'Borno',
    'Cross River',
    'Delta',
    'Ebonyi',
    'Edo',
    'Ekiti',
    'Enugu',
    'FCT',
    'Gombe',
    'Imo',
    'Jigawa',
    'Kaduna',
    'Kano',
    'Katsina',
    'Kebbi',
    'Kogi',
    'Kwara',
    'Lagos',
    'Nasarawa',
    'Niger',
    'Ogun',
    'Ondo',
    'Osun',
    'Oyo',
    'Plateau',
    'Rivers',
    'Sokoto',
    'Taraba',
    'Yobe',
    'Zamfara',
]

// Major Nigerian cities
const MAJOR_CITIES = {
    LAGOS: 'Lagos',
    ABUJA: 'Abuja',
    KANO: 'Kano',
    IBADAN: 'Ibadan',
    PORT_HARCOURT: 'Port Harcourt',
    BENIN_CITY: 'Benin City',
    KADUNA: 'Kaduna',
    ENUGU: 'Enugu',
    CALABAR: 'Calabar',
    WARRI: 'Warri',
    OWERRI: 'Owerri',
    ILORIN: 'Ilorin',
    ABEOKUTA: 'Abeokuta',
    SOKOTO: 'Sokoto',
    MINNA: 'Minna',
}

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
    OTHER: 'other',
}

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
    ENTERTAINMENT: 'Entertainment',
    BANK: 'Bank',
    FUEL_STATION: 'Fuel Station',
}

// Visibility levels for landmarks
const VISIBILITY_LEVELS = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
}

// Notification types
const NOTIFICATION_TYPES = {
    WELCOME: 'welcome',
    ROUTE_UPDATE: 'route_update',
    ROUTE_DISRUPTION: 'route_disruption',
    ROUTE_FEEDBACK: 'route_feedback',
    CONTRIBUTION_REWARD: 'contribution_reward',
    EMERGENCY_ALERT: 'emergency_alert',
    WEEKLY_DIGEST: 'weekly_digest',
    MONTHLY_REPORT: 'monthly_report',
}

// Notification priorities
const NOTIFICATION_PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
}

// API response status codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
}

// User reputation system
const REPUTATION_POINTS = {
    REGISTER: 10,
    EMAIL_VERIFY: 5,
    CREATE_ROUTE: 5,
    UPDATE_ROUTE: 2,
    PROVIDE_FEEDBACK: 1,
    HELPFUL_FEEDBACK: 3,
    REPORT_ISSUE: 2,
    VERIFY_LOCATION: 3,
}

const REPUTATION_LEVELS = {
    NEWCOMER: { min: 0, max: 49, name: 'Newcomer' },
    CONTRIBUTOR: { min: 50, max: 199, name: 'Contributor' },
    TRUSTED: { min: 200, max: 499, name: 'Trusted Navigator' },
    EXPERT: { min: 500, max: 999, name: 'Expert Navigator' },
    MASTER: { min: 1000, max: Infinity, name: 'Master Navigator' },
}

// Rate limiting configurations
const RATE_LIMITS = {
    GENERAL: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window
    },
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // authentication attempts per window
    },
    SEARCH: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 20, // search requests per minute
    },
    CREATE: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // content creation per hour
    },
    UPLOAD: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // file uploads per hour
    },
}

// File upload constraints
const UPLOAD_LIMITS = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES: 5,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
}

// Geographic constraints for Nigeria
const NIGERIA_BOUNDS = {
    LATITUDE: { MIN: 4.0, MAX: 14.0 },
    LONGITUDE: { MIN: 2.5, MAX: 15.0 },
}

// Time zones
const TIME_ZONES = {
    NIGERIA: 'Africa/Lagos',
    UTC: 'UTC',
}

// Currency
const CURRENCY = {
    CODE: 'NGN',
    SYMBOL: '₦',
    NAME: 'Nigerian Naira',
}

// Fare constraints (in Naira)
const FARE_CONSTRAINTS = {
    MIN: 0,
    MAX: 100000, // ₦100,000
    DEFAULT_MIN: 50,
    DEFAULT_MAX: 1000,
}

// Duration constraints (in minutes)
const DURATION_CONSTRAINTS = {
    MIN: 1,
    MAX: 1440, // 24 hours
    DEFAULT: 30,
}

// Distance constraints (in kilometers)
const DISTANCE_CONSTRAINTS = {
    MIN: 0.1,
    MAX: 1000,
    NEARBY_RADIUS: 10,
}

// Crowdsourcing confidence levels
const CONFIDENCE_LEVELS = {
    VERY_LOW: 1,
    LOW: 2,
    MEDIUM: 3,
    HIGH: 4,
    VERY_HIGH: 5,
}

// Update types for crowdsourcing
const UPDATE_TYPES = {
    FARE: 'fare',
    DURATION: 'duration',
    AVAILABILITY: 'availability',
    CONDITION: 'condition',
    ROUTE_CHANGE: 'route_change',
}

// Traffic conditions
const TRAFFIC_CONDITIONS = {
    LIGHT: 'light',
    MODERATE: 'moderate',
    HEAVY: 'heavy',
}

// Weather conditions
const WEATHER_CONDITIONS = {
    CLEAR: 'clear',
    RAINY: 'rainy',
    CLOUDY: 'cloudy',
    STORMY: 'stormy',
}

// Time of day categories
const TIME_OF_DAY = {
    MORNING: 'morning', // 5 AM - 12 PM
    AFTERNOON: 'afternoon', // 12 PM - 5 PM
    EVENING: 'evening', // 5 PM - 9 PM
    NIGHT: 'night', // 9 PM - 5 AM
}

// Days of the week
const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
]

// API versions
const API_VERSIONS = {
    V1: 'v1',
    CURRENT: 'v1',
}

// Database table names
const TABLE_NAMES = {
    USERS: 'users',
    LOCATIONS: 'locations',
    ROUTES: 'routes',
    ROUTE_STEPS: 'route_steps',
    USER_DIRECTIONS: 'user_directions',
    FARE_FEEDBACK: 'fare_feedback',
    LANDMARKS: 'landmarks',
}

// JWT token types
const TOKEN_TYPES = {
    ACCESS: 'access',
    REFRESH: 'refresh',
    RESET: 'reset',
    VERIFY: 'verify',
}

// Default pagination
const PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_OFFSET: 0,
}

// Search configuration
const SEARCH_CONFIG = {
    MIN_QUERY_LENGTH: 2,
    MAX_QUERY_LENGTH: 100,
    FUZZY_THRESHOLD: 0.7,
}

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
}

// Error codes
const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
}

// Regular expressions
const REGEX_PATTERNS = {
    NIGERIAN_PHONE: /^(\+234|234|0)(70|80|81|90|91)[0-9]{8}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    SHARE_CODE: /^[A-Z0-9]{8}$/,
    PASSWORD_STRENGTH: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
}

// External service configurations
const EXTERNAL_SERVICES = {
    GOOGLE_MAPS: {
        BASE_URL: 'https://maps.googleapis.com/maps/api',
        ENDPOINTS: {
            GEOCODING: '/geocode/json',
            DIRECTIONS: '/directions/json',
            PLACES: '/place/nearbysearch/json',
        },
    },
    FIREBASE: {
        MESSAGING_URL: 'https://fcm.googleapis.com/fcm/send',
    },
}

module.exports = {
    VEHICLE_TYPES,
    ROUTE_DIFFICULTY,
    SUPPORTED_LANGUAGES,
    NIGERIAN_STATES,
    MAJOR_CITIES,
    LOCATION_TYPES,
    LANDMARK_CATEGORIES,
    VISIBILITY_LEVELS,
    NOTIFICATION_TYPES,
    NOTIFICATION_PRIORITIES,
    HTTP_STATUS,
    REPUTATION_POINTS,
    REPUTATION_LEVELS,
    RATE_LIMITS,
    UPLOAD_LIMITS,
    NIGERIA_BOUNDS,
    TIME_ZONES,
    CURRENCY,
    FARE_CONSTRAINTS,
    DURATION_CONSTRAINTS,
    DISTANCE_CONSTRAINTS,
    CONFIDENCE_LEVELS,
    UPDATE_TYPES,
    TRAFFIC_CONDITIONS,
    WEATHER_CONDITIONS,
    TIME_OF_DAY,
    DAYS_OF_WEEK,
    API_VERSIONS,
    TABLE_NAMES,
    TOKEN_TYPES,
    PAGINATION,
    SEARCH_CONFIG,
    CACHE_TTL,
    ERROR_CODES,
    REGEX_PATTERNS,
    EXTERNAL_SERVICES,
    ENVIRONMENTS,
}
