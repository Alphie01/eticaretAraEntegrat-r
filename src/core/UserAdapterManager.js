const { UserMarketplaceKeys } = require("../models/UserMarketplaceKeys");
const { UserMarketplace } = require("../models/UserMarketplace");
const { UserMarketplaceAccount } = require("../models/UserMarketplaceAccount");
const TrendyolAdapter = require("../adapters/TrendyolAdapter");
const HepsiburadaAdapter = require("../adapters/HepsiburadaAdapter");
const AmazonAdapter = require("../adapters/AmazonAdapter");
const N11Adapter = require("../adapters/N11Adapter");
const ShopifyAdapter = require("../adapters/ShopifyAdapter");
const CicekSepetiAdapter = require("../adapters/CicekSepetiAdapter");
const PazaramaAdapter = require("../adapters/PazaramaAdapter");
const PTTAVMAdapter = require("../adapters/PTTAVMAdapter");
const logger = require("../utils/logger");

class UserAdapterManager {
  constructor(userId) {
    this.userId = userId;
    this.adapters = new Map(); // Marketplace name -> Adapter instance
    this.initialized = false;
  }

  /**
   * Kullanıcının marketplace credentials'larını yükle ve adapter'ları başlat
   */
  async initialize() {
    try {
      logger.info(`Initializing adapters for user ${this.userId}`);

      // Kullanıcının aktif marketplace accounts'larını çek
      const marketplaceAccounts = await UserMarketplaceAccount.findAll({
        where: {
          user_id: this.userId,
          is_active: true,
        },
        include: [
          {
            model: UserMarketplace,
            as: "marketplaceCredentials",
            where: {
              api_key: { [require("sequelize").Op.ne]: null }, // Only accounts with credentials
            },
            required: true,
          },
        ],
      });

      // Her marketplace için adapter oluştur
      for (const account of marketplaceAccounts) {
        if (account.marketplaceCredentials) {
          await this.initializeAdapter(account.marketplaceCredentials);
        }
      }

      // Hepsiburada için özel kontrol - environment'dan API credentials'ları al
      await this.initializeHepsiburadaIfAvailable();

      this.initialized = true;
      logger.info(
        `Initialized ${this.adapters.size} adapters for user ${this.userId}`
      );
    } catch (error) {
      logger.error(
        `Failed to initialize adapters for user ${this.userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Sadece belirli bir marketplace için adapter başlat
   */
  async initializeSpecificMarketplace(targetMarketplace) {
    try {
      logger.info(`Initializing adapter for specific marketplace: ${targetMarketplace} for user ${this.userId}`);

      // Belirli marketplace'e ait account'ı çek
      const marketplaceAccount = await UserMarketplaceAccount.findOne({
        where: {
          user_id: this.userId,
          marketplace: targetMarketplace,
          is_active: true,
        },
        include: [
          {
            model: UserMarketplace,
            as: "marketplaceCredentials",
            where: {
              api_key: { [require("sequelize").Op.ne]: null }, // Only accounts with credentials
            },
            required: true,
          },
        ],
      });

      if (marketplaceAccount && marketplaceAccount.marketplaceCredentials) {
        await this.initializeAdapter(marketplaceAccount.marketplaceCredentials);
      }

      // Hepsiburada için özel kontrol (eğer hedef marketplace Hepsiburada ise)
      if (targetMarketplace === 'hepsiburada') {
        await this.initializeHepsiburadaIfAvailable();
      }

      this.initialized = true;
      logger.info(
        `Initialized adapter for ${targetMarketplace} for user ${this.userId}`
      );
    } catch (error) {
      logger.error(
        `Failed to initialize adapter for ${targetMarketplace} for user ${this.userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Belirli bir marketplace için adapter başlat
   */
  async initializeAdapter(userMarketplace) {
    try {
      // Get marketplace name from the associated account
      const marketplaceAccount = await UserMarketplaceAccount.findByPk(
        userMarketplace.marketplace_account_id
      );

      if (!marketplaceAccount) {
        throw new Error(
          `No marketplace account found for credentials ID: ${userMarketplace.id}`
        );
      }

      const marketplace = marketplaceAccount.marketplace;
      const credentials = userMarketplace.getDecryptedCredentials();
      credentials.marketplace = marketplace; // Add marketplace to credentials

      // .env'den genel config'leri al
      const envConfig = this.getEnvConfig(marketplace);

      // Kullanıcı credentials'ları ile env config'ini birleştir
      const adapterConfig = {
        ...envConfig,
        ...credentials,
      };

      let adapter;

      switch (marketplace) {
        case "trendyol":
          adapter = new TrendyolAdapter(adapterConfig);
          break;
        case "hepsiburada":
          adapter = new HepsiburadaAdapter(adapterConfig);
          break;
        case "amazon":
          adapter = new AmazonAdapter(adapterConfig);
          break;
        case "n11":
          adapter = new N11Adapter(adapterConfig);
          break;
        case "shopify":
          adapter = new ShopifyAdapter(adapterConfig);
          break;
        case "ciceksepeti":
          adapter = new CicekSepetiAdapter(adapterConfig);
          break;
        case "pazarama":
          adapter = new PazaramaAdapter(adapterConfig);
          break;
        case "pttavm":
          adapter = new PTTAVMAdapter(adapterConfig);
          break;
        default:
          logger.warn(`Unknown marketplace: ${marketplace}`);
          return;
      }

      // Adapter'ı test et
      await adapter.authenticate(credentials);

      this.adapters.set(marketplace, adapter);

      // Son kullanım tarihini güncelle
      marketplaceAccount.last_used_at = new Date();
      await marketplaceAccount.save();

      logger.info(
        `Successfully initialized ${marketplace} adapter for user ${this.userId}`
      );
    } catch (error) {
      logger.error(
        `Failed to initialize adapter for user ${this.userId}:`,
        error
      );
      // Hatalı adapter'ı kaydetme, diğerleri çalışabilir
    }
  }

  /**
   * Hepsiburada için özel initialization - environment'dan API credentials, user'dan merchantId
   */
  async initializeHepsiburadaIfAvailable() {
    try {
      // Environment'da Hepsiburada API credentials'ı var mı kontrol et
      if (
        !process.env.HEPSIBURADA_USERNAME ||
        !process.env.HEPSIBURADA_PASSWORD
      ) {
        logger.debug(
          "Hepsiburada API credentials not found in environment variables"
        );
        return;
      }

      // Bu marketplace için zaten adapter var mı kontrol et
      if (this.adapters.has("hepsiburada")) {
        logger.debug("Hepsiburada adapter already initialized");
        return;
      }

      // Kullanıcının merchantId'si var mı kontrol et
      const hepsiburadaAccount = await UserMarketplaceAccount.findOne({
        where: {
          user_id: this.userId,
          marketplace: "hepsiburada",
        },
        include: [
          {
            model: UserMarketplace,
            as: "marketplaceCredentials",
          },
        ],
      });
      console.log("Hepsiburada account:", hepsiburadaAccount);
      if (
        !hepsiburadaAccount ||
        !hepsiburadaAccount.marketplaceCredentials ||
        !hepsiburadaAccount.marketplaceCredentials.merchant_id
      ) {
        logger.debug(`No Hepsiburada merchantId found for user ${this.userId}`);
        return;
      }

      // Hepsiburada adapter'ını başlat
      const credentials =
        hepsiburadaAccount.marketplaceCredentials.getDecryptedCredentials();
      const envConfig = this.getEnvConfig("hepsiburada");

      const adapterConfig = {
        ...envConfig,
        username: process.env.HEPSIBURADA_USERNAME,
        password: process.env.HEPSIBURADA_PASSWORD,
        merchantId: credentials.merchantId,
      };

      const adapter = new HepsiburadaAdapter(adapterConfig);

      // Adapter'ı test et
      await adapter.authenticate({
        username: process.env.HEPSIBURADA_USERNAME,
        password: process.env.HEPSIBURADA_PASSWORD,
        merchantId: credentials.merchantId,
      });

      this.adapters.set("hepsiburada", adapter);

      // Son kullanım tarihini güncelle
      hepsiburadaAccount.last_used_at = new Date();
      await hepsiburadaAccount.save();

      logger.info(
        `Successfully initialized Hepsiburada adapter for user ${this.userId} using environment API credentials and user merchantId`
      );
    } catch (error) {
      logger.error(
        `❌ Failed to initialize Hepsiburada adapter for user ${this.userId}: ${error.message}`
      );
      console.error(error); // ✅ Tam hatayı terminalde göster
    }
  }

  /**
   * Environment variables'dan marketplace genel config'lerini al
   */
  getEnvConfig(marketplace) {
    const baseConfig = {
      baseUrl: this.getMarketplaceBaseUrl(marketplace),
      timeout: 30000,
      retryAttempts: 3,
    };

    // Her marketplace için özel env config'leri
    switch (marketplace) {
      case "trendyol":
        return {
          ...baseConfig,
          baseUrl: "https://apigw.trendyol.com",
        };
      case "hepsiburada":
        return {
          ...baseConfig,
          baseUrl: "https://mpop-sit.hepsiburada.com",
          environment: process.env.HEPSIBURADA_ENVIRONMENT || "production",
        };
      case "amazon":
        return {
          ...baseConfig,
          baseUrl: "https://mws.amazonservices.com",
          region: process.env.AMAZON_REGION || "tr",
          marketplaceId: process.env.AMAZON_MARKETPLACE_ID,
        };
      case "n11":
        return {
          ...baseConfig,
          baseUrl: "https://api.n11.com",
          environment: process.env.N11_ENVIRONMENT || "production",
        };
      case "shopify":
        return {
          ...baseConfig,
          shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
          apiVersion: "2023-10",
        };
      case "ciceksepeti":
        return {
          ...baseConfig,
          baseUrl: "https://api.ciceksepeti.com",
          environment: process.env.CICEKSEPETI_ENVIRONMENT || "production",
        };
      case "pazarama":
        return {
          ...baseConfig,
          baseUrl: "https://api.pazarama.com",
          environment: process.env.PAZARAMA_ENVIRONMENT || "production",
        };
      case "pttavm":
        return {
          ...baseConfig,
          baseUrl: "https://api.pttavm.com",
          environment: process.env.PTTAVM_ENVIRONMENT || "production",
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Marketplace base URL'lerini döndür
   */
  getMarketplaceBaseUrl(marketplace) {
    const urls = {
      trendyol: "https://apigw.trendyol.com",
      hepsiburada: "https://mpop-sit.hepsiburada.com",
      amazon: "https://mws.amazonservices.com",
      n11: "https://api.n11.com",
      shopify: "https://admin.shopify.com",
      ciceksepeti: "https://api.ciceksepeti.com",
      pazarama: "https://api.pazarama.com",
      pttavm: "https://api.pttavm.com",
    };

    return urls[marketplace] || "";
  }

  /**
   * Belirli bir marketplace adapter'ını al
   */
  getAdapter(marketplace) {
    if (!this.initialized) {
      throw new Error(
        "UserAdapterManager not initialized. Call initialize() first."
      );
    }

    const adapter = this.adapters.get(marketplace);
    if (!adapter) {
      throw new Error(
        `No adapter found for marketplace: ${marketplace}. User may not have configured this marketplace.`
      );
    }

    return adapter;
  }

  /**
   * Kullanıcının aktif marketplace'lerini listele
   */
  getActiveMarketplaces() {
    console.log(this.adapters.keys());

    return Array.from(this.adapters.keys());
  }

  /**
   * Belirli bir marketplace'in aktif olup olmadığını kontrol et
   */
  hasMarketplace(marketplace) {
    return this.adapters.has(marketplace);
  }

  /**
   * Tüm adapter'ları kapat ve temizle
   */
  async cleanup() {
    for (const [marketplace, adapter] of this.adapters) {
      try {
        if (adapter.cleanup && typeof adapter.cleanup === "function") {
          await adapter.cleanup();
        }
      } catch (error) {
        logger.warn(`Error cleaning up ${marketplace} adapter:`, error);
      }
    }

    this.adapters.clear();
    this.initialized = false;
    logger.info(`Cleaned up adapters for user ${this.userId}`);
  }

  /**
   * Yeni marketplace credentials ekle
   */
  async addMarketplace(marketplace, credentials) {
    try {
      // First, get or create marketplace account
      console;
      let marketplaceAccount = await UserMarketplaceAccount.findOne({
        where: {
          user_id: this.userId,
          marketplace: marketplace,
        },
      });

      if (!marketplaceAccount) {
        logger.info(`🆕 Creating new marketplace account for ${marketplace}`);
        marketplaceAccount = await UserMarketplaceAccount.create({
          user_id: this.userId,
          marketplace: marketplace,
          is_active: true,
        });
      }

      // Check if credentials already exist
      let userMarketplace = await UserMarketplace.findOne({
        where: {
          marketplace_account_id: marketplaceAccount.id,
        },
      });

      // Import encryption helpers
      const { encrypt } = require("../utils/encryption");

      if (userMarketplace) {
        // Update existing credentials
        logger.info(`🔄 Updating existing credentials for ${marketplace}`);

        // Update fields based on marketplace type
        if (credentials.apiKey)
          userMarketplace.api_key = encrypt(credentials.apiKey);
        if (credentials.apiSecret)
          userMarketplace.api_secret = encrypt(credentials.apiSecret);
        if (credentials.supplierId)
          userMarketplace.supplier_id = encrypt(credentials.supplierId);
        if (credentials.merchantId)
          userMarketplace.merchant_id = encrypt(credentials.merchantId);
        if (credentials.sellerId)
          userMarketplace.seller_id = encrypt(credentials.sellerId);
        if (credentials.shopDomain)
          userMarketplace.shop_domain = credentials.shopDomain;

        userMarketplace.updated_at = new Date();
        await userMarketplace.save();
      } else {
        // Create new credentials
        logger.info(`🆕 Creating new credentials for ${marketplace}`);

        userMarketplace = await UserMarketplace.create({
          marketplace_account_id: marketplaceAccount.id,
          api_key: credentials.apiKey ? encrypt(credentials.apiKey) : null,
          api_secret: credentials.apiSecret
            ? encrypt(credentials.apiSecret)
            : null,
          supplier_id: credentials.supplierId
            ? encrypt(credentials.supplierId)
            : null,
          merchant_id: credentials.merchantId
            ? encrypt(credentials.merchantId)
            : null,
          seller_id: credentials.sellerId
            ? encrypt(credentials.sellerId)
            : null,
          shop_domain: credentials.shopDomain || null,
          environment_value: "production",
        });
      }

      // Adapter'ı başlat
      await this.initializeAdapter(userMarketplace);

      logger.info(`Added ${marketplace} marketplace for user ${this.userId}`);

      return true;
    } catch (error) {
      logger.error(
        `Failed to add ${marketplace} marketplace for user ${this.userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Marketplace credentials'larını güncelle
   */
  async updateMarketplace(marketplace, credentials) {
    try {
      // Get marketplace account
      const marketplaceAccount = await UserMarketplaceAccount.findOne({
        where: {
          user_id: this.userId,
          marketplace: marketplace,
        },
      });

      if (!marketplaceAccount) {
        throw new Error(`No marketplace account found for: ${marketplace}`);
      }

      const userMarketplace = await UserMarketplace.findOne({
        where: {
          marketplace_account_id: marketplaceAccount.id,
        },
      });

      if (!userMarketplace) {
        throw new Error(`No credentials found for marketplace: ${marketplace}`);
      }

      // Import encryption helpers
      const { encrypt } = require("../utils/encryption");

      // Update fields based on marketplace type
      if (credentials.apiKey)
        userMarketplace.api_key = encrypt(credentials.apiKey);
      if (credentials.apiSecret)
        userMarketplace.api_secret = encrypt(credentials.apiSecret);
      if (credentials.supplierId)
        userMarketplace.supplier_id = encrypt(credentials.supplierId);
      if (credentials.merchantId)
        userMarketplace.merchant_id = encrypt(credentials.merchantId);
      if (credentials.sellerId)
        userMarketplace.seller_id = encrypt(credentials.sellerId);
      if (credentials.shopDomain)
        userMarketplace.shop_domain = credentials.shopDomain;

      userMarketplace.updated_at = new Date();
      await userMarketplace.save();

      // Adapter'ı yeniden başlat
      if (this.adapters.has(marketplace)) {
        const oldAdapter = this.adapters.get(marketplace);
        if (oldAdapter.cleanup) {
          await oldAdapter.cleanup();
        }
        this.adapters.delete(marketplace);
      }

      await this.initializeAdapter(userMarketplace);

      logger.info(`Updated ${marketplace} marketplace for user ${this.userId}`);

      return true;
    } catch (error) {
      logger.error(
        `Failed to update ${marketplace} marketplace for user ${this.userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Marketplace'i devre dışı bırak
   */
  async disableMarketplace(marketplace) {
    try {
      // Get marketplace account
      const marketplaceAccount = await UserMarketplaceAccount.findOne({
        where: {
          user_id: this.userId,
          marketplace: marketplace,
        },
      });

      if (marketplaceAccount) {
        marketplaceAccount.is_active = false;
        await marketplaceAccount.save();
      }

      // Adapter'ı kapat
      if (this.adapters.has(marketplace)) {
        const adapter = this.adapters.get(marketplace);
        if (adapter.cleanup) {
          await adapter.cleanup();
        }
        this.adapters.delete(marketplace);
      }

      logger.info(
        `Disabled ${marketplace} marketplace for user ${this.userId}`
      );

      return true;
    } catch (error) {
      logger.error(
        `Failed to disable ${marketplace} marketplace for user ${this.userId}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = UserAdapterManager;
