const Queue = require('bull');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

// Job processors
const productSyncProcessor = require('./processors/productSyncProcessor');
const orderSyncProcessor = require('./processors/orderSyncProcessor');
const stockUpdateProcessor = require('./processors/stockUpdateProcessor');
const priceUpdateProcessor = require('./processors/priceUpdateProcessor');
const reportGenerationProcessor = require('./processors/reportGenerationProcessor');
const { 
  crossPlatformSyncProcessor,
  batchCrossPlatformSyncProcessor,
  scheduledCrossPlatformMonitor
} = require('./processors/crossPlatformSyncProcessor');

let redisConfig;

try {
  const redisClient = getRedisClient();
  redisConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    }
  };
} catch (error) {
  logger.error('Redis connection failed for job queue:', error);
  process.exit(1);
}

// Create job queues
const productSyncQueue = new Queue('product sync', redisConfig);
const orderSyncQueue = new Queue('order sync', redisConfig);
const stockUpdateQueue = new Queue('stock update', redisConfig);
const priceUpdateQueue = new Queue('price update', redisConfig);
const reportQueue = new Queue('report generation', redisConfig);
const crossPlatformSyncQueue = new Queue('cross platform sync', redisConfig);
const batchCrossPlatformSyncQueue = new Queue('batch cross platform sync', redisConfig);
const crossPlatformMonitorQueue = new Queue('cross platform monitor', redisConfig);

// Queue configurations
const queueConfig = {
  removeOnComplete: 100,
  removeOnFail: 50,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
};

// Process jobs
productSyncQueue.process('sync-products', 5, productSyncProcessor);
orderSyncQueue.process('sync-orders', 3, orderSyncProcessor);
stockUpdateQueue.process('update-stock', 10, stockUpdateProcessor);
priceUpdateQueue.process('update-price', 10, priceUpdateProcessor);
reportQueue.process('generate-report', 2, reportGenerationProcessor);

// Cross-platform sync processors
crossPlatformSyncQueue.process('cross-platform-sync', 2, crossPlatformSyncProcessor);
batchCrossPlatformSyncQueue.process('batch-cross-platform-sync', 1, batchCrossPlatformSyncProcessor);
crossPlatformMonitorQueue.process('cross-platform-monitor', 1, scheduledCrossPlatformMonitor);

// Queue event handlers
const setupQueueEvents = (queue, queueName) => {
  queue.on('completed', (job) => {
    logger.info(`${queueName} job completed: ${job.id}`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`${queueName} job failed: ${job.id}`, err);
  });

  queue.on('stalled', (job) => {
    logger.warn(`${queueName} job stalled: ${job.id}`);
  });

  queue.on('progress', (job, progress) => {
    logger.debug(`${queueName} job progress: ${job.id} - ${progress}%`);
  });
};

// Setup events for all queues
setupQueueEvents(productSyncQueue, 'Product Sync');
setupQueueEvents(orderSyncQueue, 'Order Sync');
setupQueueEvents(stockUpdateQueue, 'Stock Update');
setupQueueEvents(priceUpdateQueue, 'Price Update');
setupQueueEvents(reportQueue, 'Report Generation');
setupQueueEvents(crossPlatformSyncQueue, 'Cross Platform Sync');
setupQueueEvents(batchCrossPlatformSyncQueue, 'Batch Cross Platform Sync');
setupQueueEvents(crossPlatformMonitorQueue, 'Cross Platform Monitor');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing job queues...');
  
  await Promise.all([
    productSyncQueue.close(),
    orderSyncQueue.close(),
    stockUpdateQueue.close(),
    priceUpdateQueue.close(),
    reportQueue.close(),
    crossPlatformSyncQueue.close(),
    batchCrossPlatformSyncQueue.close(),
    crossPlatformMonitorQueue.close()
  ]);
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing job queues...');
  
  await Promise.all([
    productSyncQueue.close(),
    orderSyncQueue.close(),
    stockUpdateQueue.close(),
    priceUpdateQueue.close(),
    reportQueue.close(),
    crossPlatformSyncQueue.close(),
    batchCrossPlatformSyncQueue.close(),
    crossPlatformMonitorQueue.close()
  ]);
  
  process.exit(0);
});

logger.info('Job worker started successfully');

// Export queues for use in other modules
module.exports = {
  productSyncQueue,
  orderSyncQueue,
  stockUpdateQueue,
  priceUpdateQueue,
  reportQueue,
  crossPlatformSyncQueue,
  batchCrossPlatformSyncQueue,
  crossPlatformMonitorQueue,
  queueConfig
}; 