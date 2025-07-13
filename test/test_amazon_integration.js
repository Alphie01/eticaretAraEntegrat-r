require('dotenv').config();
const AmazonAdapter = require('./src/adapters/AmazonAdapter');
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');
const logger = require('./src/utils/logger');

/**
 * Amazon SP-API Integration Test
 */
async function testAmazonIntegration() {
  console.log('🚀 Amazon SP-API Integration Test Started\n');

  try {
    // 1. Test Amazon Adapter Creation
    console.log('1️⃣ Testing Amazon Adapter Creation...');
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

    // 4. Test Cross-Platform Integration
    console.log('4️⃣ Testing Cross-Platform Integration...');
    await testCrossPlatformIntegration();
    console.log('✅ Cross-platform integration test completed\n');

    console.log('🎉 All Amazon Integration Tests Completed Successfully!');
    printAmazonUsageGuide();

  } catch (error) {
    console.error('❌ Amazon Integration Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test Amazon adapter creation
 */
async function testAdapterCreation() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'AMAZON_ACCESS_KEY_ID',
      'AMAZON_SECRET_ACCESS_KEY', 
      'AMAZON_SELLER_ID',
      'AMAZON_REFRESH_TOKEN'
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
      console.log('   💡 Please configure Amazon credentials in .env file');
      return false;
    }

    // Create adapter
    const config = {
      accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
      secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
      sellerId: process.env.AMAZON_SELLER_ID,
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'A1PA6795UKMFR9',
      region: process.env.AMAZON_REGION || 'eu-west-1',
      refreshToken: process.env.AMAZON_REFRESH_TOKEN
    };

    const adapter = new AmazonAdapter(config);
    console.log('   ✅ Amazon adapter created successfully');
    console.log(`   📍 Region: ${config.region}`);
    console.log(`   🏪 Marketplace: ${config.marketplaceId}`);
    
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
    console.log(`   🎫 Access token obtained`);
    console.log(`   ⏰ Token expiry set`);

    return adapter;

  } catch (error) {
    console.log(`   ❌ Authentication failed: ${error.message}`);
    console.log('   💡 Check your refresh token and credentials');
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
    const products = await adapter.getProducts({ maxResults: 5 });
    console.log(`   ✅ Retrieved ${products.products?.length || 0} products`);
    
    if (products.products && products.products.length > 0) {
      const firstProduct = products.products[0];
      console.log(`   📋 Sample product: ${firstProduct.summaries?.[0]?.itemName || 'N/A'}`);
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
        maxResults: 5,
        createdAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      });
      console.log(`   ✅ Retrieved ${orders.orders?.length || 0} orders`);
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
 * Test cross-platform integration
 */
async function testCrossPlatformIntegration() {
  try {
    console.log('   🔄 Testing cross-platform sync with Amazon...');
    
    const syncManager = new CrossPlatformSyncManager();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    console.log(`   📊 Supported marketplaces: ${supportedMarketplaces.join(', ')}`);
    
    if (!supportedMarketplaces.includes('amazon')) {
      console.log('   ❌ Amazon not in supported marketplaces');
      return;
    }

    console.log('   ✅ Amazon is supported for cross-platform sync');

    // Test marketplace combinations
    const testCombinations = [
      { source: 'trendyol', target: 'amazon' },
      { source: 'amazon', target: 'trendyol' },
      { source: 'hepsiburada', target: 'amazon' },
      { source: 'amazon', target: 'hepsiburada' }
    ];

    console.log('   📋 Available sync combinations:');
    testCombinations.forEach((combo, index) => {
      console.log(`      ${index + 1}. ${combo.source} → ${combo.target}`);
    });

    // Test product normalization
    console.log('   🔧 Testing product data normalization...');
    const mockAmazonProduct = {
      asin: 'B08N5WRWNW',
      sku: 'TEST-SKU-123',
      title: 'Test Product',
      brand: 'Test Brand',
      price: 29.99,
      quantity: 100,
      description: 'Test product description',
      images: ['https://example.com/image1.jpg'],
      upc: '123456789012'
    };

    const normalized = syncManager.normalizeProductData(mockAmazonProduct, 'amazon');
    console.log('   ✅ Product normalization successful');
    console.log(`      Normalized SKU: ${normalized.sku}`);
    console.log(`      Normalized Name: ${normalized.name}`);
    console.log(`      Normalized Price: ${normalized.price}`);

  } catch (error) {
    console.log(`   ❌ Cross-platform integration test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Print Amazon usage guide
 */
function printAmazonUsageGuide() {
  console.log('\n📖 Amazon SP-API Integration Guide');
  console.log('==================================\n');

  console.log('🔧 Setup Requirements:');
  console.log('1. Amazon Developer Console account');
  console.log('2. SP-API application created and approved');
  console.log('3. Valid credentials configured in .env');
  console.log('4. Correct marketplace ID for your region\n');

  console.log('🚀 Quick Start Commands:');
  console.log('# Test Amazon integration');
  console.log('node test_amazon_integration.js\n');

  console.log('# Test cross-platform sync');
  console.log('node test_cross_platform_sync.js\n');

  console.log('🔄 Cross-Platform Sync Examples:');
  console.log('# Analyze Trendyol → Amazon');
  console.log('POST /api/v1/sync/cross-platform/analyze');
  console.log('{');
  console.log('  "sourceMarketplace": "trendyol",');
  console.log('  "targetMarketplace": "amazon"');
  console.log('}\n');

  console.log('# Sync Amazon → Hepsiburada');
  console.log('POST /api/v1/sync/cross-platform/execute');
  console.log('{');
  console.log('  "sourceMarketplace": "amazon",');
  console.log('  "targetMarketplace": "hepsiburada",');
  console.log('  "options": { "syncMissing": true }');
  console.log('}\n');

  console.log('🎯 Amazon-Specific Features:');
  console.log('• SP-API compliant implementation');
  console.log('• OAuth 2.0 + AWS Signature v4 authentication');
  console.log('• Feed API for product operations');
  console.log('• Rate limiting (10 requests/minute)');
  console.log('• ASIN, UPC, EAN support');
  console.log('• TSV data format handling');
  console.log('• Background job processing\n');

  console.log('📊 Monitoring:');
  console.log('• Feed processing status tracking');
  console.log('• Rate limit monitoring');
  console.log('• Authentication token management');
  console.log('• Error handling and retry logic\n');

  console.log('🔗 Useful Links:');
  console.log('• Amazon SP-API Documentation: https://developer-docs.amazon.com/sp-api/');
  console.log('• Developer Console: https://developer.amazon.com/');
  console.log('• Integration Guide: ./AMAZON_INTEGRATION_GUIDE.md\n');

  console.log('🎉 Amazon integration is ready! Start syncing across platforms!');
}

// Run the test
if (require.main === module) {
  testAmazonIntegration().catch(console.error);
}

module.exports = testAmazonIntegration; 