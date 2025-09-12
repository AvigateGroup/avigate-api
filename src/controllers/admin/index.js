const authController = require('./authController');
const managementController = require('./managementController');
const passwordController = require('./passwordController');
const totpController = require('./totpController');

module.exports = {
  auth: authController,
  management: managementController,
  password: passwordController,
  totp: totpController
};