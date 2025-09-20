// config/testAccounts.js - Test Accounts Configuration
const TEST_ACCOUNTS = {
    'testuser1@avigate.co': { 
        password: 'TestPass123!', 
        bypassOTP: true,
        description: 'General testing account for basic app functionality',
        features: ['login', 'routes', 'navigation', 'basic_features'],
    },
    'testuser2@avigate.co': { 
        password: 'TestPass123!', 
        bypassOTP: true,
        description: 'Advanced testing account with higher reputation',
        features: ['login', 'routes', 'navigation', 'crowdsourcing', 'premium_features'],
    },
    'googletest@avigate.co': { 
        password: 'TestPass123!', 
        bypassOTP: true,
        description: 'Google Play Store testing account',
        features: ['google_oauth', 'login', 'all_features'],
        googleId: 'test_google_id_123',
    },
    'appletest@avigate.co': { 
        password: 'TestPass123!', 
        bypassOTP: true,
        description: 'Apple App Store testing account',
        features: ['login', 'routes', 'navigation', 'ios_specific_features'],
    },
}

// Special test tokens for bypassing authentication
const TEST_TOKENS = {
    google: 'test_google_token',
    bypass: 'test_bypass_auth_token',
}

// Development settings for test accounts
const TEST_SETTINGS = {
    bypassOTPVerification: true,
    bypassDeviceVerification: true,
    bypassEmailVerification: true,
    autoCreateDevices: true,
    skipSecurityChecks: true,
}

module.exports = {
    TEST_ACCOUNTS,
    TEST_TOKENS,
    TEST_SETTINGS,
}