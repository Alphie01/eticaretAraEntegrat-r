const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class PazaramaAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('pazarama', config);
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.sellerId = config.sellerId;
    this.environment = config.environment || 'production'; // production, sandbox
    
    this.validateConfig(['apiKey', 'apiSecret']);
    
    // Pazarama API endpoints
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.pazarama.com'
      : 'https://api-sandbox.pazarama.com';
    
    // Pazarama rate limits (estimated)
    this.rateLimits = {
      requests: 0,
      window: 1000, // 1 second
      maxRequests: 20, // 20 requests per second
      resetTime: Date.now()
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EticaretEntegrator-Pazarama/1.0'
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
          config.headers['X-API-Key'] = this.apiKey;
          
          // Generate signature for request
          const signature = this.generateSignature(config);
          config.headers['X-Signature'] = signature;
        }
        
        logger.debug(`Pazarama API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Pazarama API Response: ${response.status} ${response.config.url}`);
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
      const response = await this.axiosInstance.get('/v1/seller/info', {
        headers: {
          'X-API-Key': this.apiKey,
          'X-Signature': this.generateSignature({ method: 'GET', url: '/v1/seller/info' })
        }
      });
      
      this.isAuthenticated = true;
      this.sellerInfo = response.data;
      
      logger.info(`Pazarama authentication successful: ${this.sellerInfo?.companyName || 'Unknown'}`);
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('Pazarama authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        page = 1,
        size = 50,
        categoryId,
        brandId,
        status,
        searchTerm,
        approved,
        isActive
      } = params;
      
      const queryParams = {
        page: page,
        size: Math.min(size, 100), // Pazarama max limit
      };
      
      if (categoryId) queryParams.categoryId = categoryId;
      if (brandId) queryParams.brandId = brandId;
      if (status) queryParams.status = status;
      if (searchTerm) queryParams.search = searchTerm;
      if (approved !== undefined) queryParams.approved = approved;
      if (isActive !== undefined) queryParams.isActive = isActive;
      
      const response = await this.axiosInstance.get('/v1/products', {
        params: queryParams
      });
      
      return {
        products: response.data.data || [],
        totalCount: response.data.totalCount || 0,
        currentPage: response.data.currentPage || page,
        totalPages: response.data.totalPages || 1,
        hasNextPage: response.data.hasNextPage || false
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const pazaramaProduct = this.transformProductForPazarama(productData);
      
      const response = await this.axiosInstance.post('/v1/products', pazaramaProduct);
      
      return {
        success: true,
        data: response.data,
        productId: response.data.id
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const pazaramaProduct = this.transformProductForPazarama(productData);
      
      const response = await this.axiosInstance.put(`/v1/products/${productId}`, pazaramaProduct);
      
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
        stockCount: stock,
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
        listPrice: price,
        salePrice: price
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
        size = 50,
        status,
        startDate,
        endDate,
        orderId
      } = params;
      
      const queryParams = {
        page: page,
        size: Math.min(size, 100)
      };
      
      if (status) queryParams.status = status;
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;
      if (orderId) queryParams.orderId = orderId;
      
      const response = await this.axiosInstance.get('/v1/orders', {
        params: queryParams
      });
      
      return {
        orders: response.data.data || [],
        totalCount: response.data.totalCount || 0,
        currentPage: response.data.currentPage || page,
        totalPages: response.data.totalPages || 1,
        hasNextPage: response.data.hasNextPage || false
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const updateData = {
        status: this.mapOrderStatusToPazarama(status)
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
      
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // Pazarama specific methods
  async getBrands(params = {}) {
    try {
      const { page = 1, size = 50 } = params;
      
      const response = await this.axiosInstance.get('/v1/brands', {
        params: { page, size }
      });
      
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_BRANDS');
    }
  }

  async getCategoryWithAttributes(categoryId) {
    try {
      const response = await this.axiosInstance.get(`/v1/categories/${categoryId}/attributes`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORY_ATTRIBUTES');
    }
  }

  async getSellerDeliveries() {
    try {
      const response = await this.axiosInstance.get('/v1/seller/deliveries');
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_SELLER_DELIVERIES');
    }
  }

  async getCities() {
    try {
      const response = await this.axiosInstance.get('/v1/cities');
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CITIES');
    }
  }

  async createBatchRequest(products) {
    try {
      const batchData = {
        products: products.map(product => this.transformProductForPazarama(product))
      };
      
      const response = await this.axiosInstance.post('/v1/products/batch', batchData);
      
      return {
        success: true,
        batchRequestId: response.data.batchRequestId,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_BATCH_REQUEST');
    }
  }

  async getBatchRequestStatus(batchRequestId) {
    try {
      const response = await this.axiosInstance.get(`/v1/products/batch/${batchRequestId}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'GET_BATCH_REQUEST_STATUS');
    }
  }

  async updateProductImages(productId, images) {
    try {
      const response = await this.axiosInstance.put(`/v1/products/${productId}/images`, {
        images: images.map((img, index) => ({
          imageUrl: img.url || img,
          order: index + 1
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

  // Pazarama specific transformations
  transformProductForPazarama(product) {
    const pazaramaProduct = {
      name: product.name || product.title,
      displayName: product.displayName || product.name || product.title,
      description: product.description || '',
      brandId: product.brandId || product.brand,
      categoryId: product.categoryId || product.category,
      desi: product.desi || product.weight || 1,
      code: product.code || product.sku || product.barcode,
      groupCode: product.groupCode || product.code || product.sku,
      stockCount: product.stockCount || product.stock || 0,
      vatRate: product.vatRate || 18, // Default Turkish VAT
      listPrice: product.listPrice || product.price || 0,
      salePrice: product.salePrice || product.price || 0,
      images: this.transformImagesForPazarama(product.images || []),
      attributes: this.transformAttributesForPazarama(product.attributes || []),
      isActive: product.isActive !== false,
      approved: product.approved || false
    };

    // Pazarama specific fields
    if (product.dimensions) {
      pazaramaProduct.dimensions = {
        length: product.dimensions.length || 0,
        width: product.dimensions.width || 0,
        height: product.dimensions.height || 0
      };
    }

    if (product.cargoSettings) {
      pazaramaProduct.cargoSettings = product.cargoSettings;
    }

    return pazaramaProduct;
  }

  transformImagesForPazarama(images) {
    if (!Array.isArray(images)) return [];
    
    return images.map((image, index) => ({
      imageUrl: typeof image === 'string' ? image : image.url || image.src,
      order: index + 1
    }));
  }

  transformAttributesForPazarama(attributes) {
    if (!Array.isArray(attributes)) return [];
    
    return attributes.map(attr => ({
      attributeId: attr.attributeId || attr.id,
      attributeValueId: attr.attributeValueId || attr.valueId || attr.value
    }));
  }

  // Order status mapping for Pazarama
  mapOrderStatusToPazarama(status) {
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

  mapOrderStatusFromPazarama(pazaramaStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Confirmed': 'confirmed',
      'Preparing': 'preparing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'returned'
    };
    
    return statusMap[pazaramaStatus] || 'pending';
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
      const batchSize = 10;
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
          await new Promise(resolve => setTimeout(resolve, 1000));
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
  generateSignature(config) {
    if (!this.apiSecret) return '';
    
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const method = config.method?.toUpperCase() || 'GET';
    const path = config.url || '';
    const body = config.data ? JSON.stringify(config.data) : '';
    
    const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(stringToSign)
      .digest('hex');
    
    // Add timestamp to headers
    config.headers = config.headers || {};
    config.headers['X-Timestamp'] = timestamp;
    
    return signature;
  }

  // Override base adapter methods for Pazarama specifics
  async getInfo() {
    return {
      marketplace: 'pazarama',
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
        'delivery_management',
        'city_listings',
        'attribute_management',
        'image_management',
        'vat_management'
      ],
      limits: {
        maxProductsPerRequest: 100,
        maxImagesPerProduct: 10,
        requestsPerSecond: 20,
        maxDescriptionLength: 5000,
        supportedCurrencies: ['TRY'],
        batchOperationLimit: 1000
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
        'health'
      ]
    };
  }
}

module.exports = PazaramaAdapter; 