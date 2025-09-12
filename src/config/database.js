require('dotenv').config();

const config = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'avigate_db',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    // Add connection timeout
    connectTimeout: 30000,
    // Add statement timeout
    statement_timeout: 30000,
    // Add idle timeout
    idle_in_transaction_session_timeout: 30000
  },
  define: {
    timestamps: true,
    underscored: false,
    paranoid: false,
    freezeTableName: true // This prevents Sequelize from pluralizing table names
  },
  // Add retry configuration
  retry: {
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /EHOSTUNREACH/,
      /ETIMEDOUT/,
      /ECONNREFUSED/
    ],
    max: 3
  },
  // Timezone configuration
  timezone: '+00:00'
};

// Validation to ensure required environment variables are set
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please ensure your .env file contains all required database configuration');
}

module.exports = config;