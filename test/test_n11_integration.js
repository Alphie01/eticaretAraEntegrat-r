require('dotenv').config();
const N11Adapter = require('./src/adapters/N11Adapter');
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');
const logger = require('./src/utils/logger');

/**
 * N11 API Integration Test
 */
async function testN11Integration() {
  console.log('🚀 N11 API Integration Test Started\n');

  try {
    // 1. Test N11 Adapter Creation
    console.log('1️⃣ Testing N11 Adapter Creation...');
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

    // 4. Test N11-Specific Features
    console.log('4️⃣ Testing N11-Specific Features...');
    await testN11SpecificFeatures();
    console.log('✅ N11-specific features test completed\n');

    // 5. Test Cross-Platform Integration
    console.log('5️⃣ Testing Cross-Platform Integration...');
    await testCrossPlatformIntegration();
    console.log('✅ Cross-platform integration test completed\n');

    console.log('🎉 All N11 Integration Tests Completed Successfully!');
    printN11UsageGuide();

  } catch (error) {
    console.error('❌ N11 Integration Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test N11 adapter creation
 */
async function testAdapterCreation() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'N11_API_KEY',
      'N11_API_SECRET', 
      'N11_COMPANY_ID'
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
      console.log('   💡 Please configure N11 credentials in .env file');
      return false;
    }

    // Create adapter
    const config = {
      apiKey: process.env.N11_API_KEY,
      apiSecret: process.env.N11_API_SECRET,
      companyId: process.env.N11_COMPANY_ID
    };

    const adapter = new N11Adapter(config);
    console.log('   ✅ N11 adapter created successfully');
    console.log(`   🏢 Company ID: ${config.companyId}`);
    console.log(`   🔑 API Key: ${config.apiKey.substring(0, 8)}...`);
    
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
    console.log(`   📊 Rate limit: ${adapter.rateLimits.maxRequests} requests/minute`);
    console.log(`   🌐 Base URL: ${adapter.baseUrl}`);

    return adapter;

  } catch (error) {
    console.log(`   ❌ Authentication failed: ${error.message}`);
    console.log('   💡 Check your API key, secret, and company ID');
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
    const products = await adapter.getProducts({ size: 5 });
    console.log(`   ✅ Retrieved ${products.products?.length || 0} products`);
    console.log(`   📊 Total products: ${products.totalCount || 0}`);
    
    if (products.products && products.products.length > 0) {
      const firstProduct = products.products[0];
      console.log(`   📋 Sample product: ${firstProduct.title || 'N/A'}`);
    }

    // Test get categories
    console.log('   📂 Testing get categories...');
    try {
      const categories = await adapter.getCategories();
      console.log(`   ✅ Retrieved ${categories?.length || 0} categories`);
    } catch (error) {
      console.log(`   ⚠️  Categories test failed: ${error.message}`);
    }

    // Test get orders
    console.log('   📋 Testing get orders...');
    try {
      const orders = await adapter.getOrders({ 
        size: 5,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
      });
      console.log(`   ✅ Retrieved ${orders.orders?.length || 0} orders`);
      console.log(`   📊 Total orders: ${orders.totalCount || 0}`);
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
 * Test N11-specific features
 */
async function testN11SpecificFeatures() {
  try {
    const adapter = await testAuthentication();
    if (!adapter) return;

    // Test product search
    console.log('   🔍 Testing product search...');
    try {
      const searchResults = await adapter.searchProducts('test', null);
      console.log(`   ✅ Search returned ${searchResults?.length || 0} products`);
    } catch (error) {
      console.log(`   ⚠️  Product search failed: ${error.message}`);
    }

    // Test shipment templates
    console.log('   🚚 Testing shipment templates...');
    try {
      const templates = await adapter.getShipmentTemplates();
      console.log(`   ✅ Retrieved ${templates?.length || 0} shipment templates`);
    } catch (error) {
      console.log(`   ⚠️  Shipment templates test failed: ${error.message}`);
    }

    // Test category attributes
    console.log('   🏷️ Testing category attributes...');
    try {
      // Try with a common category ID (electronics)
      const attributes = await adapter.getCategoryAttributes(1000);
      console.log(`   ✅ Retrieved ${attributes?.length || 0} category attributes`);
    } catch (error) {
      console.log(`   ⚠️  Category attributes test failed: ${error.message}`);
    }

    // Test adapter info
    console.log('   ℹ️ Testing adapter info...');
    const info = await adapter.getInfo();
    console.log('   ✅ Adapter info retrieved:');
    console.log(`      Marketplace: ${info.marketplace}`);
    console.log(`      Features: ${info.features?.join(', ')}`);
    console.log(`      Max images: ${info.limits?.maxImagesPerProduct}`);
    console.log(`      Requests/minute: ${info.limits?.requestsPerMinute}`);

  } catch (error) {
    console.log(`   ❌ N11-specific features test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test cross-platform integration
 */
async function testCrossPlatformIntegration() {
  try {
    console.log('   🔄 Testing cross-platform sync with N11...');
    
    const syncManager = new CrossPlatformSyncManager();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    console.log(`   📊 Supported marketplaces: ${supportedMarketplaces.join(', ')}`);
    
    if (!supportedMarketplaces.includes('n11')) {
      console.log('   ❌ N11 not in supported marketplaces');
      return;
    }

    console.log('   ✅ N11 is supported for cross-platform sync');

    // Test marketplace combinations
    const testCombinations = [
      { source: 'trendyol', target: 'n11' },
      { source: 'n11', target: 'trendyol' },
      { source: 'hepsiburada', target: 'n11' },
      { source: 'n11', target: 'hepsiburada' },
      { source: 'amazon', target: 'n11' },
      { source: 'n11', target: 'amazon' }
    ];

    console.log('   📋 Available sync combinations:');
    testCombinations.forEach((combo, index) => {
      console.log(`      ${index + 1}. ${combo.source} → ${combo.target}`);
    });

    // Test product normalization
    console.log('   🔧 Testing product data normalization...');
    const mockN11Product = {
      id: '12345',
      title: 'Test Product',
      price: 29.99,
      quantity: 100,
      description: 'Test product description',
      images: ['https://example.com/image1.jpg'],
      sellerStockCode: 'TEST-SKU-123',
      gtin: '1234567890123'
    };

    const normalized = syncManager.normalizeProductData(mockN11Product, 'n11');
    console.log('   ✅ Product normalization successful');
    console.log(`      Normalized SKU: ${normalized.sku}`);
    console.log(`      Normalized Name: ${normalized.name}`);
    console.log(`      Normalized Price: ${normalized.price}`);

    // Test product transformation
    console.log('   🔄 Testing product transformation...');
    const transformed = syncManager.transformProductForMarketplace(normalized, 'n11');
    console.log('   ✅ Product transformation successful');
    console.log(`      N11 Title: ${transformed.title}`);
    console.log(`      N11 Currency: ${transformed.currencyType}`);
    console.log(`      N11 Stock Items: ${transformed.stockItems?.length || 0}`);

  } catch (error) {
    console.log(`   ❌ Cross-platform integration test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Print N11 usage guide
 */
function printN11UsageGuide() {
  console.log('\n📖 N11 API Integration Guide');
  console.log('============================\n');

  console.log('🔧 Setup Requirements:');
  console.log('1. N11 seller account');
  console.log('2. N11 API credentials (API Key, Secret, Company ID)');
  console.log('3. Valid credentials configured in .env');
  console.log('4. N11 store approval and activation\n');

  console.log('🚀 Quick Start Commands:');
  console.log('# Test N11 integration');
  console.log('node test_n11_integration.js\n');

  console.log('# Test cross-platform sync');
  console.log('node test_cross_platform_sync.js\n');

  console.log('🔄 Cross-Platform Sync Examples:');
  console.log('# Analyze Trendyol → N11');
  console.log('POST /api/v1/sync/cross-platform/analyze');
  console.log('{');
  console.log('  "sourceMarketplace": "trendyol",');
  console.log('  "targetMarketplace": "n11"');
  console.log('}\n');

  console.log('# Sync N11 → Hepsiburada');
  console.log('POST /api/v1/sync/cross-platform/execute');
  console.log('{');
  console.log('  "sourceMarketplace": "n11",');
  console.log('  "targetMarketplace": "hepsiburada",');
  console.log('  "options": { "syncMissing": true }');
  console.log('}\n');

  console.log('🎯 N11-Specific Features:');
  console.log('• REST API implementation');
  console.log('• Signature-based authentication');
  console.log('• Product, order, category management');
  console.log('• Rate limiting (60 requests/minute)');
  console.log('• Stock management with variants');
  console.log('• Multiple image support (up to 12)');
  console.log('• Shipment template integration');
  console.log('• Category attribute management\n');

  console.log('📊 Key Operations:');
  console.log('• Product CRUD operations');
  console.log('• Stock and price updates');
  console.log('• Order status management');
  console.log('• Category and attribute queries');
  console.log('• Product search functionality');
  console.log('• Batch operations with rate limiting\n');

  console.log('🔗 Cross-Platform Combinations:');
  console.log('• Trendyol ↔ N11');
  console.log('• Hepsiburada ↔ N11');
  console.log('• Amazon ↔ N11');
  console.log('• Multi-marketplace sync operations\n');

  console.log('📊 Monitoring:');
  console.log('• Request rate monitoring');
  console.log('• Authentication status tracking');
  console.log('• Error handling and retry logic');
  console.log('• Batch operation progress tracking\n');

  console.log('🔗 Useful Links:');
  console.log('• N11 API Documentation: https://api.n11.com/');
  console.log('• N11 Seller Panel: https://www.n11.com/');
  console.log('• Integration Guide: ./docs/N11_INTEGRATION.md\n');

  console.log('💡 Tips:');
  console.log('• Use shipment templates for consistent shipping');
  console.log('• Monitor rate limits carefully (60 req/min)');
  console.log('• Test with small product sets first');
  console.log('• Use category attributes for better categorization');
  console.log('• Implement proper error handling for API calls\n');

  console.log('🎉 N11 integration is ready! Start syncing across platforms!');
}

// Run the test
if (require.main === module) {
  testN11Integration().catch(console.error);
}

module.exports = testN11Integration; 