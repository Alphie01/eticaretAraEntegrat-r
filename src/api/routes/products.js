const express = require('express');
const { Product } = require('../../models/Product');
const { protect, authorize } = require('../../middleware/auth');
const adapterManager = require('../../core/AdapterManager');
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

module.exports = router; 