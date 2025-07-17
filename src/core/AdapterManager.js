const TrendyolAdapter = require('../adapters/TrendyolAdapter');
const HepsiburadaAdapter = require('../adapters/HepsiburadaAdapter');
const AmazonAdapter = require('../adapters/AmazonAdapter');
const N11Adapter = require('../adapters/N11Adapter');
const ShopifyAdapter = require('../adapters/ShopifyAdapter');
const CicekSepetiAdapter = require('../adapters/CicekSepetiAdapter');
const PazaramaAdapter = require('../adapters/PazaramaAdapter');
const PTTAVMAdapter = require('../adapters/PTTAVMAdapter');

const logger = require('../utils/logger');
const { User } = require('../models');
const { 
  getUserTrendyolCredentials, 
  getUserHepsiburadaCredentials,
  getUserAmazonCredentials,
  getUserN11Credentials,
  getUserShopifyCredentials,
  getUserCicekSepetiCredentials,
  getUserPazaramaCredentials,
  getUserPTTAVMCredentials,
  getAllUserMarketplaceCredentials 
} = require('../utils/userCredentialsHelper');

class AdapterManager {
  constructor() {
    this.adapters = new Map();
    this.enabledMarketplaces = this.checkEnabledMarketplaces();
    this.adapterClasses = this.getAdapterClasses();
    
    logger.info(`AdapterManager initialized with marketplaces: ${this.enabledMarketplaces.join(', ')}`);
  }

  /**
   * Check which marketplaces are enabled based on environment variables
   */
  checkEnabledMarketplaces() {
    const enabled = [];
    
    // Check Trendyol
    if (process.env.TRENDYOL_API_KEY && process.env.TRENDYOL_API_SECRET && process.env.TRENDYOL_SUPPLIER_ID) {
      enabled.push('trendyol');
      logger.info('Trendyol integration enabled');
    } else {
      logger.warn('Trendyol integration disabled - missing API credentials in environment variables');
    }
    
    // Check Hepsiburada
    if (process.env.HEPSIBURADA_USERNAME && process.env.HEPSIBURADA_PASSWORD) {
      enabled.push('hepsiburada');
      logger.info('Hepsiburada integration enabled');
    } else {
      logger.warn('Hepsiburada integration disabled - missing API credentials in environment variables');
    }
    
    // Check Amazon
    if (process.env.AMAZON_ACCESS_KEY_ID && process.env.AMAZON_SECRET_ACCESS_KEY && 
        process.env.AMAZON_SELLER_ID && process.env.AMAZON_REFRESH_TOKEN) {
      enabled.push('amazon');
      logger.info('Amazon integration enabled');
    } else {
      logger.warn('Amazon integration disabled - missing API credentials in environment variables');
    }
    
    // Check N11
    if (process.env.N11_API_KEY && process.env.N11_API_SECRET && process.env.N11_COMPANY_ID) {
      enabled.push('n11');
      logger.info('N11 integration enabled');
    } else {
      logger.warn('N11 integration disabled - missing API credentials in environment variables');
    }
    
    // Check Shopify
    if (process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN) {
      enabled.push('shopify');
      logger.info('Shopify integration enabled');
    } else {
      logger.warn('Shopify integration disabled - missing API credentials in environment variables');
    }
    
    // Check ÇiçekSepeti
    if (process.env.CICEKSEPETI_API_KEY) {
      enabled.push('ciceksepeti');
      logger.info('ÇiçekSepeti integration enabled');
    } else {
      logger.warn('ÇiçekSepeti integration disabled - missing API credentials in environment variables');
    }
    
    // Check Pazarama
    if (process.env.PAZARAMA_API_KEY && process.env.PAZARAMA_API_SECRET) {
      enabled.push('pazarama');
      logger.info('Pazarama integration enabled');
    } else {
      logger.warn('Pazarama integration disabled - missing API credentials in environment variables');
    }
    
    // Check PTT AVM
    if (process.env.PTTAVM_API_KEY && process.env.PTTAVM_API_SECRET) {
      enabled.push('pttavm');
      logger.info('PTT AVM integration enabled');
    } else {
      logger.warn('PTT AVM integration disabled - missing API credentials in environment variables');
    }
    
    if (enabled.length === 0) {
      logger.warn('No marketplace integrations enabled! Please check your environment variables.');
    }
    
    return enabled;
  }

  /**
   * Get adapter classes for enabled marketplaces only
   */
  getAdapterClasses() {
    const classes = {};
    
    if (this.enabledMarketplaces.includes('trendyol')) {
      classes.trendyol = TrendyolAdapter;
    }
    
    if (this.enabledMarketplaces.includes('hepsiburada')) {
      classes.hepsiburada = HepsiburadaAdapter;
    }
    
    if (this.enabledMarketplaces.includes('amazon')) {
      classes.amazon = AmazonAdapter;
    }
    
    if (this.enabledMarketplaces.includes('n11')) {
      classes.n11 = N11Adapter;
    }
    
    if (this.enabledMarketplaces.includes('shopify')) {
      classes.shopify = ShopifyAdapter;
    }
    
    if (this.enabledMarketplaces.includes('ciceksepeti')) {
      classes.ciceksepeti = CicekSepetiAdapter;
    }
    
    if (this.enabledMarketplaces.includes('pazarama')) {
      classes.pazarama = PazaramaAdapter;
    }
    
    if (this.enabledMarketplaces.includes('pttavm')) {
      classes.pttavm = PTTAVMAdapter;
    }
    
    return classes;
  }

  /**
   * Check if a marketplace is enabled
   */
  isMarketplaceEnabled(marketplace) {
    return this.enabledMarketplaces.includes(marketplace);
  }

  /**
   * Get or create adapter for a user and marketplace
   */
  async getAdapter(userId, marketplace) {
    // Check if marketplace is enabled
    if (!this.isMarketplaceEnabled(marketplace)) {
      throw new Error(`Marketplace ${marketplace} is not enabled. Please check environment variables for API credentials.`);
    }

    const adapterKey = `${userId}-${marketplace}`;
    
    // Return existing adapter if available and authenticated
    if (this.adapters.has(adapterKey)) {
      const adapter = this.adapters.get(adapterKey);
      if (adapter.isAuthenticated) {
        return adapter;
      }
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const AdapterClass = this.adapterClasses[marketplace];
    if (!AdapterClass) {
      throw new Error(`Adapter not found for marketplace: ${marketplace}`);
    }

    // Get credentials using userCredentialsHelper
    let credentials;
    switch (marketplace) {
      case 'trendyol':
        credentials = await getUserTrendyolCredentials(userId);
        break;
      case 'hepsiburada':
        credentials = await getUserHepsiburadaCredentials(userId);
        break;
      case 'amazon':
        credentials = await getUserAmazonCredentials(userId);
        break;
      case 'n11':
        credentials = await getUserN11Credentials(userId);
        break;
      case 'shopify':
        credentials = await getUserShopifyCredentials(userId);
        break;
      case 'ciceksepeti':
        credentials = await getUserCicekSepetiCredentials(userId);
        break;
      case 'pazarama':
        credentials = await getUserPazaramaCredentials(userId);
        break;
      case 'pttavm':
        credentials = await getUserPTTAVMCredentials(userId);
        break;
      default:
        throw new Error(`Credentials helper not implemented for marketplace: ${marketplace}`);
    }

    if (!credentials) {
      throw new Error(`Credentials not found for marketplace ${marketplace}. Please configure your API keys.`);
    }

    // Create adapter with credentials
    const adapter = new AdapterClass(credentials);
    
    // Authenticate
    try {
      await adapter.authenticate(credentials);
      this.adapters.set(adapterKey, adapter);
      
      logger.info(`Adapter created and authenticated for user ${userId}, marketplace ${marketplace} using ${credentials.source} credentials`);
      return adapter;
    } catch (error) {
      logger.error(`Failed to authenticate adapter for ${marketplace}:`, error);
      throw error;
    }
  }

  /**
   * Get all adapters for a user
   */
  async getUserAdapters(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const adapters = {};
    const allCredentials = await getAllUserMarketplaceCredentials(userId);
    
    // Try to get adapters for all enabled marketplaces where user has credentials
    for (const marketplace of this.enabledMarketplaces) {
      if (allCredentials[marketplace]) {
        try {
          adapters[marketplace] = await this.getAdapter(userId, marketplace);
        } catch (error) {
          logger.warn(`Failed to get adapter for ${marketplace}:`, error.message);
          adapters[marketplace] = { error: error.message };
        }
      } else {
        adapters[marketplace] = { 
          error: `No credentials found for ${marketplace}. Please configure your API keys.`
        };
      }
    }

    return adapters;
  }

  /**
   * Execute operation on multiple marketplaces
   */
  async executeOnMarketplaces(userId, marketplaces, operation, params = {}) {
    const results = {};
    const adapters = await this.getUserAdapters(userId);

    for (const marketplace of marketplaces) {
      if (!adapters[marketplace] || adapters[marketplace].error) {
        results[marketplace] = {
          success: false,
          error: adapters[marketplace]?.error || 'Adapter not available'
        };
        continue;
      }

      try {
        const adapter = adapters[marketplace];
        const result = await adapter[operation](params);
        results[marketplace] = {
          success: true,
          data: result
        };
      } catch (error) {
        logger.error(`Operation ${operation} failed for ${marketplace}:`, error);
        results[marketplace] = {
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Sync product to multiple marketplaces
   */
  async syncProductToMarketplaces(userId, product, marketplaces) {
    const results = {};
    
    for (const marketplace of marketplaces) {
      try {
        const adapter = await this.getAdapter(userId, marketplace);
        const marketplaceSettings = product.getMarketplaceData(marketplace);
        
        if (!marketplaceSettings || !marketplaceSettings.isActive) {
          results[marketplace] = {
            success: false,
            error: 'Marketplace not active for this product'
          };
          continue;
        }

        // Transform product data for the marketplace
        const transformedProduct = adapter.transformProductData(product, marketplace);
        
        // Create or update product based on existing marketplace data
        let result;
        const existingData = product.variants?.[0]?.marketplaceData?.find(md => md.marketplace === marketplace);
        
        if (existingData && existingData.productId) {
          result = await adapter.updateProduct(existingData.productId, transformedProduct);
        } else {
          result = await adapter.createProduct(transformedProduct);
        }

        // Log sync operation
        await adapter.logSync(userId, 'product_sync', 'product', product._id, 'success', {
          direction: 'export',
          request: transformedProduct,
          response: result
        });

        results[marketplace] = {
          success: true,
          data: result
        };
      } catch (error) {
        logger.error(`Product sync failed for ${marketplace}:`, error);
        
        // Log failed sync
        try {
          const adapter = await this.getAdapter(userId, marketplace);
          await adapter.logSync(userId, 'product_sync', 'product', product._id, 'error', {
            direction: 'export',
            error: {
              code: error.code || 'SYNC_ERROR',
              message: error.message,
              details: error
            }
          });
        } catch (logError) {
          logger.error('Failed to log sync error:', logError);
        }

        results[marketplace] = {
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Update stock across marketplaces
   */
  async updateStockAcrossMarketplaces(userId, sku, stock, marketplaces) {
    return await this.executeOnMarketplaces(userId, marketplaces, 'updateStock', { productId: sku, stock });
  }

  /**
   * Update price across marketplaces
   */
  async updatePriceAcrossMarketplaces(userId, sku, price, marketplaces) {
    return await this.executeOnMarketplaces(userId, marketplaces, 'updatePrice', { productId: sku, price });
  }

  /**
   * Import orders from all marketplaces
   */
  async importOrdersFromMarketplaces(userId, params = {}) {
    const results = {};
    const adapters = await this.getUserAdapters(userId);

    for (const [marketplace, adapter] of Object.entries(adapters)) {
      if (adapter.error) {
        results[marketplace] = {
          success: false,
          error: adapter.error
        };
        continue;
      }

      try {
        const orders = await adapter.getOrders(params);
        
        // Transform and save orders to database
        const transformedOrders = orders.orders.map(order => adapter.transformOrderData(order));
        
        results[marketplace] = {
          success: true,
          data: {
            orders: transformedOrders,
            count: orders.orders.length,
            totalCount: orders.totalElements || orders.totalCount
          }
        };
      } catch (error) {
        logger.error(`Order import failed for ${marketplace}:`, error);
        results[marketplace] = {
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Get available marketplaces (only enabled ones)
   */
  getAvailableMarketplaces() {
    return this.enabledMarketplaces;
  }

  /**
   * Get all possible marketplaces (enabled and disabled)
   */
  getAllMarketplaces() {
    return ['trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm'];
  }

  /**
   * Get marketplace status (enabled/disabled with reasons)
   */
  getMarketplaceStatus() {
    const allMarketplaces = this.getAllMarketplaces();
    const status = {};

    for (const marketplace of allMarketplaces) {
      status[marketplace] = {
        enabled: this.isMarketplaceEnabled(marketplace),
        reason: this.isMarketplaceEnabled(marketplace) 
          ? 'API credentials found in environment variables'
          : 'Missing API credentials in environment variables'
      };
    }

    return status;
  }

  /**
   * Get adapter info for all marketplaces
   */
  async getAdapterInfo(userId) {
    const adapters = await this.getUserAdapters(userId);
    const info = {};

    for (const [marketplace, adapter] of Object.entries(adapters)) {
      if (adapter.error) {
        info[marketplace] = {
          available: false,
          error: adapter.error
        };
      } else {
        info[marketplace] = {
          available: true,
          ...adapter.getInfo()
        };
      }
    }

    return info;
  }

  /**
   * Test marketplace connection
   */
  async testConnection(userId, marketplace) {
    try {
      const adapter = await this.getAdapter(userId, marketplace);
      
      // Test with a simple API call
      await adapter.getProducts({ page: 0, size: 1 });
      
      return {
        success: true,
        message: 'Connection successful',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Remove adapter from cache
   */
  removeAdapter(userId, marketplace) {
    const adapterKey = `${userId}-${marketplace}`;
    this.adapters.delete(adapterKey);
    logger.info(`Adapter removed for user ${userId}, marketplace ${marketplace}`);
  }

  /**
   * Clear all adapters for a user
   */
  clearUserAdapters(userId) {
    const keysToRemove = [];
    for (const key of this.adapters.keys()) {
      if (key.startsWith(`${userId}-`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.adapters.delete(key));
    logger.info(`All adapters cleared for user ${userId}`);
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    const stats = {
      totalAdapters: this.adapters.size,
      authenticatedAdapters: 0,
      adaptersByMarketplace: {}
    };

    for (const [key, adapter] of this.adapters.entries()) {
      const [userId, marketplace] = key.split('-');
      
      if (adapter.isAuthenticated) {
        stats.authenticatedAdapters++;
      }
      
      if (!stats.adaptersByMarketplace[marketplace]) {
        stats.adaptersByMarketplace[marketplace] = 0;
      }
      stats.adaptersByMarketplace[marketplace]++;
    }

    return stats;
  }

  /**
   * Cleanup inactive adapters
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    const keysToRemove = [];

    for (const [key, adapter] of this.adapters.entries()) {
      // Remove adapters that haven't been used for more than 1 hour
      if (now - adapter.lastRequestTime > maxAge) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.adapters.delete(key);
      logger.debug(`Cleaned up inactive adapter: ${key}`);
    });

    logger.info(`Cleaned up ${keysToRemove.length} inactive adapters`);
    return keysToRemove.length;
  }
}

// Create singleton instance
const adapterManager = new AdapterManager();

// Cleanup inactive adapters every hour
setInterval(() => {
  adapterManager.cleanup();
}, 60 * 60 * 1000);

module.exports = adapterManager; 