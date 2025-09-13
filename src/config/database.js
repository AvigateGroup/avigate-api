require('dotenv').config();

config = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: false
  },
  define: {
    timestamps: true,
    underscored: false,
    paranoid: false
  }
};

module.exports = config;