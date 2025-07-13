const { 
  productSyncQueue,
  orderSyncQueue,
  stockUpdateQueue,
  priceUpdateQueue,
  reportQueue,
  crossPlatformSyncQueue,
  batchCrossPlatformSyncQueue,
  crossPlatformMonitorQueue,
  queueConfig
} = require('./worker');
const logger = require('../utils/logger');

class JobManager {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize job manager
  async init() {
    if (this.isInitialized) return;
    
    try {
      logger.info('Initializing Job Manager...');
      this.isInitialized = true;
      logger.info('Job Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Job Manager:', error);
      throw error;
    }
  }

  // Add product sync job
  async addProductSyncJob(userId, options = {}) {
    try {
      const jobData = {
        userId,
        productIds: options.productIds,
        marketplaces: options.marketplaces
      };

      const job = await productSyncQueue.add(
        'sync-products',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 0
        }
      );

      logger.info(`Product sync job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add product sync job:', error);
      throw error;
    }
  }

  // Add order sync job
  async addOrderSyncJob(userId, options = {}) {
    try {
      const jobData = {
        userId,
        marketplaces: options.marketplaces,
        startDate: options.startDate,
        endDate: options.endDate
      };

      const job = await orderSyncQueue.add(
        'sync-orders',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 0
        }
      );

      logger.info(`Order sync job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add order sync job:', error);
      throw error;
    }
  }

  // Add stock update job
  async addStockUpdateJob(userId, updates, options = {}) {
    try {
      const jobData = {
        userId,
        updates,
        marketplaces: options.marketplaces
      };

      const job = await stockUpdateQueue.add(
        'update-stock',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 5
        }
      );

      logger.info(`Stock update job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add stock update job:', error);
      throw error;
    }
  }

  // Add price update job
  async addPriceUpdateJob(userId, updates, options = {}) {
    try {
      const jobData = {
        userId,
        updates,
        marketplaces: options.marketplaces
      };

      const job = await priceUpdateQueue.add(
        'update-price',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 5
        }
      );

      logger.info(`Price update job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add price update job:', error);
      throw error;
    }
  }

  // Add report generation job
  async addReportJob(userId, reportType, parameters, options = {}) {
    try {
      const jobData = {
        userId,
        reportType,
        parameters,
        format: options.format || 'json'
      };

      const job = await reportQueue.add(
        'generate-report',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 1
        }
      );

      logger.info(`Report generation job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add report generation job:', error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(queueName, jobId) {
    try {
      let queue;
      switch (queueName) {
        case 'product-sync':
          queue = productSyncQueue;
          break;
        case 'order-sync':
          queue = orderSyncQueue;
          break;
        case 'stock-update':
          queue = stockUpdateQueue;
          break;
        case 'price-update':
          queue = priceUpdateQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      return {
        success: true,
        job: {
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          finishedOn: job.finishedOn,
          processedOn: job.processedOn,
          returnvalue: job.returnvalue
        }
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      throw error;
    }
  }

  // Cancel job
  async cancelJob(queueName, jobId) {
    try {
      let queue;
      switch (queueName) {
        case 'product-sync':
          queue = productSyncQueue;
          break;
        case 'order-sync':
          queue = orderSyncQueue;
          break;
        case 'stock-update':
          queue = stockUpdateQueue;
          break;
        case 'price-update':
          queue = priceUpdateQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      await job.remove();
      logger.info(`Job cancelled: ${queueName}:${jobId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    try {
      let queue;
      switch (queueName) {
        case 'product-sync':
          queue = productSyncQueue;
          break;
        case 'order-sync':
          queue = orderSyncQueue;
          break;
        case 'stock-update':
          queue = stockUpdateQueue;
          break;
        case 'price-update':
          queue = priceUpdateQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        success: true,
        stats: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        }
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  // Get all queue statistics
  async getAllQueueStats() {
    try {
      const [
        productSyncStats,
        orderSyncStats,
        stockUpdateStats,
        priceUpdateStats,
        reportStats
      ] = await Promise.all([
        this.getQueueStats('product-sync'),
        this.getQueueStats('order-sync'),
        this.getQueueStats('stock-update'),
        this.getQueueStats('price-update'),
        this.getQueueStats('report')
      ]);

      return {
        success: true,
        queues: {
          'product-sync': productSyncStats.stats,
          'order-sync': orderSyncStats.stats,
          'stock-update': stockUpdateStats.stats,
          'price-update': priceUpdateStats.stats,
          'report': reportStats.stats
        }
      };
    } catch (error) {
      logger.error('Failed to get all queue stats:', error);
      throw error;
    }
  }

  // Clean old jobs
  async cleanOldJobs(queueName, grace = 24 * 60 * 60 * 1000) {
    try {
      let queue;
      switch (queueName) {
        case 'product-sync':
          queue = productSyncQueue;
          break;
        case 'order-sync':
          queue = orderSyncQueue;
          break;
        case 'stock-update':
          queue = stockUpdateQueue;
          break;
        case 'price-update':
          queue = priceUpdateQueue;
          break;
        case 'report':
          queue = reportQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      
      logger.info(`Cleaned old jobs from queue: ${queueName}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to clean old jobs:', error);
      throw error;
    }
  }

  // Add cross-platform sync job
  async addCrossPlatformSyncJob(userId, sourceMarketplace, targetMarketplace, operation, options = {}) {
    try {
      const jobData = {
        userId,
        sourceMarketplace,
        targetMarketplace,
        operation,
        options
      };

      const job = await crossPlatformSyncQueue.add(
        'cross-platform-sync',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 1
        }
      );

      logger.info(`Cross-platform sync job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add cross-platform sync job:', error);
      throw error;
    }
  }

  // Add batch cross-platform sync job
  async addBatchCrossPlatformSyncJob(userId, marketplacePairs, operation, options = {}) {
    try {
      const jobData = {
        userId,
        marketplacePairs,
        operation,
        options
      };

      const job = await batchCrossPlatformSyncQueue.add(
        'batch-cross-platform-sync',
        jobData,
        {
          ...queueConfig,
          delay: options.delay || 0,
          priority: options.priority || 1
        }
      );

      logger.info(`Batch cross-platform sync job added: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add batch cross-platform sync job:', error);
      throw error;
    }
  }

  // Add scheduled cross-platform monitoring
  async addCrossPlatformMonitor(userId, enabledMarketplaces, schedule = '0 */6 * * *') {
    try {
      const jobData = {
        userId,
        enabledMarketplaces
      };

      const job = await crossPlatformMonitorQueue.add(
        'cross-platform-monitor',
        jobData,
        {
          repeat: { cron: schedule },
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      logger.info(`Cross-platform monitor scheduled: ${job.id} for user ${userId}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error('Failed to add cross-platform monitor:', error);
      throw error;
    }
  }

  // Generic add method for new cross-platform jobs
  async add(jobType, jobData, options = {}) {
    try {
      let queue;
      let jobName;

      switch (jobType) {
        case 'cross-platform-sync':
          queue = crossPlatformSyncQueue;
          jobName = 'cross-platform-sync';
          break;
        case 'batch-cross-platform-sync':
          queue = batchCrossPlatformSyncQueue;
          jobName = 'batch-cross-platform-sync';
          break;
        case 'cross-platform-monitor':
          queue = crossPlatformMonitorQueue;
          jobName = 'cross-platform-monitor';
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      const job = await queue.add(jobName, jobData, {
        ...queueConfig,
        delay: options.delay || 0,
        priority: options.priority || 1,
        ...options
      });

      logger.info(`Job added: ${jobType}:${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobType}:`, error);
      throw error;
    }
  }

  // Generic get job method
  async getJob(jobId) {
    try {
      // Search in all queues
      const queues = [
        productSyncQueue,
        orderSyncQueue,
        stockUpdateQueue,
        priceUpdateQueue,
        reportQueue,
        crossPlatformSyncQueue,
        batchCrossPlatformSyncQueue,
        crossPlatformMonitorQueue
      ];

      for (const queue of queues) {
        const job = await queue.getJob(jobId);
        if (job) {
          return job;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get job:', error);
      throw error;
    }
  }

  // Add scheduled job
  async addScheduled(jobType, schedule, jobData, options = {}) {
    try {
      return await this.add(jobType, jobData, {
        repeat: { cron: schedule },
        removeOnComplete: 5,
        removeOnFail: 3,
        ...options
      });
    } catch (error) {
      logger.error(`Failed to add scheduled job ${jobType}:`, error);
      throw error;
    }
  }

  // Schedule periodic sync jobs
  async schedulePeriodicSyncs() {
    try {
      // Add recurring product sync every 6 hours
      await productSyncQueue.add(
        'periodic-product-sync',
        { type: 'periodic' },
        {
          repeat: { cron: '0 */6 * * *' }, // Every 6 hours
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      // Add recurring order sync every hour
      await orderSyncQueue.add(
        'periodic-order-sync',
        { type: 'periodic' },
        {
          repeat: { cron: '0 * * * *' }, // Every hour
          removeOnComplete: 5,
          removeOnFail: 3
        }
      );

      logger.info('Periodic sync jobs scheduled');
    } catch (error) {
      logger.error('Failed to schedule periodic sync jobs:', error);
      throw error;
    }
  }
}

module.exports = new JobManager(); 