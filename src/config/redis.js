const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    // Redis client konfigürasyonu
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return false;
          }
          return Math.min(retries * 50, 500);
        }
      }
    };

    // Password varsa ekle
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    redisClient = redis.createClient(redisConfig);

    // Event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready to accept commands');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Redis'e bağlan
    await redisClient.connect();
    logger.info('Redis connection established');

  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Redis bağlantı hatası uygulamayı durdurmamalı
    throw error;
  }
};

// Redis client'ını al
const getRedisClient = () => {
  return redisClient;
};

// Redis bağlantısını kapat
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

// Redis durumunu kontrol et
const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};

// Test Redis connection
const testRedisConnection = async () => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return { success: false, message: 'Redis client not connected' };
    }
    
    await redisClient.ping();
    return { success: true, message: 'Redis connection is healthy' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = { 
  connectRedis, 
  getRedisClient, 
  closeRedis, 
  isRedisConnected,
  testRedisConnection 
}; 