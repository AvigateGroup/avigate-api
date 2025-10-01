const { Sequelize } = require('sequelize')
const config = require('../config/database.js')
const { logger } = require('../utils/logger')

const dbConfig = config

// Initialize Sequelize first
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        ...dbConfig,
        logging: (msg) => logger.debug(msg),
    }
)

// Import user models
const User = require('./user/User.js')(sequelize, Sequelize.DataTypes)
const UserDevice = require('./user/UserDevice.js')(sequelize, Sequelize.DataTypes)
const UserOTP = require('./user/UserOTP.js')(sequelize, Sequelize.DataTypes)

// Import location models
const Location = require('./location/Location')(sequelize, Sequelize.DataTypes)
const Landmark = require('./location/Landmark')(sequelize, Sequelize.DataTypes)
const GeographicBoundary = require('./location/GeographicBoundary')(sequelize, Sequelize.DataTypes)

// Import transportation models
const Route = require('./transportation/Route')(sequelize, Sequelize.DataTypes)
const RouteStep = require('./transportation/RouteStep')(sequelize, Sequelize.DataTypes)

// Import fare models
const FareFeedback = require('./fare/FareFeedback')(sequelize, Sequelize.DataTypes)
const FareHistory = require('./fare/FareHistory')(sequelize, Sequelize.DataTypes)
const FareRule = require('./fare/FareRule')(sequelize, Sequelize.DataTypes)

// Import community models
const CommunityPost = require('./community/CommunityPost')(sequelize, Sequelize.DataTypes)
const DirectionShare = require('./community/DirectionShare')(sequelize, Sequelize.DataTypes)
const RouteContribution = require('./community/RouteContribution')(sequelize, Sequelize.DataTypes)
const SafetyReport = require('./community/SafetyReport')(sequelize, Sequelize.DataTypes)
const UserFeedback = require('./community/UserFeedback')(sequelize, Sequelize.DataTypes)

// Import analytics models
const SearchLog = require('./analytics/SearchLog')(sequelize, Sequelize.DataTypes)
const TripLog = require('./analytics/TripLog')(sequelize, Sequelize.DataTypes)
const UserInteraction = require('./analytics/UserInteraction')(sequelize, Sequelize.DataTypes)

// Import admin models
const Admin = require('./admin/Admin.js')(sequelize, Sequelize.DataTypes)

// Analytics Models
const UserAnalytics = require('./analytics/UserAnalytics')(sequelize, Sequelize.DataTypes)
const AppUsageAnalytics = require('./analytics/AppUsageAnalytics')(sequelize, Sequelize.DataTypes)
const GeographicAnalytics = require('./analytics/GeographicAnalytics')(sequelize, Sequelize.DataTypes)
const SystemMetrics = require('./analytics/SystemMetrics')(sequelize, Sequelize.DataTypes)
const AuditLog = require('./analytics/AuditLog')(sequelize, Sequelize.DataTypes)

// Store models in db object
const db = {
    sequelize,
    Sequelize,
    // User models
    User,
    UserDevice,
    UserOTP,
    // Location models
    Location,
    Landmark,
    GeographicBoundary,
    // Transportation models
    Route,
    RouteStep,
    TransportOperator,
    Vehicle,
    VehicleAvailability,
    // Fare models
    FareFeedback,
    FareHistory,
    FareRule,
    // Community models
    CommunityPost,
    DirectionShare,
    RouteContribution,
    SafetyReport,
    UserFeedback,
    // Analytics models
    SearchLog,
    TripLog,
    UserInteraction,
    // Other models
    UserDirection,
    // Admin models
    Admin,
    UserAnalytics,
    AppUsageAnalytics,
    GeographicAnalytics,
    SystemMetrics,
    AuditLog,
}

// Define associations after all models are initialized

// User associations
User.hasMany(Route, { foreignKey: 'createdBy', as: 'createdRoutes' })
User.hasMany(UserDirection, { foreignKey: 'createdBy', as: 'directions' })
User.hasMany(FareFeedback, { foreignKey: 'userId', as: 'fareFeedbacks' })
User.hasMany(CommunityPost, { foreignKey: 'authorId', as: 'communityPosts' })
User.hasMany(DirectionShare, { foreignKey: 'createdBy', as: 'directionShares' })
User.hasMany(RouteContribution, { foreignKey: 'contributorId', as: 'contributions' })
User.hasMany(SafetyReport, { foreignKey: 'reportedBy', as: 'safetyReports' })
User.hasMany(UserFeedback, { foreignKey: 'userId', as: 'feedback' })
User.hasMany(SearchLog, { foreignKey: 'userId', as: 'searchLogs' })
User.hasMany(TripLog, { foreignKey: 'userId', as: 'tripLogs' })
User.hasMany(UserInteraction, { foreignKey: 'userId', as: 'interactions' })

// Location associations
Location.hasMany(Route, { foreignKey: 'startLocationId', as: 'routesAsStart' })
Location.hasMany(Route, { foreignKey: 'endLocationId', as: 'routesAsEnd' })
Location.hasMany(RouteStep, { foreignKey: 'fromLocationId', as: 'stepsAsFrom' })
Location.hasMany(RouteStep, { foreignKey: 'toLocationId', as: 'stepsAsTo' })
Location.hasMany(UserDirection, { foreignKey: 'startLocationId', as: 'directionsAsStart' })
Location.hasMany(UserDirection, { foreignKey: 'endLocationId', as: 'directionsAsEnd' })
Location.hasMany(Landmark, { foreignKey: 'locationId', as: 'landmarks' })
Location.hasMany(CommunityPost, { foreignKey: 'locationId', as: 'communityPosts' })
Location.hasMany(DirectionShare, { foreignKey: 'startLocationId', as: 'directionSharesAsStart' })
Location.hasMany(DirectionShare, { foreignKey: 'endLocationId', as: 'directionSharesAsEnd' })
Location.hasMany(SafetyReport, { foreignKey: 'locationId', as: 'safetyReports' })
Location.hasMany(TripLog, { foreignKey: 'startLocationId', as: 'tripLogsAsStart' })
Location.hasMany(TripLog, { foreignKey: 'endLocationId', as: 'tripLogsAsEnd' })
Location.hasMany(Vehicle, { foreignKey: 'currentLocationId', as: 'vehicles' })
Location.hasMany(VehicleAvailability, { foreignKey: 'locationId', as: 'vehicleAvailability' })

// Route associations
Route.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
Route.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' })
Route.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' })
Route.belongsTo(Admin, { foreignKey: 'verifiedBy', as: 'verifier' })
Route.hasMany(RouteStep, { foreignKey: 'routeId', as: 'steps' })
Route.hasMany(FareFeedback, { foreignKey: 'routeId', as: 'fareFeedbacks' })
Route.hasMany(CommunityPost, { foreignKey: 'routeId', as: 'communityPosts' })
Route.hasMany(RouteContribution, { foreignKey: 'routeId', as: 'contributions' })
Route.hasMany(SafetyReport, { foreignKey: 'routeId', as: 'safetyReports' })
Route.hasMany(TripLog, { foreignKey: 'routeId', as: 'tripLogs' })
Route.hasMany(FareHistory, { foreignKey: 'routeId', as: 'fareHistory' })

// RouteStep associations
RouteStep.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
RouteStep.belongsTo(Location, { foreignKey: 'fromLocationId', as: 'fromLocation' })
RouteStep.belongsTo(Location, { foreignKey: 'toLocationId', as: 'toLocation' })
RouteStep.hasMany(FareFeedback, { foreignKey: 'routeStepId', as: 'fareFeedbacks' })
RouteStep.hasMany(FareHistory, { foreignKey: 'routeStepId', as: 'fareHistory' })

// UserDirection associations
UserDirection.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
UserDirection.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' })
UserDirection.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' })

// FareFeedback associations
FareFeedback.belongsTo(User, { foreignKey: 'userId', as: 'user' })
FareFeedback.belongsTo(RouteStep, { foreignKey: 'routeStepId', as: 'routeStep' })
FareFeedback.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
FareFeedback.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' })

// FareHistory associations
FareHistory.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
FareHistory.belongsTo(RouteStep, { foreignKey: 'routeStepId', as: 'routeStep' })
FareHistory.belongsTo(FareRule, { foreignKey: 'fareRuleId', as: 'fareRule' })
FareHistory.belongsTo(Admin, { foreignKey: 'createdBy', as: 'creator' })

// FareRule associations
FareRule.belongsTo(Admin, { foreignKey: 'createdBy', as: 'creator' })
FareRule.belongsTo(Admin, { foreignKey: 'lastModifiedBy', as: 'lastModifier' })
FareRule.hasMany(FareHistory, { foreignKey: 'fareRuleId', as: 'history' })

// Landmark associations
Landmark.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
Landmark.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
Landmark.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' })

// GeographicBoundary associations (self-referential)
GeographicBoundary.belongsTo(GeographicBoundary, { foreignKey: 'parentId', as: 'parent' })
GeographicBoundary.hasMany(GeographicBoundary, { foreignKey: 'parentId', as: 'children' })

// CommunityPost associations
CommunityPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' })
CommunityPost.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
CommunityPost.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
CommunityPost.belongsTo(Admin, { foreignKey: 'verifiedBy', as: 'verifier' })

// DirectionShare associations
DirectionShare.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
DirectionShare.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' })
DirectionShare.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' })
DirectionShare.belongsTo(User, { foreignKey: 'lastAccessedBy', as: 'lastAccessor' })

// RouteContribution associations
RouteContribution.belongsTo(User, { foreignKey: 'contributorId', as: 'contributor' })
RouteContribution.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
RouteContribution.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' })
RouteContribution.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' })
RouteContribution.belongsTo(Admin, { foreignKey: 'reviewedBy', as: 'reviewer' })
RouteContribution.belongsTo(Admin, { foreignKey: 'implementedBy', as: 'implementer' })

// SafetyReport associations
SafetyReport.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' })
SafetyReport.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
SafetyReport.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
SafetyReport.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' })
SafetyReport.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' })

// UserFeedback associations
UserFeedback.belongsTo(User, { foreignKey: 'userId', as: 'user' })
UserFeedback.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
UserFeedback.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
UserFeedback.belongsTo(Admin, { foreignKey: 'assignedTo', as: 'assignee' })

// SearchLog associations
SearchLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// TripLog associations
TripLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })
TripLog.belongsTo(Route, { foreignKey: 'routeId', as: 'route' })
TripLog.belongsTo(Location, { foreignKey: 'startLocationId', as: 'startLocation' })
TripLog.belongsTo(Location, { foreignKey: 'endLocationId', as: 'endLocation' })

// UserInteraction associations
UserInteraction.belongsTo(User, { foreignKey: 'userId', as: 'user' })


// Admin associations
Admin.belongsTo(Admin, {
    foreignKey: 'createdBy',
    as: 'creator',
    constraints: false
})

Admin.belongsTo(Admin, {
    foreignKey: 'lastModifiedBy', 
    as: 'lastModifier',
    constraints: false
})

Admin.hasMany(AuditLog, { foreignKey: 'adminId', as: 'auditLogs' })
AuditLog.belongsTo(Admin, { foreignKey: 'adminId', as: 'admin' })

// Call associate methods if they exist (for any additional custom associations)
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db)
    }
})

// Test database connection
const testConnection = async () => {
    try {
        await sequelize.authenticate()
        logger.info('Database connection has been established successfully.')
        return true
    } catch (error) {
        logger.error('Unable to connect to the database:', error)
        throw error
    }
}

// Sync database
const syncDatabase = async (options = {}) => {
    try {
        await sequelize.sync(options)
        logger.info('Database synchronized successfully')
        return true
    } catch (error) {
        logger.error('Error synchronizing database:', error)
        throw error
    }
}

// Close database connection
const closeConnection = async () => {
    try {
        await sequelize.close()
        logger.info('Database connection closed')
    } catch (error) {
        logger.error('Error closing database connection:', error)
        throw error
    }
}

module.exports = {
    ...db,
    testConnection,
    syncDatabase,
    closeConnection,
}