const { adminSecurityMethods, securityFields } = require('./AdminSecurity');
const { adminTOTPMethods, totpFields } = require('./AdminTOTP');
const { adminPermissionMethods, adminStaticMethods, adminAssociations } = require('./AdminPermissions');

module.exports = (sequelize) => {
  // Import base model
  const AdminModel = require('./Admin')(sequelize);
  const Admin = AdminModel;

  // Add additional fields
  const additionalFields = {
    ...securityFields,
    ...totpFields
  };

  // Add fields to the model
  Object.keys(additionalFields).forEach(fieldName => {
    Admin.rawAttributes[fieldName] = additionalFields[fieldName];
    Admin.tableAttributes[fieldName] = additionalFields[fieldName];
  });

  // Add additional indexes
  Admin.options.indexes = [
    ...Admin.options.indexes,
    {
      fields: ['totpEnabled']
    },
    {
      fields: ['lastLoginAt']
    }
  ];

  // Add instance methods
  Object.keys(adminSecurityMethods).forEach(methodName => {
    Admin.prototype[methodName] = adminSecurityMethods[methodName];
  });

  Object.keys(adminTOTPMethods).forEach(methodName => {
    Admin.prototype[methodName] = adminTOTPMethods[methodName];
  });

  Object.keys(adminPermissionMethods).forEach(methodName => {
    Admin.prototype[methodName] = adminPermissionMethods[methodName];
  });

  // Add static methods
  Object.keys(adminStaticMethods).forEach(methodName => {
    Admin[methodName] = adminStaticMethods[methodName];
  });

  // Define associations
  Admin.associate = function(models) {
    const associations = adminAssociations(models);
    return associations;
  };

  return Admin;
};