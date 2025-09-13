const { Sequelize } = require('sequelize');
const config = require('../config/database.js');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize first
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    ...dbConfig,
    logging: dbConfig.logging || ((sql) => logger.debug(sql))
  }
);

// Import models after sequelize is created
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Location = require('./Location')(sequelize, Sequelize.DataTypes);
const Route = require('./Route')(sequelize, Sequelize.DataTypes);
const RouteStep = require('./RouteStep')(sequelize, Sequelize.DataTypes);
const UserDirection = require('./UserDirection')(sequelize, Sequelize.DataTypes);
const FareFeedback = require('./FareFeedback')(sequelize, Sequelize.DataTypes);
const Landmark = require('./Landmark')(sequelize, Sequelize.DataTypes);

// Import admin models
const Admin = require('./admin/Admin.js')(sequelize, Sequelize.DataTypes);
const { UserAnalytics, AppUsageAnalytics, GeographicAnalytics, SystemMetrics, AuditLog } = require('./Analytics');

// Initialize analytics models
const UserAnalyticsModel = UserAnalytics(sequelize, Sequelize.DataTypes);
const AppUsageAnalyticsModel = AppUsageAnalytics(sequelize, Sequelize.DataTypes);
const GeographicAnalyticsModel = GeographicAnalytics(sequelize, Sequelize.DataTypes);
const SystemMetricsModel = SystemMetrics(sequelize, Sequelize.DataTypes);
const AuditLogModel = AuditLog(sequelize, Sequelize.DataTypes);

// Store models in db object
const db = {
  sequelize,
  Sequelize,
  User,
  Location,
  Route,
  RouteStep,
  UserDirection,
  FareFeedback,
  Landmark,
  Admin,
  UserAnalytics: UserAnalyticsModel,
  AppUsageAnalytics: AppUsageAnalyticsModel,
  GeographicAnalytics: GeographicAnalyticsModel,
  SystemMetrics: SystemMetricsModel,
  AuditLog: AuditLogModel
};

// Define associations
// User associations
User.hasMany(Route, { foreignKey: 'createdBy', as: 'createdRoutes' });
User.hasMany(UserDirection, { foreignKey: 'createdBy', as: 'directions' });
User.hasMany(FareFeedback, { foreignKey: 'userId', as: 'fareFeedbacks' });

// Route associations
Route.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Route.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' });
Route.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' });
Route.hasMany(RouteStep, { foreignKey: 'routeId', as: 'steps' });
Route.hasMany(FareFeedback, { through: 'RouteStep', as: 'feedbacks' });

// RouteStep associations
RouteStep.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
RouteStep.belongsTo(Location, { foreignKey: 'fromLocationId', as: 'fromLocation' });
RouteStep.belongsTo(Location, { foreignKey: 'toLocationId', as: 'toLocation' });
RouteStep.hasMany(FareFeedback, { foreignKey: 'routeStepId', as: 'feedbacks' });

// UserDirection associations
UserDirection.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
UserDirection.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' });
UserDirection.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' });

// FareFeedback associations
FareFeedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });
FareFeedback.belongsTo(RouteStep, { foreignKey: 'routeStepId', as: 'routeStep' });

// Location associations
Location.hasMany(Route, { foreignKey: 'startLocationId', as: 'routesAsStart' });
Location.hasMany(Route, { foreignKey: 'endLocationId', as: 'routesAsEnd' });
Location.hasMany(RouteStep, { foreignKey: 'fromLocationId', as: 'stepsAsFrom' });
Location.hasMany(RouteStep, { foreignKey: 'toLocationId', as: 'stepsAsTo' });
Location.hasMany(UserDirection, { foreignKey: 'startLocationId', as: 'directionsAsStart' });
Location.hasMany(UserDirection, { foreignKey: 'endLocationId', as: 'directionsAsEnd' });

// Admin associations
Admin.hasMany(AuditLogModel, { foreignKey: 'adminId', as: 'auditLogs' });
AuditLogModel.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' });

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
};

// Sync database
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('Database synchronized successfully');
    return true;
  } catch (error) {
    logger.error('Error synchronizing database:', error);
    return false;
  }
};

// Close database connection
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

module.exports = {
  ...db,
  testConnection,
  syncDatabase,
  closeConnection
};