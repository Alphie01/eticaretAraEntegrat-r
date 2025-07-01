const express = require('express');
const { protect } = require('../../middleware/auth');
const CrossPlatformSyncManager = require('../../core/CrossPlatformSyncManager');
const adapterManager = require('../../core/AdapterManager');
const logger = require('../../utils/logger');
const JobManager = require('../../jobs/JobManager');

const router = express.Router();
const syncManager = new CrossPlatformSyncManager();

// @desc    Get supported marketplaces for cross-platform sync
// @route   GET /api/v1/sync/cross-platform/marketplaces
// @access  Private
router.get('/marketplaces', protect, async (req, res) => {
  try {
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    const availableMarketplaces = adapterManager.getAvailableMarketplaces();
    
    // Sadece hem desteklenen hem de available olan marketplace'leri göster
    const enabledMarketplaces = supportedMarketplaces.filter(mp => 
      availableMarketplaces.includes(mp)
    );

    res.status(200).json({
      success: true,
      data: {
        supported: supportedMarketplaces,
        available: availableMarketplaces,
        enabled: enabledMarketplaces,
        combinations: generateMarketplaceCombinations(enabledMarketplaces)
      }
    });
  } catch (error) {
    logger.error('Get supported marketplaces failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching supported marketplaces'
    });
  }
});

// @desc    Analyze products across marketplaces
// @route   POST /api/v1/sync/cross-platform/analyze
// @access  Private
router.post('/analyze', protect, async (req, res) => {
  try {
    const { 
      sourceMarketplace, 
      targetMarketplace,
      options = {},
      runInBackground = false
    } = req.body;

    // Input validation
    if (!sourceMarketplace || !targetMarketplace) {
      return res.status(400).json({
        success: false,
        error: 'Source and target marketplaces are required'
      });
    }

    if (sourceMarketplace === targetMarketplace) {
      return res.status(400).json({
        success: false,
        error: 'Source and target marketplaces cannot be the same'
      });
    }

    // Background job olarak çalıştır
    if (runInBackground) {
      const job = await JobManager.add('cross-platform-sync', {
        userId: req.user.id,
        sourceMarketplace,
        targetMarketplace,
        operation: 'analyze',
        options
      });

      return res.status(202).json({
        success: true,
        message: 'Analysis job started',
        jobId: job.id,
        status: 'pending'
      });
    }

    // Direkt çalıştır
    const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
      req.user.id,
      sourceMarketplace,
      targetMarketplace,
      options
    );

    logger.info(`Cross-platform analysis completed for user ${req.user.email}:`, {
      source: sourceMarketplace,
      target: targetMarketplace,
      matches: analysis.summary.matched,
      sourceOnly: analysis.summary.sourceOnly,
      targetOnly: analysis.summary.targetOnly
    });

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Cross-platform analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during cross-platform analysis'
    });
  }
});

// @desc    Execute cross-platform sync
// @route   POST /api/v1/sync/cross-platform/execute
// @access  Private
router.post('/execute', protect, async (req, res) => {
  try {
    const { 
      sourceMarketplace, 
      targetMarketplace,
      options = {},
      runInBackground = true
    } = req.body;

    // Input validation
    if (!sourceMarketplace || !targetMarketplace) {
      return res.status(400).json({
        success: false,
        error: 'Source and target marketplaces are required'
      });
    }

    // Background job olarak çalıştır (recommended for sync operations)
    if (runInBackground) {
      const job = await JobManager.add('cross-platform-sync', {
        userId: req.user.id,
        sourceMarketplace,
        targetMarketplace,
        operation: 'sync',
        options: {
          syncMissing: options.syncMissing !== false, // Default true
          importMissing: options.importMissing === true, // Default false
          ...options
        }
      });

      return res.status(202).json({
        success: true,
        message: 'Cross-platform sync job started',
        jobId: job.id,
        status: 'pending',
        estimatedDuration: '5-15 minutes'
      });
    }

    // Direkt çalıştır (küçük sync'ler için)
    const syncResult = await syncManager.executeCrossPlatformSync(
      req.user.id,
      sourceMarketplace,
      targetMarketplace,
      options
    );

    logger.info(`Cross-platform sync completed for user ${req.user.email}:`, {
      source: sourceMarketplace,
      target: targetMarketplace,
      duration: syncResult.sync.duration
    });

    res.status(200).json({
      success: true,
      message: 'Cross-platform sync completed',
      data: syncResult
    });
  } catch (error) {
    logger.error('Cross-platform sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during cross-platform sync'
    });
  }
});

// @desc    Get cross-platform sync status
// @route   GET /api/v1/sync/cross-platform/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const { source, target } = req.query;

    if (!source || !target) {
      return res.status(400).json({
        success: false,
        error: 'Source and target marketplace parameters are required'
      });
    }

    const status = await syncManager.getCrossPlatformSyncStatus(
      req.user.id,
      source,
      target
    );

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Get cross-platform sync status failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while fetching sync status'
    });
  }
});

// @desc    Get overview of all marketplace sync statuses
// @route   GET /api/v1/sync/cross-platform/overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const availableMarketplaces = adapterManager.getAvailableMarketplaces();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    const enabledMarketplaces = supportedMarketplaces.filter(mp => 
      availableMarketplaces.includes(mp)
    );

    if (enabledMarketplaces.length < 2) {
      return res.status(200).json({
        success: true,
        message: 'At least 2 marketplaces required for cross-platform sync',
        data: {
          enabledMarketplaces,
          pairs: [],
          overview: {
            totalPairs: 0,
            needsSync: 0,
            hasConflicts: 0,
            healthy: 0
          }
        }
      });
    }

    // Tüm marketplace kombinasyonları
    const marketplacePairs = generateMarketplaceCombinations(enabledMarketplaces);
    const statusPromises = marketplacePairs.map(pair => 
      syncManager.getCrossPlatformSyncStatus(req.user.id, pair.source, pair.target)
        .then(status => ({ ...pair, status, success: true }))
        .catch(error => ({ ...pair, error: error.message, success: false }))
    );

    const statuses = await Promise.allSettled(statusPromises);
    const results = statuses.map(s => s.value);

    // Overview istatistikleri
    const overview = {
      totalPairs: results.length,
      needsSync: 0,
      hasConflicts: 0,
      healthy: 0,
      errors: 0
    };

    for (const result of results) {
      if (!result.success) {
        overview.errors++;
      } else if (result.status.syncStatus.needsSync) {
        overview.needsSync++;
      } else if (result.status.syncStatus.hasConflicts) {
        overview.hasConflicts++;
      } else {
        overview.healthy++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        enabledMarketplaces,
        pairs: results,
        overview,
        lastChecked: new Date()
      }
    });
  } catch (error) {
    logger.error('Get cross-platform sync overview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while fetching sync overview'
    });
  }
});

// @desc    Batch analyze multiple marketplace pairs
// @route   POST /api/v1/sync/cross-platform/batch/analyze
// @access  Private
router.post('/batch/analyze', protect, async (req, res) => {
  try {
    const { marketplacePairs, options = {} } = req.body;

    if (!marketplacePairs || !Array.isArray(marketplacePairs) || marketplacePairs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Marketplace pairs array is required'
      });
    }

    // Validate pairs
    for (const pair of marketplacePairs) {
      if (!pair.source || !pair.target) {
        return res.status(400).json({
          success: false,
          error: 'Each pair must have source and target marketplace'
        });
      }
    }

    const job = await JobManager.add('batch-cross-platform-sync', {
      userId: req.user.id,
      marketplacePairs,
      operation: 'analyze',
      options
    });

    res.status(202).json({
      success: true,
      message: 'Batch analysis job started',
      jobId: job.id,
      status: 'pending',
      totalPairs: marketplacePairs.length
    });
  } catch (error) {
    logger.error('Batch cross-platform analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during batch analysis'
    });
  }
});

// @desc    Batch sync multiple marketplace pairs
// @route   POST /api/v1/sync/cross-platform/batch/execute
// @access  Private
router.post('/batch/execute', protect, async (req, res) => {
  try {
    const { marketplacePairs, options = {} } = req.body;

    if (!marketplacePairs || !Array.isArray(marketplacePairs) || marketplacePairs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Marketplace pairs array is required'
      });
    }

    const job = await JobManager.add('batch-cross-platform-sync', {
      userId: req.user.id,
      marketplacePairs,
      operation: 'sync',
      options: {
        syncMissing: options.syncMissing !== false,
        importMissing: options.importMissing === true,
        ...options
      }
    });

    res.status(202).json({
      success: true,
      message: 'Batch sync job started',
      jobId: job.id,
      status: 'pending',
      totalPairs: marketplacePairs.length,
      estimatedDuration: `${marketplacePairs.length * 10}-${marketplacePairs.length * 20} minutes`
    });
  } catch (error) {
    logger.error('Batch cross-platform sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during batch sync'
    });
  }
});

// @desc    Get job status
// @route   GET /api/v1/sync/cross-platform/job/:jobId
// @access  Private
router.get('/job/:jobId', protect, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await JobManager.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if user owns this job
    if (job.data.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const jobStatus = {
      id: job.id,
      status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : 'processing',
      progress: job.progress || 0,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn
    };

    res.status(200).json({
      success: true,
      data: jobStatus
    });
  } catch (error) {
    logger.error('Get job status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching job status'
    });
  }
});

// @desc    Start scheduled monitoring for user
// @route   POST /api/v1/sync/cross-platform/monitor/start
// @access  Private
router.post('/monitor/start', protect, async (req, res) => {
  try {
    const { schedule = '0 */6 * * *' } = req.body; // Default: every 6 hours
    
    const availableMarketplaces = adapterManager.getAvailableMarketplaces();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    const enabledMarketplaces = supportedMarketplaces.filter(mp => 
      availableMarketplaces.includes(mp)
    );

    if (enabledMarketplaces.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 marketplaces required for monitoring'
      });
    }

    const job = await JobManager.addScheduled('cross-platform-monitor', schedule, {
      userId: req.user.id,
      enabledMarketplaces
    });

    res.status(200).json({
      success: true,
      message: 'Cross-platform monitoring started',
      jobId: job.id,
      schedule,
      enabledMarketplaces
    });
  } catch (error) {
    logger.error('Start monitoring failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while starting monitoring'
    });
  }
});

// Helper function to generate marketplace combinations
function generateMarketplaceCombinations(marketplaces) {
  const combinations = [];
  
  for (let i = 0; i < marketplaces.length; i++) {
    for (let j = i + 1; j < marketplaces.length; j++) {
      combinations.push({
        source: marketplaces[i],
        target: marketplaces[j]
      });
    }
  }
  
  return combinations;
}

module.exports = router; 