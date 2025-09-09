const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { User } = require('../models');
const logger = require('../utils/logger');

// JWT Strategy for API authentication
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: 'avigate-api',
  audience: 'avigate-app'
}, async (payload, done) => {
  try {
    // Find user by ID from JWT payload
    const user = await User.findByPk(payload.userId, {
      attributes: { exclude: ['passwordHash', 'refreshToken'] }
    });

    if (!user) {
      logger.warn(`JWT authentication failed: User not found for ID ${payload.userId}`);
      return done(null, false, { message: 'User not found' });
    }

    if (!user.isActive) {
      logger.warn(`JWT authentication failed: User account deactivated for ID ${payload.userId}`);
      return done(null, false, { message: 'User account is deactivated' });
    }

    // Check if token is recent enough (optional security check)
    const tokenAge = Date.now() / 1000 - payload.iat;
    const maxTokenAge = 24 * 60 * 60; // 24 hours in seconds

    if (tokenAge > maxTokenAge) {
      logger.warn(`JWT authentication failed: Token too old for user ${payload.userId}`);
      return done(null, false, { message: 'Token expired' });
    }

    logger.debug(`JWT authentication successful for user ${user.email}`);
    return done(null, user);

  } catch (error) {
    logger.error('JWT Strategy error:', error);
    return done(error, false);
  }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    logger.debug(`Google OAuth attempt for email: ${profile.emails[0].value}`);

    // Check if user already exists with this Google ID
    let user = await User.findOne({
      where: { googleId: profile.id }
    });

    if (user) {
      // User exists with Google ID, update last login
      await user.updateLastLogin();
      logger.info(`Google OAuth successful for existing user: ${user.email}`);
      return done(null, user);
    }

    // Check if user exists with this email
    const email = profile.emails[0].value;
    user = await User.findOne({
      where: { email }
    });

    if (user) {
      // User exists with email but no Google ID, link accounts
      user.googleId = profile.id;
      if (!user.profilePicture && profile.photos[0]) {
        user.profilePicture = profile.photos[0].value;
      }
      if (!user.isVerified) {
        user.isVerified = true; // Google accounts are considered verified
      }
      await user.save();
      await user.updateLastLogin();

      logger.info(`Google OAuth successful, linked existing account: ${user.email}`);
      return done(null, user);
    }

    // Create new user
    const newUser = await User.create({
      email,
      googleId: profile.id,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profilePicture: profile.photos[0]?.value,
      isVerified: true, // Google accounts are considered verified
      preferredLanguage: 'English'
    });

    await newUser.updateLastLogin();
    logger.info(`Google OAuth successful, created new user: ${newUser.email}`);
    return done(null, newUser);

  } catch (error) {
    logger.error('Google OAuth Strategy error:', error);
    return done(error, null);
  }
}));

// Serialize user for session (not used in JWT setup but required by Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (not used in JWT setup but required by Passport)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash', 'refreshToken'] }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to authenticate JWT tokens
const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('JWT authentication error:', err);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }

    if (!user) {
      const message = info?.message || 'Invalid token';
      return res.status(401).json({
        success: false,
        message
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Optional JWT authentication (doesn't fail if no token)
const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Optional JWT authentication error:', err);
    }

    if (user) {
      req.user = user;
    }

    next();
  })(req, res, next);
};

// Google OAuth authentication middleware
const authenticateGoogle = passport.authenticate('google', {
  scope: ['profile', 'email']
});

// Google OAuth callback middleware
const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Google OAuth callback error:', err);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=oauth_error`);
    }

    if (!user) {
      const message = info?.message || 'Google authentication failed';
      logger.warn('Google OAuth failed:', message);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=oauth_failed`);
    }

    // Generate JWT tokens for the user
    const { generateTokens } = require('../services/authService');
    const tokens = generateTokens(user);

    // Update user with refresh token
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.save();

    // Redirect to client with tokens (you might want to handle this differently)
    const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;
    res.redirect(redirectUrl);

  })(req, res, next);
};

// Middleware to check user verification status
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

// Middleware to check minimum reputation
const requireReputation = (minReputation = 50) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.reputationScore < minReputation) {
      return res.status(403).json({
        success: false,
        message: `Minimum reputation of ${minReputation} required`,
        currentReputation: req.user.reputationScore,
        code: 'INSUFFICIENT_REPUTATION'
      });
    }

    next();
  };
};

// Admin role check (based on high reputation for now)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // You can implement proper admin roles here
  // For now, we'll use high reputation as admin indicator
  if (req.user.reputationScore < 1000) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Rate limiting based on user reputation
const getReputation = (req) => {
  return req.user ? req.user.reputationScore : 0;
};

// Check if user can perform action based on reputation
const canPerformAction = (user, action) => {
  if (!user) return false;

  const reputation = user.reputationScore;
  const actions = {
    'create_route': 50,
    'edit_route': 100,
    'delete_route': 200,
    'moderate_content': 500,
    'admin_actions': 1000
  };

  return reputation >= (actions[action] || 0);
};

// Validate Google OAuth configuration
const validateGoogleConfig = () => {
  const errors = [];

  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is required for Google OAuth');
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET is required for Google OAuth');
  }

  if (!process.env.CLIENT_URL) {
    errors.push('CLIENT_URL is required for OAuth redirects');
  }

  return errors;
};

// Initialize passport configuration
const initializePassport = (app) => {
  app.use(passport.initialize());
  
  // Validate configuration
  const googleConfigErrors = validateGoogleConfig();
  if (googleConfigErrors.length > 0) {
    logger.warn('Google OAuth configuration issues:', googleConfigErrors);
  } else {
    logger.info('Passport initialized with Google OAuth support');
  }
};

module.exports = {
  passport,
  initializePassport,
  authenticateJWT,
  optionalJWT,
  authenticateGoogle,
  googleCallback,
  requireVerified,
  requireReputation,
  requireAdmin,
  getReputation,
  canPerformAction,
  validateGoogleConfig
};