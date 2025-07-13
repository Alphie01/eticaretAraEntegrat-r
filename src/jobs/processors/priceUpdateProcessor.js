const adapterManager = require('../../core/AdapterManager');
const Product = require('../../models/Product');
const logger = require('../../utils/logger');

const priceUpdateProcessor = async (job) => {
  const { userId, updates, marketplaces } = job.data;
  
  try {
    logger.info(`Starting price update job for user ${userId}`);
    job.progress(10);

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new Error('No price updates provided');
    }

    const results = {};
    let completed = 0;
    const total = updates.length;

    for (const update of updates) {
      try {
        const { productId, variantId, price, discountedPrice, sku } = update;
        
        // Find the product
        const product = await Product.findOne({
          _id: productId,
          user: userId
        });

        if (!product) {
          results[productId] = { error: 'Product not found' };
          continue;
        }

        // Update price in database
        if (variantId) {
          const variant = product.variants.id(variantId);
          if (variant) {
            if (price !== undefined) variant.price = price;
            if (discountedPrice !== undefined) variant.discountedPrice = discountedPrice;
          }
        } else {
          // Update base price or all variants
          if (price !== undefined) {
            product.basePrice = price;
            
            // Also update variants if no specific SKU
            if (!sku) {
              product.variants.forEach(variant => {
                variant.price = price;
              });
            } else {
              product.variants.forEach(variant => {
                if (variant.sku === sku) {
                  variant.price = price;
                  if (discountedPrice !== undefined) {
                    variant.discountedPrice = discountedPrice;
                  }
                }
              });
            }
          }
        }

        await product.save();

        // Update price in marketplaces
        const targetMarketplaces = marketplaces || 
          product.marketplaceSettings
            .filter(setting => setting.isActive)
            .map(setting => setting.marketplace);

        if (targetMarketplaces.length > 0) {
          const effectivePrice = discountedPrice || price;
          const marketplaceResults = await adapterManager.updatePriceAcrossMarketplaces(
            userId,
            sku || (variantId ? product.variants.id(variantId)?.sku : product.variants[0]?.sku),
            effectivePrice,
            targetMarketplaces
          );
          
          results[productId] = {
            success: true,
            marketplaceResults
          };
        } else {
          results[productId] = {
            success: true,
            message: 'Price updated in database only'
          };
        }

        completed++;
        const progress = 10 + Math.floor((completed / total) * 80);
        job.progress(progress);

      } catch (error) {
        logger.error(`Failed to update price for product ${update.productId}:`, error);
        results[update.productId] = { error: error.message };
      }
    }

    job.progress(100);

    const successCount = Object.values(results).filter(result => result.success).length;
    const failureCount = total - successCount;

    logger.info(`Price update job completed for user ${userId}: ${successCount} successful, ${failureCount} failed`);

    return {
      success: true,
      totalUpdates: total,
      successfulUpdates: successCount,
      failedUpdates: failureCount,
      results
    };

  } catch (error) {
    logger.error(`Price update job failed for user ${userId}:`, error);
    throw error;
  }
};

module.exports = priceUpdateProcessor; 