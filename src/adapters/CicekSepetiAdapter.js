const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class CicekSepetiAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('ciceksepeti', config);
    
    this.apiKey = config.apiKey;
    this.sellerId = config.sellerId;
    this.apiSecret = config.apiSecret;
    this.environment = config.environment || 'production'; // production, sandbox
    
    this.validateConfig(['apiKey']);
    
    // ÇiçekSepeti API endpoints
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.ciceksepeti.com'
      : 'https://api-sandbox.ciceksepeti.com';
    
    // ÇiçekSepeti rate limits (assumed values)
    this.rateLimits = {
      requests: 0,
      window: 1000, // 1 second
      maxRequests: 10, // 10 requests per second
      resetTime: Date.now()
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EticaretEntegrator-CicekSepeti/1.0'
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
        if (this.apiKey) {
          config.headers['X-API-Key'] = this.apiKey;
        }

        // Add signature if needed
        if (this.apiSecret && config.data) {
          const signature = this.generateSignature(config.data);
          config.headers['X-Signature'] = signature;
        }
        
        logger.debug(`ÇiçekSepeti API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`ÇiçekSepeti API Response: ${response.status} ${response.config.url}`);
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
        this.sellerId = credentials.sellerId;
        this.apiSecret = credentials.apiSecret;
        
        // Update headers
        this.axiosInstance.defaults.headers['X-API-Key'] = this.apiKey;
      }

      // Test API connection by getting seller info
      const response = await this.axiosInstance.get('/v1/seller/info', {
        headers: {
          'X-API-Key': this.apiKey
        }
      });
      
      this.isAuthenticated = true;
      this.sellerInfo = response.data;
      
      logger.info(`ÇiçekSepeti authentication successful: ${this.sellerInfo?.companyName || 'Unknown'}`);
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('ÇiçekSepeti authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        page = 1,
        limit = 50,
        categoryId,
        status = 'active',
        searchTerm,
        priceMin,
        priceMax,
        stockMin
      } = params;
      
      const queryParams = {
        page: page,
        limit: Math.min(limit, 100), // ÇiçekSepeti max limit
        status: status
      };
      
      if (categoryId) queryParams.categoryId = categoryId;
      if (searchTerm) queryParams.search = searchTerm;
      if (priceMin) queryParams.priceMin = priceMin;
      if (priceMax) queryParams.priceMax = priceMax;
      if (stockMin) queryParams.stockMin = stockMin;
      
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
      const cicekSepetiProduct = this.transformProductForCicekSepeti(productData);
      
      const response = await this.axiosInstance.post('/v1/products', cicekSepetiProduct);
      
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
      const cicekSepetiProduct = this.transformProductForCicekSepeti(productData);
      
      const response = await this.axiosInstance.put(`/v1/products/${productId}`, cicekSepetiProduct);
      
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
        stockStatus: stock > 0 ? 'in_stock' : 'out_of_stock'
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
        currency: 'TRY'
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
        dateFrom,
        dateTo,
        cityId,
        paymentStatus
      } = params;
      
      const queryParams = {
        page: page,
        limit: Math.min(limit, 100)
      };
      
      if (status) queryParams.status = status;
      if (dateFrom) queryParams.dateFrom = dateFrom;
      if (dateTo) queryParams.dateTo = dateTo;
      if (cityId) queryParams.cityId = cityId;
      if (paymentStatus) queryParams.paymentStatus = paymentStatus;
      
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
        status: this.mapOrderStatusToCicekSepeti(status)
      };

      // Add delivery information if status is shipped
      if (status === 'shipped' || status === 'delivered') {
        if (trackingInfo.deliveryDate) {
          updateData.deliveryDate = trackingInfo.deliveryDate;
        }
        if (trackingInfo.trackingNumber) {
          updateData.trackingNumber = trackingInfo.trackingNumber;
        }
        if (trackingInfo.cargoCompany) {
          updateData.cargoCompany = trackingInfo.cargoCompany;
        }
        if (trackingInfo.deliveryNote) {
          updateData.deliveryNote = trackingInfo.deliveryNote;
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

  // ÇiçekSepeti specific methods
  async getCities() {
    try {
      const response = await this.axiosInstance.get('/v1/cities');
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CITIES');
    }
  }

  async getDeliveryOptions(cityId, districtId) {
    try {
      const response = await this.axiosInstance.get('/v1/delivery-options', {
        params: { cityId, districtId }
      });
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_DELIVERY_OPTIONS');
    }
  }

  async getOccasions() {
    try {
      const response = await this.axiosInstance.get('/v1/occasions');
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_OCCASIONS');
    }
  }

  async getProductVariants(productId) {
    try {
      const response = await this.axiosInstance.get(`/v1/products/${productId}/variants`);
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCT_VARIANTS');
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

  // ÇiçekSepeti specific transformations
  transformProductForCicekSepeti(product) {
    const cicekSepetiProduct = {
      name: product.name || product.title,
      description: product.description || '',
      categoryId: product.categoryId || product.category,
      price: product.price || 0,
      currency: 'TRY',
      stock: product.stock || 0,
      stockStatus: (product.stock || 0) > 0 ? 'in_stock' : 'out_of_stock',
      status: product.status === false ? 'inactive' : 'active',
      sku: product.sku || '',
      barcode: product.barcode || '',
      brand: product.brand || '',
      weight: product.weight || 0,
      dimensions: {
        width: product.width || 0,
        height: product.height || 0,
        length: product.length || 0
      },
      images: this.transformImagesForCicekSepeti(product.images || []),
      tags: product.tags || (product.keywords ? product.keywords.join(',') : ''),
      isPerishable: product.isPerishable || true, // Çiçek/hediye ürünleri için
      shelfLife: product.shelfLife || 7, // Gün cinsinden
      careInstructions: product.careInstructions || '',
      occasionIds: product.occasionIds || []
    };

    // ÇiçekSepeti specific fields
    if (product.deliveryType) {
      cicekSepetiProduct.deliveryType = product.deliveryType; // same_day, next_day, standard
    }

    if (product.minDeliveryHours) {
      cicekSepetiProduct.minDeliveryHours = product.minDeliveryHours;
    }

    return cicekSepetiProduct;
  }

  transformImagesForCicekSepeti(images) {
    if (!Array.isArray(images)) return [];
    
    return images.map((image, index) => ({
      url: typeof image === 'string' ? image : image.url || image.src,
      order: index + 1,
      isMain: index === 0,
      alt: typeof image === 'object' ? image.alt : ''
    }));
  }

  // Order status mapping for ÇiçekSepeti
  mapOrderStatusToCicekSepeti(status) {
    const statusMap = {
      'pending': 'waiting_approval',
      'confirmed': 'approved',
      'preparing': 'preparing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned'
    };
    
    return statusMap[status] || 'waiting_approval';
  }

  mapOrderStatusFromCicekSepeti(cicekSepetiStatus) {
    const statusMap = {
      'waiting_approval': 'pending',
      'approved': 'confirmed',
      'preparing': 'preparing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned'
    };
    
    return statusMap[cicekSepetiStatus] || 'pending';
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
      const batchSize = 5;
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
  generateSignature(data) {
    if (!this.apiSecret) return '';
    
    const crypto = require('crypto');
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  // Override base adapter methods for ÇiçekSepeti specifics
  async getInfo() {
    return {
      marketplace: 'ciceksepeti',
      authenticated: this.isAuthenticated,
      sellerInfo: this.sellerInfo,
      baseUrl: this.baseUrl,
      environment: this.environment,
      rateLimits: this.rateLimits,
      features: [
        'products',
        'orders',
        'categories',
        'stock_management',
        'price_management',
        'delivery_management',
        'city_based_delivery',
        'occasion_based_products',
        'perishable_products',
        'same_day_delivery',
        'care_instructions',
        'weight_dimensions'
      ],
      limits: {
        maxProductsPerRequest: 100,
        maxImagesPerProduct: 10,
        requestsPerSecond: 10,
        maxDescriptionLength: 2000,
        supportedCurrencies: ['TRY'],
        supportedDeliveryTypes: ['same_day', 'next_day', 'standard']
      },
      categories: [
        'flowers',
        'bouquets',
        'plants',
        'gifts',
        'chocolates',
        'cakes',
        'arrangements',
        'occasions'
      ]
    };
  }
}

module.exports = CicekSepetiAdapter; 