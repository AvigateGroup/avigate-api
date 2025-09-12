const { User } = require('../models');
const logger = require('../utils/logger');
const { generateTokens, verifyRefreshToken } = require('../services/authService');

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { email, password, firstName, lastName, phoneNumber, preferredLanguage } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          $or: [{ email }, { phoneNumber }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email 
            ? 'User with this email already exists' 
            : 'User with this phone number already exists'
        });
      }

      // Create new user
      const user = await User.create({
        email,
        passwordHash: password, // Will be hashed by the model hook
        firstName,
        lastName,
        phoneNumber,
        preferredLanguage: preferredLanguage || 'English',
        isVerified: false
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Save refresh token
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Update refresh token and last login
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.updateLastLogin();

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Google OAuth login
  googleAuth: async (req, res) => {
    try {
      const { token, firstName, lastName, phoneNumber } = req.body;

      // Verify Google token (you'll need to implement this with Google APIs)
      const googleUser = await verifyGoogleToken(token);
      if (!googleUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Google token'
        });
      }

      // Check if user exists
      let user = await User.findByEmail(googleUser.email);
      
      if (!user) {
        // Create new user with Google data
        user = await User.create({
          email: googleUser.email,
          firstName: firstName || googleUser.given_name,
          lastName: lastName || googleUser.family_name,
          phoneNumber: phoneNumber || null,
          googleId: googleUser.sub,
          profilePicture: googleUser.picture,
          isVerified: googleUser.email_verified,
          preferredLanguage: 'English'
        });
      } else if (!user.googleId) {
        // Link existing account with Google
        user.googleId = googleUser.sub;
        if (!user.profilePicture) {
          user.profilePicture = googleUser.picture;
        }
        await user.save();
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Update refresh token and last login
      user.refreshToken = refreshToken;
      user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.updateLastLogin();

      logger.info(`Google auth successful: ${user.email}`);

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
          isNewUser: !user.phoneNumber
        }
      });

    } catch (error) {
      logger.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Refresh access token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Find user and validate refresh token
      const user = await User.findByPk(decoded.userId);
      if (!user || user.refreshToken !== refreshToken || user.refreshTokenExpiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });

    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Logout user
  logout: async (req, res) => {
    try {
      const user = req.user;

      // Clear refresh token
      user.refreshToken = null;
      user.refreshTokenExpiresAt = null;
      await user.save();

      logger.info(`User logged out: ${user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, phoneNumber, preferredLanguage, profilePicture } = req.body;

      // Check if phone number is already taken by another user
      if (phoneNumber && phoneNumber !== user.phoneNumber) {
        const existingUser = await User.findByPhoneNumber(phoneNumber);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(409).json({
            success: false,
            message: 'Phone number is already in use by another user'
          });
        }
      }

      // Update user fields
      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (phoneNumber) updates.phoneNumber = phoneNumber;
      if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
      if (profilePicture) updates.profilePicture = profilePicture;

      await user.update(updates);

      logger.info(`Profile updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by model hook
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Helper function to verify Google token (implement with Google OAuth2 library)
const verifyGoogleToken = async (token) => {
  // This is a placeholder - implement with Google OAuth2 client library
  try {
    // Use google-auth-library to verify token
    // const { OAuth2Client } = require('google-auth-library');
    // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    // const ticket = await client.verifyIdToken({
    //   idToken: token,
    //   audience: process.env.GOOGLE_CLIENT_ID
    // });
    // return ticket.getPayload();
    
    // For now, return null - implement proper Google token verification
    return null;
  } catch (error) {
    logger.error('Google token verification error:', error);
    return null;
  }
};

module.exports = authController;