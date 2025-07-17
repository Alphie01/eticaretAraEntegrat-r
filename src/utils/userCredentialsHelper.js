const { UserMarketplaceKeys } = require('../models/UserMarketplaceKeys');
const logger = require('./logger');

/**
 * Kullanıcının marketplace credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @param {string} marketplace - Marketplace adı (trendyol, hepsiburada, vs.)
 * @returns {Object|null} - Credentials objesi veya null
 */
async function getUserMarketplaceCredentials(userId, marketplace) {
  try {
    const userKey = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: userId,
        marketplace: marketplace,
        is_active: true 
      }
    });

    if (!userKey) {
      logger.warn(`No active API key found for user ${userId} and marketplace ${marketplace}`);
      return null;
    }

    // Update last used date
    userKey.last_used_at = new Date();
    await userKey.save();

    // Return decrypted credentials
    return userKey.getDecryptedCredentials();
  } catch (error) {
    logger.error(`Error getting user marketplace credentials: ${error.message}`);
    return null;
  }
}

/**
 * Kullanıcının Trendyol credentials'ını alır, fallback olarak env değişkenlerini kullanır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - Trendyol credentials objesi veya null
 */
async function getUserTrendyolCredentials(userId) {
  // Önce kullanıcının kendi key'ini dene
  const userCredentials = await getUserMarketplaceCredentials(userId, 'trendyol');
  
  if (userCredentials && userCredentials.apiKey && userCredentials.apiSecret && userCredentials.supplierId) {
    logger.info(`Using user's own Trendyol credentials for user ${userId}`);
    return {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      supplierId: userCredentials.supplierId,
      source: 'user'
    };
  }

  // Kullanıcının key'i yoksa env değişkenlerini dene
  if (process.env.TRENDYOL_API_KEY && process.env.TRENDYOL_API_SECRET && process.env.TRENDYOL_SUPPLIER_ID) {
    logger.info(`Using environment Trendyol credentials for user ${userId}`);
    return {
      apiKey: process.env.TRENDYOL_API_KEY,
      apiSecret: process.env.TRENDYOL_API_SECRET,
      supplierId: process.env.TRENDYOL_SUPPLIER_ID,
      source: 'environment'
    };
  }

  logger.warn(`No Trendyol credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının Hepsiburada credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - Hepsiburada credentials objesi veya null
 */
async function getUserHepsiburadaCredentials(userId) {
  // API credentials (username, password) env'den alınır
  if (!process.env.HEPSIBURADA_USERNAME || !process.env.HEPSIBURADA_PASSWORD) {
    logger.warn(`Hepsiburada API credentials not found in environment variables`);
    return null;
  }

  // Kullanıcıya özel merchantId veritabanından alınır
  const userCredentials = await getUserMarketplaceCredentials(userId, 'hepsiburada');
  
  if (!userCredentials || !userCredentials.merchantId) {
    logger.warn(`Hepsiburada merchantId not found for user ${userId}`);
    return null;
  }

  logger.info(`Using Hepsiburada credentials for user ${userId}: API from env, merchantId from user data`);
  return {
    username: process.env.HEPSIBURADA_USERNAME,
    password: process.env.HEPSIBURADA_PASSWORD,
    merchantId: userCredentials.merchantId,
    source: 'hybrid'
  };
}

/**
 * Kullanıcının Amazon credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - Amazon credentials objesi veya null
 */
async function getUserAmazonCredentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'amazon');
  
  if (userCredentials && userCredentials.accessKeyId && userCredentials.secretAccessKey && 
      userCredentials.sellerId && userCredentials.refreshToken) {
    logger.info(`Using user's own Amazon credentials for user ${userId}`);
    return {
      accessKeyId: userCredentials.accessKeyId,
      secretAccessKey: userCredentials.secretAccessKey,
      sellerId: userCredentials.sellerId,
      marketplaceId: userCredentials.marketplaceId,
      region: userCredentials.region,
      refreshToken: userCredentials.refreshToken,
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.AMAZON_ACCESS_KEY_ID && process.env.AMAZON_SECRET_ACCESS_KEY && 
      process.env.AMAZON_SELLER_ID && process.env.AMAZON_REFRESH_TOKEN) {
    logger.info(`Using environment Amazon credentials for user ${userId}`);
    return {
      accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
      secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
      sellerId: process.env.AMAZON_SELLER_ID,
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'A1PA6795UKMFR9', // Default to Germany
      region: process.env.AMAZON_REGION || 'eu-west-1',
      refreshToken: process.env.AMAZON_REFRESH_TOKEN,
      source: 'environment'
    };
  }

  logger.warn(`No Amazon credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının N11 credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - N11 credentials objesi veya null
 */
async function getUserN11Credentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'n11');
  
  if (userCredentials && userCredentials.apiKey && userCredentials.apiSecret && userCredentials.companyId) {
    logger.info(`Using user's own N11 credentials for user ${userId}`);
    return {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      companyId: userCredentials.companyId,
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.N11_API_KEY && process.env.N11_API_SECRET && process.env.N11_COMPANY_ID) {
    logger.info(`Using environment N11 credentials for user ${userId}`);
    return {
      apiKey: process.env.N11_API_KEY,
      apiSecret: process.env.N11_API_SECRET,
      companyId: process.env.N11_COMPANY_ID,
      source: 'environment'
    };
  }

  logger.warn(`No N11 credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının Shopify credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - Shopify credentials objesi veya null
 */
async function getUserShopifyCredentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'shopify');
  
  if (userCredentials && userCredentials.shopDomain && userCredentials.accessToken) {
    logger.info(`Using user's own Shopify credentials for user ${userId}`);
    return {
      shopDomain: userCredentials.shopDomain,
      accessToken: userCredentials.accessToken,
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN) {
    logger.info(`Using environment Shopify credentials for user ${userId}`);
    return {
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecret: process.env.SHOPIFY_API_SECRET,
      source: 'environment'
    };
  }

  logger.warn(`No Shopify credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının ÇiçekSepeti credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - ÇiçekSepeti credentials objesi veya null
 */
async function getUserCicekSepetiCredentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'ciceksepeti');
  
  if (userCredentials && userCredentials.apiKey) {
    logger.info(`Using user's own ÇiçekSepeti credentials for user ${userId}`);
    return {
      apiKey: userCredentials.apiKey,
      sellerId: userCredentials.sellerId,
      apiSecret: userCredentials.apiSecret,
      environment: userCredentials.environment || 'production',
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.CICEKSEPETI_API_KEY) {
    logger.info(`Using environment ÇiçekSepeti credentials for user ${userId}`);
    return {
      apiKey: process.env.CICEKSEPETI_API_KEY,
      sellerId: process.env.CICEKSEPETI_SELLER_ID,
      apiSecret: process.env.CICEKSEPETI_API_SECRET,
      environment: process.env.CICEKSEPETI_ENVIRONMENT || 'production',
      source: 'environment'
    };
  }

  logger.warn(`No ÇiçekSepeti credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının Pazarama credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - Pazarama credentials objesi veya null
 */
async function getUserPazaramaCredentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'pazarama');
  
  if (userCredentials && userCredentials.apiKey && userCredentials.apiSecret) {
    logger.info(`Using user's own Pazarama credentials for user ${userId}`);
    return {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      sellerId: userCredentials.sellerId,
      environment: userCredentials.environment || 'production',
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.PAZARAMA_API_KEY && process.env.PAZARAMA_API_SECRET) {
    logger.info(`Using environment Pazarama credentials for user ${userId}`);
    return {
      apiKey: process.env.PAZARAMA_API_KEY,
      apiSecret: process.env.PAZARAMA_API_SECRET,
      sellerId: process.env.PAZARAMA_SELLER_ID,
      environment: process.env.PAZARAMA_ENVIRONMENT || 'production',
      source: 'environment'
    };
  }

  logger.warn(`No Pazarama credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının PTT AVM credentials'ını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object|null} - PTT AVM credentials objesi veya null
 */
async function getUserPTTAVMCredentials(userId) {
  const userCredentials = await getUserMarketplaceCredentials(userId, 'pttavm');
  
  if (userCredentials && userCredentials.apiKey && userCredentials.apiSecret) {
    logger.info(`Using user's own PTT AVM credentials for user ${userId}`);
    return {
      apiKey: userCredentials.apiKey,
      apiSecret: userCredentials.apiSecret,
      sellerId: userCredentials.sellerId,
      environment: userCredentials.environment || 'production',
      source: 'user'
    };
  }

  // Fallback to env
  if (process.env.PTTAVM_API_KEY && process.env.PTTAVM_API_SECRET) {
    logger.info(`Using environment PTT AVM credentials for user ${userId}`);
    return {
      apiKey: process.env.PTTAVM_API_KEY,
      apiSecret: process.env.PTTAVM_API_SECRET,
      sellerId: process.env.PTTAVM_SELLER_ID,
      environment: process.env.PTTAVM_ENVIRONMENT || 'production',
      source: 'environment'
    };
  }

  logger.warn(`No PTT AVM credentials available for user ${userId}`);
  return null;
}

/**
 * Kullanıcının tüm marketplace credentials'larını alır
 * @param {number} userId - Kullanıcı ID
 * @returns {Object} - Tüm marketplace credentials'ları
 */
async function getAllUserMarketplaceCredentials(userId) {
  const credentials = {};

  try {
    // Trendyol
    credentials.trendyol = await getUserTrendyolCredentials(userId);

    // Hepsiburada
    credentials.hepsiburada = await getUserHepsiburadaCredentials(userId);

    // Amazon
    credentials.amazon = await getUserAmazonCredentials(userId);

    // N11
    credentials.n11 = await getUserN11Credentials(userId);

    // Shopify
    credentials.shopify = await getUserShopifyCredentials(userId);

    // ÇiçekSepeti
    credentials.ciceksepeti = await getUserCicekSepetiCredentials(userId);

    // Pazarama
    credentials.pazarama = await getUserPazaramaCredentials(userId);

    // PTT AVM
    credentials.pttavm = await getUserPTTAVMCredentials(userId);

    // GittiGidiyor için de benzer şekilde eklenebilir
    // credentials.gittigidiyor = await getUserGittigidiyorCredentials(userId);

    logger.info(`Retrieved marketplace credentials for user ${userId}:`, {
      trendyol: !!credentials.trendyol,
      hepsiburada: !!credentials.hepsiburada,
      amazon: !!credentials.amazon,
      n11: !!credentials.n11,
      shopify: !!credentials.shopify,
      ciceksepeti: !!credentials.ciceksepeti,
      pazarama: !!credentials.pazarama,
      pttavm: !!credentials.pttavm
    });

    return credentials;
  } catch (error) {
    logger.error(`Error getting all user marketplace credentials: ${error.message}`);
    return {};
  }
}

/**
 * Kullanıcının belirli bir marketplace için API key'inin olup olmadığını kontrol eder
 * @param {number} userId - Kullanıcı ID
 * @param {string} marketplace - Marketplace adı
 * @returns {boolean} - API key var mı?
 */
async function hasUserMarketplaceCredentials(userId, marketplace) {
  try {
    const userKey = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: userId,
        marketplace: marketplace,
        is_active: true 
      }
    });

    return !!userKey;
  } catch (error) {
    logger.error(`Error checking user marketplace credentials: ${error.message}`);
    return false;
  }
}

module.exports = {
  getUserMarketplaceCredentials,
  getUserTrendyolCredentials,
  getUserHepsiburadaCredentials,
  getUserAmazonCredentials,
  getUserN11Credentials,
  getUserShopifyCredentials,
  getUserCicekSepetiCredentials,
  getUserPazaramaCredentials,
  getUserPTTAVMCredentials,
  getAllUserMarketplaceCredentials,
  hasUserMarketplaceCredentials
}; 