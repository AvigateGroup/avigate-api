// config/googleMaps.js
module.exports = {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    libraries: ['places', 'geometry', 'directions'],
    
    // Nigeria-specific configuration
    defaultBounds: {
        north: 14.0,
        south: 4.0,
        east: 15.0,
        west: 2.5,
    },
    
    defaultCenter: {
        lat: 9.0820,
        lng: 8.6753, // Nigeria's approximate center
    },
    
    // Major Nigerian cities with coordinates
    majorCities: {
        'Lagos': { lat: 6.5244, lng: 3.3792 },
        'Abuja': { lat: 9.0579, lng: 7.4951 },
        'Kano': { lat: 12.0022, lng: 8.5920 },
        'Ibadan': { lat: 7.3775, lng: 3.9470 },
        'Port Harcourt': { lat: 4.8156, lng: 7.0498 },
        'Benin City': { lat: 6.3350, lng: 5.6037 },
        'Kaduna': { lat: 10.5222, lng: 7.4383 },
        'Jos': { lat: 9.8965, lng: 8.8583 },
        'Ilorin': { lat: 8.5370, lng: 4.5907 },
        'Aba': { lat: 5.1066, lng: 7.3667 },
    },
    
    // Transport mode mappings
    transportModeMapping: {
        'bus': 'transit',
        'taxi': 'driving',
        'keke_napep': 'driving',
        'okada': 'driving',
        'walking': 'walking',
        'car': 'driving',
    },
    
    // Places types relevant to transportation
    relevantPlaceTypes: [
        'bus_station',
        'transit_station',
        'subway_station',
        'train_station',
        'airport',
        'taxi_stand',
        'parking',
        'gas_station',
        'hospital',
        'school',
        'university',
        'shopping_mall',
        'bank',
        'atm',
        'restaurant',
        'lodging',
        'tourist_attraction',
        'place_of_worship',
        'government',
    ],
    
    // Rate limiting
    rateLimit: {
        requestsPerSecond: 10,
        requestsPerDay: 25000,
    },
    
    // Caching settings
    cache: {
        geocodeTtl: 86400, // 24 hours
        directionsTtl: 3600, // 1 hour
        placesTtl: 43200, // 12 hours
    },
}

