const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Initialize Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: config.logging,
  pool: config.pool,
  define: config.define
});

const db = {};

// Import models - AFTER sequelize is initialized
const Admin = require('./admin/Admin.js')(sequelize);

// Add models to db object
db.Admin = Admin;
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;