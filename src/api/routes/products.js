const express = require('express');
const { Product } = require('../../models/Product');
const { protect, authorize } = require('../../middleware/auth');
const adapterManager = require('../../core/AdapterManager');
const MultiPlatformProductMatcher = require('../../core/MultiPlatformProductMatcher');
const logger = require('../../utils/logger');

const router = express.Router();

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      status,
      marketplace,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build Sequelize where clause
    const where = { user_id: req.user.id };
    
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (brand) where.brand = brand;
    if (status) where.is_active = status === 'active';

    // Execute query with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      order,
      offset,
      limit: parseInt(limit),
      include: [
        {
          association: 'user',
          attributes: ['name', 'email']
        },
        {
          association: 'variants',
          required: false
        },
        {
          association: 'images',
          required: false
        },
        {
          association: 'marketplaceListings',
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: products
    });
  } catch (error) {
    logger.error('Get products failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching products'
    });
  }
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [
        {
          association: 'user',
          attributes: ['name', 'email']
        },
        {
          association: 'variants',
          required: false
        },
        {
          association: 'images',
          required: false
        },
        {
          association: 'marketplaceListings',
          required: false
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Get product failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching product'
    });
  }
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    const product = await Product.create(req.body);
    
    logger.info(`Product created: ${product.name} by user ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Create product failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    logger.info(`Product updated: ${product.name} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Update product failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await product.deleteOne();

    logger.info(`Product deleted: ${product.name} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting product'
    });
  }
});

// @desc    Sync product to marketplaces
// @route   POST /api/v1/products/:id/sync
// @access  Private
router.post('/:id/sync', protect, async (req, res) => {
  try {
    const { marketplaces } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Default to all active marketplaces if not specified
    const targetMarketplaces = marketplaces || 
      product.marketplaceSettings
        .filter(setting => setting.isActive)
        .map(setting => setting.marketplace);

    if (targetMarketplaces.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active marketplaces found for this product'
      });
    }

    // Sync to marketplaces
    const results = await adapterManager.syncProductToMarketplaces(
      req.user.id,
      product,
      targetMarketplaces
    );

    logger.info(`Product sync initiated: ${product.name} to ${targetMarketplaces.join(', ')}`);
    res.status(200).json({
      success: true,
      message: 'Product sync initiated',
      results
    });
  } catch (error) {
    logger.error('Product sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during product sync'
    });
  }
});

// @desc    Update product stock
// @route   PUT /api/v1/products/:id/stock
// @access  Private
router.put('/:id/stock', protect, async (req, res) => {
  try {
    const { variants, syncToMarketplaces = true } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Update variant stocks
    if (variants && Array.isArray(variants)) {
      variants.forEach(({ variantId, stock }) => {
        const variant = product.variants.id(variantId);
        if (variant) {
          variant.stock = stock;
        }
      });
    }

    await product.save();

    // Sync to marketplaces if requested
    let syncResults = {};
    if (syncToMarketplaces) {
      const activeMarketplaces = product.marketplaceSettings
        .filter(setting => setting.isActive)
        .map(setting => setting.marketplace);

      if (activeMarketplaces.length > 0) {
        // Update stock for each variant in each marketplace
        for (const variant of variants) {
          const variantFromDb = product.variants.id(variant.variantId);
          if (variantFromDb) {
            const results = await adapterManager.updateStockAcrossMarketplaces(
              req.user.id,
              variantFromDb.sku,
              variant.stock,
              activeMarketplaces
            );
            syncResults[variantFromDb.sku] = results;
          }
        }
      }
    }

    logger.info(`Product stock updated: ${product.name} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: product,
      syncResults: syncToMarketplaces ? syncResults : undefined
    });
  } catch (error) {
    logger.error('Update stock failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating stock'
    });
  }
});

// @desc    Update product prices
// @route   PUT /api/v1/products/:id/price
// @access  Private
router.put('/:id/price', protect, async (req, res) => {
  try {
    const { basePrice, variants, syncToMarketplaces = true } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Update base price
    if (basePrice !== undefined) {
      product.basePrice = basePrice;
    }

    // Update variant prices
    if (variants && Array.isArray(variants)) {
      variants.forEach(({ variantId, price, discountedPrice }) => {
        const variant = product.variants.id(variantId);
        if (variant) {
          if (price !== undefined) variant.price = price;
          if (discountedPrice !== undefined) variant.discountedPrice = discountedPrice;
        }
      });
    }

    await product.save();

    // Sync to marketplaces if requested
    let syncResults = {};
    if (syncToMarketplaces) {
      const activeMarketplaces = product.marketplaceSettings
        .filter(setting => setting.isActive)
        .map(setting => setting.marketplace);

      if (activeMarketplaces.length > 0) {
        // Update price for each variant in each marketplace
        for (const variant of variants || []) {
          const variantFromDb = product.variants.id(variant.variantId);
          if (variantFromDb) {
            const results = await adapterManager.updatePriceAcrossMarketplaces(
              req.user.id,
              variantFromDb.sku,
              variant.price,
              activeMarketplaces
            );
            syncResults[variantFromDb.sku] = results;
          }
        }
      }
    }

    logger.info(`Product price updated: ${product.name} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Price updated successfully',
      data: product,
      syncResults: syncToMarketplaces ? syncResults : undefined
    });
  } catch (error) {
    logger.error('Update price failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating price'
    });
  }
});

// @desc    Get product statistics
// @route   GET /api/v1/products/stats
// @access  Private
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalProducts,
      activeProducts,
      draftProducts,
      lowStockProducts,
      outOfStockProducts,
      recentProducts
    ] = await Promise.all([
      Product.countDocuments({ user: userId }),
      Product.countDocuments({ user: userId, status: 'active' }),
      Product.countDocuments({ user: userId, status: 'draft' }),
      Product.countDocuments({ 
        user: userId, 
        'inventory.stockStatus': 'low_stock' 
      }),
      Product.countDocuments({ 
        user: userId, 
        'inventory.stockStatus': 'out_of_stock' 
      }),
      Product.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name status totalStock createdAt')
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        draftProducts,
        lowStockProducts,
        outOfStockProducts,
        recentProducts
      }
    });
  } catch (error) {
    logger.error('Get product stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching product statistics'
    });
  }
});

// @desc    Bulk operations
// @route   POST /api/v1/products/bulk
// @access  Private
router.post('/bulk', protect, async (req, res) => {
  try {
    const { operation, productIds, data } = req.body;

    if (!operation || !productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        error: 'Operation and product IDs are required'
      });
    }

    // Find products
    const products = await Product.find({
      _id: { $in: productIds },
      user: req.user.id
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No products found'
      });
    }

    let results = {};

    switch (operation) {
      case 'updateStatus':
        await Product.updateMany(
          { _id: { $in: productIds }, user: req.user.id },
          { status: data.status }
        );
        results.message = `Status updated to ${data.status} for ${products.length} products`;
        break;

      case 'updateCategory':
        await Product.updateMany(
          { _id: { $in: productIds }, user: req.user.id },
          { 'category.name': data.category }
        );
        results.message = `Category updated to ${data.category} for ${products.length} products`;
        break;

      case 'syncToMarketplace':
        const syncResults = {};
        for (const product of products) {
          try {
            const result = await adapterManager.syncProductToMarketplaces(
              req.user.id,
              product,
              data.marketplaces
            );
            syncResults[product._id] = result;
          } catch (error) {
            syncResults[product._id] = { error: error.message };
          }
        }
        results = { syncResults };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid operation'
        });
    }

    logger.info(`Bulk operation ${operation} completed for ${products.length} products by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Bulk operation completed',
      affectedProducts: products.length,
      results
    });
  } catch (error) {
    logger.error('Bulk operation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during bulk operation'
    });
  }
});

// @desc    Match products across all platforms  
// @route   POST /api/v1/products/match-platforms
// @access  Private
router.post('/match-platforms', protect, async (req, res) => {
  try {
    const {
      marketplaces,
      strictMatching = false,
      similarityThreshold = 0.85,
      ignoreBrand = false
    } = req.body;

    const matcher = new MultiPlatformProductMatcher();
    
    logger.info(`Starting multi-platform product matching for user ${req.user.id}`);

    // Ürünleri eşleştir
    const matchingResults = await matcher.matchAllPlatformProducts(
      req.user.id,
      {
        marketplaces,
        strictMatching,
        similarityThreshold,
        ignoreBrand
      }
    );

    res.status(200).json({
      success: true,
      message: 'Multi-platform product matching completed',
      data: matchingResults
    });

  } catch (error) {
    logger.error('Multi-platform matching failed:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-platform product matching failed',
      details: error.message
    });
  }
});

// @desc    Save matched products to database
// @route   POST /api/v1/products/match-platforms/save
// @access  Private  
router.post('/match-platforms/save', protect, async (req, res) => {
  try {
    const {
      matchingResults,
      overwriteExisting = false,
      createMissingCategories = true,
      saveUnmatched = true
    } = req.body;

    if (!matchingResults) {
      return res.status(400).json({
        success: false,
        error: 'Matching results are required'
      });
    }

    const matcher = new MultiPlatformProductMatcher();
    
    logger.info(`Saving matched products to database for user ${req.user.id}`);

    // Eşleştirilen ürünleri veritabanına kaydet
    const saveResults = await matcher.saveMatchedProductsToDatabase(
      req.user.id,
      matchingResults,
      {
        overwriteExisting,
        createMissingCategories
      }
    );

    res.status(200).json({
      success: true,
      message: 'Matched products saved to database successfully',
      data: saveResults
    });

  } catch (error) {
    logger.error('Saving matched products failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save matched products to database',
      details: error.message
    });
  }
});

// @desc    Get platform product matching status
// @route   GET /api/v1/products/match-platforms/status
// @access  Private
router.get('/match-platforms/status', protect, async (req, res) => {
  try {
    const matcher = new MultiPlatformProductMatcher();
    
    // Kullanıcının mevcut ürünlerini al
    const existingProducts = await Product.findAll({
      where: { 
        user_id: req.user.id,
        is_active: true 
      },
      include: ['marketplaceListings']
    });

    // Platform başına ürün sayıları
    const platformCounts = {};
    const supportedMarketplaces = matcher.getSupportedMarketplaces();
    
    for (const marketplace of supportedMarketplaces) {
      try {
        const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
        const productsResponse = await adapter.getProducts({ limit: 1, page: 0 });
        platformCounts[marketplace] = productsResponse.totalCount || productsResponse.products?.length || 0;
      } catch (error) {
        platformCounts[marketplace] = 0;
      }
    }

    // Veritabanındaki ürün istatistikleri
    const dbStats = {
      totalProducts: existingProducts.length,
      productsByPlatform: {},
      unmatchedProducts: 0
    };

    existingProducts.forEach(product => {
      if (product.marketplaceListings) {
        product.marketplaceListings.forEach(listing => {
          if (!dbStats.productsByPlatform[listing.marketplace]) {
            dbStats.productsByPlatform[listing.marketplace] = 0;
          }
          dbStats.productsByPlatform[listing.marketplace]++;
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        supportedMarketplaces,
        platformCounts,
        databaseStats: dbStats,
        lastChecked: new Date(),
        recommendations: generateStatusRecommendations(platformCounts, dbStats)
      }
    });

  } catch (error) {
    logger.error('Get matching status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform matching status',
      details: error.message
    });
  }
});

// @desc    Match and save products in one operation
// @route   POST /api/v1/products/match-platforms/auto
// @access  Private
router.post('/match-platforms/auto', protect, async (req, res) => {
  try {
    const {
      marketplaces,
      strictMatching = false,
      similarityThreshold = 0.85,
      ignoreBrand = false,
      overwriteExisting = false,
      saveUnmatched = true
    } = req.body;

    const matcher = new MultiPlatformProductMatcher();
    
    logger.info(`Starting auto match and save for user ${req.user.id}`);

    // 1. Ürünleri eşleştir
    const matchingResults = await matcher.matchAllPlatformProducts(
      req.user.id,
      {
        marketplaces,
        strictMatching,
        similarityThreshold,
        ignoreBrand
      }
    );

    // 2. Veritabanına kaydet
    const saveResults = await matcher.saveMatchedProductsToDatabase(
      req.user.id,
      matchingResults.matching,
      {
        overwriteExisting,
        createMissingCategories: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Auto match and save completed successfully',
      data: {
        matching: matchingResults,
        saving: saveResults,
        summary: {
          totalProcessed: matchingResults.summary.totalProducts,
          productsSaved: saveResults.savedProducts,
          productsSkipped: saveResults.skippedProducts,
          errors: saveResults.errors.length,
          matchRate: matchingResults.summary.matchRate
        }
      }
    });

  } catch (error) {
    logger.error('Auto match and save failed:', error);
    res.status(500).json({
      success: false,
      error: 'Auto match and save operation failed',
      details: error.message
    });
  }
});

// @desc    Get supported marketplaces for matching
// @route   GET /api/v1/products/match-platforms/marketplaces
// @access  Private
router.get('/match-platforms/marketplaces', protect, async (req, res) => {
  try {
    const matcher = new MultiPlatformProductMatcher();
    const supportedMarketplaces = matcher.getSupportedMarketplaces();

    // Her marketplace için bağlantı durumunu kontrol et
    const marketplaceStatus = {};
    for (const marketplace of supportedMarketplaces) {
      try {
        const adapter = await adapterManager.getAdapter(req.user.id, marketplace);
        marketplaceStatus[marketplace] = {
          connected: true,
          hasCredentials: true
        };
      } catch (error) {
        marketplaceStatus[marketplace] = {
          connected: false,
          hasCredentials: false,
          error: error.message
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        supportedMarketplaces,
        marketplaceStatus,
        connectedCount: Object.values(marketplaceStatus).filter(status => status.connected).length,
        totalCount: supportedMarketplaces.length
      }
    });

  } catch (error) {
    logger.error('Get supported marketplaces failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported marketplaces',
      details: error.message
    });
  }
});

// Helper function for status recommendations
function generateStatusRecommendations(platformCounts, dbStats) {
  const recommendations = [];

  // Platform bağlantısı kontrolü
  const disconnectedPlatforms = Object.entries(platformCounts)
    .filter(([, count]) => count === 0)
    .map(([platform]) => platform);

  if (disconnectedPlatforms.length > 0) {
    recommendations.push({
      type: 'connect_platforms',
      priority: 'high',
      message: `${disconnectedPlatforms.join(', ')} platformlarına bağlanın`,
      action: 'Configure marketplace credentials'
    });
  }

  // Eşleştirme önerisi
  const totalPlatformProducts = Object.values(platformCounts).reduce((sum, count) => sum + count, 0);
  const totalDbProducts = dbStats.totalProducts;

  if (totalPlatformProducts > totalDbProducts * 1.2) {
    recommendations.push({
      type: 'run_matching',
      priority: 'medium',
      message: 'Yeni ürünler tespit edildi, eşleştirme çalıştırın',
      action: 'POST /api/v1/products/match-platforms/auto'
    });
  }

  // Veri kalitesi kontrolü
  const platformsWithProducts = Object.values(platformCounts).filter(count => count > 0).length;
  if (platformsWithProducts >= 2 && totalDbProducts === 0) {
    recommendations.push({
      type: 'initial_setup',
      priority: 'high',
      message: 'İlk ürün eşleştirmenizi yapın',
      action: 'POST /api/v1/products/match-platforms/auto'
    });
  }

  return recommendations;
}

module.exports = router; 