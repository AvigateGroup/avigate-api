const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const adminTOTPMethods = {
  // Generate TOTP secret
  generateTOTPSecret: function() {
    const secret = speakeasy.generateSecret({
      name: `Avigate Admin (${this.email})`,
      issuer: 'Avigate',
      length: 32 // Increased length for better security
    });
    
    this.totpSecret = secret.base32;
    return secret;
  },

  // Generate QR code for TOTP setup
  generateQRCode: async function() {
    if (!this.totpSecret) {
      throw new Error('TOTP secret not generated');
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: this.totpSecret,
      label: `Avigate Admin (${this.email})`,
      issuer: 'Avigate',
      encoding: 'base32'
    });

    return qrcode.toDataURL(otpauthUrl);
  },

  // Verify TOTP token
  verifyTOTP: function(token = false) {
    if (!this.totpSecret || !this.totpEnabled) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: this.totpSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after current
    });
  },

  // Enable TOTP with verification
  enableTOTP: async function(token) {
    if (!this.totpSecret) {
      throw new Error('TOTP secret not generated');
    }

    const isValid = speakeasy.totp.verify({
      secret: this.totpSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValid) {
      throw new Error('Invalid TOTP token');
    }

    this.totpEnabled = true;
    this.totpBackupCodes = this.generateBackupCodes();
    await this.save();

    return this.totpBackupCodes;
  },

  // Disable TOTP
  disableTOTP: function() {
    this.totpEnabled = false;
    this.totpSecret = null;
    this.totpBackupCodes = [];
  },

  // Generate backup codes
  generateBackupCodes: function() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      // Generate more secure backup codes
      codes.push(
        Math.random().toString(36).substr(2, 4).toUpperCase() + 
        Math.random().toString(36).substr(2, 4).toUpperCase()
      );
    }
    return codes;
  },

  // Use backup code
  useBackupCode: async function(code) {
    const upperCode = code.toUpperCase();
    const index = this.totpBackupCodes.indexOf(upperCode);
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    this.totpBackupCodes.splice(index, 1);
    await this.save();
    return true;
  }
};

// Add TOTP fields to the model
const totpFields = {
  // TOTP Configuration
  totpSecret: {
    type: require('sequelize').DataTypes.STRING,
    allowNull: true // Will be set when TOTP is enabled
  },
  totpEnabled: {
    type: require('sequelize').DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  totpBackupCodes: {
    type: require('sequelize').DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
};

module.exports = {
  adminTOTPMethods,
  totpFields
};