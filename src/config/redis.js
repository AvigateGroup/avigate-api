// config/redis.js
module.exports = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // Connection options
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
    },
    
    // Cache TTL settings (in seconds)
    ttl: {
        routes: 3600, // 1 hour
        locations: 7200, // 2 hours
        search: 300, // 5 minutes
        fare: 1800, // 30 minutes
        session: 3600, // 1 hour
        directions: 1800, // 30 minutes
        user: 900, // 15 minutes
    },
    
    // Key prefixes
    prefixes: {
        route: 'avigate:route:',
        location: 'avigate:location:',
        search: 'avigate:search:',
        fare: 'avigate:fare:',
        session: 'avigate:session:',
        user: 'avigate:user:',
        rateLimit: 'avigate:rate:',
    },
    
    // Rate limiting configuration
    rateLimit: {
        general: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // requests per window
        },
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // requests per window
        },
        search: {
            windowMs: 60 * 1000, // 1 minute
            max: 20, // requests per window
        },
    },
}