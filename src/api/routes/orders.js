const express = require('express');
const { Order } = require('../../models/Order');
const { protect, authorize } = require('../../middleware/auth');
const adapterManager = require('../../core/AdapterManager');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');
const rateLimiter = require('../../middleware/rateLimiter');

const router = express.Router();

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
router.get('/', protect, rateLimiter(20, 60), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      fulfillmentStatus,
      marketplace,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build Sequelize where clause
    const where = { user_id: req.user.id };
    
    if (search) {
      where[Op.or] = [
        { order_number: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
        { customer_email: { [Op.iLike]: `%${search}%` } },
        { marketplace_order_id: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) where.status = status;
    if (paymentStatus) where.payment_status = paymentStatus;
    if (marketplace) where.marketplace_name = marketplace;
    
    if (startDate || endDate) {
      const dateCondition = {};
      if (startDate) dateCondition[Op.gte] = new Date(startDate);
      if (endDate) dateCondition[Op.lte] = new Date(endDate);
      if (Object.keys(dateCondition).length > 0) {
        where.created_at = dateCondition;
      }
    }

    // Execute query with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      order,
      offset,
      limit: parseInt(limit),
      include: [
        {
          association: 'user',
          attributes: ['name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: orders
    });
  } catch (error) {
    logger.error('Get orders failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching orders'
    });
  }
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('user', 'name email')
    .populate('items.product', 'name images brand');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching order'
    });
  }
});

// @desc    Create new order (mainly for manual orders)
// @route   POST /api/v1/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    const order = await Order.create(req.body);
    
    logger.info(`Order created: ${order.orderNumber} by user ${req.user.email}`);
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Create order failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update order
// @route   PUT /api/v1/orders/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    logger.info(`Order updated: ${order.orderNumber} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Update order failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, note, trackingInfo, syncToMarketplace = true } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status
    order.updateStatus(status, note, req.user.name);

    // Update tracking info if provided
    if (trackingInfo) {
      if (trackingInfo.trackingNumber) {
        order.shipping.trackingNumber = trackingInfo.trackingNumber;
      }
      if (trackingInfo.carrierCode) {
        order.shipping.carrierCode = trackingInfo.carrierCode;
      }
      if (trackingInfo.estimatedDelivery) {
        order.shipping.estimatedDelivery = trackingInfo.estimatedDelivery;
      }
    }

    await order.save();

    // Sync status to marketplace if requested
    let syncResult = null;
    if (syncToMarketplace && order.marketplace.name !== 'website') {
      try {
        const adapter = await adapterManager.getAdapter(req.user.id, order.marketplace.name);
        syncResult = await adapter.updateOrderStatus(
          order.marketplace.orderId,
          status,
          trackingInfo || {}
        );
      } catch (error) {
        logger.error(`Failed to sync order status to ${order.marketplace.name}:`, error);
        syncResult = { error: error.message };
      }
    }

    logger.info(`Order status updated: ${order.orderNumber} to ${status} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
      syncResult
    });
  } catch (error) {
    logger.error('Update order status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating order status'
    });
  }
});

// @desc    Add note to order
// @route   POST /api/v1/orders/:id/notes
// @access  Private
router.post('/:id/notes', protect, async (req, res) => {
  try {
    const { note, isPrivate = false } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    order.notes.push({
      note,
      isPrivate,
      createdBy: req.user.name
    });

    await order.save();

    logger.info(`Note added to order: ${order.orderNumber} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: order
    });
  } catch (error) {
    logger.error('Add order note failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while adding note'
    });
  }
});

// @desc    Cancel order
// @route   POST /api/v1/orders/:id/cancel
// @access  Private
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason, refundAmount } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled in current status'
      });
    }

    // Update order
    order.status = 'cancelled';
    order.cancellation = {
      reason,
      cancelledBy: req.user.name,
      cancelledAt: new Date(),
      refundAmount
    };

    order.updateStatus('cancelled', `Order cancelled: ${reason}`, req.user.name);
    await order.save();

    // TODO: Sync cancellation to marketplace
    // TODO: Process refund if needed

    logger.info(`Order cancelled: ${order.orderNumber} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Cancel order failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while cancelling order'
    });
  }
});

// @desc    Request refund
// @route   POST /api/v1/orders/:id/refund
// @access  Private
router.post('/:id/refund', protect, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (!order.canBeRefunded()) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be refunded in current status'
      });
    }

    // Add refund request
    order.refunds.push({
      amount,
      reason,
      status: 'pending'
    });

    await order.save();

    logger.info(`Refund requested for order: ${order.orderNumber} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Refund request submitted',
      data: order
    });
  } catch (error) {
    logger.error('Request refund failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while requesting refund'
    });
  }
});

// @desc    Import orders from marketplaces
// @route   POST /api/v1/orders/import
// @access  Private
router.post('/import', protect, async (req, res) => {
  try {
    const { marketplaces, startDate, endDate } = req.body;

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Import orders from specified marketplaces or all active ones
    const targetMarketplaces = marketplaces || 
      req.user.marketplaceAccounts
        .filter(acc => acc.isActive)
        .map(acc => acc.marketplace);

    const results = await adapterManager.importOrdersFromMarketplaces(
      req.user.id,
      params
    );

    // Save imported orders to database
    const savedOrders = [];
    for (const [marketplace, result] of Object.entries(results)) {
      if (result.success && result.data.orders) {
        for (const orderData of result.data.orders) {
          try {
            // Check if order already exists
            const existingOrder = await Order.findOne({
              user: req.user.id,
              'marketplace.name': marketplace,
              'marketplace.orderId': orderData.marketplace.orderId
            });

            if (!existingOrder) {
              const order = new Order({
                ...orderData,
                user: req.user.id
              });
              
              order.calculateTotals();
              await order.save();
              savedOrders.push(order);
            }
          } catch (error) {
            logger.error(`Failed to save order from ${marketplace}:`, error);
          }
        }
      }
    }

    logger.info(`Orders imported: ${savedOrders.length} new orders by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      message: 'Order import completed',
      newOrders: savedOrders.length,
      results
    });
  } catch (error) {
    logger.error('Import orders failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during order import'
    });
  }
});

// @desc    Get order statistics
// @route   GET /api/v1/orders/stats
// @access  Private
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      todayOrders,
      monthlyOrders,
      monthlyRevenue,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.countDocuments({ user: userId, status: 'pending' }),
      Order.countDocuments({ user: userId, status: 'shipped' }),
      Order.countDocuments({ user: userId, status: 'delivered' }),
      Order.countDocuments({ 
        user: userId, 
        createdAt: { $gte: startOfDay } 
      }),
      Order.countDocuments({ 
        user: userId, 
        createdAt: { $gte: startOfMonth } 
      }),
      Order.aggregate([
        {
          $match: { 
            user: userId, 
            createdAt: { $gte: startOfMonth },
            status: { $in: ['delivered', 'shipped'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' }
          }
        }
      ]),
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status pricing.total marketplace.name createdAt')
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        todayOrders,
        monthlyOrders,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        recentOrders
      }
    });
  } catch (error) {
    logger.error('Get order stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching order statistics'
    });
  }
});

// @desc    Get orders by status distribution
// @route   GET /api/v1/orders/status-distribution
// @access  Private
router.get('/status-distribution', protect, async (req, res) => {
  try {
    const statusDistribution = await Order.aggregate([
      { $match: { user: req.user.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: statusDistribution
    });
  } catch (error) {
    logger.error('Get status distribution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching status distribution'
    });
  }
});

/**
 * @route GET /api/v1/orders/recent
 * @desc Son siparişleri getir
 * @access Private
 */
router.get('/recent', protect, rateLimiter(30, 60), async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        logger.info(`Recent orders request with limit: ${limit} by user: ${req.user?.id || 'anonymous'}`);
        
        // Mock data - gerçek implementasyon için veritabanından çekilecek
        const recentOrders = [
            { id: '#12345', platform: 'Trendyol', amount: '₺245', status: 'delivered', time: '2 saat önce' },
            { id: '#12344', platform: 'Hepsiburada', amount: '₺189', status: 'shipped', time: '4 saat önce' },
            { id: '#12343', platform: 'Amazon', amount: '₺456', status: 'processing', time: '6 saat önce' },
            { id: '#12342', platform: 'N11', amount: '₺129', status: 'pending', time: '8 saat önce' },
            { id: '#12341', platform: 'Shopify', amount: '₺78', status: 'delivered', time: '1 gün önce' },
            { id: '#12340', platform: 'ÇiçekSepeti', amount: '₺345', status: 'shipped', time: '1 gün önce' },
            { id: '#12339', platform: 'Pazarama', amount: '₺567', status: 'processing', time: '2 gün önce' },
            { id: '#12338', platform: 'PTT AVM', amount: '₺234', status: 'delivered', time: '2 gün önce' },
            { id: '#12337', platform: 'Trendyol', amount: '₺890', status: 'shipped', time: '3 gün önce' },
            { id: '#12336', platform: 'Hepsiburada', amount: '₺123', status: 'pending', time: '3 gün önce' },
        ].slice(0, parseInt(limit));

        res.json({
            success: true,
            data: recentOrders
        });
    } catch (error) {
        logger.error('Recent orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Son siparişler alınamadı',
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/orders/test/recent
 * @desc Son siparişleri getir (Auth-free test)
 * @access Public
 */
router.get('/test/recent', rateLimiter(30, 60), async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        logger.info(`Recent orders test request with limit: ${limit} (no auth)`);
        
        // Mock data
        const recentOrders = [
            { id: '#12345', platform: 'Trendyol', amount: '₺245', status: 'delivered', time: '2 saat önce' },
            { id: '#12344', platform: 'Hepsiburada', amount: '₺189', status: 'shipped', time: '4 saat önce' },
            { id: '#12343', platform: 'Amazon', amount: '₺456', status: 'processing', time: '6 saat önce' },
            { id: '#12342', platform: 'N11', amount: '₺129', status: 'pending', time: '8 saat önce' },
            { id: '#12341', platform: 'Shopify', amount: '₺78', status: 'delivered', time: '1 gün önce' },
            { id: '#12340', platform: 'ÇiçekSepeti', amount: '₺345', status: 'shipped', time: '1 gün önce' },
            { id: '#12339', platform: 'Pazarama', amount: '₺567', status: 'processing', time: '2 gün önce' },
            { id: '#12338', platform: 'PTT AVM', amount: '₺234', status: 'delivered', time: '2 gün önce' },
            { id: '#12337', platform: 'Trendyol', amount: '₺890', status: 'shipped', time: '3 gün önce' },
            { id: '#12336', platform: 'Hepsiburada', amount: '₺123', status: 'pending', time: '3 gün önce' },
        ].slice(0, parseInt(limit));

        res.json({
            success: true,
            data: recentOrders
        });
    } catch (error) {
        logger.error('Recent orders test error:', error);
        res.status(500).json({
            success: false,
            message: 'Son siparişler alınamadı',
            error: error.message
        });
    }
});

module.exports = router; 