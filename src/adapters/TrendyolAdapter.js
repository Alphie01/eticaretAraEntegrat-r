const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class TrendyolAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('trendyol', config);
    
    this.baseUrl = config.baseUrl || 'https://api.trendyol.com';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.supplierId = config.supplierId;
    
    this.validateConfig(['apiKey', 'apiSecret', 'supplierId']);
    
    // Trendyol specific rate limits
    this.rateLimits = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 45 // Trendyol allows 45 requests per minute
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EticaretEntegrator-Trendyol/1.0'
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
        const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        config.headers.Authorization = `Basic ${credentials}`;
        
        logger.debug(`Trendyol API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Trendyol API Response: ${response.status} ${response.config.url}`);
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
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      this.supplierId = credentials.supplierId;
      
      // Test authentication with a simple API call
      await this.axiosInstance.get(`/sapigw/suppliers/${this.supplierId}/products`, {
        params: { page: 0, size: 1 }
      });
      
      this.isAuthenticated = true;
      logger.info('Trendyol authentication successful');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('Trendyol authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { page = 0, size = 50, approved = true, barcode } = params;
      
      const response = await this.axiosInstance.get(`/sapigw/suppliers/${this.supplierId}/products`, {
        params: { page, size, approved, barcode }
      });
      
      return {
        products: response.data.content || [],
        totalElements: response.data.totalElements,
        totalPages: response.data.totalPages,
        page: response.data.page
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const trendyolProduct = this.transformProductForTrendyol(productData);
      
      const response = await this.axiosInstance.post(
        `/sapigw/suppliers/${this.supplierId}/v2/products`,
        trendyolProduct
      );
      
      return {
        success: true,
        data: response.data,
        productId: response.data.id,
        batchRequestId: response.data.batchRequestId
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const trendyolProduct = this.transformProductForTrendyol(productData);
      
      const response = await this.axiosInstance.put(
        `/sapigw/suppliers/${this.supplierId}/v2/products`,
        trendyolProduct
      );
      
      return {
        success: true,
        data: response.data,
        batchRequestId: response.data.batchRequestId
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRODUCT');
    }
  }

  async deleteProduct(productId) {
    try {
      await this.axiosInstance.delete(
        `/sapigw/suppliers/${this.supplierId}/products/${productId}`
      );
      
      return { success: true };
    } catch (error) {
      this.handleApiError(error, 'DELETE_PRODUCT');
    }
  }

  async updateStock(productId, stock, variantId = null) {
    try {
      const stockData = {
        items: [{
          barcode: productId, // Trendyol uses barcode for stock updates
          quantity: stock
        }]
      };
      
      const response = await this.axiosInstance.post(
        `/sapigw/suppliers/${this.supplierId}/stocks`,
        stockData
      );
      
      return {
        success: true,
        data: response.data,
        batchRequestId: response.data.batchRequestId
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_STOCK');
    }
  }

  async updatePrice(productId, price, variantId = null) {
    try {
      const priceData = {
        items: [{
          barcode: productId, // Trendyol uses barcode for price updates
          salePrice: price,
          listPrice: price * 1.2 // Typically 20% higher than sale price
        }]
      };
      
      const response = await this.axiosInstance.post(
        `/sapigw/suppliers/${this.supplierId}/products/price-and-inventory`,
        priceData
      );
      
      return {
        success: true,
        data: response.data,
        batchRequestId: response.data.batchRequestId
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
        status,
        allStatuses = false,
        orderByField = 'PackageLastModifiedDate',
        orderByDirection = 'DESC',
        startDate,
        endDate
      } = params;
      
      // Trendyol'da mevcut tüm sipariş statüleri
      const allTrendyolStatuses = [
        'Created',
        'Confirmed', 
        'Picking',
        'Invoiced',
        'Shipped',
        'Delivered',
        'UnDelivered',
        'Cancelled',
        'Returned'
      ];
      
      let allOrders = [];
      let totalElements = 0;
      let totalPages = 0;
      
      if (allStatuses) {
        // Tüm statülerdeki siparişleri çek
        logger.info(`Fetching orders for all statuses: ${allTrendyolStatuses.join(', ')}`);
        
        for (const statusValue of allTrendyolStatuses) {
          try {
            const response = await this.axiosInstance.get(`/sapigw/suppliers/${this.supplierId}/orders`, {
              params: {
                page,
                size,
                status: statusValue,
                orderByField,
                orderByDirection,
                startDate,
                endDate
              }
            });
            
            if (response.data.content && response.data.content.length > 0) {
              allOrders = allOrders.concat(response.data.content);
              totalElements += response.data.totalElements || 0;
              totalPages = Math.max(totalPages, response.data.totalPages || 0);
              
              logger.info(`Found ${response.data.content.length} orders with status: ${statusValue}`);
            }
          } catch (statusError) {
            logger.warn(`Failed to fetch orders for status ${statusValue}:`, statusError.message);
            // Continue with other statuses even if one fails
          }
        }
        
        // Remove duplicate orders (by orderNumber)
        const uniqueOrders = [];
        const seenOrderNumbers = new Set();
        
        for (const order of allOrders) {
          if (!seenOrderNumbers.has(order.orderNumber)) {
            seenOrderNumbers.add(order.orderNumber);
            uniqueOrders.push(order);
          }
        }
        
        logger.info(`Total unique orders found across all statuses: ${uniqueOrders.length}`);
        
        return {
          orders: uniqueOrders,
          totalElements: uniqueOrders.length,
          totalPages: Math.ceil(uniqueOrders.length / size),
          page: page
        };
      } else {
        // Tek bir statü veya status parametresi olmadan normal çağrı
        const response = await this.axiosInstance.get(`/sapigw/suppliers/${this.supplierId}/orders`, {
          params: {
            page,
            size,
            status,
            orderByField,
            orderByDirection,
            startDate,
            endDate
          }
        });
        
        return {
          orders: response.data.content || [],
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page
        };
      }
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const statusData = {
        status,
        ...trackingInfo
      };
      
      const response = await this.axiosInstance.put(
        `/sapigw/suppliers/${this.supplierId}/orders/${orderId}/status`,
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
      const response = await this.axiosInstance.get('/sapigw/product-categories');
      
      return response.data.categories || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // Trendyol specific transformations
  transformProductForTrendyol(product) {
    const trendyolProduct = {
      title: product.name,
      productMainId: product.sku || product.id,
      brandId: this.getBrandId(product.brand),
      categoryId: this.getCategoryId(product.category),
      description: product.description,
      currencyType: 'TRY',
      listPrice: product.basePrice * 1.2,
      salePrice: product.basePrice,
      cargoCompanyId: 10, // Default cargo company
      images: product.images?.map(img => ({ url: img.url })) || [],
      attributes: this.transformAttributes(product.specifications || []),
      variants: []
    };

    // Transform variants
    if (product.variants && product.variants.length > 0) {
      trendyolProduct.variants = product.variants.map(variant => ({
        barcode: variant.sku,
        quantity: variant.stock,
        salePrice: variant.price,
        listPrice: variant.price * 1.2,
        images: variant.images?.map(url => ({ url })) || [],
        attributes: this.transformVariantAttributes(variant.attributes || [])
      }));
    }

    return trendyolProduct;
  }

  transformAttributes(specifications) {
    return specifications.map(spec => ({
      attributeId: this.getAttributeId(spec.name),
      attributeValueId: this.getAttributeValueId(spec.name, spec.value),
      customAttributeValue: spec.value
    }));
  }

  transformVariantAttributes(attributes) {
    return attributes.map(attr => ({
      attributeId: this.getAttributeId(attr.name),
      attributeValueId: this.getAttributeValueId(attr.name, attr.value)
    }));
  }

  // Helper methods for ID mappings (these would typically come from cache or database)
  getBrandId(brandName) {
    // This should be implemented to map brand names to Trendyol brand IDs
    // For now, returning a default ID
    return 1;
  }

  getCategoryId(categoryName) {
    // This should be implemented to map category names to Trendyol category IDs
    // For now, returning a default ID
    return 1;
  }

  getAttributeId(attributeName) {
    // This should be implemented to map attribute names to Trendyol attribute IDs
    return 1;
  }

  getAttributeValueId(attributeName, value) {
    // This should be implemented to map attribute values to Trendyol attribute value IDs
    return 1;
  }

  // Override order status mapping for Trendyol
  mapOrderStatus(trendyolStatus) {
    const statusMap = {
      'Created': 'pending',           // Sipariş oluşturuldu
      'Confirmed': 'confirmed',       // Sipariş onaylandı
      'Picking': 'processing',        // Hazırlanıyor
      'Picked': 'processing',         // Hazırlandı
      'Invoiced': 'processing',       // Faturalandı
      'Shipped': 'shipped',           // Kargoya verildi
      'Delivered': 'delivered',       // Teslim edildi
      'UnDelivered': 'returned',      // Teslim edilemedi
      'Cancelled': 'cancelled',       // İptal edildi
      'Returned': 'returned'          // İade edildi
    };
    
    const mappedStatus = statusMap[trendyolStatus];
    if (!mappedStatus) {
      logger.warn(`Unknown Trendyol order status: ${trendyolStatus}, defaulting to 'pending'`);
    }
    
    return mappedStatus || 'pending';
  }

  // Batch operations for bulk sync
  async batchUpdatePricesAndStock(items) {
    try {
      const batchData = {
        items: items.map(item => ({
          barcode: item.barcode,
          quantity: item.stock,
          salePrice: item.price,
          listPrice: item.price * 1.2
        }))
      };
      
      const response = await this.axiosInstance.post(
        `/sapigw/suppliers/${this.supplierId}/products/price-and-inventory`,
        batchData
      );
      
      return {
        success: true,
        data: response.data,
        batchRequestId: response.data.batchRequestId
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  // Get batch request status
  async getBatchRequestResult(batchRequestId) {
    try {
      const response = await this.axiosInstance.get(
        `/sapigw/suppliers/${this.supplierId}/products/batch-requests/${batchRequestId}`
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'GET_BATCH_REQUEST_RESULT');
    }
  }
}

module.exports = TrendyolAdapter; 