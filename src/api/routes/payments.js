const express = require('express');
const { protect } = require('../../middleware/auth');
const { Payment } = require('../../models/Payment');
const { PayTRTransaction } = require('../../models/PayTRTransaction');
const { Order } = require('../../models/Order');
const { OrderItem } = require('../../models/OrderItem');
const PayTRService = require('../../services/PayTRService');
const logger = require('../../utils/logger');
const rateLimiter = require('../../middleware/rateLimiter');
const { Op } = require('sequelize');

const router = express.Router();
const paytrService = new PayTRService();

// @desc    Create a new payment
// @route   POST /api/v1/payments/create
// @access  Private
router.post('/create', protect, rateLimiter(5, 60), async (req, res) => {
  try {
    const {
      orderId,
      successUrl,
      failUrl,
      installmentOptions = {}
    } = req.body;

    if (!orderId || !successUrl || !failUrl) {
      return res.status(400).json({
        success: false,
        message: 'orderId, successUrl, and failUrl are required'
      });
    }

    // Find the order
    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: req.user.id
      },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Get user IP
    const userIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

    // Prepare order data for PayTR
    const orderData = {
      orderId: order.id,
      amount: parseFloat(order.total_amount),
      currency: order.currency || 'TRY',
      customerEmail: req.user.email,
      customerName: `${req.user.first_name} ${req.user.last_name}`,
      customerPhone: req.user.phone || '',
      customerAddress: req.user.address || '',
      userIp: userIp,
      successUrl: successUrl,
      failUrl: failUrl,
      orderItems: order.items.map(item => ({
        product_name: item.product_name,
        unit_price: parseFloat(item.unit_price),
        quantity: item.quantity
      })),
      installmentOptions: installmentOptions
    };

    // Create payment with PayTR
    const paymentResult = await paytrService.createPayment(orderData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: paymentResult
    });

  } catch (error) {
    logger.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment creation failed'
    });
  }
});

// @desc    PayTR webhook handler
// @route   POST /api/v1/payments/paytr/webhook
// @access  Public (but verified by hash)
router.post('/paytr/webhook', async (req, res) => {
  try {
    logger.info('PayTR webhook received:', req.body);

    // Handle webhook
    const result = await paytrService.handleWebhook(req.body);

    if (result.success) {
      // PayTR expects "OK" response for successful webhooks
      res.status(200).send('OK');
    } else {
      res.status(400).send('FAIL');
    }

  } catch (error) {
    logger.error('PayTR webhook error:', error);
    res.status(400).send('FAIL');
  }
});

// @desc    Get payment status
// @route   GET /api/v1/payments/:paymentId/status
// @access  Private
router.get('/:paymentId/status', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Check if user owns this payment
    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        user_id: req.user.id
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const paymentStatus = await paytrService.getPaymentStatus(paymentId);

    res.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    logger.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment status'
    });
  }
});

// @desc    Get all payments for user
// @route   GET /api/v1/payments
// @access  Private
router.get('/', protect, rateLimiter(20, 60), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      gateway,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const where = { user_id: req.user.id };
    
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;
    
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

    const payments = await Payment.findAndCountAll({
      where,
      include: [{
        model: Order,
        as: 'order',
        attributes: ['id', 'order_number', 'marketplace_name']
      }],
      limit: parseInt(limit),
      offset: offset,
      order: order
    });

    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments: payments.rows,
        pagination: {
          total: payments.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(payments.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payments'
    });
  }
});

// @desc    Get payment details
// @route   GET /api/v1/payments/:paymentId
// @access  Private
router.get('/:paymentId', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        user_id: req.user.id
      },
      include: [
        {
          model: Order,
          as: 'order',
          include: [{
            model: OrderItem,
            as: 'items'
          }]
        },
        {
          model: PayTRTransaction,
          as: 'paytr_transaction'
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    logger.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment details'
    });
  }
});

// @desc    Refund a payment
// @route   POST /api/v1/payments/:paymentId/refund
// @access  Private
router.post('/:paymentId/refund', protect, rateLimiter(3, 300), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount, reason } = req.body;

    // Check if user owns this payment
    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        user_id: req.user.id
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const refundResult = await paytrService.refundPayment(paymentId, refundAmount, reason);

    res.json({
      success: true,
      message: 'Refund request processed successfully',
      data: refundResult
    });

  } catch (error) {
    logger.error('Payment refund error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Refund failed'
    });
  }
});

// @desc    Cancel a pending payment
// @route   POST /api/v1/payments/:paymentId/cancel
// @access  Private
router.post('/:paymentId/cancel', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    // Check if user owns this payment
    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        user_id: req.user.id
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const cancelResult = await paytrService.cancelPayment(paymentId, reason);

    res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: cancelResult
    });

  } catch (error) {
    logger.error('Payment cancellation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment cancellation failed'
    });
  }
});

// @desc    Get payment statistics
// @route   GET /api/v1/payments/statistics/summary
// @access  Private
router.get('/statistics/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
    }

    const whereClause = { user_id: userId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    // Get payment statistics
    const totalPayments = await Payment.count({
      where: whereClause
    });

    const completedPayments = await Payment.count({
      where: {
        ...whereClause,
        status: 'completed'
      }
    });

    const totalRevenue = await Payment.sum('amount', {
      where: {
        ...whereClause,
        status: 'completed'
      }
    }) || 0;

    const pendingPayments = await Payment.count({
      where: {
        ...whereClause,
        status: 'pending'
      }
    });

    const failedPayments = await Payment.count({
      where: {
        ...whereClause,
        status: 'failed'
      }
    });

    const refundedAmount = await Payment.sum('refund_amount', {
      where: whereClause
    }) || 0;

    // Payment method breakdown
    const paymentMethodStats = await Payment.findAll({
      where: {
        ...whereClause,
        status: 'completed'
      },
      attributes: [
        'payment_method',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      group: ['payment_method']
    });

    const statistics = {
      total_payments: totalPayments,
      completed_payments: completedPayments,
      pending_payments: pendingPayments,
      failed_payments: failedPayments,
      success_rate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) : 0,
      total_revenue: parseFloat(totalRevenue).toFixed(2),
      refunded_amount: parseFloat(refundedAmount).toFixed(2),
      net_revenue: parseFloat(totalRevenue - refundedAmount).toFixed(2),
      payment_methods: paymentMethodStats.map(stat => ({
        method: stat.payment_method,
        count: parseInt(stat.dataValues.count),
        total: parseFloat(stat.dataValues.total || 0).toFixed(2)
      }))
    };

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Payment statistics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment statistics'
    });
  }
});

module.exports = router; 