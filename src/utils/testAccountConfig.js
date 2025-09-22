// utils/testAccountConfig.js - Configuration for test accounts
const TEST_ACCOUNT_CONFIG = {
    // Test accounts for app store review and development
    accounts: {
        'testuser1@avigate.co': {
            password: 'TestPass123!',
            firstName: 'John',
            lastName: 'Tester',
            sex: 'male',
            phoneNumber: '+2348012345671',
            description: 'General testing account for app functionality',
            features: ['login', 'routes', 'navigation', 'basic_features'],
        },
        'testuser2@avigate.co': {
            password: 'TestPass123!',
            firstName: 'Jane',
            lastName: 'Reviewer',
            sex: 'female',
            phoneNumber: '+2348012345672',
            description: 'Advanced testing account with higher reputation',
            features: ['login', 'routes', 'navigation', 'crowdsourcing', 'premium_features'],
        },
        'googletest@avigate.co': {
            password: 'TestPass123!',
            firstName: 'Google',
            lastName: 'PlayTester',
            sex: 'male',
            phoneNumber: '+2348012345673',
            description: 'Google Play Store testing account',
            features: ['google_oauth', 'login', 'all_features'],
            googleId: 'test_google_id_123',
        },
        'appletest@avigate.co': {
            password: 'TestPass123!',
            firstName: 'Apple',
            lastName: 'StoreTester',
            sex: 'female',
            phoneNumber: '+2348012345674',
            description: 'Apple App Store testing account',
            features: ['login', 'routes', 'navigation', 'ios_specific_features'],
        },
    },
        
    // Special test tokens for bypassing authentication
    testTokens: {
        google: 'test_google_token',
        bypass: 'test_bypass_auth_token',
    },
        
    // Development settings
    settings: {
        bypassOTPVerification: true,
        bypassDeviceVerification: true,
        bypassEmailVerification: true,
        autoCreateDevices: true,
        skipSecurityChecks: true,
    },
}

module.exports = { TEST_ACCOUNT_CONFIG }