const { 
  generateAdminAccessToken,
  generateAdminRefreshToken, 
  generateAdminTokens,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
  extractAdminTokenInfo,
  validateAdminJWTConfig
} = require('./tokenService');

const { 
  tokenBlacklistManager,
  blacklistAdminToken,
  isAdminTokenBlacklisted
} = require('./blacklistService');

const {
  adminSessionManager,
  createAdminSessionData
} = require('./sessionService');

const { adminSecurityUtils } = require('./adminSecurityService');

const {
  generateAdminInviteToken,
  verifyAdminInviteToken,
  generateAdminPasswordResetToken,
  verifyAdminPasswordResetToken,
  generateAdminAPIKey,
  verifyAdminAPIKey,
  getExpiryMilliseconds
} = require('./specialTokenService');

module.exports = {
  // Token services
  generateAdminAccessToken,
  generateAdminRefreshToken,
  generateAdminTokens,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
  extractAdminTokenInfo,
  validateAdminJWTConfig,
  
  // Blacklist services
  tokenBlacklistManager,
  blacklistAdminToken,
  isAdminTokenBlacklisted,
  
  // Session services
  adminSessionManager,
  createAdminSessionData,
  
  // Security services
  adminSecurityUtils,
  
  // Special token services
  generateAdminInviteToken,
  verifyAdminInviteToken,
  generateAdminPasswordResetToken,
  verifyAdminPasswordResetToken,
  generateAdminAPIKey,
  verifyAdminAPIKey,
  getExpiryMilliseconds
};