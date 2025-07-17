const logger = require('../utils/logger');
const { SyncLog } = require('../models/SyncLog');

/**
 * Abstract Marketplace Adapter
 * Tüm pazaryeri adaptörlerinin implement etmesi gereken temel sınıf
 */
class MarketplaceAdapter {
  constructor(name, config = {}) {
    if (this.constructor === MarketplaceAdapter) {
      throw new Error('MarketplaceAdapter is abstract and cannot be instantiated');
    }
    
    this.name = name;
    this.config = config;
    this.isAuthenticated = false;
    this.rateLimits = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 100
    };
    this.lastRequestTime = 0;
  }

  // Abstract methods - must be implemented by subclasses
  async authenticate(credentials) {
    throw new Error('authenticate method must be implemented');
  }

  async getProducts(params = {}) {
    throw new Error('getProducts method must be implemented');
  }

  async createProduct(productData) {
    throw new Error('createProduct method must be implemented');
  }

  async updateProduct(productId, productData) {
    throw new Error('updateProduct method must be implemented');
  }

  async deleteProduct(productId) {
    throw new Error('deleteProduct method must be implemented');
  }

  async updateStock(productId, stock, variantId = null) {
    throw new Error('updateStock method must be implemented');
  }

  async updatePrice(productId, price, variantId = null) {
    throw new Error('updatePrice method must be implemented');
  }

  async getOrders(params = {}) {
    throw new Error('getOrders method must be implemented');
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    throw new Error('updateOrderStatus method must be implemented');
  }

  async getCategories() {
    throw new Error('getCategories method must be implemented');
  }

  // Concrete methods
  /**
   * Rate limiting check
   */
  async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimits.window) {
      if (this.rateLimits.requests >= this.rateLimits.maxRequests) {
        const waitTime = this.rateLimits.window - timeSinceLastRequest;
        logger.warn(`Rate limit exceeded for ${this.name}, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        this.rateLimits.requests = 0;
      }
    } else {
      this.rateLimits.requests = 0;
    }
    
    this.rateLimits.requests++;
    this.lastRequestTime = now;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log sync operation
   */
  async logSync(userId, operation, entity, entityId, status, data = {}) {
    try {
      const syncLog = new SyncLog({
        user: userId,
        marketplace: this.name,
        operation,
        entity,
        entityId,
        status,
        direction: data.direction || 'export',
        data: {
          request: data.request,
          response: data.response,
          changes: data.changes
        },
        error: data.error,
        warnings: data.warnings || [],
        metadata: {
          userAgent: 'EticaretEntegrator/1.0',
          apiVersion: this.config.apiVersion || '1.0',
          requestId: data.requestId
        }
      });

      await syncLog.save();
      return syncLog;
    } catch (error) {
      logger.error('Failed to log sync operation:', error);
    }
  }

  /**
   * Transform product data to marketplace format
   */
  transformProductData(product, marketplace) {
    // Base transformation - override in subclasses for specific formats
    return {
      name: product.name,
      description: product.description,
      price: product.basePrice,
      stock: product.totalStock,
      category: product.category.name,
      brand: product.brand,
      images: product.images.map(img => img.url),
      attributes: product.specifications || []
    };
  }

  /**
   * Transform order data from marketplace format
   */
  transformOrderData(orderData) {
    // Base transformation - override in subclasses for specific formats
    return {
      marketplace: {
        name: this.name,
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate
      },
      customer: {
        firstName: orderData.customer?.firstName,
        lastName: orderData.customer?.lastName,
        email: orderData.customer?.email,
        phone: orderData.customer?.phone
      },
      items: orderData.items || [],
      pricing: {
        subtotal: orderData.subtotal,
        shipping: orderData.shippingCost,
        tax: orderData.tax,
        total: orderData.total
      },
      status: this.mapOrderStatus(orderData.status)
    };
  }

  /**
   * Map marketplace order status to standard status
   */
  mapOrderStatus(marketplaceStatus) {
    // Override in subclasses for marketplace-specific mapping
    const statusMap = {
      'new': 'pending',
      'confirmed': 'confirmed',
      'processing': 'processing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned'
    };
    
    return statusMap[marketplaceStatus?.toLowerCase()] || 'pending';
  }

  /**
   * Validate required configuration
   */
  validateConfig(requiredFields) {
    console.log(this.config);
    const missing = requiredFields.filter(field => !this.config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Handle API errors
   */
  handleApiError(error, operation) {
    logger.error(`${this.name} API error in ${operation}:`, error);
    
    const standardError = {
      code: error.code || 'API_ERROR',
      message: error.message || 'Unknown API error',
      details: error.response?.data || error,
      operation,
      marketplace: this.name
    };

    // Rate limit specific handling
    if (error.response?.status === 429) {
      standardError.code = 'RATE_LIMIT_EXCEEDED';
      standardError.retryAfter = error.response.headers['retry-after'] || 60;
    }

    // Authentication specific handling
    if (error.response?.status === 401) {
      standardError.code = 'AUTHENTICATION_FAILED';
      this.isAuthenticated = false;
    }

    throw standardError;
  }

  /**
   * Batch operation handler
   */
  async batchOperation(items, operation, batchSize = 10) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await operation(item, i + index);
          results.push({ index: i + index, success: true, data: result });
        } catch (error) {
          errors.push({ index: i + index, error, item });
          results.push({ index: i + index, success: false, error });
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // Rate limiting between batches
      if (i + batchSize < items.length) {
        await this.sleep(1000); // Wait 1 second between batches
      }
    }
    
    return {
      total: items.length,
      success: results.filter(r => r.success).length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Get adapter info
   */
  getInfo() {
    return {
      name: this.name,
      isAuthenticated: this.isAuthenticated,
      rateLimits: this.rateLimits,
      config: {
        apiVersion: this.config.apiVersion,
        environment: this.config.environment || 'production'
      }
    };
  }
}

module.exports = MarketplaceAdapter; 