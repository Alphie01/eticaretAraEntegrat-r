const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

const connectDB = async () => {
  try {
    // Database connection configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 1433,
      database: process.env.NODE_ENV === 'test' 
        ? process.env.DB_TEST_NAME || 'EticaretAraEntegratorTest'
        : process.env.DB_NAME || 'EticaretAraEntegrator',
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || '',
      dialect: 'mssql',
      dialectOptions: {
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true' || false, // Azure için true
          trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000,
        },
      },
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        min: parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: 30000,
        idle: 10000,
      },
      logging: process.env.NODE_ENV === 'development' 
        ? (msg) => logger.debug(msg)
        : false,
      define: {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        freezeTableName: true,
      },
    };

    sequelize = new Sequelize(dbConfig);

    // Test connection
    await sequelize.authenticate();
    logger.info(`MSSQL Connected: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Sync database (only in development)
    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Pool events are handled internally by Sequelize

  } catch (error) {
    logger.error('MSSQL connection failed:', error);
    throw error; // Let the caller handle the error
  }
};

// Get sequelize instance
const getSequelize = () => {
  if (!sequelize) {
    return null; // Return null instead of throwing error in demo mode
  }
  return sequelize;
};

// Close database connection
const closeDB = async () => {
  if (sequelize) {
    await sequelize.close();
    logger.info('Database connection closed');
  }
};

// Test database connection
const testConnection = async () => {
  try {
    if (!sequelize) {
      return { success: false, message: 'Database not initialized' };
    }
    await sequelize.authenticate();
    return { success: true, message: 'Database connection is healthy' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  connectDB,
  getSequelize,
  closeDB,
  testConnection
}; 