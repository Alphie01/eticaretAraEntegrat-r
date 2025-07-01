const express = require('express');
const { protect } = require('../../middleware/auth');
const adapterManager = require('../../core/AdapterManager');
const logger = require('../../utils/logger');

const router = express.Router();

// @desc    Get available marketplaces
// @route   GET /api/v1/marketplace
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const availableMarketplaces = adapterManager.getAvailableMarketplaces();
    const allMarketplaces = adapterManager.getAllMarketplaces();
    const marketplaceStatus = adapterManager.getMarketplaceStatus();
    const adapterInfo = await adapterManager.getAdapterInfo(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        available: availableMarketplaces,
        all: allMarketplaces,
        status: marketplaceStatus,
        connections: adapterInfo,
        message: availableMarketplaces.length === 0 
          ? 'No marketplace integrations are enabled. Please check your environment variables for API credentials.'
          : `${availableMarketplaces.length} marketplace integration(s) enabled: ${availableMarketplaces.join(', ')}`
      }
    });
  } catch (error) {
    logger.error('Get marketplaces failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching marketplaces'
    });
  }
});

// @desc    Test marketplace connection
// @route   POST /api/v1/marketplace/:marketplace/test
// @access  Private
router.post('/:marketplace/test', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    
    const result = await adapterManager.testConnection(req.user.id, marketplace);

    logger.info(`Marketplace connection test: ${marketplace} - ${result.success ? 'SUCCESS' : 'FAILED'} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Test marketplace connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during connection test'
    });
  }
});

// @desc    Get marketplace products
// @route   GET /api/v1/marketplace/:marketplace/products
// @access  Private
router.get('/:marketplace/products', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { page = 0, limit = 50, ...otherParams } = req.query;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.getProducts({
      page: parseInt(page),
      size: parseInt(limit),
      ...otherParams
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get marketplace products failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while fetching marketplace products'
    });
  }
});

// @desc    Get marketplace orders
// @route   GET /api/v1/marketplace/:marketplace/orders
// @access  Private
router.get('/:marketplace/orders', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { page = 0, limit = 50, ...otherParams } = req.query;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.getOrders({
      page: parseInt(page),
      size: parseInt(limit),
      ...otherParams
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get marketplace orders failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while fetching marketplace orders'
    });
  }
});

// @desc    Get marketplace categories
// @route   GET /api/v1/marketplace/:marketplace/categories
// @access  Private
router.get('/:marketplace/categories', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const categories = await adapter.getCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get marketplace categories failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while fetching marketplace categories'
    });
  }
});

// @desc    Create product in marketplace
// @route   POST /api/v1/marketplace/:marketplace/products
// @access  Private
router.post('/:marketplace/products', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const productData = req.body;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.createProduct(productData);

    logger.info(`Product created in ${marketplace} by user ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Create marketplace product failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while creating marketplace product'
    });
  }
});

// @desc    Update product in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId
// @access  Private
router.put('/:marketplace/products/:productId', protect, async (req, res) => {
  try {
    const { marketplace, productId } = req.params;
    const productData = req.body;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.updateProduct(productId, productData);

    logger.info(`Product ${productId} updated in ${marketplace} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update marketplace product failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating marketplace product'
    });
  }
});

// @desc    Update stock in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId/stock
// @access  Private
router.put('/:marketplace/products/:productId/stock', protect, async (req, res) => {
  try {
    const { marketplace, productId } = req.params;
    const { stock, variantId } = req.body;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.updateStock(productId, stock, variantId);

    logger.info(`Stock updated for product ${productId} in ${marketplace} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update marketplace stock failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating marketplace stock'
    });
  }
});

// @desc    Update price in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/products/:productId/price
// @access  Private
router.put('/:marketplace/products/:productId/price', protect, async (req, res) => {
  try {
    const { marketplace, productId } = req.params;
    const { price, variantId } = req.body;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.updatePrice(productId, price, variantId);

    logger.info(`Price updated for product ${productId} in ${marketplace} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update marketplace price failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating marketplace price'
    });
  }
});

// @desc    Update order status in marketplace
// @route   PUT /api/v1/marketplace/:marketplace/orders/:orderId/status
// @access  Private
router.put('/:marketplace/orders/:orderId/status', protect, async (req, res) => {
  try {
    const { marketplace, orderId } = req.params;
    const { status, trackingInfo } = req.body;

    const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
    const result = await adapter.updateOrderStatus(orderId, status, trackingInfo);

    logger.info(`Order ${orderId} status updated in ${marketplace} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Update marketplace order status failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating marketplace order status'
    });
  }
});

// @desc    Get adapter statistics
// @route   GET /api/v1/marketplace/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = adapterManager.getStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get adapter stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching adapter statistics'
    });
  }
});

// @desc    Bulk operations across marketplaces
// @route   POST /api/v1/marketplace/bulk
// @access  Private
router.post('/bulk', protect, async (req, res) => {
  try {
    const { operation, marketplaces, data } = req.body;

    if (!operation || !marketplaces || !Array.isArray(marketplaces)) {
      return res.status(400).json({
        success: false,
        error: 'Operation and marketplaces are required'
      });
    }

    const results = await adapterManager.executeOnMarketplaces(
      req.user.id,
      marketplaces,
      operation,
      data
    );

    logger.info(`Bulk operation ${operation} executed on ${marketplaces.join(', ')} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Bulk operation completed',
      results
    });
  } catch (error) {
    logger.error('Bulk marketplace operation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during bulk operation'
    });
  }
});

// @desc    Get system status (database, marketplace integrations, etc.)
// @route   GET /api/v1/marketplace/system-status
// @access  Private
router.get('/system-status', protect, async (req, res) => {
  try {
    const { testConnection } = require('../../config/database');
    
    // Test database connection
    const dbStatus = await testConnection();
    
    // Get marketplace status
    const marketplaceStatus = adapterManager.getMarketplaceStatus();
    const availableMarketplaces = adapterManager.getAvailableMarketplaces();
    const totalMarketplaces = adapterManager.getAllMarketplaces();
    
    // Get adapter stats
    const adapterStats = adapterManager.getStats();
    
    // Calculate system health
    const enabledCount = availableMarketplaces.length;
    const totalCount = totalMarketplaces.length;
    const healthPercentage = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0;
    
    const systemStatus = {
      healthy: dbStatus.success && enabledCount > 0,
      database: dbStatus,
      marketplaces: {
        enabled: availableMarketplaces,
        disabled: totalMarketplaces.filter(m => !availableMarketplaces.includes(m)),
        status: marketplaceStatus,
        health: {
          enabled: enabledCount,
          total: totalCount,
          percentage: healthPercentage
        }
      },
      adapters: adapterStats,
      timestamp: new Date().toISOString(),
      warnings: [],
      recommendations: []
    };
    
    // Add warnings and recommendations
    if (!dbStatus.success) {
      systemStatus.warnings.push('Database connection failed');
      systemStatus.recommendations.push('Check database configuration and connection');
    }
    
    if (enabledCount === 0) {
      systemStatus.warnings.push('No marketplace integrations enabled');
      systemStatus.recommendations.push('Configure marketplace API credentials in environment variables');
    }
    
    if (enabledCount < totalCount) {
      const disabledMarketplaces = totalMarketplaces.filter(m => !availableMarketplaces.includes(m));
      systemStatus.warnings.push(`${disabledMarketplaces.length} marketplace(s) disabled: ${disabledMarketplaces.join(', ')}`);
      systemStatus.recommendations.push('Add missing API credentials to enable all marketplace integrations');
    }

    res.status(200).json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    logger.error('Get system status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching system status'
    });
  }
});

module.exports = router; 