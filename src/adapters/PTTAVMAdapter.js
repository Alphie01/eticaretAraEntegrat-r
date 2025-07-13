const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class PTTAVMAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('pttavm', config);
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.sellerId = config.sellerId;
    this.environment = config.environment || 'production'; // production, test
    
    this.validateConfig(['apiKey', 'apiSecret']);
    
    // PTT AVM API endpoints
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.pttavm.com'
      : 'https://test-api.pttavm.com';
    
    // PTT AVM rate limits (estimated based on typical enterprise APIs)
    this.rateLimits = {
      requests: 0,
      window: 1000, // 1 second
      maxRequests: 10, // 10 requests per second (conservative estimate)
      resetTime: Date.now()
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EticaretEntegrator-PTTAVM/1.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        // Add authentication
        if (this.apiKey && this.apiSecret) {
          // Standard API Key authentication
          config.headers['X-API-Key'] = this.apiKey;
          
          // Generate timestamp and signature for security
          const timestamp = Date.now().toString();
          config.headers['X-Timestamp'] = timestamp;
          
          if (this.apiSecret) {
            const signature = this.generateSignature(config, timestamp);
            config.headers['X-Signature'] = signature;
          }
        }
        
        logger.debug(`PTT AVM API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`PTT AVM API Response: ${response.status} ${response.config.url}`);
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
        this.apiKey = credentials.apiKey;
        this.apiSecret = credentials.apiSecret;
        this.sellerId = credentials.sellerId;
        
        // Update headers
        this.axiosInstance.defaults.headers['X-API-Key'] = this.apiKey;
      }

      // Test API connection by getting seller info
      const response = await this.axiosInstance.get('/v1/seller/profile', {
        headers: {
          'X-API-Key': this.apiKey,
          'X-Timestamp': Date.now().toString()
        }
      });
      
      this.isAuthenticated = true;
      this.sellerInfo = response.data;
      
      logger.info(`PTT AVM authentication successful: ${this.sellerInfo?.companyName || 'Unknown'}`);
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('PTT AVM authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        page = 1,
        limit = 50,
        categoryId,
        status,
        searchTerm,
        isActive
      } = params;
      
      const queryParams = {
        page: page,
        limit: Math.min(limit, 100), // PTT AVM max limit estimation
      };
      
      if (categoryId) queryParams.categoryId = categoryId;
      if (status) queryParams.status = status;
      if (searchTerm) queryParams.search = searchTerm;
      if (isActive !== undefined) queryParams.isActive = isActive;
      
      const response = await this.axiosInstance.get('/v1/products', {
        params: queryParams
      });
      
      return {
        products: response.data.data || response.data.products || [],
        totalCount: response.data.totalCount || response.data.total || 0,
        currentPage: response.data.currentPage || response.data.page || page,
        totalPages: response.data.totalPages || Math.ceil((response.data.totalCount || 0) / limit),
        hasNextPage: response.data.hasNextPage || false
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const pttavmProduct = this.transformProductForPTTAVM(productData);
      
      const response = await this.axiosInstance.post('/v1/products', pttavmProduct);
      
      return {
        success: true,
        data: response.data,
        productId: response.data.id || response.data.productId
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const pttavmProduct = this.transformProductForPTTAVM(productData);
      
      const response = await this.axiosInstance.put(`/v1/products/${productId}`, pttavmProduct);
      
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
      await this.axiosInstance.delete(`/v1/products/${productId}`);
      
      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      this.handleApiError(error, 'DELETE_PRODUCT');
    }
  }

  async updateStock(productId, stock, variantId = null) {
    try {
      const endpoint = variantId 
        ? `/v1/products/${productId}/variants/${variantId}/stock`
        : `/v1/products/${productId}/stock`;
      
      const response = await this.axiosInstance.put(endpoint, {
        stock: stock,
        isActive: stock > 0
      });
      
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
      const endpoint = variantId 
        ? `/v1/products/${productId}/variants/${variantId}/price`
        : `/v1/products/${productId}/price`;
      
      const response = await this.axiosInstance.put(endpoint, {
        price: price,
        listPrice: price
      });
      
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
        page = 1,
        limit = 50,
        status,
        startDate,
        endDate,
        orderId
      } = params;
      
      const queryParams = {
        page: page,
        limit: Math.min(limit, 100)
      };
      
      if (status) queryParams.status = status;
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;
      if (orderId) queryParams.orderId = orderId;
      
      const response = await this.axiosInstance.get('/v1/orders', {
        params: queryParams
      });
      
      return {
        orders: response.data.data || response.data.orders || [],
        totalCount: response.data.totalCount || response.data.total || 0,
        currentPage: response.data.currentPage || response.data.page || page,
        totalPages: response.data.totalPages || Math.ceil((response.data.totalCount || 0) / limit),
        hasNextPage: response.data.hasNextPage || false
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const updateData = {
        status: this.mapOrderStatusToPTTAVM(status)
      };

      // Add shipping information if status is shipped
      if (status === 'shipped' || status === 'preparing') {
        if (trackingInfo.trackingNumber) {
          updateData.trackingNumber = trackingInfo.trackingNumber;
        }
        if (trackingInfo.cargoCompany) {
          updateData.cargoCompany = trackingInfo.cargoCompany;
        }
        if (trackingInfo.shippingDate) {
          updateData.shippingDate = trackingInfo.shippingDate;
        }
      }

      const response = await this.axiosInstance.put(`/v1/orders/${orderId}/status`, updateData);
      
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
      const response = await this.axiosInstance.get('/v1/categories');
      
      return response.data.data || response.data.categories || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // PTT AVM specific methods
  async getBrands(params = {}) {
    try {
      const { page = 1, limit = 50 } = params;
      
      const response = await this.axiosInstance.get('/v1/brands', {
        params: { page, limit }
      });
      
      return response.data.data || response.data.brands || [];
    } catch (error) {
      this.handleApiError(error, 'GET_BRANDS');
    }
  }

  async getShippingTemplates() {
    try {
      const response = await this.axiosInstance.get('/v1/shipping/templates');
      return response.data.data || response.data.templates || [];
    } catch (error) {
      this.handleApiError(error, 'GET_SHIPPING_TEMPLATES');
    }
  }

  async getCities() {
    try {
      const response = await this.axiosInstance.get('/v1/locations/cities');
      return response.data.data || response.data.cities || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CITIES');
    }
  }

  async getCargoCompanies() {
    try {
      const response = await this.axiosInstance.get('/v1/cargo/companies');
      return response.data.data || response.data.companies || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CARGO_COMPANIES');
    }
  }

  async updateProductImages(productId, images) {
    try {
      const response = await this.axiosInstance.put(`/v1/products/${productId}/images`, {
        images: images.map((img, index) => ({
          url: img.url || img,
          order: index + 1,
          isMain: index === 0
        }))
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRODUCT_IMAGES');
    }
  }

  // PTT AVM specific transformations
  transformProductForPTTAVM(product) {
    const pttavmProduct = {
      name: product.name || product.title,
      description: product.description || '',
      categoryId: product.categoryId || product.category,
      brandId: product.brandId || product.brand,
      barcode: product.barcode || product.sku || product.code,
      modelCode: product.modelCode || product.sku,
      price: product.price || 0,
      listPrice: product.listPrice || product.price || 0,
      stock: product.stock || product.stockCount || 0,
      currency: product.currency || 'TRY',
      images: this.transformImagesForPTTAVM(product.images || []),
      attributes: this.transformAttributesForPTTAVM(product.attributes || []),
      isActive: product.isActive !== false,
      status: product.status || 'active'
    };

    // PTT AVM specific fields
    if (product.weight) {
      pttavmProduct.weight = product.weight;
    }

    if (product.dimensions) {
      pttavmProduct.dimensions = {
        length: product.dimensions.length || 0,
        width: product.dimensions.width || 0,
        height: product.dimensions.height || 0
      };
    }

    if (product.shippingTemplate) {
      pttavmProduct.shippingTemplateId = product.shippingTemplate;
    }

    // Variants support
    if (product.variants && Array.isArray(product.variants)) {
      pttavmProduct.variants = product.variants.map(variant => ({
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price,
        stock: variant.stock,
        attributes: variant.attributes || []
      }));
    }

    return pttavmProduct;
  }

  transformImagesForPTTAVM(images) {
    if (!Array.isArray(images)) return [];
    
    return images.map((image, index) => ({
      url: typeof image === 'string' ? image : image.url || image.src,
      order: index + 1,
      isMain: index === 0
    }));
  }

  transformAttributesForPTTAVM(attributes) {
    if (!Array.isArray(attributes)) return [];
    
    return attributes.map(attr => ({
      name: attr.name || attr.key,
      value: attr.value,
      type: attr.type || 'text'
    }));
  }

  // Order status mapping for PTT AVM
  mapOrderStatusToPTTAVM(status) {
    const statusMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned'
    };
    
    return statusMap[status] || 'Pending';
  }

  mapOrderStatusFromPTTAVM(pttavmStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Confirmed': 'confirmed',
      'Preparing': 'preparing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'returned'
    };
    
    return statusMap[pttavmStatus] || 'pending';
  }

  // Batch operations
  async batchUpdatePricesAndStock(items) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        details: []
      };

      // Process in batches to respect rate limits
      const batchSize = 5; // Conservative batch size for enterprise API
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (item) => {
          try {
            const updates = [];
            
            if (item.price !== undefined) {
              updates.push(this.updatePrice(item.productId, item.price, item.variantId));
            }
            
            if (item.stock !== undefined) {
              updates.push(this.updateStock(item.productId, item.stock, item.variantId));
            }
            
            await Promise.all(updates);
            
            results.successful++;
            results.details.push({
              productId: item.productId,
              variantId: item.variantId,
              status: 'success',
              message: 'Price/stock updated successfully'
            });

          } catch (error) {
            results.failed++;
            results.details.push({
              productId: item.productId,
              variantId: item.variantId,
              status: 'failed',
              error: error.message,
              message: 'Price/stock update failed'
            });
          }
        }));

        // Rate limiting delay between batches
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      return {
        success: true,
        batchResults: results
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  // Generate signature for API requests
  generateSignature(config, timestamp) {
    if (!this.apiSecret) return '';
    
    const crypto = require('crypto');
    const method = config.method?.toUpperCase() || 'GET';
    const path = config.url || '';
    const body = config.data ? JSON.stringify(config.data) : '';
    
    const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(stringToSign)
      .digest('hex');
    
    return signature;
  }

  // Override base adapter methods for PTT AVM specifics
  async getInfo() {
    return {
      marketplace: 'pttavm',
      authenticated: this.isAuthenticated,
      sellerInfo: this.sellerInfo,
      baseUrl: this.baseUrl,
      environment: this.environment,
      rateLimits: this.rateLimits,
      features: [
        'products',
        'orders',
        'categories',
        'brands',
        'stock_management',
        'price_management',
        'batch_operations',
        'shipping_templates',
        'cargo_companies',
        'city_listings',
        'attribute_management',
        'image_management',
        'variant_support'
      ],
      limits: {
        maxProductsPerRequest: 100,
        maxImagesPerProduct: 10,
        requestsPerSecond: 10,
        maxDescriptionLength: 5000,
        supportedCurrencies: ['TRY'],
        batchOperationLimit: 500
      },
      categories: [
        'electronics',
        'fashion',
        'home_garden',
        'sports',
        'books',
        'beauty',
        'automotive',
        'baby_kids',
        'food_beverages',
        'health',
        'office_supplies',
        'pet_supplies'
      ]
    };
  }
}

module.exports = PTTAVMAdapter; 