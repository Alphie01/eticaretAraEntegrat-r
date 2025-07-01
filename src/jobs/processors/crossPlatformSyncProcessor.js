const CrossPlatformSyncManager = require('../../core/CrossPlatformSyncManager');
const logger = require('../../utils/logger');

/**
 * Cross-platform ürün senkronizasyon işlemcisi
 * Background job olarak çapraz platform sync işlemlerini gerçekleştirir
 */
const crossPlatformSyncProcessor = async (job) => {
  const { 
    userId, 
    sourceMarketplace, 
    targetMarketplace, 
    operation,
    options = {} 
  } = job.data;

  try {
    logger.info(`Starting cross-platform sync job: ${operation} for user ${userId}`, {
      source: sourceMarketplace,
      target: targetMarketplace
    });

    job.progress(5);

    const syncManager = new CrossPlatformSyncManager();
    let result;

    switch (operation) {
      case 'analyze':
        result = await performAnalysis(syncManager, userId, sourceMarketplace, targetMarketplace, options, job);
        break;
      
      case 'sync':
        result = await performSync(syncManager, userId, sourceMarketplace, targetMarketplace, options, job);
        break;
      
      case 'status':
        result = await performStatusCheck(syncManager, userId, sourceMarketplace, targetMarketplace, job);
        break;
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    job.progress(100);

    logger.info(`Cross-platform sync job completed: ${operation}`, {
      userId,
      source: sourceMarketplace,
      target: targetMarketplace,
      success: true
    });

    return result;

  } catch (error) {
    logger.error(`Cross-platform sync job failed: ${operation}`, {
      userId,
      source: sourceMarketplace,
      target: targetMarketplace,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Ürün analizi gerçekleştir
 */
async function performAnalysis(syncManager, userId, sourceMarketplace, targetMarketplace, options, job) {
  job.progress(10);

  logger.info(`Performing product analysis between ${sourceMarketplace} and ${targetMarketplace}`);

  const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
    userId,
    sourceMarketplace,
    targetMarketplace,
    options
  );

  job.progress(90);

  // Analiz sonuçlarını cache'e kaydet (opsiyonel)
  // await cacheAnalysisResults(userId, sourceMarketplace, targetMarketplace, analysis);

  return {
    operation: 'analyze',
    timestamp: new Date(),
    userId,
    sourceMarketplace,
    targetMarketplace,
    result: analysis,
    summary: {
      totalProducts: analysis.analysis.sourceProductCount + analysis.analysis.targetProductCount,
      matches: analysis.summary.matched,
      sourceOnly: analysis.summary.sourceOnly,
      targetOnly: analysis.summary.targetOnly,
      conflicts: analysis.summary.conflicts,
      recommendations: analysis.syncRecommendations.length
    }
  };
}

/**
 * Sync işlemi gerçekleştir
 */
async function performSync(syncManager, userId, sourceMarketplace, targetMarketplace, options, job) {
  job.progress(10);

  logger.info(`Performing cross-platform sync between ${sourceMarketplace} and ${targetMarketplace}`);

  // Önce analiz yap
  job.progress(20);
  const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
    userId,
    sourceMarketplace,
    targetMarketplace,
    options
  );

  job.progress(40);

  // Sync işlemini gerçekleştir
  const syncResult = await syncManager.executeCrossPlatformSync(
    userId,
    sourceMarketplace,
    targetMarketplace,
    {
      ...options,
      syncMissing: options.syncMissing !== false, // Default true
      importMissing: options.importMissing === true // Default false
    }
  );

  job.progress(90);

  // Başarı/başarısızlık istatistikleri hesapla
  const stats = calculateSyncStats(syncResult);

  return {
    operation: 'sync',
    timestamp: new Date(),
    userId,
    sourceMarketplace,
    targetMarketplace,
    result: syncResult,
    stats,
    summary: {
      totalProcessed: stats.totalProcessed,
      successful: stats.successful,
      failed: stats.failed,
      duration: syncResult.sync.duration,
      recommendations: analysis.syncRecommendations.length
    }
  };
}

/**
 * Durum kontrolü gerçekleştir
 */
async function performStatusCheck(syncManager, userId, sourceMarketplace, targetMarketplace, job) {
  job.progress(20);

  logger.info(`Checking sync status between ${sourceMarketplace} and ${targetMarketplace}`);

  const status = await syncManager.getCrossPlatformSyncStatus(
    userId,
    sourceMarketplace,
    targetMarketplace
  );

  job.progress(80);

  return {
    operation: 'status',
    timestamp: new Date(),
    userId,
    sourceMarketplace,
    targetMarketplace,
    result: status,
    summary: {
      marketplaceA: status.marketplaceA,
      marketplaceB: status.marketplaceB,
      syncStatus: status.syncStatus,
      needsAttention: status.syncStatus.needsSync || status.syncStatus.hasConflicts
    }
  };
}

/**
 * Sync istatistiklerini hesapla
 */
function calculateSyncStats(syncResult) {
  const stats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    operations: []
  };

  for (const result of syncResult.sync.results) {
    stats.totalProcessed += result.total || 0;
    stats.successful += result.successful || 0;
    stats.failed += result.failed || 0;
    stats.operations.push({
      type: result.type,
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });
  }

  return stats;
}

/**
 * Batch Cross-Platform Sync Processor
 * Birden fazla marketplace kombinasyonu için sync
 */
const batchCrossPlatformSyncProcessor = async (job) => {
  const { userId, marketplacePairs, operation, options = {} } = job.data;

  try {
    logger.info(`Starting batch cross-platform sync: ${operation} for user ${userId}`, {
      pairs: marketplacePairs
    });

    job.progress(5);

    const syncManager = new CrossPlatformSyncManager();
    const results = [];
    const total = marketplacePairs.length;

    for (let i = 0; i < marketplacePairs.length; i++) {
      const pair = marketplacePairs[i];
      const progress = 5 + Math.floor((i / total) * 90);
      job.progress(progress);

      try {
        let pairResult;

        switch (operation) {
          case 'analyze':
            pairResult = await syncManager.analyzeProductsAcrossMarketplaces(
              userId,
              pair.source,
              pair.target,
              options
            );
            break;
          
          case 'sync':
            pairResult = await syncManager.executeCrossPlatformSync(
              userId,
              pair.source,
              pair.target,
              options
            );
            break;
          
          case 'status':
            pairResult = await syncManager.getCrossPlatformSyncStatus(
              userId,
              pair.source,
              pair.target
            );
            break;
        }

        results.push({
          source: pair.source,
          target: pair.target,
          success: true,
          result: pairResult,
          timestamp: new Date()
        });

        logger.info(`Batch sync pair completed: ${pair.source} -> ${pair.target}`);

      } catch (error) {
        results.push({
          source: pair.source,
          target: pair.target,
          success: false,
          error: error.message,
          timestamp: new Date()
        });

        logger.error(`Batch sync pair failed: ${pair.source} -> ${pair.target}`, error);
      }
    }

    job.progress(100);

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    logger.info(`Batch cross-platform sync completed:`, summary);

    return {
      operation: `batch_${operation}`,
      timestamp: new Date(),
      userId,
      results,
      summary
    };

  } catch (error) {
    logger.error(`Batch cross-platform sync failed:`, error);
    throw error;
  }
};

/**
 * Scheduled Cross-Platform Monitor
 * Düzenli olarak çalışacak monitoring job'u
 */
const scheduledCrossPlatformMonitor = async (job) => {
  const { userId, enabledMarketplaces } = job.data;

  try {
    logger.info(`Starting scheduled cross-platform monitor for user ${userId}`);

    const syncManager = new CrossPlatformSyncManager();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    // Enabled marketplace'ler arasındaki tüm kombinasyonları oluştur
    const marketplacePairs = [];
    for (let i = 0; i < enabledMarketplaces.length; i++) {
      for (let j = i + 1; j < enabledMarketplaces.length; j++) {
        if (supportedMarketplaces.includes(enabledMarketplaces[i]) && 
            supportedMarketplaces.includes(enabledMarketplaces[j])) {
          marketplacePairs.push({
            source: enabledMarketplaces[i],
            target: enabledMarketplaces[j]
          });
        }
      }
    }

    job.progress(10);

    const monitorResults = [];
    
    for (const pair of marketplacePairs) {
      try {
        const status = await syncManager.getCrossPlatformSyncStatus(
          userId,
          pair.source,
          pair.target
        );

        monitorResults.push({
          source: pair.source,
          target: pair.target,
          status,
          needsAttention: status.syncStatus.needsSync || status.syncStatus.hasConflicts,
          lastChecked: new Date()
        });

      } catch (error) {
        logger.error(`Monitor failed for pair ${pair.source} -> ${pair.target}:`, error);
      }
    }

    job.progress(90);

    // Alert'ler oluştur
    const alerts = [];
    for (const result of monitorResults) {
      if (result.needsAttention) {
        alerts.push({
          type: 'sync_attention_required',
          source: result.source,
          target: result.target,
          message: `${result.source} <-> ${result.target} sync attention required`,
          details: result.status.syncStatus
        });
      }
    }

    job.progress(100);

    return {
      operation: 'scheduled_monitor',
      timestamp: new Date(),
      userId,
      marketplacePairs: marketplacePairs.length,
      results: monitorResults,
      alerts,
      summary: {
        total: monitorResults.length,
        needsAttention: alerts.length,
        healthy: monitorResults.length - alerts.length
      }
    };

  } catch (error) {
    logger.error(`Scheduled cross-platform monitor failed:`, error);
    throw error;
  }
};

module.exports = {
  crossPlatformSyncProcessor,
  batchCrossPlatformSyncProcessor,
  scheduledCrossPlatformMonitor
}; 