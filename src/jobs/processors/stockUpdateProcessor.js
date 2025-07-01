const adapterManager = require('../../core/AdapterManager');
const Product = require('../../models/Product');
const logger = require('../../utils/logger');

const stockUpdateProcessor = async (job) => {
  const { userId, updates, marketplaces } = job.data;
  
  try {
    logger.info(`Starting stock update job for user ${userId}`);
    job.progress(10);

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new Error('No stock updates provided');
    }

    const results = {};
    let completed = 0;
    const total = updates.length;

    for (const update of updates) {
      try {
        const { productId, variantId, stock, sku } = update;
        
        // Find the product
        const product = await Product.findOne({
          _id: productId,
          user: userId
        });

        if (!product) {
          results[productId] = { error: 'Product not found' };
          continue;
        }

        // Update stock in database
        if (variantId) {
          const variant = product.variants.id(variantId);
          if (variant) {
            variant.stock = stock;
          }
        } else {
          // Update all variants or total stock
          product.variants.forEach(variant => {
            if (!sku || variant.sku === sku) {
              variant.stock = stock;
            }
          });
        }

        await product.save();

        // Update stock in marketplaces
        const targetMarketplaces = marketplaces || 
          product.marketplaceSettings
            .filter(setting => setting.isActive)
            .map(setting => setting.marketplace);

        if (targetMarketplaces.length > 0) {
          const marketplaceResults = await adapterManager.updateStockAcrossMarketplaces(
            userId,
            sku || (variantId ? product.variants.id(variantId)?.sku : product.variants[0]?.sku),
            stock,
            targetMarketplaces
          );
          
          results[productId] = {
            success: true,
            marketplaceResults
          };
        } else {
          results[productId] = {
            success: true,
            message: 'Stock updated in database only'
          };
        }

        completed++;
        const progress = 10 + Math.floor((completed / total) * 80);
        job.progress(progress);

      } catch (error) {
        logger.error(`Failed to update stock for product ${update.productId}:`, error);
        results[update.productId] = { error: error.message };
      }
    }

    job.progress(100);

    const successCount = Object.values(results).filter(result => result.success).length;
    const failureCount = total - successCount;

    logger.info(`Stock update job completed for user ${userId}: ${successCount} successful, ${failureCount} failed`);

    return {
      success: true,
      totalUpdates: total,
      successfulUpdates: successCount,
      failedUpdates: failureCount,
      results
    };

  } catch (error) {
    logger.error(`Stock update job failed for user ${userId}:`, error);
    throw error;
  }
};

module.exports = stockUpdateProcessor; 