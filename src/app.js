const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
// Load environment variables as early as possible
require('dotenv').config();
const passport = require('./config/passport');

const { connectDB, closeDB, testConnection } = require('./config/database');
const { setupModels } = require('./models');
const { connectRedis, closeRedis, testRedisConnection } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./api/routes/auth');
const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const marketplaceRoutes = require('./api/routes/marketplace');
const syncRoutes = require('./api/routes/sync');
const reportRoutes = require('./api/routes/reports');
const marketplaceKeysRoutes = require('./api/routes/marketplace-keys');
const crossPlatformSyncRoutes = require('./api/routes/cross-platform-sync');
const mngCargoRoutes = require('./api/routes/mng-cargo');
const arasCargoRoutes = require('./api/routes/aras-cargo');
const upsCargoRoutes = require('./api/routes/ups-cargo');
const yurticiCargoRoutes = require('./api/routes/yurtici-cargo');
const suratCargoRoutes = require('./api/routes/surat-cargo');
const dhlCargoRoutes = require('./api/routes/dhl-cargo');
const errorRoutes = require('./api/routes/errors');
const paymentRoutes = require('./api/routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and models
const initializeDatabase = async () => {
  try {
    await connectDB();
    setupModels();
    logger.info('Database and models initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Initialize Redis connection (optional)
const initializeRedis = async () => {
  try {
    await connectRedis();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    logger.warn('Redis connection failed - some features may not work properly');
    // Redis hatası uygulamayı durdurmasın, sadece uyar
  }
};

// Connect to databases and Redis
initializeDatabase();
//initializeRedis();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'eticaret-entegrator-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
/* app.use(rateLimiter); */

// Health check
app.get('/health', async (req, res) => {
  let dbStatus = { success: false, message: 'Database not initialized' };
  let redisStatus = { success: false, message: 'Redis not initialized' };
  
  try {
    dbStatus = await testConnection();
  } catch (error) {
    dbStatus = { success: false, message: 'Database connection failed' };
  }
  
  try {
    redisStatus = await testRedisConnection();
  } catch (error) {
    redisStatus = { success: false, message: 'Redis connection failed' };
  }
  
  const isHealthy = dbStatus.success;
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'OK' : 'Service Unavailable',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      redis: redisStatus
    }
  });
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

// Health check with API prefix
app.get(`${apiPrefix}/health`, async (req, res) => {
  let dbStatus = { success: false, message: 'Database not initialized' };
  let redisStatus = { success: false, message: 'Redis not initialized' };
  
  try {
    dbStatus = await testConnection();
  } catch (error) {
    dbStatus = { success: false, message: 'Database connection failed' };
  }
  
  try {
    redisStatus = await testRedisConnection();
  } catch (error) {
    redisStatus = { success: false, message: 'Redis connection failed' };
  }
  
  const isHealthy = dbStatus.success;
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'OK' : 'Service Unavailable',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      redis: redisStatus
    }
  });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/marketplace`, marketplaceRoutes);
app.use(`${apiPrefix}/sync`, syncRoutes);
app.use(`${apiPrefix}/sync/cross-platform`, crossPlatformSyncRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);
app.use(`${apiPrefix}/marketplace-keys`, marketplaceKeysRoutes);
app.use(`${apiPrefix}/mng-cargo`, mngCargoRoutes);
app.use(`${apiPrefix}/aras-cargo`, arasCargoRoutes);
app.use(`${apiPrefix}/ups-cargo`, upsCargoRoutes);
app.use(`${apiPrefix}/yurtici-cargo`, yurticiCargoRoutes);
app.use(`${apiPrefix}/surat-cargo`, suratCargoRoutes);
app.use(`${apiPrefix}/dhl-cargo`, dhlCargoRoutes);
app.use(`${apiPrefix}/errors`, errorRoutes);
app.use(`${apiPrefix}/payments`, paymentRoutes);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Close database connection
    await closeDB();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }

  // Close Redis connection
  await closeRedis();

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app; 