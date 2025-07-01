const express = require('express');
const { UserMarketplaceKeys } = require('../../models/UserMarketplaceKeys');
const { protect } = require('../../middleware/auth');
const { validateApiKey } = require('../../utils/encryption');
const logger = require('../../utils/logger');

const router = express.Router();

// @desc    Get user's marketplace keys
// @route   GET /api/v1/marketplace-keys
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const keys = await UserMarketplaceKeys.findAll({
      where: { 
        user_id: req.user.id,
        is_active: true 
      },
      order: [['marketplace', 'ASC'], ['created_at', 'DESC']]
    });

    // Don't return encrypted values, just metadata
    const keysData = keys.map(key => ({
      id: key.id,
      marketplace: key.marketplace,
      key_name: key.key_name,
      is_active: key.is_active,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
      updated_at: key.updated_at,
      has_api_key: !!key.encrypted_api_key,
      has_api_secret: !!key.encrypted_api_secret,
      has_supplier_id: !!key.encrypted_supplier_id
    }));

    res.status(200).json({
      success: true,
      count: keysData.length,
      data: keysData
    });
  } catch (error) {
    logger.error('Get marketplace keys failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching marketplace keys'
    });
  }
});

// @desc    Get supported marketplaces
// @route   GET /api/v1/marketplace-keys/supported
// @access  Private
router.get('/supported', protect, async (req, res) => {
  try {
    const supportedMarketplaces = [
      {
        name: 'trendyol',
        display_name: 'Trendyol',
        required_fields: ['api_key', 'api_secret', 'supplier_id'],
        documentation_url: 'https://developers.trendyol.com/'
      },
      {
        name: 'hepsiburada',
        display_name: 'Hepsiburada',
        required_fields: ['api_key'],
        documentation_url: 'https://developer.hepsiburada.com/'
      },
      {
        name: 'amazon',
        display_name: 'Amazon',
        required_fields: ['api_key', 'api_secret'],
        documentation_url: 'https://developer.amazonservices.com/'
      },
      {
        name: 'n11',
        display_name: 'N11',
        required_fields: ['api_key', 'api_secret'],
        documentation_url: 'https://www.n11.com/api/'
      },
      {
        name: 'gittigidiyor',
        display_name: 'GittiGidiyor',
        required_fields: ['api_key'],
        documentation_url: 'https://dev.gittigidiyor.com/'
      }
    ];

    res.status(200).json({
      success: true,
      data: supportedMarketplaces
    });
  } catch (error) {
    logger.error('Get supported marketplaces failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching supported marketplaces'
    });
  }
});

// @desc    Get specific marketplace key
// @route   GET /api/v1/marketplace-keys/:marketplace
// @access  Private
router.get('/:marketplace', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const key = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: req.user.id,
        marketplace: marketplace,
        is_active: true 
      }
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        error: `No active API key found for ${marketplace}`
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
        has_supplier_id: !!key.encrypted_supplier_id
      }
    });
  } catch (error) {
    logger.error('Get marketplace key failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching marketplace key'
    });
  }
});

// @desc    Save or update marketplace API keys
// @route   POST /api/v1/marketplace-keys
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { marketplace, api_key, api_secret, supplier_id, key_name } = req.body;

    // Validation
    if (!marketplace || !api_key) {
      return res.status(400).json({
        success: false,
        error: 'Marketplace and API key are required'
      });
    }

    // Validate marketplace
    const allowedMarketplaces = ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'];
    if (!allowedMarketplaces.includes(marketplace)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid marketplace. Allowed: ' + allowedMarketplaces.join(', ')
      });
    }

    // Validate API key format
    if (!validateApiKey(api_key)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    // Trendyol için özel validasyon
    if (marketplace === 'trendyol') {
      if (!api_secret) {
        return res.status(400).json({
          success: false,
          error: 'API secret is required for Trendyol'
        });
      }
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          error: 'Supplier ID is required for Trendyol'
        });
      }
    }

    // Check if key already exists
    let userKey = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: req.user.id,
        marketplace: marketplace
      }
    });

    if (userKey) {
      // Update existing key
      await userKey.setCredentials(api_key, api_secret, supplier_id);
      if (key_name) {
        userKey.key_name = key_name;
      }
      userKey.is_active = true;
      await userKey.save();

      logger.info(`Marketplace key updated: ${marketplace} for user ${req.user.email}`);
    } else {
      // Import encryption helpers
      const { encrypt } = require('../../utils/encryption');
      
      // Create new key with encrypted credentials
      userKey = await UserMarketplaceKeys.create({
        user_id: req.user.id,
        marketplace: marketplace,
        encrypted_api_key: encrypt(api_key),
        encrypted_api_secret: api_secret ? encrypt(api_secret) : null,
        encrypted_supplier_id: supplier_id ? encrypt(supplier_id) : null,
        key_name: key_name || `${marketplace} API Key`
      });

      logger.info(`Marketplace key created: ${marketplace} for user ${req.user.email}`);
    }

    res.status(201).json({
      success: true,
      message: `${marketplace} API key saved successfully`,
      data: {
        id: userKey.id,
        marketplace: userKey.marketplace,
        key_name: userKey.key_name,
        is_active: userKey.is_active,
        created_at: userKey.created_at,
        updated_at: userKey.updated_at
      }
    });
  } catch (error) {
    logger.error('Save marketplace key failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while saving marketplace key'
    });
  }
});

// @desc    Test marketplace API key
// @route   POST /api/v1/marketplace-keys/:marketplace/test
// @access  Private
router.post('/:marketplace/test', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const userKey = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: req.user.id,
        marketplace: marketplace,
        is_active: true 
      }
    });

    if (!userKey) {
      return res.status(404).json({
        success: false,
        error: `No active API key found for ${marketplace}`
      });
    }

    // Get decrypted credentials
    const credentials = userKey.getDecryptedCredentials();

    // Test API connection based on marketplace
    let testResult = { success: false, message: 'Test not implemented' };

    if (marketplace === 'trendyol') {
      // Test Trendyol API
      try {
        const TrendyolAdapter = require('../../adapters/TrendyolAdapter');
        const adapter = new TrendyolAdapter({
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          supplierId: credentials.supplierId
        });

        // Simple test call - get supplier info
        const result = await adapter.makeRequest('GET', '/suppliers');
        
        testResult = { 
          success: true, 
          message: 'Trendyol API connection successful',
          data: { supplier_id: credentials.supplierId }
        };

        // Update last used date
        userKey.last_used_at = new Date();
        await userKey.save();

      } catch (error) {
        testResult = { 
          success: false, 
          message: 'Trendyol API connection failed: ' + error.message 
        };
      }
    }

    logger.info(`API key test: ${marketplace} for user ${req.user.email} - ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

    res.status(200).json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data || null
    });
  } catch (error) {
    logger.error('Test marketplace key failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while testing marketplace key'
    });
  }
});

// @desc    Delete marketplace API key
// @route   DELETE /api/v1/marketplace-keys/:marketplace
// @access  Private
router.delete('/:marketplace', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;

    const userKey = await UserMarketplaceKeys.findOne({
      where: { 
        user_id: req.user.id,
        marketplace: marketplace
      }
    });

    if (!userKey) {
      return res.status(404).json({
        success: false,
        error: `No API key found for ${marketplace}`
      });
    }

    // Soft delete - just mark as inactive
    userKey.is_active = false;
    await userKey.save();

    logger.info(`Marketplace key deleted: ${marketplace} for user ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${marketplace} API key deleted successfully`
    });
  } catch (error) {
    logger.error('Delete marketplace key failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting marketplace key'
    });
  }
});

module.exports = router; 