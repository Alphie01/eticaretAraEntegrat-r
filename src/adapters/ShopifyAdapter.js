const axios = require('axios');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class ShopifyAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('shopify', config);
    
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.apiVersion = config.apiVersion || '2023-10';
    
    this.validateConfig(['shopDomain', 'accessToken']);
    
    // Shopify Admin API endpoints
    this.baseUrl = `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}`;
    
    // Shopify specific rate limits (40 requests per second burst, 2 requests per second sustained)
    this.rateLimits = {
      requests: 0,
      window: 1000, // 1 second
      maxRequests: 2, // Conservative limit for sustained usage
      burstRequests: 0,
      burstWindow: 1000,
      maxBurstRequests: 40
    };

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        'User-Agent': 'EticaretEntegrator-Shopify/1.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        logger.debug(`Shopify API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Handle Shopify rate limit headers
        if (response.headers['x-shopify-shop-api-call-limit']) {
          const limit = response.headers['x-shopify-shop-api-call-limit'];
          const [used, total] = limit.split('/').map(Number);
          
          if (used >= total * 0.8) { // 80% threshold
            logger.warn(`Shopify rate limit approaching: ${used}/${total}`);
          }
        }
        
        logger.debug(`Shopify API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 1;
          logger.warn(`Shopify rate limit exceeded, retry after ${retryAfter}s`);
        }
        
        this.handleApiError(error, 'API_CALL');
        return Promise.reject(error);
      }
    );
  }

  async authenticate(credentials) {
    try {
      if (credentials) {
        this.shopDomain = credentials.shopDomain;
        this.accessToken = credentials.accessToken;
        this.apiKey = credentials.apiKey;
        this.apiSecret = credentials.apiSecret;
        
        // Update headers
        this.axiosInstance.defaults.headers['X-Shopify-Access-Token'] = this.accessToken;
        this.axiosInstance.defaults.baseURL = `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}`;
      }

      // Test API connection by getting shop info
      const response = await this.axiosInstance.get('/shop.json');
      
      this.isAuthenticated = true;
      this.shopInfo = response.data.shop;
      
      logger.info(`Shopify authentication successful: ${this.shopInfo.name}`);
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      logger.error('Shopify authentication failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      const { 
        page = 1,
        limit = 50,
        ids,
        vendor,
        product_type,
        collection_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        published_status = 'published',
        fields
      } = params;
      
      const queryParams = {
        limit: Math.min(limit, 250), // Shopify max is 250
        page: page,
        published_status: published_status
      };
      
      if (ids) queryParams.ids = Array.isArray(ids) ? ids.join(',') : ids;
      if (vendor) queryParams.vendor = vendor;
      if (product_type) queryParams.product_type = product_type;
      if (collection_id) queryParams.collection_id = collection_id;
      if (created_at_min) queryParams.created_at_min = created_at_min;
      if (created_at_max) queryParams.created_at_max = created_at_max;
      if (updated_at_min) queryParams.updated_at_min = updated_at_min;
      if (updated_at_max) queryParams.updated_at_max = updated_at_max;
      if (fields) queryParams.fields = fields;
      
      const response = await this.axiosInstance.get('/products.json', {
        params: queryParams
      });
      
      return {
        products: response.data.products || [],
        totalCount: response.data.products?.length || 0,
        hasNextPage: response.data.products?.length === limit,
        nextPageInfo: response.headers.link ? this.parseLinkHeader(response.headers.link) : null
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const shopifyProduct = this.transformProductForShopify(productData);
      
      const response = await this.axiosInstance.post('/products.json', {
        product: shopifyProduct
      });
      
      return {
        success: true,
        data: response.data.product,
        productId: response.data.product.id
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const shopifyProduct = this.transformProductForShopify(productData);
      
      const response = await this.axiosInstance.put(`/products/${productId}.json`, {
        product: shopifyProduct
      });
      
      return {
        success: true,
        data: response.data.product
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRODUCT');
    }
  }

  async deleteProduct(productId) {
    try {
      await this.axiosInstance.delete(`/products/${productId}.json`);
      
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
      if (variantId) {
        // Update specific variant
        const response = await this.axiosInstance.put(`/variants/${variantId}.json`, {
          variant: {
            id: variantId,
            inventory_quantity: stock
          }
        });
        
        return {
          success: true,
          data: response.data.variant
        };
      } else {
        // Update first variant of the product
        const product = await this.getProductById(productId);
        if (product.variants && product.variants.length > 0) {
          const firstVariant = product.variants[0];
          return await this.updateStock(productId, stock, firstVariant.id);
        }
      }
    } catch (error) {
      this.handleApiError(error, 'UPDATE_STOCK');
    }
  }

  async updatePrice(productId, price, variantId = null) {
    try {
      if (variantId) {
        // Update specific variant price
        const response = await this.axiosInstance.put(`/variants/${variantId}.json`, {
          variant: {
            id: variantId,
            price: price.toString()
          }
        });
        
        return {
          success: true,
          data: response.data.variant
        };
      } else {
        // Update first variant of the product
        const product = await this.getProductById(productId);
        if (product.variants && product.variants.length > 0) {
          const firstVariant = product.variants[0];
          return await this.updatePrice(productId, price, firstVariant.id);
        }
      }
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRICE');
    }
  }

  async getOrders(params = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        ids,
        status = 'any',
        financial_status,
        fulfillment_status,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        processed_at_min,
        processed_at_max,
        fields
      } = params;
      
      const queryParams = {
        limit: Math.min(limit, 250),
        page: page,
        status: status
      };
      
      if (ids) queryParams.ids = Array.isArray(ids) ? ids.join(',') : ids;
      if (financial_status) queryParams.financial_status = financial_status;
      if (fulfillment_status) queryParams.fulfillment_status = fulfillment_status;
      if (created_at_min) queryParams.created_at_min = created_at_min;
      if (created_at_max) queryParams.created_at_max = created_at_max;
      if (updated_at_min) queryParams.updated_at_min = updated_at_min;
      if (updated_at_max) queryParams.updated_at_max = updated_at_max;
      if (processed_at_min) queryParams.processed_at_min = processed_at_min;
      if (processed_at_max) queryParams.processed_at_max = processed_at_max;
      if (fields) queryParams.fields = fields;
      
      const response = await this.axiosInstance.get('/orders.json', {
        params: queryParams
      });
      
      return {
        orders: response.data.orders || [],
        totalCount: response.data.orders?.length || 0,
        hasNextPage: response.data.orders?.length === limit,
        nextPageInfo: response.headers.link ? this.parseLinkHeader(response.headers.link) : null
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const order = await this.getOrderById(orderId);
      
      if (status === 'fulfilled' || status === 'shipped') {
        // Create fulfillment
        const fulfillmentData = {
          location_id: order.fulfillments?.[0]?.location_id || null,
          tracking_number: trackingInfo.trackingNumber || null,
          tracking_company: trackingInfo.company || null,
          tracking_url: trackingInfo.trackingUrl || null,
          notify_customer: trackingInfo.notifyCustomer !== false
        };

        const response = await this.axiosInstance.post(`/orders/${orderId}/fulfillments.json`, {
          fulfillment: fulfillmentData
        });
        
        return {
          success: true,
          data: response.data.fulfillment
        };
      } else {
        // Update order status
        const orderUpdate = {};
        
        if (status === 'cancelled') {
          orderUpdate.cancelled_at = new Date().toISOString();
          orderUpdate.cancel_reason = trackingInfo.reason || 'other';
        }
        
        const response = await this.axiosInstance.put(`/orders/${orderId}.json`, {
          order: orderUpdate
        });
        
        return {
          success: true,
          data: response.data.order
        };
      }
    } catch (error) {
      this.handleApiError(error, 'UPDATE_ORDER_STATUS');
    }
  }

  async getCategories() {
    try {
      // Shopify uses collections instead of categories
      const response = await this.axiosInstance.get('/collections.json');
      
      return response.data.collections || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // Shopify specific methods
  async getProductById(productId) {
    try {
      const response = await this.axiosInstance.get(`/products/${productId}.json`);
      return response.data.product;
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCT_BY_ID');
    }
  }

  async getOrderById(orderId) {
    try {
      const response = await this.axiosInstance.get(`/orders/${orderId}.json`);
      return response.data.order;
    } catch (error) {
      this.handleApiError(error, 'GET_ORDER_BY_ID');
    }
  }

  async getVariants(productId) {
    try {
      const response = await this.axiosInstance.get(`/products/${productId}/variants.json`);
      return response.data.variants || [];
    } catch (error) {
      this.handleApiError(error, 'GET_VARIANTS');
    }
  }

  async updateVariant(variantId, variantData) {
    try {
      const response = await this.axiosInstance.put(`/variants/${variantId}.json`, {
        variant: variantData
      });
      
      return {
        success: true,
        data: response.data.variant
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_VARIANT');
    }
  }

  async getInventoryLevels(inventoryItemId) {
    try {
      const response = await this.axiosInstance.get('/inventory_levels.json', {
        params: { inventory_item_ids: inventoryItemId }
      });
      
      return response.data.inventory_levels || [];
    } catch (error) {
      this.handleApiError(error, 'GET_INVENTORY_LEVELS');
    }
  }

  async updateInventoryLevel(inventoryItemId, locationId, quantity) {
    try {
      const response = await this.axiosInstance.post('/inventory_levels/set.json', {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available: quantity
      });
      
      return {
        success: true,
        data: response.data.inventory_level
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_INVENTORY_LEVEL');
    }
  }

  async getWebhooks() {
    try {
      const response = await this.axiosInstance.get('/webhooks.json');
      return response.data.webhooks || [];
    } catch (error) {
      this.handleApiError(error, 'GET_WEBHOOKS');
    }
  }

  async createWebhook(webhookData) {
    try {
      const response = await this.axiosInstance.post('/webhooks.json', {
        webhook: webhookData
      });
      
      return {
        success: true,
        data: response.data.webhook
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_WEBHOOK');
    }
  }

  // Shopify specific transformations
  transformProductForShopify(product) {
    const shopifyProduct = {
      title: product.name || product.title,
      body_html: product.description || '',
      vendor: product.brand || product.vendor || '',
      product_type: product.category || product.product_type || '',
      tags: product.tags || (product.keywords ? product.keywords.join(',') : ''),
      published: product.published !== false,
      status: product.status || 'active',
      images: this.transformImagesForShopify(product.images || []),
      options: this.transformOptionsForShopify(product.options || []),
      variants: this.transformVariantsForShopify(product.variants || [
        {
          price: product.price || 0,
          inventory_quantity: product.stock || 0,
          sku: product.sku || '',
          barcode: product.barcode || '',
          weight: product.weight || 0,
          weight_unit: 'kg'
        }
      ])
    };

    // Add SEO fields if available
    if (product.seo_title || product.seo_description) {
      shopifyProduct.metafields_global_title_tag = product.seo_title;
      shopifyProduct.metafields_global_description_tag = product.seo_description;
    }

    return shopifyProduct;
  }

  transformImagesForShopify(images) {
    if (!Array.isArray(images)) return [];
    
    return images.map((image, index) => ({
      src: typeof image === 'string' ? image : image.url || image.src,
      position: index + 1,
      alt: typeof image === 'object' ? image.alt : ''
    }));
  }

  transformOptionsForShopify(options) {
    if (!Array.isArray(options) || options.length === 0) {
      return [{ name: 'Title', values: ['Default Title'] }];
    }
    
    return options.map(option => ({
      name: option.name,
      values: option.values || []
    }));
  }

  transformVariantsForShopify(variants) {
    return variants.map((variant, index) => ({
      option1: variant.option1 || 'Default Title',
      option2: variant.option2 || null,
      option3: variant.option3 || null,
      price: variant.price?.toString() || '0.00',
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      inventory_quantity: variant.inventory_quantity || variant.stock || 0,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      fulfillment_service: 'manual',
      weight: variant.weight || 0,
      weight_unit: variant.weight_unit || 'kg',
      requires_shipping: variant.requires_shipping !== false,
      taxable: variant.taxable !== false,
      compare_at_price: variant.compare_at_price ? variant.compare_at_price.toString() : null
    }));
  }

  // Override order status mapping for Shopify
  mapOrderStatus(shopifyStatus, fulfillmentStatus, financialStatus) {
    // Shopify has complex status system
    if (shopifyStatus === 'cancelled') return 'cancelled';
    if (fulfillmentStatus === 'fulfilled') return 'delivered';
    if (fulfillmentStatus === 'partial') return 'processing';
    if (financialStatus === 'paid') return 'confirmed';
    if (financialStatus === 'pending') return 'pending';
    if (financialStatus === 'refunded') return 'refunded';
    
    return 'pending';
  }

  // Batch operations
  async batchUpdatePricesAndStock(items) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        details: []
      };

      // Shopify doesn't have native batch API, process individually with rate limiting
      for (const item of items) {
        try {
          if (item.variantId) {
            // Update variant directly
            const variantUpdate = {};
            if (item.price !== undefined) variantUpdate.price = item.price.toString();
            if (item.stock !== undefined) variantUpdate.inventory_quantity = item.stock;
            
            await this.updateVariant(item.variantId, variantUpdate);
          } else {
            // Update product's first variant
            if (item.price !== undefined) {
              await this.updatePrice(item.productId, item.price);
            }
            if (item.stock !== undefined) {
              await this.updateStock(item.productId, item.stock);
            }
          }
          
          results.successful++;
          results.details.push({
            productId: item.productId,
            variantId: item.variantId,
            status: 'success',
            message: 'Price/stock updated successfully'
          });

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 500)); // 2 requests per second

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
      }

      return {
        success: true,
        batchResults: results
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  // Helper methods
  parseLinkHeader(linkHeader) {
    const links = {};
    const parts = linkHeader.split(',');
    
    parts.forEach(part => {
      const section = part.split(';');
      if (section.length !== 2) return;
      
      const url = section[0].replace(/<(.*)>/, '$1').trim();
      const rel = section[1].replace(/rel="(.*)"/, '$1').trim();
      links[rel] = url;
    });
    
    return links;
  }

  // Override base adapter methods for Shopify specifics
  async getInfo() {
    return {
      marketplace: 'shopify',
      authenticated: this.isAuthenticated,
      shopInfo: this.shopInfo,
      baseUrl: this.baseUrl,
      apiVersion: this.apiVersion,
      rateLimits: this.rateLimits,
      features: [
        'products',
        'variants',
        'orders',
        'collections',
        'inventory_management',
        'webhooks',
        'fulfillments',
        'metafields',
        'seo_optimization',
        'multi_variant_support',
        'image_management'
      ],
      limits: {
        maxVariantsPerProduct: 100,
        maxImagesPerProduct: 250,
        maxOptionsPerProduct: 3,
        maxValuesPerOption: 255,
        requestsPerSecond: 2,
        burstRequestsPerSecond: 40
      }
    };
  }
}

module.exports = ShopifyAdapter; 