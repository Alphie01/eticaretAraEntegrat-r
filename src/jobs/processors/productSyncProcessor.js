const adapterManager = require('../../core/AdapterManager');
const Product = require('../../models/Product');
const logger = require('../../utils/logger');

const productSyncProcessor = async (job) => {
  const { userId, productIds, marketplaces } = job.data;
  
  try {
    logger.info(`Starting product sync job for user ${userId}`);
    job.progress(10);

    // Get products to sync
    const query = { user: userId };
    if (productIds && productIds.length > 0) {
      query._id = { $in: productIds };
    }

    const products = await Product.find(query);
    if (products.length === 0) {
      throw new Error('No products found to sync');
    }

    job.progress(20);

    const results = {};
    let completed = 0;
    const total = products.length;

    // Sync each product
    for (const product of products) {
      try {
        const targetMarketplaces = marketplaces || 
          product.marketplaceSettings
            .filter(setting => setting.isActive)
            .map(setting => setting.marketplace);

        if (targetMarketplaces.length > 0) {
          const syncResult = await adapterManager.syncProductToMarketplaces(
            userId,
            product,
            targetMarketplaces
          );
          
          results[product._id] = syncResult;
          
          // Update product sync date
          for (const marketplace of targetMarketplaces) {
            const marketplaceSetting = product.marketplaceSettings.find(
              setting => setting.marketplace === marketplace
            );
            if (marketplaceSetting) {
              marketplaceSetting.lastSyncDate = new Date();
            }
          }
          
          await product.save();
        }

        completed++;
        const progress = 20 + Math.floor((completed / total) * 70);
        job.progress(progress);
        
        logger.debug(`Product sync progress: ${completed}/${total}`);
        
      } catch (error) {
        logger.error(`Failed to sync product ${product._id}:`, error);
        results[product._id] = { error: error.message };
      }
    }

    job.progress(95);

    // Calculate success/failure stats
    const successCount = Object.values(results).filter(result => 
      !result.error && Object.values(result).some(r => r.success)
    ).length;
    
    const failureCount = total - successCount;

    job.progress(100);

    logger.info(`Product sync job completed for user ${userId}: ${successCount} successful, ${failureCount} failed`);

    return {
      success: true,
      totalProducts: total,
      successfulSyncs: successCount,
      failedSyncs: failureCount,
      results
    };

  } catch (error) {
    logger.error(`Product sync job failed for user ${userId}:`, error);
    throw error;
  }
};

module.exports = productSyncProcessor; 