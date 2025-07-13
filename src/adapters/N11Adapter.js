const axios = require('axios');
const crypto = require('crypto');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class N11Adapter extends MarketplaceAdapter {
  constructor(config) {
    super('n11', config);
    
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.companyId = config.companyId;
    
    this.validateConfig(['apiKey', 'apiSecret', 'companyId']);
    
    // N11 API endpoints
    this.baseUrl = 'https://api.n11.com/ws';
    
    // N11 specific rate limits
    this.rateLimits = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 60 // 60 requests per minute
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EticaretEntegrator-N11/1.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        // Add authentication headers
        config.headers['X-N11-API-KEY'] = this.apiKey;
        config.headers['X-N11-API-SECRET'] = this.apiSecret;
        config.headers['X-N11-COMPANY-ID'] = this.companyId;
        
        // Add timestamp and signature for security
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(config.method, config.url, timestamp);
        
        config.headers['X-N11-TIMESTAMP'] = timestamp;
        config.headers['X-N11-SIGNATURE'] = signature;
        
        logger.debug(`N11 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`N11 API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.handleApiError(error, 'API_CALL');
        return Promise.reject(error);
      }
    );
  }

  generateSignature(method, url, timestamp) {
    const data = `${method.toUpperCase()}${url}${this.apiKey}${timestamp}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(data)
      .digest('hex');
  }

  async authenticate(credentials) {
    try {
      if (credentials) {
        this.apiKey = credentials.apiKey;
        this.apiSecret = credentials.apiSecret;
        this.companyId = credentials.companyId;
      }

      // Test API connection
      const response = await this.axiosInstance.get('/CategoryService.wsdl', {
        params: {
          'service': 'getCategories',
          'format': 'json'
        }
      });
      
      this.isAuthenticated = true;
      logger.info('N11 authentication successful');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('N11 authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        page = 0,
        size = 50,
        productId,
        barcode,
        keyword
      } = params;
      
      const queryParams = {
        service: 'getProducts',
        format: 'json',
        page: page,
        size: size
      };
      
      if (productId) queryParams.productId = productId;
      if (barcode) queryParams.barcode = barcode;
      if (keyword) queryParams.keyword = keyword;
      
      const response = await this.axiosInstance.get('/ProductService.wsdl', {
        params: queryParams
      });
      
      const data = response.data;
      
      return {
        products: data.products || [],
        totalCount: data.totalCount || 0,
        currentPage: page,
        totalPages: Math.ceil((data.totalCount || 0) / size)
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const n11Product = this.transformProductForN11(productData);
      
      const response = await this.axiosInstance.post('/ProductService.wsdl', {
        service: 'saveProduct',
        format: 'json',
        product: n11Product
      });
      
      return {
        success: true,
        data: response.data,
        productId: response.data.product?.id
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const n11Product = this.transformProductForN11(productData);
      n11Product.id = productId;
      
      const response = await this.axiosInstance.post('/ProductService.wsdl', {
        service: 'updateProduct',
        format: 'json',
        product: n11Product
      });
      
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
      const response = await this.axiosInstance.post('/ProductService.wsdl', {
        service: 'deleteProduct',
        format: 'json',
        productId: productId
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.handleApiError(error, 'DELETE_PRODUCT');
    }
  }

  async updateStock(productId, stock, variantId = null) {
    try {
      const stockData = {
        productId: variantId || productId,
        quantity: stock
      };
      
      const response = await this.axiosInstance.post('/ProductStockService.wsdl', {
        service: 'updateProductStock',
        format: 'json',
        stock: stockData
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
      const priceData = {
        productId: variantId || productId,
        price: price
      };
      
      const response = await this.axiosInstance.post('/ProductService.wsdl', {
        service: 'updateProductPrice',
        format: 'json',
        price: priceData
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
        page = 0,
        size = 50,
        startDate,
        endDate,
        status,
        orderNumber
      } = params;
      
      const queryParams = {
        service: 'getOrders',
        format: 'json',
        page: page,
        size: size
      };
      
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;
      if (status) queryParams.status = status;
      if (orderNumber) queryParams.orderNumber = orderNumber;
      
      const response = await this.axiosInstance.get('/OrderService.wsdl', {
        params: queryParams
      });
      
      const data = response.data;
      
      return {
        orders: data.orders || [],
        totalCount: data.totalCount || 0,
        currentPage: page,
        totalPages: Math.ceil((data.totalCount || 0) / size)
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const orderUpdate = {
        orderId: orderId,
        status: this.mapOrderStatusToN11(status)
      };
      
      if (trackingInfo.trackingNumber) {
        orderUpdate.shipmentInfo = {
          trackingNumber: trackingInfo.trackingNumber,
          shipmentCompany: trackingInfo.company || 'Kargo Şirketi'
        };
      }
      
      const response = await this.axiosInstance.post('/OrderService.wsdl', {
        service: 'updateOrderStatus',
        format: 'json',
        order: orderUpdate
      });
      
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
      const response = await this.axiosInstance.get('/CategoryService.wsdl', {
        params: {
          service: 'getCategories',
          format: 'json'
        }
      });
      
      return response.data.categories || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  async getCategoryAttributes(categoryId) {
    try {
      const response = await this.axiosInstance.get('/CategoryService.wsdl', {
        params: {
          service: 'getCategoryAttributes',
          format: 'json',
          categoryId: categoryId
        }
      });
      
      return response.data.attributes || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORY_ATTRIBUTES');
    }
  }

  // N11 specific transformations
  transformProductForN11(product) {
    const n11Product = {
      title: product.name || product.title,
      subtitle: product.subtitle || '',
      description: product.description || '',
      attributes: product.attributes || {},
      category: {
        id: product.categoryId || null
      },
      price: product.price,
      currencyType: 'TL',
      images: this.transformImagesForN11(product.images || []),
      stockItems: [{
        bundle: false,
        mpn: product.sku || product.id,
        gtin: product.barcode || '',
        oem: product.oem || '',
        quantity: product.stock || 0,
        sellerStockCode: product.sku || product.id,
        attributes: product.variantAttributes || {}
      }],
      saleStartDate: product.saleStartDate || new Date().toISOString(),
      saleEndDate: product.saleEndDate || '',
      productionDate: product.productionDate || '',
      expirationDate: product.expirationDate || '',
      productCondition: 1, // 1: New, 2: Used, 3: Refurbished
      preparingDay: product.preparingDay || 1,
      shipmentTemplate: product.shipmentTemplate || 'default'
    };

    return n11Product;
  }

  transformImagesForN11(images) {
    if (!Array.isArray(images)) return [];
    
    return images.slice(0, 12).map((image, index) => ({
      url: typeof image === 'string' ? image : image.url,
      order: index + 1
    }));
  }

  // Override order status mapping for N11
  mapOrderStatus(n11Status) {
    const statusMap = {
      '1': 'pending',       // Yeni sipariş
      '2': 'confirmed',     // Onaylandı
      '3': 'processing',    // Hazırlanıyor
      '4': 'shipped',       // Kargoya verildi
      '5': 'delivered',     // Teslim edildi
      '6': 'cancelled',     // İptal edildi
      '7': 'returned',      // İade edildi
      '8': 'refunded'       // Para iadesi yapıldı
    };
    
    return statusMap[n11Status?.toString()] || 'pending';
  }

  mapOrderStatusToN11(status) {
    const statusMap = {
      'pending': '1',
      'confirmed': '2',
      'processing': '3',
      'shipped': '4',
      'delivered': '5',
      'cancelled': '6',
      'returned': '7',
      'refunded': '8'
    };
    
    return statusMap[status] || '1';
  }

  // Batch operations
  async batchUpdatePricesAndStock(items) {
    try {
      const batchResults = {
        successful: 0,
        failed: 0,
        details: []
      };

      // N11 doesn't have native batch API, so we process individually
      for (const item of items) {
        try {
          // Update price
          await this.updatePrice(item.productId, item.price);
          
          // Update stock
          await this.updateStock(item.productId, item.stock);
          
          batchResults.successful++;
          batchResults.details.push({
            productId: item.productId,
            status: 'success',
            message: 'Price and stock updated successfully'
          });

          // Add small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1100)); // ~55 requests per minute

        } catch (error) {
          batchResults.failed++;
          batchResults.details.push({
            productId: item.productId,
            status: 'failed',
            error: error.message,
            message: 'Price/stock update failed'
          });
        }
      }

      return {
        success: true,
        batchResults
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  // N11 specific helper methods
  async getProductDetails(productId) {
    try {
      const response = await this.axiosInstance.get('/ProductService.wsdl', {
        params: {
          service: 'getProductByProductId',
          format: 'json',
          productId: productId
        }
      });
      
      return response.data.product || null;
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCT_DETAILS');
    }
  }

  async searchProducts(keyword, categoryId = null) {
    try {
      const params = {
        service: 'searchProducts',
        format: 'json',
        keyword: keyword,
        page: 0,
        size: 100
      };
      
      if (categoryId) {
        params.categoryId = categoryId;
      }
      
      const response = await this.axiosInstance.get('/ProductService.wsdl', {
        params: params
      });
      
      return response.data.products || [];
    } catch (error) {
      this.handleApiError(error, 'SEARCH_PRODUCTS');
    }
  }

  async getShipmentTemplates() {
    try {
      const response = await this.axiosInstance.get('/ShipmentService.wsdl', {
        params: {
          service: 'getShipmentTemplates',
          format: 'json'
        }
      });
      
      return response.data.templates || [];
    } catch (error) {
      this.handleApiError(error, 'GET_SHIPMENT_TEMPLATES');
    }
  }

  // Override base adapter methods for N11 specifics
  async getInfo() {
    return {
      marketplace: 'n11',
      authenticated: this.isAuthenticated,
      baseUrl: this.baseUrl,
      rateLimits: this.rateLimits,
      features: [
        'products',
        'orders', 
        'categories',
        'stock_management',
        'price_management',
        'image_upload',
        'batch_operations'
      ],
      limits: {
        maxImagesPerProduct: 12,
        maxProductTitleLength: 100,
        maxDescriptionLength: 5000,
        requestsPerMinute: 60
      }
    };
  }
}

module.exports = N11Adapter; 