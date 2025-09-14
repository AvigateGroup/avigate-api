const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('./models');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const routeRoutes = require('./routes/routes');
const directionRoutes = require('./routes/directions');
const crowdsourceRoutes = require('./routes/crowdsource');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS should be before helmet for correct headers
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.com'] // Replace with your actual domain
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { 
  stream: { 
    write: msg => logger.info(msg.trim()) 
  } 
}));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/directions', directionRoutes);
app.use('/api/v1/crowdsource', crowdsourceRoutes);
app.use('/api/v1/admin', adminRoutes);


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Avigate API server running on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });
    
    return server;
    
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    logger.error('Full error:', error);
    process.exit(1);
  }
};

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  try {
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  logger.error('Stack:', reason?.stack);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  logger.error('Stack:', error.stack);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;