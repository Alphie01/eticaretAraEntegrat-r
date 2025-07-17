const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');
require('dotenv').config();

class HepsiburadaAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('hepsiburada', config);
    
    this.baseUrl = config.baseUrl || 'https://mpop-sit.hepsiburada.com';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.merchantId = config.merchantId;
    this.username = config.username || process.env.HEPSIBURADA_USERNAME;
    this.password = config.password || process.env.HEPSIBURADA_PASSWORD;

    // Config'e de aynı değerleri set edelim ki validateConfig çalışsın
    this.config.username = this.username;
    this.config.password = this.password;
    this.config.merchantId = this.merchantId;

    this.validateConfig(['username', 'password', 'merchantId']);
    
    // Hepsiburada specific rate limits
    this.rateLimits = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 60 // Hepsiburada allows 60 requests per minute
    };

    // Basic Auth için credentials'ları encode et
    const basicAuthToken = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'castelina_dev',
        'Authorization': `Basic ${basicAuthToken}`
      }
    });

    this.setupInterceptors();
    this.isAuthenticated = true; // Basic Auth ile hemen authenticate
  }

  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        // Basic Auth header zaten constructor'da set edildi
        // Ek bir işlem yapılmasına gerek yok
        
        logger.debug(`Hepsiburada API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Hepsiburada API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.handleApiError(error, 'API_CALL');
        return Promise.reject(error);
      }
    );
  }

  async authenticate(credentials) {
    try {
      if (credentials) {
        this.username = credentials.username;
        this.password = credentials.password;
        this.merchantId = credentials.merchantId;
        
        // Basic Auth header'ını güncelle
        const basicAuthToken = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        this.axiosInstance.defaults.headers['Authorization'] = `Basic ${basicAuthToken}`;
      }

      // Debug bilgileri
      logger.info(`Hepsiburada Auth Debug - Username: ${this.username?.substring(0, 8)}...`);
      logger.info(`Hepsiburada Auth Debug - Password: ${this.password ? '***' + this.password.substring(this.password.length-3) : 'not set'}`);
      logger.info(`Hepsiburada Auth Debug - MerchantId: ${this.merchantId}`);
      logger.info(`Hepsiburada Auth Debug - Base URL: ${this.baseUrl}`);
      
      // Basic Auth ile test isteği yap
      const testUrl = `/product/api/products/all-products-of-merchant/${this.merchantId}?limit=1&offset=0`;
      logger.info(`Hepsiburada Auth Debug - Test URL: ${this.baseUrl}${testUrl}`);
      
      const response = await this.axiosInstance.get(testUrl);
      
      this.isAuthenticated = true;
      logger.info('Hepsiburada Basic Auth authentication successful');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('Hepsiburada Basic Auth authentication failed:', error.response?.status, error.response?.statusText);
      logger.error('Hepsiburada Auth Error Details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers ? 'present' : 'missing',
        data: error.response?.data
      });
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        offset = 0, 
        limit = 50, 
        sku,
        listingId 
      } = params;
      
      let url = `/product/api/products/all-products-of-merchant/${this.merchantId}`;
      const queryParams = { offset, limit };
      
      if (sku) queryParams.sku = sku;
      if (listingId) queryParams.listingId = listingId;
      
      const response = await this.axiosInstance.get(url, { params: queryParams });
      console.log(response.data);
      return {
        products: response.data || [],
        totalCount: response.data.totalElements,
        offset: response.data.offset,
        limit: response.data.limit
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const hepsiburadaProduct = this.transformProductForHepsiburada(productData);
      
      const response = await this.axiosInstance.post(
        `/api/product/v1/products/merchant/${this.merchantId}`,
        hepsiburadaProduct
      );
      
      return {
        success: true,
        data: response.data,
        listingId: response.data.listingId
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const hepsiburadaProduct = this.transformProductForHepsiburada(productData);
      
      const response = await this.axiosInstance.put(
        `/api/product/v1/products/merchant/${this.merchantId}/${productId}`,
        hepsiburadaProduct
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRODUCT');
    }
  }

  async deleteProduct(productId) {
    try {
      await this.axiosInstance.delete(
        `/api/product/v1/products/merchant/${this.merchantId}/${productId}`
      );
      
      return { success: true };
    } catch (error) {
      this.handleApiError(error, 'DELETE_PRODUCT');
    }
  }

  async updateStock(productId, stock, variantId = null) {
    try {
      const stockData = {
        merchantSku: productId,
        availableStock: stock
      };
      
      const response = await this.axiosInstance.put(
        `/api/product/v1/products/merchant/${this.merchantId}/${productId}/price-inventory`,
        stockData
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_STOCK');
    }
  }

  async updatePrice(productId, price, variantId = null) {
    try {
      const priceData = {
        merchantSku: productId,
        price: price
      };
      
      const response = await this.axiosInstance.put(
        `/api/product/v1/products/merchant/${this.merchantId}/${productId}/price-inventory`,
        priceData
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRICE');
    }
  }

  async getOrders(params = {}) {
    try {
      const {
        offset = 0,
        limit = 50,
        status,
        beginDate,
        endDate
      } = params;
      
      const queryParams = { offset, limit };
      if (status) queryParams.status = status;
      if (beginDate) queryParams.beginDate = beginDate;
      if (endDate) queryParams.endDate = endDate;
      
      const response = await this.axiosInstance.get(
        `/api/order/v1/orders/merchant/${this.merchantId}`,
        { params: queryParams }
      );
      
      return {
        orders: response.data.orderList || [],
        totalCount: response.data.totalCount,
        offset: response.data.offset,
        limit: response.data.limit
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const statusData = {
        status,
        cargoCompany: trackingInfo.carrierCode,
        trackingNumber: trackingInfo.trackingNumber
      };
      
      const response = await this.axiosInstance.put(
        `/api/order/v1/orders/merchant/${this.merchantId}/${orderId}/status`,
        statusData
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_ORDER_STATUS');
    }
  }

  async getCategories() {
    try {
      const response = await this.axiosInstance.get('/api/category/v1/categories');
      
      return response.data.categoryList || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // Hepsiburada specific transformations
  transformProductForHepsiburada(product) {
    const hepsiburadaProduct = {
      merchantSku: product.sku || product.id,
      title: product.name,
      description: product.description,
      brand: product.brand,
      categoryId: this.getCategoryId(product.category),
      price: product.basePrice,
      availableStock: product.totalStock,
      images: product.images?.map(img => img.url) || [],
      attributes: this.transformAttributes(product.specifications || []),
      variants: []
    };

    // Transform variants
    if (product.variants && product.variants.length > 0) {
      hepsiburadaProduct.variants = product.variants.map(variant => ({
        merchantSku: variant.sku,
        price: variant.price,
        availableStock: variant.stock,
        images: variant.images || [],
        attributes: this.transformVariantAttributes(variant.attributes || [])
      }));
    }

    return hepsiburadaProduct;
  }

  transformAttributes(specifications) {
    return specifications.map(spec => ({
      attributeId: this.getAttributeId(spec.name),
      attributeValue: spec.value
    }));
  }

  transformVariantAttributes(attributes) {
    return attributes.map(attr => ({
      attributeId: this.getAttributeId(attr.name),
      attributeValue: attr.value
    }));
  }

  // Helper methods for ID mappings
  getCategoryId(categoryName) {
    // This should be implemented to map category names to Hepsiburada category IDs
    return 1;
  }

  getAttributeId(attributeName) {
    // This should be implemented to map attribute names to Hepsiburada attribute IDs
    return 1;
  }

  // Override order status mapping for Hepsiburada
  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      'WaitingForApproval': 'pending',
      'Approved': 'confirmed',
      'Preparing': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'returned',
      'UnDelivered': 'returned'
    };
    
    return statusMap[hepsiburadaStatus] || 'pending';
  }

  // Batch operations
  async batchUpdatePricesAndStock(items) {
    try {
      const promises = items.map(item => 
        this.updatePriceAndStock(item.sku, item.price, item.stock)
      );
      
      const results = await Promise.allSettled(promises);
      
      return {
        total: items.length,
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results: results
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  async updatePriceAndStock(sku, price, stock) {
    try {
      const data = {
        merchantSku: sku,
        price: price,
        availableStock: stock
      };
      
      const response = await this.axiosInstance.put(
        `/api/product/v1/products/merchant/${this.merchantId}/${sku}/price-inventory`,
        data
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRICE_AND_STOCK');
    }
  }

  // Get delivery status
  async getDeliveryStatus(orderId) {
    try {
      const response = await this.axiosInstance.get(
        `/api/order/v1/orders/merchant/${this.merchantId}/${orderId}/delivery`
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'GET_DELIVERY_STATUS');
    }
  }
}

module.exports = HepsiburadaAdapter; 