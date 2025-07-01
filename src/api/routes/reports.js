const express = require('express');
const { protect } = require('../../middleware/auth');
const { Product } = require('../../models/Product');
const { Order } = require('../../models/Order');
const { SyncLog } = require('../../models/SyncLog');
const logger = require('../../utils/logger');
const { getSequelize } = require('../../config/database');

const router = express.Router();

// @desc    Get sales report
// @route   GET /api/v1/reports/sales
// @access  Private
router.get('/sales', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      marketplace,
      groupBy = 'day'
    } = req.query;

    const userId = req.user.id;

    const sequelize = getSequelize();

    // Build WHERE conditions
    let whereConditions = [`user_id = :userId`];
    let replacements = { userId };

    // Date filter
    if (startDate) {
      whereConditions.push(`created_at >= :startDate`);
      replacements.startDate = startDate;
    }
    if (endDate) {
      whereConditions.push(`created_at <= :endDate`);
      replacements.endDate = endDate;
    }

    // Marketplace filter
    if (marketplace) {
      whereConditions.push(`marketplace_name = :marketplace`);
      replacements.marketplace = marketplace;
    }

    // Only completed orders
    whereConditions.push(`status IN ('delivered', 'shipped')`);

    const whereClause = whereConditions.join(' AND ');

    // Group by format for SQL
    let dateFormat, orderBy;
    switch (groupBy) {
      case 'hour':
        dateFormat = `FORMAT(created_at, 'yyyy-MM-dd HH')`;
        orderBy = `ORDER BY FORMAT(created_at, 'yyyy-MM-dd HH')`;
        break;
      case 'day':
        dateFormat = `FORMAT(created_at, 'yyyy-MM-dd')`;
        orderBy = `ORDER BY FORMAT(created_at, 'yyyy-MM-dd')`;
        break;
      case 'month':
        dateFormat = `FORMAT(created_at, 'yyyy-MM')`;
        orderBy = `ORDER BY FORMAT(created_at, 'yyyy-MM')`;
        break;
      case 'year':
        dateFormat = `FORMAT(created_at, 'yyyy')`;
        orderBy = `ORDER BY FORMAT(created_at, 'yyyy')`;
        break;
      default:
        dateFormat = `FORMAT(created_at, 'yyyy-MM-dd')`;
        orderBy = `ORDER BY FORMAT(created_at, 'yyyy-MM-dd')`;
    }

    // Get sales data grouped by period
    const salesData = await sequelize.query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as totalOrders,
        SUM(total_amount) as totalRevenue,
        AVG(total_amount) as avgOrderValue
      FROM orders 
      WHERE ${whereClause}
      GROUP BY ${dateFormat}
      ${orderBy}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Get summary statistics
    const summary = await sequelize.query(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total_amount) as totalRevenue,
        AVG(total_amount) as avgOrderValue
      FROM orders 
      WHERE ${whereClause}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        salesData,
        summary: summary[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get sales report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating sales report'
    });
  }
});

// @desc    Get product performance report
// @route   GET /api/v1/reports/products
// @access  Private
router.get('/products', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      limit = 20,
      sortBy = 'revenue'
    } = req.query;

    const userId = req.user.id;
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const productPerformance = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          avgPrice: { $avg: '$items.unitPrice' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $addFields: {
          currentStock: { $arrayElemAt: ['$productInfo.totalStock', 0] },
          status: { $arrayElemAt: ['$productInfo.status', 0] }
        }
      },
      {
        $sort: sortBy === 'quantity' ? { totalSold: -1 } : { totalRevenue: -1 }
      },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: productPerformance
    });
  } catch (error) {
    logger.error('Get product performance report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating product performance report'
    });
  }
});

// @desc    Get marketplace comparison report
// @route   GET /api/v1/reports/marketplace-comparison
// @access  Private
router.get('/marketplace-comparison', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    const userId = req.user.id;
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const marketplaceComparison = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$marketplace.name',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          avgOrderValue: { $avg: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get sync performance by marketplace
    const syncPerformance = await SyncLog.aggregate([
      { $match: { user: userId, ...matchQuery } },
      {
        $group: {
          _id: '$marketplace',
          totalSyncs: { $sum: 1 },
          successfulSyncs: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedSyncs: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          },
          avgExecutionTime: { $avg: '$executionTime' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        orderComparison: marketplaceComparison,
        syncPerformance
      }
    });
  } catch (error) {
    logger.error('Get marketplace comparison report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating marketplace comparison report'
    });
  }
});

// @desc    Get inventory report
// @route   GET /api/v1/reports/inventory
// @access  Private
router.get('/inventory', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      stockByCategory,
      topSellingProducts
    ] = await Promise.all([
      Product.countDocuments({ user: userId }),
      Product.countDocuments({ user: userId, status: 'active' }),
      Product.find({ 
        user: userId, 
        'inventory.stockStatus': 'low_stock' 
      }).select('name totalStock inventory.lowStockThreshold'),
      Product.find({ 
        user: userId, 
        'inventory.stockStatus': 'out_of_stock' 
      }).select('name totalStock'),
      Product.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$category.name',
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$totalStock' },
            avgStock: { $avg: '$totalStock' }
          }
        },
        { $sort: { totalProducts: -1 } }
      ]),
      Order.aggregate([
        { $match: { user: userId } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.name' },
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          activeProducts,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length
        },
        lowStockProducts,
        outOfStockProducts,
        stockByCategory,
        topSellingProducts
      }
    });
  } catch (error) {
    logger.error('Get inventory report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating inventory report'
    });
  }
});

// @desc    Get financial summary
// @route   GET /api/v1/reports/financial
// @access  Private
router.get('/financial', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    const userId = req.user.id;
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const financialSummary = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          totalShipping: { $sum: '$pricing.shipping' },
          totalTax: { $sum: '$pricing.tax' },
          totalDiscount: { $sum: '$pricing.discount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      }
    ]);

    // Revenue by payment status
    const revenueByPaymentStatus = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentStatus',
          totalRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: financialSummary[0] || {
          totalRevenue: 0,
          totalShipping: 0,
          totalTax: 0,
          totalDiscount: 0,
          totalOrders: 0,
          avgOrderValue: 0
        },
        revenueByPaymentStatus,
        monthlyTrend: monthlyRevenue
      }
    });
  } catch (error) {
    logger.error('Get financial report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating financial report'
    });
  }
});

// @desc    Get sync performance report
// @route   GET /api/v1/reports/sync-performance
// @access  Private
router.get('/sync-performance', protect, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      marketplace
    } = req.query;

    const userId = req.user.id;
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    if (marketplace) {
      matchQuery.marketplace = marketplace;
    }

    const [
      syncSummary,
      syncByOperation,
      syncTrend,
      errorAnalysis
    ] = await Promise.all([
      SyncLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSyncs: { $sum: 1 },
            successfulSyncs: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failedSyncs: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
            },
            avgExecutionTime: { $avg: '$executionTime' }
          }
        }
      ]),
      SyncLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$operation',
            count: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            avgExecutionTime: { $avg: '$executionTime' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      SyncLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            totalSyncs: { $sum: 1 },
            successfulSyncs: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      SyncLog.aggregate([
        { $match: { ...matchQuery, status: 'error' } },
        {
          $group: {
            _id: '$error.code',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$createdAt' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: syncSummary[0] || {
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          avgExecutionTime: 0
        },
        syncByOperation,
        syncTrend,
        errorAnalysis
      }
    });
  } catch (error) {
    logger.error('Get sync performance report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating sync performance report'
    });
  }
});

// @desc    Export report data
// @route   GET /api/v1/reports/export
// @access  Private
router.get('/export', protect, async (req, res) => {
  try {
    const {
      type,
      format = 'json',
      startDate,
      endDate
    } = req.query;

    // Validate export type
    const validTypes = ['sales', 'products', 'orders', 'inventory'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export type'
      });
    }

    const userId = req.user.id;
    const matchQuery = { user: userId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    let data;
    let filename;

    switch (type) {
      case 'sales':
        data = await Order.find(matchQuery).populate('items.product', 'name');
        filename = `sales_report_${Date.now()}`;
        break;
      case 'products':
        data = await Product.find(matchQuery);
        filename = `products_report_${Date.now()}`;
        break;
      case 'orders':
        data = await Order.find(matchQuery).populate('items.product', 'name');
        filename = `orders_report_${Date.now()}`;
        break;
      case 'inventory':
        data = await Product.find(matchQuery).select('name totalStock inventory');
        filename = `inventory_report_${Date.now()}`;
        break;
    }

    if (format === 'csv') {
      // TODO: Implement CSV export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    }

    logger.info(`Report exported: ${type} by user ${req.user.email}`);
    res.status(200).json({
      success: true,
      data,
      meta: {
        type,
        exportDate: new Date(),
        recordCount: data.length
      }
    });
  } catch (error) {
    logger.error('Export report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while exporting report'
    });
  }
});

module.exports = router; 