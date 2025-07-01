const axios = require('axios');
const crypto = require('crypto');
const MarketplaceAdapter = require('../core/MarketplaceAdapter');
const logger = require('../utils/logger');

class AmazonAdapter extends MarketplaceAdapter {
  constructor(config) {
    super('amazon', config);
    
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sellerId = config.sellerId;
    this.marketplaceId = config.marketplaceId;
    this.region = config.region || 'eu-west-1';
    this.refreshToken = config.refreshToken;
    
    this.validateConfig(['accessKeyId', 'secretAccessKey', 'sellerId', 'marketplaceId', 'refreshToken']);
    
    // Amazon SP-API endpoints
    this.endpoints = {
      'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
      'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
      'us-west-2': 'https://sellingpartnerapi-fe.amazon.com'
    };
    
    this.baseUrl = this.endpoints[this.region] || this.endpoints['eu-west-1'];
    
    // Amazon specific rate limits
    this.rateLimits = {
      requests: 0,
      window: 60000, // 1 minute
      maxRequests: 10 // Conservative rate limit for Amazon
    };

    this.accessToken = null;
    this.tokenExpiry = null;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EticaretEntegrator-Amazon/1.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        
        // Add authentication token
        if (this.accessToken && this.isTokenValid()) {
          config.headers['x-amz-access-token'] = this.accessToken;
        } else if (!config.url.includes('/auth/o2/token')) {
          // Refresh token if needed
          await this.authenticate();
          config.headers['x-amz-access-token'] = this.accessToken;
        }
        
        // Add AWS signature
        this.addAwsSignature(config);
        
        logger.debug(`Amazon API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`Amazon API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.handleApiError(error, 'API_CALL');
        return Promise.reject(error);
      }
    );
  }

  isTokenValid() {
    return this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  async authenticate(credentials) {
    try {
      if (credentials) {
        this.accessKeyId = credentials.accessKeyId;
        this.secretAccessKey = credentials.secretAccessKey;
        this.refreshToken = credentials.refreshToken;
        this.sellerId = credentials.sellerId;
        this.marketplaceId = credentials.marketplaceId;
      }

      const tokenUrl = 'https://api.amazon.com/auth/o2/token';
      
      const response = await axios.post(tokenUrl, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.accessKeyId,
        client_secret: this.secretAccessKey
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
      this.isAuthenticated = true;
      
      logger.info('Amazon authentication successful');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      this.accessToken = null;
      this.tokenExpiry = null;
      logger.error('Amazon authentication failed:', error);
      throw error;
    }
  }

  addAwsSignature(config) {
    const now = new Date();
    const dateString = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = dateString.substr(0, 8);
    
    config.headers['x-amz-date'] = dateString;
    
    // Create canonical request
    const method = config.method.toUpperCase();
    const uri = config.url;
    const queryString = '';
    const canonicalHeaders = Object.keys(config.headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${config.headers[key]}`)
      .join('\n') + '\n';
    
    const signedHeaders = Object.keys(config.headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');
    
    const hashedPayload = crypto
      .createHash('sha256')
      .update(config.data || '')
      .digest('hex');
    
    const canonicalRequest = [
      method,
      uri,
      queryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload
    ].join('\n');
    
    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/execute-api/aws4_request`;
    const stringToSign = [
      algorithm,
      dateString,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    // Calculate signature
    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');
    
    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    config.headers['Authorization'] = authorizationHeader;
  }

  getSignatureKey(dateStamp) {
    const kDate = crypto.createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('execute-api').digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }

  async getProducts(params = {}) {
    try {
      const { 
        nextToken,
        maxResults = 50,
        asin,
        sku
      } = params;
      
      let url = `/catalog/2022-04-01/items`;
      const queryParams = {
        marketplaceIds: this.marketplaceId,
        pageSize: maxResults
      };
      
      if (nextToken) queryParams.nextToken = nextToken;
      if (asin) queryParams.identifiers = asin;
      if (sku) queryParams.identifiers = sku;
      
      const response = await this.axiosInstance.get(url, { params: queryParams });
      
      return {
        products: response.data.items || [],
        nextToken: response.data.pagination?.nextToken,
        totalCount: response.data.pagination?.totalCount
      };
    } catch (error) {
      this.handleApiError(error, 'GET_PRODUCTS');
    }
  }

  async createProduct(productData) {
    try {
      const amazonProduct = this.transformProductForAmazon(productData);
      
      // Amazon requires product creation via Feeds API
      const feedDocument = await this.createFeedDocument();
      
      // Upload product data to feed document
      await this.uploadToFeedDocument(feedDocument.url, amazonProduct);
      
      // Create feed
      const response = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_PRODUCT_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: feedDocument.feedDocumentId
      });
      
      return {
        success: true,
        data: response.data,
        feedId: response.data.feedId
      };
    } catch (error) {
      this.handleApiError(error, 'CREATE_PRODUCT');
    }
  }

  async updateProduct(productId, productData) {
    try {
      const amazonProduct = this.transformProductForAmazon(productData);
      amazonProduct.sku = productId; // Use productId as SKU
      
      const feedDocument = await this.createFeedDocument();
      await this.uploadToFeedDocument(feedDocument.url, amazonProduct);
      
      const response = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_PRODUCT_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: feedDocument.feedDocumentId
      });
      
      return {
        success: true,
        data: response.data,
        feedId: response.data.feedId
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRODUCT');
    }
  }

  async deleteProduct(productId) {
    try {
      // Amazon doesn't support direct product deletion
      // Instead, set quantity to 0
      await this.updateStock(productId, 0);
      
      return { success: true, message: 'Product quantity set to 0' };
    } catch (error) {
      this.handleApiError(error, 'DELETE_PRODUCT');
    }
  }

  async updateStock(productId, stock, variantId = null) {
    try {
      const inventoryData = {
        sku: productId,
        quantity: stock,
        fulfillmentType: 'MFN' // Merchant Fulfilled Network
      };
      
      const feedDocument = await this.createFeedDocument();
      await this.uploadToFeedDocument(feedDocument.url, inventoryData);
      
      const response = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_INVENTORY_AVAILABILITY_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: feedDocument.feedDocumentId
      });
      
      return {
        success: true,
        data: response.data,
        feedId: response.data.feedId
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_STOCK');
    }
  }

  async updatePrice(productId, price, variantId = null) {
    try {
      const priceData = {
        sku: productId,
        price: {
          ListPrice: {
            Amount: price,
            CurrencyCode: 'USD'
          }
        }
      };
      
      const feedDocument = await this.createFeedDocument();
      await this.uploadToFeedDocument(feedDocument.url, priceData);
      
      const response = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_PRODUCT_PRICING_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: feedDocument.feedDocumentId
      });
      
      return {
        success: true,
        data: response.data,
        feedId: response.data.feedId
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_PRICE');
    }
  }

  async getOrders(params = {}) {
    try {
      const {
        nextToken,
        maxResults = 50,
        createdAfter,
        createdBefore,
        orderStatuses
      } = params;
      
      const queryParams = {
        MarketplaceIds: this.marketplaceId,
        MaxResultsPerPage: maxResults
      };
      
      if (nextToken) queryParams.NextToken = nextToken;
      if (createdAfter) queryParams.CreatedAfter = createdAfter;
      if (createdBefore) queryParams.CreatedBefore = createdBefore;
      if (orderStatuses) queryParams.OrderStatuses = orderStatuses;
      
      const response = await this.axiosInstance.get('/orders/v0/orders', {
        params: queryParams
      });
      
      return {
        orders: response.data.payload?.Orders || [],
        nextToken: response.data.payload?.NextToken,
        totalCount: response.data.payload?.Orders?.length || 0
      };
    } catch (error) {
      this.handleApiError(error, 'GET_ORDERS');
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      // Amazon handles order status automatically
      // This method is mainly for updating shipping information
      
      if (trackingInfo.trackingNumber && trackingInfo.carrierCode) {
        const response = await this.axiosInstance.post(`/orders/v0/orders/${orderId}/shipment`, {
          packageDetail: {
            packageReferenceId: trackingInfo.trackingNumber,
            carrierCode: trackingInfo.carrierCode,
            trackingNumber: trackingInfo.trackingNumber
          }
        });
        
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: true,
        message: 'Amazon handles order status automatically'
      };
    } catch (error) {
      this.handleApiError(error, 'UPDATE_ORDER_STATUS');
    }
  }

  async getCategories() {
    try {
      const response = await this.axiosInstance.get(`/catalog/2022-04-01/items/categories`, {
        params: {
          marketplaceId: this.marketplaceId
        }
      });
      
      return response.data.categories || [];
    } catch (error) {
      this.handleApiError(error, 'GET_CATEGORIES');
    }
  }

  // Amazon specific helper methods
  async createFeedDocument() {
    try {
      const response = await this.axiosInstance.post('/feeds/2021-06-30/documents', {
        contentType: 'text/tab-separated-values; charset=UTF-8'
      });
      
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'CREATE_FEED_DOCUMENT');
    }
  }

  async uploadToFeedDocument(url, data) {
    try {
      const tsvData = this.convertToTSV(data);
      
      await axios.put(url, tsvData, {
        headers: {
          'Content-Type': 'text/tab-separated-values; charset=UTF-8'
        }
      });
    } catch (error) {
      this.handleApiError(error, 'UPLOAD_FEED_DOCUMENT');
    }
  }

  convertToTSV(data) {
    // Convert data to Tab-Separated Values format for Amazon
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0]).join('\t');
      const rows = data.map(item => Object.values(item).join('\t'));
      return [headers, ...rows].join('\n');
    } else {
      const headers = Object.keys(data).join('\t');
      const values = Object.values(data).join('\t');
      return [headers, values].join('\n');
    }
  }

  // Amazon specific transformations
  transformProductForAmazon(product) {
    const amazonProduct = {
      sku: product.sku || product.id,
      'product-id': product.asin || '',
      'product-id-type': product.asin ? 'ASIN' : 'UPC',
      item_name: product.name,
      item_type: 'standard-product-id',
      brand_name: product.brand,
      manufacturer: product.brand,
      'part-number': product.sku,
      'model-number': product.model || product.sku,
      'product-description': product.description,
      'bullet-point1': product.features?.[0] || '',
      'bullet-point2': product.features?.[1] || '',
      'bullet-point3': product.features?.[2] || '',
      'bullet-point4': product.features?.[3] || '',
      'bullet-point5': product.features?.[4] || '',
      'generic-keywords': product.keywords?.join(',') || '',
      'main-image-url': product.images?.[0]?.url || product.images?.[0] || '',
      'other-image-url1': product.images?.[1]?.url || product.images?.[1] || '',
      'other-image-url2': product.images?.[2]?.url || product.images?.[2] || '',
      'other-image-url3': product.images?.[3]?.url || product.images?.[3] || '',
      'other-image-url4': product.images?.[4]?.url || product.images?.[4] || '',
      'parentage': 'parent',
      'relationship-type': '',
      'variation-theme': '',
      'update-delete': '',
      'recommended-browse-nodes': '',
      'search-terms': product.searchTerms?.join(',') || '',
      'enclosure-material': '',
      'pattern': '',
      'department': product.department || 'unisex-adult'
    };

    return amazonProduct;
  }

  // Override order status mapping for Amazon
  mapOrderStatus(amazonStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Unshipped': 'confirmed',
      'PartiallyShipped': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Canceled': 'cancelled',
      'Returned': 'returned',
      'Refunded': 'returned'
    };
    
    return statusMap[amazonStatus] || 'pending';
  }

  // Batch operations
  async batchUpdatePricesAndStock(items) {
    try {
      // Amazon requires separate feeds for prices and inventory
      const priceItems = items.map(item => ({
        sku: item.sku,
        price: {
          ListPrice: {
            Amount: item.price,
            CurrencyCode: 'USD'
          }
        }
      }));

      const stockItems = items.map(item => ({
        sku: item.sku,
        quantity: item.stock,
        fulfillmentType: 'MFN'
      }));

      // Create price feed
      const priceFeedDoc = await this.createFeedDocument();
      await this.uploadToFeedDocument(priceFeedDoc.url, priceItems);
      
      const priceResponse = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_PRODUCT_PRICING_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: priceFeedDoc.feedDocumentId
      });

      // Create stock feed
      const stockFeedDoc = await this.createFeedDocument();
      await this.uploadToFeedDocument(stockFeedDoc.url, stockItems);
      
      const stockResponse = await this.axiosInstance.post('/feeds/2021-06-30/feeds', {
        feedType: 'POST_INVENTORY_AVAILABILITY_DATA',
        marketplaceIds: [this.marketplaceId],
        inputFeedDocumentId: stockFeedDoc.feedDocumentId
      });

      return {
        success: true,
        priceUpdates: {
          feedId: priceResponse.data.feedId,
          total: items.length
        },
        stockUpdates: {
          feedId: stockResponse.data.feedId,
          total: items.length
        }
      };
    } catch (error) {
      this.handleApiError(error, 'BATCH_UPDATE_PRICES_STOCK');
    }
  }

  // Get feed processing status
  async getFeedStatus(feedId) {
    try {
      const response = await this.axiosInstance.get(`/feeds/2021-06-30/feeds/${feedId}`);
      
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'GET_FEED_STATUS');
    }
  }
}

module.exports = AmazonAdapter; 