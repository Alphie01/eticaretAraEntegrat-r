const Product = require('../../models/Product');
const Order = require('../../models/Order');
const SyncLog = require('../../models/SyncLog');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const reportGenerationProcessor = async (job) => {
  const { userId, reportType, parameters, format = 'json' } = job.data;
  
  try {
    logger.info(`Starting report generation job for user ${userId}: ${reportType}`);
    job.progress(10);

    const { startDate, endDate, marketplace, ...otherParams } = parameters || {};

    // Build base query
    const baseQuery = { user: userId };
    
    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    if (marketplace) {
      baseQuery['marketplace.name'] = marketplace;
    }

    job.progress(20);

    let reportData;
    let filename;

    switch (reportType) {
      case 'sales':
        reportData = await generateSalesReport(baseQuery, otherParams, job);
        filename = `sales_report_${userId}_${Date.now()}`;
        break;
        
      case 'products':
        reportData = await generateProductsReport(baseQuery, otherParams, job);
        filename = `products_report_${userId}_${Date.now()}`;
        break;
        
      case 'inventory':
        reportData = await generateInventoryReport({ user: userId }, otherParams, job);
        filename = `inventory_report_${userId}_${Date.now()}`;
        break;
        
      case 'financial':
        reportData = await generateFinancialReport(baseQuery, otherParams, job);
        filename = `financial_report_${userId}_${Date.now()}`;
        break;
        
      case 'sync-performance':
        reportData = await generateSyncReport(baseQuery, otherParams, job);
        filename = `sync_report_${userId}_${Date.now()}`;
        break;
        
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    job.progress(90);

    // Save report to file system
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, `${filename}.${format}`);
    
    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
    } else if (format === 'csv') {
      const csvData = convertToCSV(reportData);
      await fs.writeFile(filePath, csvData);
    }

    job.progress(100);

    logger.info(`Report generation completed for user ${userId}: ${reportType}`);

    return {
      success: true,
      reportType,
      filename: `${filename}.${format}`,
      filePath,
      recordCount: Array.isArray(reportData.data) ? reportData.data.length : 0,
      generatedAt: new Date()
    };

  } catch (error) {
    logger.error(`Report generation failed for user ${userId}:`, error);
    throw error;
  }
};

// Report generation functions
const generateSalesReport = async (query, params, job) => {
  const orders = await Order.find(query)
    .populate('items.product', 'name category brand')
    .sort({ createdAt: -1 });
  
  job.progress(60);

  // Calculate summary statistics
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + order.pricing.total, 0),
    avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.pricing.total, 0) / orders.length : 0,
    totalItems: orders.reduce((sum, order) => sum + order.items.length, 0)
  };

  return {
    type: 'sales',
    summary,
    data: orders,
    generatedAt: new Date()
  };
};

const generateProductsReport = async (query, params, job) => {
  const products = await Product.find({ user: query.user })
    .sort({ createdAt: -1 });
  
  job.progress(60);

  // Get sales data for products
  const productSales = await Order.aggregate([
    { $match: query },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.totalPrice' }
      }
    }
  ]);

  // Merge sales data with products
  const productsWithSales = products.map(product => {
    const salesData = productSales.find(s => s._id?.toString() === product._id.toString());
    return {
      ...product.toObject(),
      salesData: salesData || { totalSold: 0, totalRevenue: 0 }
    };
  });

  return {
    type: 'products',
    summary: {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'active').length,
      totalStock: products.reduce((sum, p) => sum + p.totalStock, 0)
    },
    data: productsWithSales,
    generatedAt: new Date()
  };
};

const generateInventoryReport = async (query, params, job) => {
  const products = await Product.find(query);
  
  job.progress(60);

  const lowStockProducts = products.filter(p => p.inventory.stockStatus === 'low_stock');
  const outOfStockProducts = products.filter(p => p.inventory.stockStatus === 'out_of_stock');

  return {
    type: 'inventory',
    summary: {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalStockValue: products.reduce((sum, p) => sum + (p.totalStock * p.basePrice), 0)
    },
    data: {
      allProducts: products,
      lowStockProducts,
      outOfStockProducts
    },
    generatedAt: new Date()
  };
};

const generateFinancialReport = async (query, params, job) => {
  const orders = await Order.find(query);
  
  job.progress(60);

  const totalRevenue = orders.reduce((sum, order) => sum + order.pricing.total, 0);
  const totalShipping = orders.reduce((sum, order) => sum + order.pricing.shipping, 0);
  const totalTax = orders.reduce((sum, order) => sum + order.pricing.tax, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.pricing.discount, 0);

  // Group by month
  const monthlyData = orders.reduce((acc, order) => {
    const month = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { revenue: 0, orders: 0 };
    }
    acc[month].revenue += order.pricing.total;
    acc[month].orders += 1;
    return acc;
  }, {});

  return {
    type: 'financial',
    summary: {
      totalRevenue,
      totalShipping,
      totalTax,
      totalDiscount,
      netRevenue: totalRevenue - totalDiscount,
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
    },
    data: {
      orders,
      monthlyTrend: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }))
    },
    generatedAt: new Date()
  };
};

const generateSyncReport = async (query, params, job) => {
  const syncLogs = await SyncLog.find(query).sort({ createdAt: -1 });
  
  job.progress(60);

  const summary = {
    totalSyncs: syncLogs.length,
    successfulSyncs: syncLogs.filter(log => log.status === 'success').length,
    failedSyncs: syncLogs.filter(log => log.status === 'error').length,
    avgExecutionTime: syncLogs.reduce((sum, log) => sum + log.executionTime, 0) / syncLogs.length || 0
  };

  // Group by operation
  const operationStats = syncLogs.reduce((acc, log) => {
    if (!acc[log.operation]) {
      acc[log.operation] = { total: 0, success: 0, failed: 0 };
    }
    acc[log.operation].total += 1;
    if (log.status === 'success') acc[log.operation].success += 1;
    if (log.status === 'error') acc[log.operation].failed += 1;
    return acc;
  }, {});

  return {
    type: 'sync-performance',
    summary,
    data: {
      logs: syncLogs,
      operationStats: Object.entries(operationStats).map(([operation, stats]) => ({
        operation,
        ...stats,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0
      }))
    },
    generatedAt: new Date()
  };
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  // Simple CSV conversion - can be enhanced
  if (!Array.isArray(data.data)) {
    return JSON.stringify(data);
  }

  const headers = Object.keys(data.data[0] || {});
  const csvRows = [headers.join(',')];
  
  data.data.forEach(item => {
    const values = headers.map(header => {
      const value = item[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

module.exports = reportGenerationProcessor; 