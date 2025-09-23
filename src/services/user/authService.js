//services/user/authService.js - JWT and token management
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { logger } = require('../../utils/logger')

// Generate JWT access token
const generateAccessToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        reputation: user.reputationScore,
        type: 'access',
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'avigate-api',
        audience: 'avigate-app',
    })
}

// Generate JWT refresh token
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        type: 'refresh',
        tokenId: crypto.randomUUID(),
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'avigate-api',
        audience: 'avigate-app',
    })
}

// Generate both access and refresh tokens
const generateTokens = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
    }
}

// Verify access token
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'avigate-api',
            audience: 'avigate-app',
        })
    } catch (error) {
        logger.debug('Access token verification failed:', error.message)
        return null
    }
}

// Verify refresh token
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
            issuer: 'avigate-api',
            audience: 'avigate-app',
        })

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type')
        }

        return decoded
    } catch (error) {
        logger.debug('Refresh token verification failed:', error.message)
        return null
    }
}

// Generate password reset token
const generatePasswordResetToken = () => {
    return crypto.randomBytes(32).toString('hex')
}

// Generate email verification token
const generateEmailVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex')
}

// Generate secure random string for share codes, etc. - FIXED!
const generateSecureRandomString = (length = 8, charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
    console.log('=== GENERATE SECURE RANDOM STRING ===')
    console.log('Length:', length)
    console.log('Character set:', charSet)
    
    let result = ''

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charSet.length)
        result += charSet.charAt(randomIndex)
        console.log(`Character ${i + 1}: ${charSet.charAt(randomIndex)} (index ${randomIndex})`)
    }

    console.log('Generated result:', result)
    console.log('==========================================')

    return result
}

// Hash a token for storage (useful for password reset tokens)
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

// Validate token strength
const validateTokenStrength = (token) => {
    if (!token || token.length < 8) {
        return false
    }

    // Check if token has sufficient entropy
    const uniqueChars = new Set(token).size
    return uniqueChars >= 4
}

// Create session data for storing in Redis/memory
const createSessionData = (user, tokenId) => {
    return {
        userId: user.id,
        email: user.email,
        tokenId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: null, // Can be set by middleware
        ip: null, // Can be set by middleware
    }
}

// Token blacklist management (for logout)
const blacklistedTokens = new Set()

const blacklistToken = (tokenId) => {
    blacklistedTokens.add(tokenId)

    // Clean up old tokens periodically (simple in-memory cleanup)
    if (blacklistedTokens.size > 10000) {
        const tokensArray = Array.from(blacklistedTokens)
        blacklistedTokens.clear()
        // Keep only the most recent 5000 tokens
        tokensArray
            .slice(-5000)
            .forEach((token) => blacklistedTokens.add(token))
    }
}

const isTokenBlacklisted = (tokenId) => {
    return blacklistedTokens.has(tokenId)
}

// JWT token info extractor
const extractTokenInfo = (token) => {
    try {
        const decoded = jwt.decode(token)
        if (!decoded) return null

        return {
            userId: decoded.userId,
            email: decoded.email,
            type: decoded.type,
            tokenId: decoded.tokenId,
            iat: decoded.iat,
            exp: decoded.exp,
            issuer: decoded.iss,
            audience: decoded.aud,
            isExpired: decoded.exp < Math.floor(Date.now() / 1000),
        }
    } catch (error) {
        return null
    }
}

// Calculate token expiry time
const getTokenExpiryTime = (expiresIn) => {
    const now = new Date()
    const expiry = new Date(now.getTime())

    // Parse expiry string (e.g., '15m', '7d', '1h')
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    if (!match) {
        return new Date(now.getTime() + 15 * 60 * 1000) // Default 15 minutes
    }

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
        case 's':
            expiry.setSeconds(expiry.getSeconds() + value)
            break
        case 'm':
            expiry.setMinutes(expiry.getMinutes() + value)
            break
        case 'h':
            expiry.setHours(expiry.getHours() + value)
            break
        case 'd':
            expiry.setDate(expiry.getDate() + value)
            break
        default:
            expiry.setMinutes(expiry.getMinutes() + 15)
    }

    return expiry
}

// Validate JWT configuration
const validateJWTConfig = () => {
    const errors = []

    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required')
    } else if (process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters long')
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET is required')
    } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
        errors.push('JWT_REFRESH_SECRET should be at least 32 characters long')
    }

    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_SECRET and JWT_REFRESH_SECRET should be different')
    }

    return errors
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
    generatePasswordResetToken,
    generateEmailVerificationToken,
    generateSecureRandomString,
    hashToken,
    validateTokenStrength,
    createSessionData,
    blacklistToken,
    isTokenBlacklisted,
    extractTokenInfo,
    getTokenExpiryTime,
    validateJWTConfig,
}