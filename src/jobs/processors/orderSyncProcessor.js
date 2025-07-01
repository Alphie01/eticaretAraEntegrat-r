const adapterManager = require('../../core/AdapterManager');
const Order = require('../../models/Order');
const User = require('../../models/User');
const logger = require('../../utils/logger');

const orderSyncProcessor = async (job) => {
  const { userId, marketplaces, startDate, endDate } = job.data;
  
  try {
    logger.info(`Starting order sync job for user ${userId}`);
    job.progress(10);

    // Get user and marketplace accounts
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const targetMarketplaces = marketplaces || 
      user.marketplaceAccounts
        .filter(acc => acc.isActive)
        .map(acc => acc.marketplace);

    if (targetMarketplaces.length === 0) {
      throw new Error('No active marketplace accounts found');
    }

    job.progress(20);

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Import orders from marketplaces
    const results = await adapterManager.importOrdersFromMarketplaces(
      userId,
      params
    );

    job.progress(60);

    // Save imported orders to database
    let totalNewOrders = 0;
    let totalExistingOrders = 0;
    const saveResults = {};

    for (const [marketplace, result] of Object.entries(results)) {
      saveResults[marketplace] = {
        newOrders: 0,
        existingOrders: 0,
        errors: []
      };

      if (result.success && result.data.orders) {
        for (const orderData of result.data.orders) {
          try {
            // Check if order already exists
            const existingOrder = await Order.findOne({
              user: userId,
              'marketplace.name': marketplace,
              'marketplace.orderId': orderData.marketplace.orderId
            });

            if (!existingOrder) {
              const order = new Order({
                ...orderData,
                user: userId
              });
              
              order.calculateTotals();
              await order.save();
              
              totalNewOrders++;
              saveResults[marketplace].newOrders++;
            } else {
              // Update existing order if needed
              const hasChanges = 
                existingOrder.status !== orderData.status ||
                existingOrder.paymentStatus !== orderData.paymentStatus ||
                existingOrder.fulfillmentStatus !== orderData.fulfillmentStatus;

              if (hasChanges) {
                existingOrder.status = orderData.status;
                existingOrder.paymentStatus = orderData.paymentStatus;
                existingOrder.fulfillmentStatus = orderData.fulfillmentStatus;
                existingOrder.syncStatus.lastSyncDate = new Date();
                await existingOrder.save();
              }

              totalExistingOrders++;
              saveResults[marketplace].existingOrders++;
            }
          } catch (error) {
            logger.error(`Failed to save order from ${marketplace}:`, error);
            saveResults[marketplace].errors.push(error.message);
          }
        }
      }
    }

    job.progress(90);

    // Update user marketplace accounts sync dates
    for (const marketplace of targetMarketplaces) {
      const account = user.marketplaceAccounts.find(
        acc => acc.marketplace === marketplace
      );
      if (account) {
        account.lastSyncDate = new Date();
      }
    }
    await user.save();

    job.progress(100);

    logger.info(`Order sync job completed for user ${userId}: ${totalNewOrders} new orders, ${totalExistingOrders} existing orders`);

    return {
      success: true,
      totalNewOrders,
      totalExistingOrders,
      marketplaceResults: results,
      saveResults
    };

  } catch (error) {
    logger.error(`Order sync job failed for user ${userId}:`, error);
    throw error;
  }
};

module.exports = orderSyncProcessor; 