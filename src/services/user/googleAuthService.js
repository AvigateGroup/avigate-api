// services/user/googleAuthService.js
const { OAuth2Client } = require('google-auth-library')
const { logger } = require('../../utils/logger')

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Initialize Google OAuth client
let googleClient = null

const initializeGoogleClient = () => {
    if (!googleClient && GOOGLE_CLIENT_ID) {
        googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    }
    return googleClient
}

/**
 * Verify Google ID token and return user info
 */
const verifyGoogleToken = async (idToken) => {
    try {
        if (!GOOGLE_CLIENT_ID) {
            throw new Error('Google Client ID not configured')
        }
        
        const client = initializeGoogleClient()
        if (!client) {
            throw new Error('Failed to initialize Google OAuth client')
        }
        
        logger.info('Verifying Google token')
        
        const ticket = await client.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        })
        
        const payload = ticket.getPayload()
        
        if (!payload) {
            throw new Error('Invalid token payload')
        }
        
        // Validate token audience and issuer
        if (payload.aud !== GOOGLE_CLIENT_ID) {
            throw new Error('Invalid token audience')
        }
        
        if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
            throw new Error('Invalid token issuer')
        }
        
        logger.info('Google token verified successfully', {
            email: payload.email,
            sub: payload.sub,
        })
        
        return {
            sub: payload.sub, // Google user ID
            email: payload.email,
            email_verified: payload.email_verified,
            given_name: payload.given_name,
            family_name: payload.family_name,
            name: payload.name,
            picture: payload.picture,
            locale: payload.locale,
        }
    } catch (error) {
        logger.error('Google token verification failed:', {
            error: error.message,
            stack: error.stack,
        })
        
        return null
    }
}

/**
 * Validate Google OAuth configuration
 */
const validateGoogleConfig = () => {
    const errors = []
    
    if (!GOOGLE_CLIENT_ID) {
        errors.push('GOOGLE_CLIENT_ID is required')
    }
    
    if (!GOOGLE_CLIENT_SECRET) {
        errors.push('GOOGLE_CLIENT_SECRET is required')
    }
    
    if (errors.length > 0) {
        logger.warn('Google OAuth configuration incomplete:', errors)
        return { isValid: false, errors }
    }
    
    logger.info('Google OAuth configuration validated')
    return { isValid: true, errors: [] }
}

/**
 * Get Google OAuth URL for web login (if needed)
 */
const getGoogleAuthURL = (redirectUri) => {
    try {
        const client = initializeGoogleClient()
        if (!client) {
            throw new Error('Google client not initialized')
        }
        
        const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ],
            redirect_uri: redirectUri,
        })
        
        return authUrl
    } catch (error) {
        logger.error('Failed to generate Google auth URL:', error)
        return null
    }
}

/**
 * Exchange authorization code for tokens (for web OAuth flow)
 */
const exchangeCodeForTokens = async (code, redirectUri) => {
    try {
        const client = initializeGoogleClient()
        if (!client) {
            throw new Error('Google client not initialized')
        }
        
        const { tokens } = await client.getToken({
            code,
            redirect_uri: redirectUri,
        })
        
        client.setCredentials(tokens)
        
        return tokens
    } catch (error) {
        logger.error('Failed to exchange code for tokens:', error)
        return null
    }
}

module.exports = {
    verifyGoogleToken,
    validateGoogleConfig,
    getGoogleAuthURL,
    exchangeCodeForTokens,
}