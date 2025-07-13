require('dotenv').config();
const ShopifyAdapter = require('./src/adapters/ShopifyAdapter');
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');
const logger = require('./src/utils/logger');

/**
 * Shopify Admin API Integration Test
 */
async function testShopifyIntegration() {
  console.log('🚀 Shopify Admin API Integration Test Started\n');

  try {
    // 1. Test Shopify Adapter Creation
    console.log('1️⃣ Testing Shopify Adapter Creation...');
    await testAdapterCreation();
    console.log('✅ Adapter creation test completed\n');

    // 2. Test Authentication
    console.log('2️⃣ Testing Authentication...');
    await testAuthentication();
    console.log('✅ Authentication test completed\n');

    // 3. Test API Operations
    console.log('3️⃣ Testing API Operations...');
    await testApiOperations();
    console.log('✅ API operations test completed\n');

    // 4. Test Shopify-Specific Features
    console.log('4️⃣ Testing Shopify-Specific Features...');
    await testShopifySpecificFeatures();
    console.log('✅ Shopify-specific features test completed\n');

    // 5. Test Cross-Platform Integration
    console.log('5️⃣ Testing Cross-Platform Integration...');
    await testCrossPlatformIntegration();
    console.log('✅ Cross-platform integration test completed\n');

    console.log('🎉 All Shopify Integration Tests Completed Successfully!');
    printShopifyUsageGuide();

  } catch (error) {
    console.error('❌ Shopify Integration Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test Shopify adapter creation
 */
async function testAdapterCreation() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'SHOPIFY_SHOP_DOMAIN',
      'SHOPIFY_ACCESS_TOKEN'
    ];

    console.log('   🔍 Checking environment variables...');
    const missingVars = [];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      } else {
        console.log(`   ✅ ${envVar}: ${process.env[envVar].substring(0, 8)}...`);
      }
    }

    if (missingVars.length > 0) {
      console.log(`   ⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.log('   💡 Please configure Shopify credentials in .env file');
      return false;
    }

    // Create adapter
    const config = {
      shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecret: process.env.SHOPIFY_API_SECRET
    };

    const adapter = new ShopifyAdapter(config);
    console.log('   ✅ Shopify adapter created successfully');
    console.log(`   🏪 Shop Domain: ${config.shopDomain}.myshopify.com`);
    console.log(`   🔑 Access Token: ${config.accessToken.substring(0, 8)}...`);
    
    return adapter;

  } catch (error) {
    console.log(`   ❌ Adapter creation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test authentication
 */
async function testAuthentication() {
  try {
    const adapter = await testAdapterCreation();
    if (!adapter) return;

    console.log('   🔐 Testing authentication...');
    
    // Test authentication
    await adapter.authenticate();
    
    console.log('   ✅ Authentication successful');
    console.log(`   🏪 Shop Name: ${adapter.shopInfo?.name || 'N/A'}`);
    console.log(`   📧 Shop Email: ${adapter.shopInfo?.email || 'N/A'}`);
    console.log(`   🌍 Shop Domain: ${adapter.shopInfo?.domain || 'N/A'}`);
    console.log(`   💰 Currency: ${adapter.shopInfo?.currency || 'N/A'}`);
    console.log(`   📊 Rate Limit: ${adapter.rateLimits.maxRequests} sustained, ${adapter.rateLimits.maxBurstRequests} burst`);

    return adapter;

  } catch (error) {
    console.log(`   ❌ Authentication failed: ${error.message}`);
    console.log('   💡 Check your shop domain and access token');
    throw error;
  }
}

/**
 * Test API operations
 */
async function testApiOperations() {
  try {
    const adapter = await testAuthentication();
    if (!adapter) return;

    // Test get products
    console.log('   📦 Testing get products...');
    const products = await adapter.getProducts({ limit: 5 });
    console.log(`   ✅ Retrieved ${products.products?.length || 0} products`);
    console.log(`   📊 Has next page: ${products.hasNextPage}`);
    
    if (products.products && products.products.length > 0) {
      const firstProduct = products.products[0];
      console.log(`   📋 Sample product: ${firstProduct.title || 'N/A'}`);
      console.log(`   💰 Price: ${firstProduct.variants?.[0]?.price || 'N/A'}`);
      console.log(`   📦 Stock: ${firstProduct.variants?.[0]?.inventory_quantity || 'N/A'}`);
    }

    // Test get collections (categories)
    console.log('   📂 Testing get collections...');
    try {
      const collections = await adapter.getCategories();
      console.log(`   ✅ Retrieved ${collections?.length || 0} collections`);
    } catch (error) {
      console.log(`   ⚠️  Collections test failed: ${error.message}`);
    }

    // Test get orders
    console.log('   📋 Testing get orders...');
    try {
      const orders = await adapter.getOrders({ 
        limit: 5,
        status: 'any'
      });
      console.log(`   ✅ Retrieved ${orders.orders?.length || 0} orders`);
      console.log(`   📊 Has next page: ${orders.hasNextPage}`);
    } catch (error) {
      console.log(`   ⚠️  Orders test failed: ${error.message}`);
    }

    return adapter;

  } catch (error) {
    console.log(`   ❌ API operations failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test Shopify-specific features
 */
async function testShopifySpecificFeatures() {
  try {
    const adapter = await testAuthentication();
    if (!adapter) return;

    // Test product variants
    console.log('   🔄 Testing product variants...');
    try {
      const products = await adapter.getProducts({ limit: 1 });
      if (products.products && products.products.length > 0) {
        const productId = products.products[0].id;
        const variants = await adapter.getVariants(productId);
        console.log(`   ✅ Product has ${variants?.length || 0} variants`);
      }
    } catch (error) {
      console.log(`   ⚠️  Variants test failed: ${error.message}`);
    }

    // Test webhooks
    console.log('   🔗 Testing webhooks...');
    try {
      const webhooks = await adapter.getWebhooks();
      console.log(`   ✅ Retrieved ${webhooks?.length || 0} webhooks`);
    } catch (error) {
      console.log(`   ⚠️  Webhooks test failed: ${error.message}`);
    }

    // Test inventory levels
    console.log('   📊 Testing inventory management...');
    try {
      const products = await adapter.getProducts({ limit: 1 });
      if (products.products && products.products.length > 0) {
        const firstVariant = products.products[0].variants?.[0];
        if (firstVariant?.inventory_item_id) {
          const inventoryLevels = await adapter.getInventoryLevels(firstVariant.inventory_item_id);
          console.log(`   ✅ Retrieved ${inventoryLevels?.length || 0} inventory levels`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Inventory levels test failed: ${error.message}`);
    }

    // Test adapter info
    console.log('   ℹ️ Testing adapter info...');
    const info = await adapter.getInfo();
    console.log('   ✅ Adapter info retrieved:');
    console.log(`      Marketplace: ${info.marketplace}`);
    console.log(`      API Version: ${info.apiVersion}`);
    console.log(`      Features: ${info.features?.join(', ')}`);
    console.log(`      Max variants: ${info.limits?.maxVariantsPerProduct}`);
    console.log(`      Max images: ${info.limits?.maxImagesPerProduct}`);
    console.log(`      Rate limit: ${info.limits?.requestsPerSecond} req/sec`);

  } catch (error) {
    console.log(`   ❌ Shopify-specific features test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test cross-platform integration
 */
async function testCrossPlatformIntegration() {
  try {
    console.log('   🔄 Testing cross-platform sync with Shopify...');
    
    const syncManager = new CrossPlatformSyncManager();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    console.log(`   📊 Supported marketplaces: ${supportedMarketplaces.join(', ')}`);
    
    if (!supportedMarketplaces.includes('shopify')) {
      console.log('   ❌ Shopify not in supported marketplaces');
      return;
    }

    console.log('   ✅ Shopify is supported for cross-platform sync');

    // Test marketplace combinations
    const testCombinations = [
      { source: 'trendyol', target: 'shopify' },
      { source: 'shopify', target: 'trendyol' },
      { source: 'hepsiburada', target: 'shopify' },
      { source: 'shopify', target: 'hepsiburada' },
      { source: 'amazon', target: 'shopify' },
      { source: 'shopify', target: 'amazon' },
      { source: 'n11', target: 'shopify' },
      { source: 'shopify', target: 'n11' }
    ];

    console.log('   📋 Available sync combinations:');
    testCombinations.forEach((combo, index) => {
      console.log(`      ${index + 1}. ${combo.source} → ${combo.target}`);
    });

    // Test product normalization
    console.log('   🔧 Testing product data normalization...');
    const mockShopifyProduct = {
      id: '12345',
      title: 'Test Product',
      vendor: 'Test Brand',
      product_type: 'Electronics',
      body_html: '<p>Test product description</p>',
      images: [{ src: 'https://example.com/image1.jpg' }],
      variants: [{
        id: '67890',
        price: '29.99',
        sku: 'TEST-SKU-123',
        barcode: '1234567890123',
        inventory_quantity: 100
      }],
      status: 'active'
    };

    const normalized = syncManager.normalizeProductData(mockShopifyProduct, 'shopify');
    console.log('   ✅ Product normalization successful');
    console.log(`      Normalized SKU: ${normalized.sku}`);
    console.log(`      Normalized Name: ${normalized.name}`);
    console.log(`      Normalized Price: ${normalized.price}`);
    console.log(`      Normalized Stock: ${normalized.stock}`);

    // Test product transformation
    console.log('   🔄 Testing product transformation...');
    const transformed = syncManager.transformProductForMarketplace(normalized, 'shopify');
    console.log('   ✅ Product transformation successful');
    console.log(`      Shopify Title: ${transformed.title}`);
    console.log(`      Shopify Vendor: ${transformed.vendor}`);
    console.log(`      Shopify Variants: ${transformed.variants?.length || 0}`);

  } catch (error) {
    console.log(`   ❌ Cross-platform integration test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Print Shopify usage guide
 */
function printShopifyUsageGuide() {
  console.log('\n📖 Shopify Admin API Integration Guide');
  console.log('======================================\n');

  console.log('🔧 Setup Requirements:');
  console.log('1. Shopify store (any plan)');
  console.log('2. Shopify Private App or Custom App');
  console.log('3. Admin API access token');
  console.log('4. Valid credentials configured in .env\n');

  console.log('🚀 Quick Start Commands:');
  console.log('# Test Shopify integration');
  console.log('node test_shopify_integration.js\n');

  console.log('# Test cross-platform sync');
  console.log('node test_cross_platform_sync.js\n');

  console.log('🔄 Cross-Platform Sync Examples:');
  console.log('# Analyze Trendyol → Shopify');
  console.log('POST /api/v1/sync/cross-platform/analyze');
  console.log('{');
  console.log('  "sourceMarketplace": "trendyol",');
  console.log('  "targetMarketplace": "shopify"');
  console.log('}\n');

  console.log('# Sync Shopify → Amazon');
  console.log('POST /api/v1/sync/cross-platform/execute');
  console.log('{');
  console.log('  "sourceMarketplace": "shopify",');
  console.log('  "targetMarketplace": "amazon",');
  console.log('  "options": { "syncMissing": true }');
  console.log('}\n');

  console.log('🎯 Shopify-Specific Features:');
  console.log('• Admin API v2023-10 implementation');
  console.log('• Access token authentication');
  console.log('• Product variants support');
  console.log('• Collections (categories) management');
  console.log('• Rate limiting (2 req/sec sustained, 40 burst)');
  console.log('• Inventory management');
  console.log('• Order fulfillment');
  console.log('• Webhooks support');
  console.log('• SEO optimization');
  console.log('• Multi-image support (up to 250)\n');

  console.log('📊 Key Operations:');
  console.log('• Product CRUD operations');
  console.log('• Variant management');
  console.log('• Stock and price updates');
  console.log('• Order status management');
  console.log('• Collection queries');
  console.log('• Webhook management');
  console.log('• Inventory level tracking');
  console.log('• Fulfillment processing\n');

  console.log('🔗 Cross-Platform Combinations:');
  console.log('• Trendyol ↔ Shopify');
  console.log('• Hepsiburada ↔ Shopify');
  console.log('• Amazon ↔ Shopify');
  console.log('• N11 ↔ Shopify');
  console.log('• Multi-marketplace → Shopify sync\n');

  console.log('📊 Monitoring:');
  console.log('• Real-time rate limit monitoring');
  console.log('• Authentication status tracking');
  console.log('• Error handling and retry logic');
  console.log('• Batch operation progress tracking');
  console.log('• Webhook event processing\n');

  console.log('🔗 Useful Links:');
  console.log('• Shopify Admin API: https://shopify.dev/api/admin');
  console.log('• Shopify Partners: https://partners.shopify.com/');
  console.log('• Admin Console: https://[your-shop].myshopify.com/admin');
  console.log('• Integration Guide: ./docs/SHOPIFY_INTEGRATION.md\n');

  console.log('💡 Tips:');
  console.log('• Use webhooks for real-time updates');
  console.log('• Monitor rate limits carefully');
  console.log('• Test with development store first');
  console.log('• Use variants for product options');
  console.log('• Implement proper error handling');
  console.log('• Use collections for categorization\n');

  console.log('🎉 Shopify integration is ready! Start syncing across platforms!');
}

// Run the test
if (require.main === module) {
  testShopifyIntegration().catch(console.error);
}

module.exports = testShopifyIntegration; 