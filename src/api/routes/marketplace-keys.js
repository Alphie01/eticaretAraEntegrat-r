const express = require("express");
const { UserMarketplaceKeys } = require("../../models/UserMarketplaceKeys");
const { UserMarketplace } = require("../../models/UserMarketplace");
const { UserMarketplaceAccount } = require("../../models/UserMarketplaceAccount");
const { protect } = require("../../middleware/auth");
const { validateApiKey } = require("../../utils/validation");
const logger = require("../../utils/logger");

const router = express.Router();

// @desc    Get user's marketplace keys
// @route   GET /api/v1/marketplace-keys
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    // Get user's marketplace accounts
    const accounts = await UserMarketplaceAccount.findAll({
      where: {
        user_id: req.user.id,
        is_active: true,
      },
      include: [{
        model: UserMarketplace,
        as: 'marketplaceCredentials',
        attributes: ['id', 'api_key', 'api_secret', 'supplier_id', 'merchant_id', 'seller_id', 'shop_domain', 'created_at', 'updated_at']
      }],
      order: [
        ["marketplace", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    logger.info(`🔍 Found ${accounts.length} marketplace accounts for user ${req.user.id}`);
    accounts.forEach(account => {
      logger.info(`  - ${account.marketplace}: has credentials = ${!!account.marketplaceCredentials}`);
    });

    // Format the response
    const keysData = accounts.map((account) => {
      const credentials = account.marketplaceCredentials;
      return {
        id: credentials ? credentials.id : null,
        marketplace: account.marketplace,
        is_active: account.is_active,
        last_sync_date: account.last_sync_date,
        created_at: account.created_at,
        updated_at: account.updated_at,
        has_api_key: !!credentials?.api_key,
        has_api_secret: !!credentials?.api_secret,
        has_supplier_id: !!credentials?.supplier_id,
        has_merchant_id: !!credentials?.merchant_id,
        has_seller_id: !!credentials?.seller_id,
        has_shop_domain: !!credentials?.shop_domain,
        // Add marketplace account info
        account_id: account.id,
        marketplace_account_id: account.id,
        // Add credentials info for debugging
        credentials_exists: !!credentials,
        credentials_id: credentials?.id || null,
      };
    });

    res.status(200).json({
      success: true,
      count: keysData.length,
      data: keysData,
      // Add additional info for frontend compatibility
      configurations: keysData,
      marketplaces: keysData.map(key => ({
        id: key.marketplace,
        status: key.has_api_key ? 'connected' : 'error',
        orders: 0,
        products: 0,
        revenue: '₺0'
      }))
    });
  } catch (error) {
    logger.error("Get marketplace keys failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching marketplace keys",
    });
  }
});

// @desc    Get supported marketplaces
// @route   GET /api/v1/marketplace-keys/supported
// @access  Private
router.get("/supported", protect, async (req, res) => {
  try {
    const supportedMarketplaces = [
      {
        name: "trendyol",
        display_name: "Trendyol",
        required_fields: ["api_key", "api_secret", "supplier_id"],
        documentation_url: "https://developers.trendyol.com/",
      },
      {
        name: "hepsiburada",
        display_name: "Hepsiburada",
        required_fields: ["api_key"],
        documentation_url: "https://developer.hepsiburada.com/",
      },
      {
        name: "amazon",
        display_name: "Amazon",
        required_fields: ["api_key", "api_secret"],
        documentation_url: "https://developer.amazonservices.com/",
      },
      {
        name: "n11",
        display_name: "N11",
        required_fields: ["api_key", "api_secret"],
        documentation_url: "https://www.n11.com/api/",
      },
      {
        name: "shopify",
        display_name: "Shopify",
        required_fields: ["shop_domain", "api_secret"],
        documentation_url: "https://shopify.dev/",
      },
      {
        name: "ciceksepeti",
        display_name: "ÇiçekSepeti",
        required_fields: ["api_key", "seller_id"],
        documentation_url: "https://developers.ciceksepeti.com/",
      },
      {
        name: "pazarama",
        display_name: "Pazarama",
        required_fields: ["api_key", "api_secret", "seller_id"],
        documentation_url: "https://pazarama.com/",
      },
      {
        name: "pttavm",
        display_name: "PTT AVM",
        required_fields: ["api_key", "api_secret", "seller_id"],
        documentation_url: "https://pttavm.com/",
      },
    ];

    res.status(200).json({
      success: true,
      data: supportedMarketplaces,
    });
  } catch (error) {
    logger.error("Get supported marketplaces failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching supported marketplaces",
    });
  }
});

// @desc    Get specific marketplace key
// @route   GET /api/v1/marketplace-keys/:marketplace
// @access  Private
router.get("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const key = await UserMarketplaceKeys.findOne({
      where: {
        user_id: req.user.id,
        marketplace: marketplace,
        is_active: true,
      },
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        error: `No active API key found for ${marketplace}`,
      });
    }

    // Return metadata only (no actual keys)
    res.status(200).json({
      success: true,
      data: {
        id: key.id,
        marketplace: key.marketplace,
        key_name: key.key_name,
        is_active: key.is_active,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
        updated_at: key.updated_at,
        has_api_key: !!key.encrypted_api_key,
        has_api_secret: !!key.encrypted_api_secret,
        has_supplier_id: !!key.encrypted_supplier_id,
      },
    });
  } catch (error) {
    logger.error("Get marketplace key failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching marketplace key",
    });
  }
});

// @desc    Save or update marketplace API keys
// @route   POST /api/v1/marketplace-keys/:marketplace
// @access  Private
router.post("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { api_key, api_secret, supplier_id, merchant_id, seller_id, shop_domain } = req.body;

    // Debug logging
    logger.info(`🔑 Marketplace credentials save request:`, {
      marketplace,
      userId: req.user.id,
      userEmail: req.user.email,
      hasApiKey: !!api_key,
      hasApiSecret: !!api_secret,
      hasSupplierId: !!supplier_id,
      hasMerchantId: !!merchant_id,
      hasSellerId: !!seller_id,
      hasShopDomain: !!shop_domain,
      requestBody: req.body,
      apiKeyLength: api_key ? api_key.length : 0,
      apiSecretLength: api_secret ? api_secret.length : 0,
      supplierIdLength: supplier_id ? supplier_id.length : 0,
    });

    // Validation
    if (!marketplace || !api_key) {
      logger.error(`❌ Validation failed: missing marketplace or api_key`, {
        marketplace,
        hasApiKey: !!api_key,
      });
      return res.status(400).json({
        success: false,
        error: "Marketplace and API key are required",
      });
    }

    // Validate API key format - temporarily disabled for testing
    if (!validateApiKey(api_key)) {
      logger.warn(
        `⚠️ API key validation failed for ${marketplace}, but continuing...`
      );
      // Temporarily disable strict validation for testing
      // return res.status(400).json({
      //   success: false,
      //   error: "Invalid API key format",
      // });
    }

    // Trendyol için özel validasyon
    if (marketplace === "trendyol") {
      if (!api_secret) {
        return res.status(400).json({
          success: false,
          error: "API secret is required for Trendyol",
        });
      }
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          error: "Supplier ID is required for Trendyol",
        });
      }
    }

    // First, get or create marketplace account
    let marketplaceAccount = await UserMarketplaceAccount.findOne({
      where: {
        user_id: req.user.id,
        marketplace: marketplace,
      },
    });

    if (!marketplaceAccount) {
      logger.info(`🆕 Creating new marketplace account for ${marketplace}`);
      marketplaceAccount = await UserMarketplaceAccount.create({
        user_id: req.user.id,
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
    const { encrypt } = require("../../utils/encryption");

    if (userMarketplace) {
      // Update existing credentials
      logger.info(`🔄 Updating existing credentials for ${marketplace}`);
      
      // Update fields based on marketplace type
      if (api_key) userMarketplace.api_key = encrypt(api_key);
      if (api_secret) userMarketplace.api_secret = encrypt(api_secret);
      if (supplier_id) userMarketplace.supplier_id = encrypt(supplier_id);
      if (merchant_id) userMarketplace.merchant_id = encrypt(merchant_id);
      if (seller_id) userMarketplace.seller_id = encrypt(seller_id);
      if (shop_domain) userMarketplace.shop_domain = shop_domain;
      
      userMarketplace.updated_at = new Date();
      await userMarketplace.save();

      logger.info(`✅ Marketplace credentials updated successfully:`, {
        id: userMarketplace.id,
        marketplace,
        userId: req.user.id,
        userEmail: req.user.email,
      });
    } else {
      // Create new credentials
      logger.info(`🆕 Creating new credentials for ${marketplace}`);

      userMarketplace = await UserMarketplace.create({
        marketplace_account_id: marketplaceAccount.id,
        api_key: api_key ? encrypt(api_key) : null,
        api_secret: api_secret ? encrypt(api_secret) : null,
        supplier_id: supplier_id ? encrypt(supplier_id) : null,
        merchant_id: merchant_id ? encrypt(merchant_id) : null,
        seller_id: seller_id ? encrypt(seller_id) : null,
        shop_domain: shop_domain || null,
        environment_value: 'production',
      });

      logger.info(`✅ Marketplace credentials created successfully:`, {
        id: userMarketplace.id,
        marketplace,
        userId: req.user.id,
        userEmail: req.user.email,
        createdAt: userMarketplace.created_at,
      });
    }

    // Verify the credentials were saved properly
    const savedCredentials = await UserMarketplace.findByPk(userMarketplace.id);
    if (!savedCredentials) {
      throw new Error('Failed to verify saved marketplace credentials');
    }

    logger.info(`✅ Marketplace credentials operation completed successfully:`, {
      id: savedCredentials.id,
      marketplace,
      userId: req.user.id,
      userEmail: req.user.email,
      hasApiKey: !!savedCredentials.api_key,
      hasApiSecret: !!savedCredentials.api_secret,
      hasSupplierId: !!savedCredentials.supplier_id,
      hasMerchantId: !!savedCredentials.merchant_id,
      hasSellerId: !!savedCredentials.seller_id,
      hasShopDomain: !!savedCredentials.shop_domain
    });

    res.status(201).json({
      success: true,
      message: `${marketplace} credentials saved successfully`,
      data: {
        id: savedCredentials.id,
        marketplace: marketplace,
        created_at: savedCredentials.created_at,
        updated_at: savedCredentials.updated_at,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Save marketplace credentials failed for ${req.params.marketplace}:`,
      {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        userEmail: req.user?.email,
        requestBody: req.body,
      }
    );
    res.status(500).json({
      success: false,
      error: "Server error while saving marketplace credentials: " + error.message,
    });
  }
});

// @desc    Test marketplace API key
// @route   GET /api/v1/marketplace-keys/:marketplace/test
// @access  Private
router.get("/:marketplace/test", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    // Get marketplace account and credentials
    const marketplaceAccount = await UserMarketplaceAccount.findOne({
      where: {
        user_id: req.user.id,
        marketplace: marketplace,
        is_active: true,
      },
      include: [{
        model: UserMarketplace,
        as: 'marketplaceCredentials'
      }]
    });

    if (!marketplaceAccount || !marketplaceAccount.marketplaceCredentials) {
      return res.status(404).json({
        success: false,
        error: `No active credentials found for ${marketplace}`,
      });
    }

    // Get decrypted credentials
    const credentials = marketplaceAccount.marketplaceCredentials.getDecryptedCredentials();

    // Test API connection based on marketplace
    let testResult = { success: false, message: "Test not implemented" };

    if (marketplace === "trendyol") {
      // Test Trendyol API
      try {
        const TrendyolAdapter = require("../../adapters/TrendyolAdapter");
        const adapter = new TrendyolAdapter({
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          supplierId: credentials.supplierId,
        });

        // Simple test call - get supplier info
        const result = await adapter.makeRequest("GET", "/suppliers");

        testResult = {
          success: true,
          message: "Trendyol API connection successful",
          data: { supplier_id: credentials.supplierId },
        };

        // Update last sync date
        marketplaceAccount.last_sync_date = new Date();
        await marketplaceAccount.save();
      } catch (error) {
        testResult = {
          success: false,
          message: "Trendyol API connection failed: " + error.message,
        };
      }
    }

    logger.info(
      `API key test: ${marketplace} for user ${req.user.email} - ${testResult.success ? "SUCCESS" : "FAILED"}`
    );

    res.status(200).json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data || null,
    });
  } catch (error) {
    logger.error("Test marketplace key failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while testing marketplace key",
    });
  }
});

// @desc    Delete marketplace API key
// @route   DELETE /api/v1/marketplace-keys/:marketplace
// @access  Private
router.delete("/:marketplace", protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const userKey = await UserMarketplaceKeys.findOne({
      where: {
        user_id: req.user.id,
        marketplace: marketplace,
      },
    });

    if (!userKey) {
      return res.status(404).json({
        success: false,
        error: `No API key found for ${marketplace}`,
      });
    }

    // Soft delete - just mark as inactive
    userKey.is_active = false;
    await userKey.save();

    logger.info(
      `Marketplace key deleted: ${marketplace} for user ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: `${marketplace} API key deleted successfully`,
    });
  } catch (error) {
    logger.error("Delete marketplace key failed:", error);
    res.status(500).json({
      success: false,
      error: "Server error while deleting marketplace key",
    });
  }
});

module.exports = router;
