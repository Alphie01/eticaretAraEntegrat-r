const crypto = require('crypto');
const axios = require('axios');
const { Payment } = require('../models/Payment');
const { PayTRTransaction } = require('../models/PayTRTransaction');
const { Order } = require('../models/Order');
const logger = require('../utils/logger');

class PayTRService {
  constructor() {
    this.merchantId = process.env.PAYTR_MERCHANT_ID;
    this.merchantKey = process.env.PAYTR_MERCHANT_KEY;
    this.merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    this.testMode = process.env.PAYTR_TEST_MODE === 'true';
    this.baseUrl = this.testMode 
      ? 'https://www.paytr.com/odeme/api/get-token'
      : 'https://www.paytr.com/odeme/api/get-token';
    
    if (!this.merchantId || !this.merchantKey || !this.merchantSalt) {
      throw new Error('PayTR credentials are not configured properly');
    }
  }

  /**
   * Generate a unique merchant order ID
   */
  generateMerchantOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD_${timestamp}_${random}`;
  }

  /**
   * Generate PayTR hash for verification
   */
  generateHash(merchantOid, email, paymentAmount, userBasket, noInstallment, maxInstallment, userIp, successUrl, failUrl) {
    const hashStr = merchantOid + email + paymentAmount + userBasket + noInstallment + maxInstallment + 
                   (this.testMode ? '1' : '0') + userIp + successUrl + failUrl + this.merchantSalt;
    return crypto.createHmac('sha256', this.merchantKey).update(hashStr).digest('base64');
  }

  /**
   * Generate webhook verification hash
   */
  generateWebhookHash(postData) {
    const { merchant_oid, status, total_amount } = postData;
    const hashStr = merchant_oid + this.merchantSalt + status + total_amount;
    return crypto.createHmac('sha256', this.merchantKey).update(hashStr).digest('base64');
  }

  /**
   * Prepare user basket data for PayTR
   */
  prepareUserBasket(orderItems) {
    const basket = orderItems.map(item => [
      item.product_name || 'Ürün',
      (item.unit_price * 100).toString(), // Convert to kuruş
      item.quantity.toString()
    ]);
    return JSON.stringify(basket);
  }

  /**
   * Create a payment request to PayTR
   */
  async createPayment(orderData) {
    try {
      const {
        orderId,
        amount,
        currency = 'TRY',
        customerEmail,
        customerName,
        customerPhone,
        customerAddress,
        userIp,
        successUrl,
        failUrl,
        orderItems = [],
        installmentOptions = {}
      } = orderData;

      // Find the order
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Generate merchant order ID
      const merchantOid = this.generateMerchantOrderId();
      
      // Convert amount to kuruş (Turkish cents)
      const paymentAmount = Math.round(amount * 100);
      
      // Prepare user basket
      const userBasket = this.prepareUserBasket(orderItems);
      
      // Installment settings
      const noInstallment = installmentOptions.noInstallment || '0';
      const maxInstallment = installmentOptions.maxInstallment || '0';
      
      // Generate hash
      const hash = this.generateHash(
        merchantOid,
        customerEmail,
        paymentAmount,
        userBasket,
        noInstallment,
        maxInstallment,
        userIp,
        successUrl,
        failUrl
      );

      // Prepare PayTR request data
      const requestData = {
        merchant_id: this.merchantId,
        user_ip: userIp,
        merchant_oid: merchantOid,
        email: customerEmail,
        payment_amount: paymentAmount,
        paytr_token: hash,
        user_basket: userBasket,
        debug_on: this.testMode ? '1' : '0',
        no_installment: noInstallment,
        max_installment: maxInstallment,
        user_name: customerName,
        user_address: customerAddress,
        user_phone: customerPhone,
        merchant_ok_url: successUrl,
        merchant_fail_url: failUrl,
        timeout_limit: '30',
        currency: currency,
        test_mode: this.testMode ? '1' : '0'
      };

      // Create payment record
      const payment = await Payment.create({
        order_id: orderId,
        user_id: order.user_id,
        payment_id: merchantOid,
        gateway: 'paytr',
        amount: amount,
        currency: currency,
        status: 'pending',
        ip_address: userIp
      });

      // Create PayTR transaction record
      const paytrTransaction = await PayTRTransaction.create({
        payment_id: payment.id,
        merchant_oid: merchantOid,
        merchant_id: this.merchantId,
        amount: paymentAmount,
        currency: currency,
        test_mode: this.testMode,
        status: 'pending',
        hash: hash,
        success_url: successUrl,
        fail_url: failUrl,
        user_basket: userBasket,
        user_name: customerName,
        user_address: customerAddress,
        user_phone: customerPhone,
        user_ip: userIp,
        email: customerEmail,
        no_installment: noInstallment === '1',
        max_installment: parseInt(maxInstallment),
        lang: 'tr'
      });

      // Send request to PayTR
      const response = await axios.post(this.baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      logger.info('PayTR API Response:', response.data);

      // Update transaction with response
      await paytrTransaction.update({
        raw_response: JSON.stringify(response.data)
      });

      if (response.data.status === 'success') {
        await paytrTransaction.update({
          paytr_token: response.data.token
        });

        return {
          success: true,
          paymentId: payment.id,
          merchantOid: merchantOid,
          token: response.data.token,
          iframe_url: `https://www.paytr.com/odeme/guvenli/${response.data.token}`,
          redirect_url: `https://www.paytr.com/odeme?token=${response.data.token}`
        };
      } else {
        await payment.update({
          status: 'failed',
          error_message: response.data.reason || 'PayTR request failed'
        });

        await paytrTransaction.update({
          status: 'failed',
          failed_reason_msg: response.data.reason || 'PayTR request failed'
        });

        throw new Error(response.data.reason || 'PayTR payment request failed');
      }

    } catch (error) {
      logger.error('PayTR payment creation error:', error);
      throw error;
    }
  }

  /**
   * Handle PayTR webhook notification
   */
  async handleWebhook(postData) {
    try {
      const {
        merchant_oid,
        status,
        total_amount,
        hash,
        failed_reason_code,
        failed_reason_msg,
        test_mode,
        payment_type,
        currency,
        payment_amount,
        installment_count,
        card_pan,
        card_type,
        issuer_bank
      } = postData;

      // Verify hash
      const expectedHash = this.generateWebhookHash(postData);
      if (hash !== expectedHash) {
        logger.error('PayTR webhook hash verification failed');
        throw new Error('Invalid webhook hash');
      }

      // Find PayTR transaction
      const paytrTransaction = await PayTRTransaction.findOne({
        where: { merchant_oid },
        include: [{
          model: Payment,
          as: 'payment'
        }]
      });

      if (!paytrTransaction) {
        logger.error(`PayTR transaction not found for merchant_oid: ${merchant_oid}`);
        throw new Error('Transaction not found');
      }

      // Update PayTR transaction
      await paytrTransaction.update({
        status: status === '1' ? 'success' : 'failed',
        failed_reason_code: failed_reason_code,
        failed_reason_msg: failed_reason_msg,
        payment_type: payment_type,
        installment_count: installment_count,
        card_pan: card_pan,
        card_type: card_type,
        issuer_bank: issuer_bank,
        webhook_received_at: new Date(),
        raw_response: JSON.stringify(postData)
      });

      // Update payment status
      const payment = paytrTransaction.payment;
      if (status === '1') {
        await payment.update({
          status: 'completed',
          payment_method: payment_type === 'card' ? 'credit_card' : payment_type,
          installment_count: installment_count,
          card_type: card_type,
          card_last_four: card_pan ? card_pan.substr(-4) : null,
          bank_name: issuer_bank,
          processed_at: new Date(),
          gateway_payment_id: merchant_oid,
          transaction_id: merchant_oid
        });

        // Update order payment status
        const order = await Order.findByPk(payment.order_id);
        if (order) {
          await order.update({
            payment_status: 'paid'
          });
        }

        logger.info(`Payment completed successfully for merchant_oid: ${merchant_oid}`);
      } else {
        await payment.update({
          status: 'failed',
          error_message: failed_reason_msg,
          error_code: failed_reason_code
        });

        logger.warn(`Payment failed for merchant_oid: ${merchant_oid}, reason: ${failed_reason_msg}`);
      }

      return {
        success: true,
        status: status === '1' ? 'completed' : 'failed',
        merchantOid: merchant_oid
      };

    } catch (error) {
      logger.error('PayTR webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{
          model: PayTRTransaction,
          as: 'paytr_transaction'
        }]
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        payment_id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        processed_at: payment.processed_at,
        paytr_data: payment.paytr_transaction
      };

    } catch (error) {
      logger.error('Get payment status error:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId, refundAmount, reason) {
    try {
      const payment = await Payment.findByPk(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Payment is not completed, cannot refund');
      }

      if (!payment.canRefund) {
        throw new Error('Payment cannot be refunded');
      }

      // Note: PayTR doesn't have direct refund API
      // This would typically be handled manually through PayTR dashboard
      // We just update our records here
      
      const refundAmountValue = refundAmount || payment.amount;
      
      await payment.update({
        status: refundAmountValue >= payment.amount ? 'refunded' : 'partial_refund',
        refund_amount: (payment.refund_amount || 0) + refundAmountValue,
        refunded_at: new Date(),
        notes: reason
      });

      // Update order status if fully refunded
      if (refundAmountValue >= payment.amount) {
        const order = await Order.findByPk(payment.order_id);
        if (order) {
          await order.update({
            payment_status: 'refunded'
          });
        }
      }

      logger.info(`Payment refund recorded for payment_id: ${paymentId}, amount: ${refundAmountValue}`);

      return {
        success: true,
        refund_amount: refundAmountValue,
        status: payment.status
      };

    } catch (error) {
      logger.error('Payment refund error:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId, reason) {
    try {
      const payment = await Payment.findByPk(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'pending') {
        throw new Error('Only pending payments can be cancelled');
      }

      await payment.update({
        status: 'cancelled',
        notes: reason
      });

      // Update PayTR transaction
      const paytrTransaction = await PayTRTransaction.findOne({
        where: { payment_id: paymentId }
      });

      if (paytrTransaction) {
        await paytrTransaction.update({
          status: 'cancelled'
        });
      }

      logger.info(`Payment cancelled for payment_id: ${paymentId}`);

      return {
        success: true,
        status: 'cancelled'
      };

    } catch (error) {
      logger.error('Payment cancellation error:', error);
      throw error;
    }
  }
}

module.exports = PayTRService; 