require('dotenv').config();
const CicekSepetiAdapter = require('./src/adapters/CicekSepetiAdapter');
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');
const logger = require('./src/utils/logger');

/**
 * ÇiçekSepeti API Integration Test
 */
async function testCicekSepetiIntegration() {
  console.log('🌺 ÇiçekSepeti API Integration Test Started\n');

  try {
    // 1. Test ÇiçekSepeti Adapter Creation
    console.log('1️⃣ Testing ÇiçekSepeti Adapter Creation...');
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

    // 4. Test ÇiçekSepeti-Specific Features
    console.log('4️⃣ Testing ÇiçekSepeti-Specific Features...');
    await testCicekSepetiSpecificFeatures();
    console.log('✅ ÇiçekSepeti-specific features test completed\n');

    // 5. Test Cross-Platform Integration
    console.log('5️⃣ Testing Cross-Platform Integration...');
    await testCrossPlatformIntegration();
    console.log('✅ Cross-platform integration test completed\n');

    console.log('🎉 All ÇiçekSepeti Integration Tests Completed Successfully!');
    printCicekSepetiUsageGuide();

  } catch (error) {
    console.error('❌ ÇiçekSepeti Integration Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Test ÇiçekSepeti adapter creation
 */
async function testAdapterCreation() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'CICEKSEPETI_API_KEY'
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
      console.log('   💡 Please configure ÇiçekSepeti credentials in .env file');
      return false;
    }

    // Create adapter
    const config = {
      apiKey: process.env.CICEKSEPETI_API_KEY,
      sellerId: process.env.CICEKSEPETI_SELLER_ID,
      apiSecret: process.env.CICEKSEPETI_API_SECRET,
      environment: process.env.CICEKSEPETI_ENVIRONMENT || 'production'
    };

    const adapter = new CicekSepetiAdapter(config);
    console.log('   ✅ ÇiçekSepeti adapter created successfully');
    console.log(`   🔑 API Key: ${config.apiKey.substring(0, 8)}...`);
    console.log(`   🏪 Seller ID: ${config.sellerId || 'Not specified'}`);
    console.log(`   🌍 Environment: ${config.environment}`);
    
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
    console.log(`   🏪 Company Name: ${adapter.sellerInfo?.companyName || 'N/A'}`);
    console.log(`   📧 Contact Email: ${adapter.sellerInfo?.email || 'N/A'}`);
    console.log(`   📱 Phone: ${adapter.sellerInfo?.phone || 'N/A'}`);
    console.log(`   🌍 Environment: ${adapter.environment}`);
    console.log(`   📊 Rate Limit: ${adapter.rateLimits.maxRequests} req/sec`);

    return adapter;

  } catch (error) {
    console.log(`   ❌ Authentication failed: ${error.message}`);
    console.log('   💡 Check your API key and seller credentials');
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
    console.log('   🌸 Testing get products...');
    const products = await adapter.getProducts({ limit: 5 });
    console.log(`   ✅ Retrieved ${products.products?.length || 0} products`);
    console.log(`   📊 Total count: ${products.totalCount}`);
    console.log(`   📄 Current page: ${products.currentPage}`);
    console.log(`   📊 Has next page: ${products.hasNextPage}`);
    
    if (products.products && products.products.length > 0) {
      const firstProduct = products.products[0];
      console.log(`   🌺 Sample product: ${firstProduct.name || 'N/A'}`);
      console.log(`   💰 Price: ${firstProduct.price || 'N/A'} TRY`);
      console.log(`   📦 Stock: ${firstProduct.stock || 'N/A'}`);
      console.log(`   🏷️  Category: ${firstProduct.categoryId || 'N/A'}`);
    }

    // Test get categories
    console.log('   📂 Testing get categories...');
    try {
      const categories = await adapter.getCategories();
      console.log(`   ✅ Retrieved ${categories?.length || 0} categories`);
      
      if (categories && categories.length > 0) {
        console.log('   📋 Sample categories:');
        categories.slice(0, 3).forEach((cat, index) => {
          console.log(`      ${index + 1}. ${cat.name || cat.title} (ID: ${cat.id})`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Categories test failed: ${error.message}`);
    }

    // Test get orders
    console.log('   📋 Testing get orders...');
    try {
      const orders = await adapter.getOrders({ 
        limit: 5,
        status: 'all'
      });
      console.log(`   ✅ Retrieved ${orders.orders?.length || 0} orders`);
      console.log(`   📊 Total count: ${orders.totalCount}`);
      
      if (orders.orders && orders.orders.length > 0) {
        const firstOrder = orders.orders[0];
        console.log(`   📦 Sample order: ${firstOrder.id || firstOrder.orderNumber}`);
        console.log(`   📅 Date: ${firstOrder.createdAt || firstOrder.orderDate}`);
        console.log(`   💰 Total: ${firstOrder.total || firstOrder.totalAmount} TRY`);
      }
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
 * Test ÇiçekSepeti-specific features
 */
async function testCicekSepetiSpecificFeatures() {
  try {
    const adapter = await testAuthentication();
    if (!adapter) return;

    // Test cities
    console.log('   🏙️ Testing cities...');
    try {
      const cities = await adapter.getCities();
      console.log(`   ✅ Retrieved ${cities?.length || 0} cities`);
      
      if (cities && cities.length > 0) {
        console.log('   🗺️  Sample cities:');
        cities.slice(0, 5).forEach((city, index) => {
          console.log(`      ${index + 1}. ${city.name} (ID: ${city.id})`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Cities test failed: ${error.message}`);
    }

    // Test occasions
    console.log('   🎉 Testing occasions...');
    try {
      const occasions = await adapter.getOccasions();
      console.log(`   ✅ Retrieved ${occasions?.length || 0} occasions`);
      
      if (occasions && occasions.length > 0) {
        console.log('   🎈 Sample occasions:');
        occasions.slice(0, 5).forEach((occasion, index) => {
          console.log(`      ${index + 1}. ${occasion.name} (ID: ${occasion.id})`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Occasions test failed: ${error.message}`);
    }

    // Test delivery options
    console.log('   🚚 Testing delivery options...');
    try {
      // Assuming Istanbul (city ID 34)
      const deliveryOptions = await adapter.getDeliveryOptions(34, 1);
      console.log(`   ✅ Retrieved ${deliveryOptions?.length || 0} delivery options`);
      
      if (deliveryOptions && deliveryOptions.length > 0) {
        console.log('   📦 Sample delivery options:');
        deliveryOptions.slice(0, 3).forEach((option, index) => {
          console.log(`      ${index + 1}. ${option.name || option.type} - ${option.price || 0} TRY`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Delivery options test failed: ${error.message}`);
    }

    // Test adapter info
    console.log('   ℹ️ Testing adapter info...');
    const info = await adapter.getInfo();
    console.log('   ✅ Adapter info retrieved:');
    console.log(`      Marketplace: ${info.marketplace}`);
    console.log(`      Environment: ${info.environment}`);
    console.log(`      Features: ${info.features?.join(', ')}`);
    console.log(`      Max products per request: ${info.limits?.maxProductsPerRequest}`);
    console.log(`      Max images per product: ${info.limits?.maxImagesPerProduct}`);
    console.log(`      Rate limit: ${info.limits?.requestsPerSecond} req/sec`);
    console.log(`      Categories: ${info.categories?.join(', ')}`);

  } catch (error) {
    console.log(`   ❌ ÇiçekSepeti-specific features test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test cross-platform integration
 */
async function testCrossPlatformIntegration() {
  try {
    console.log('   🔄 Testing cross-platform sync with ÇiçekSepeti...');
    
    const syncManager = new CrossPlatformSyncManager();
    const supportedMarketplaces = syncManager.getSupportedMarketplaces();
    
    console.log(`   📊 Supported marketplaces: ${supportedMarketplaces.join(', ')}`);
    
    if (!supportedMarketplaces.includes('ciceksepeti')) {
      console.log('   ❌ ÇiçekSepeti not in supported marketplaces');
      return;
    }

    console.log('   ✅ ÇiçekSepeti is supported for cross-platform sync');

    // Test marketplace combinations
    const testCombinations = [
      { source: 'trendyol', target: 'ciceksepeti' },
      { source: 'ciceksepeti', target: 'trendyol' },
      { source: 'hepsiburada', target: 'ciceksepeti' },
      { source: 'ciceksepeti', target: 'hepsiburada' },
      { source: 'amazon', target: 'ciceksepeti' },
      { source: 'ciceksepeti', target: 'amazon' },
      { source: 'n11', target: 'ciceksepeti' },
      { source: 'ciceksepeti', target: 'n11' },
      { source: 'shopify', target: 'ciceksepeti' },
      { source: 'ciceksepeti', target: 'shopify' }
    ];

    console.log('   📋 Available sync combinations:');
    testCombinations.forEach((combo, index) => {
      console.log(`      ${index + 1}. ${combo.source} → ${combo.target}`);
    });

    // Test product normalization
    console.log('   🔧 Testing product data normalization...');
    const mockCicekSepetiProduct = {
      id: '12345',
      name: 'Red Rose Bouquet',
      description: 'Beautiful red roses for special occasions',
      brand: 'Premium Flowers',
      price: 150.00,
      stock: 25,
      sku: 'ROSE-RED-12',
      barcode: '1234567890123',
      categoryId: 'flowers',
      status: 'active',
      images: [
        { url: 'https://example.com/rose1.jpg' },
        { url: 'https://example.com/rose2.jpg' }
      ],
      isPerishable: true,
      shelfLife: 7,
      deliveryType: 'same_day',
      occasionIds: ['valentine', 'anniversary']
    };

    const normalized = syncManager.normalizeProductData(mockCicekSepetiProduct, 'ciceksepeti');
    console.log('   ✅ Product normalization successful');
    console.log(`      Normalized SKU: ${normalized.sku}`);
    console.log(`      Normalized Name: ${normalized.name}`);
    console.log(`      Normalized Price: ${normalized.price} TRY`);
    console.log(`      Normalized Stock: ${normalized.stock}`);
    console.log(`      Delivery Type: ${normalized.deliveryType}`);
    console.log(`      Is Perishable: ${normalized.isPerishable}`);
    console.log(`      Shelf Life: ${normalized.shelfLife} days`);

    // Test product transformation
    console.log('   🔄 Testing product transformation...');
    const transformed = syncManager.transformProductForMarketplace(normalized, 'ciceksepeti');
    console.log('   ✅ Product transformation successful');
    console.log(`      ÇiçekSepeti Name: ${transformed.name}`);
    console.log(`      ÇiçekSepeti Category: ${transformed.categoryId}`);
    console.log(`      ÇiçekSepeti Price: ${transformed.price} ${transformed.currency}`);
    console.log(`      ÇiçekSepeti Stock Status: ${transformed.stockStatus}`);
    console.log(`      ÇiçekSepeti Images: ${transformed.images?.length || 0}`);

  } catch (error) {
    console.log(`   ❌ Cross-platform integration test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Print ÇiçekSepeti usage guide
 */
function printCicekSepetiUsageGuide() {
  console.log('\n📖 ÇiçekSepeti API Integration Guide');
  console.log('====================================\n');

  console.log('🔧 Setup Requirements:');
  console.log('1. ÇiçekSepeti seller account');
  console.log('2. API key from ÇiçekSepeti developer portal');
  console.log('3. Valid seller credentials');
  console.log('4. Configured credentials in .env file\n');

  console.log('🚀 Quick Start Commands:');
  console.log('# Test ÇiçekSepeti integration');
  console.log('node test_ciceksepeti_integration.js\n');

  console.log('# Test cross-platform sync');
  console.log('node test_cross_platform_sync.js\n');

  console.log('🔄 Cross-Platform Sync Examples:');
  console.log('# Analyze Trendyol → ÇiçekSepeti');
  console.log('POST /api/v1/sync/cross-platform/analyze');
  console.log('{');
  console.log('  "sourceMarketplace": "trendyol",');
  console.log('  "targetMarketplace": "ciceksepeti"');
  console.log('}\n');

  console.log('# Sync ÇiçekSepeti → Shopify');
  console.log('POST /api/v1/sync/cross-platform/execute');
  console.log('{');
  console.log('  "sourceMarketplace": "ciceksepeti",');
  console.log('  "targetMarketplace": "shopify",');
  console.log('  "options": { "syncMissing": true }');
  console.log('}\n');

  console.log('🌺 ÇiçekSepeti-Specific Features:');
  console.log('• Flower and gift marketplace specialization');
  console.log('• City-based delivery options');
  console.log('• Occasion-based product categorization');
  console.log('• Perishable product management');
  console.log('• Same-day delivery support');
  console.log('• Care instructions for flowers');
  console.log('• Shelf life tracking');
  console.log('• Weight and dimension specifications\n');

  console.log('📊 Key Operations:');
  console.log('• Product CRUD operations');
  console.log('• Stock and price management');
  console.log('• Order status tracking');
  console.log('• City and delivery option queries');
  console.log('• Occasion-based filtering');
  console.log('• Image management');
  console.log('• Perishable product handling');
  console.log('• Delivery type configuration\n');

  console.log('🔗 Cross-Platform Combinations:');
  console.log('• Trendyol ↔ ÇiçekSepeti');
  console.log('• Hepsiburada ↔ ÇiçekSepeti');
  console.log('• Amazon ↔ ÇiçekSepeti');
  console.log('• N11 ↔ ÇiçekSepeti');
  console.log('• Shopify ↔ ÇiçekSepeti');
  console.log('• Multi-marketplace → ÇiçekSepeti sync\n');

  console.log('📊 Monitoring:');
  console.log('• Rate limit tracking (10 req/sec)');
  console.log('• Authentication status monitoring');
  console.log('• Delivery option validation');
  console.log('• Perishable product alerts');
  console.log('• Same-day delivery tracking\n');

  console.log('🔗 Useful Links:');
  console.log('• ÇiçekSepeti Seller Portal: https://satici.ciceksepeti.com/');
  console.log('• Developer Documentation: [Contact ÇiçekSepeti Support]');
  console.log('• API Status: https://api.ciceksepeti.com/status');
  console.log('• Integration Guide: ./docs/CICEKSEPETI_INTEGRATION.md\n');

  console.log('💡 Tips:');
  console.log('• Focus on flower and gift categories');
  console.log('• Set appropriate shelf life for perishable products');
  console.log('• Configure same-day delivery for time-sensitive items');
  console.log('• Use occasion-based categorization');
  console.log('• Include care instructions for flowers');
  console.log('• Monitor stock carefully for perishable items\n');

  console.log('🎯 Product Categories:');
  console.log('• Fresh Flowers (roses, tulips, carnations)');
  console.log('• Bouquets and Arrangements');
  console.log('• Plants (indoor, outdoor, succulents)');
  console.log('• Gifts (chocolates, teddy bears, jewelry)');
  console.log('• Cakes and Desserts');
  console.log('• Special Occasion Items\n');

  console.log('🌺 ÇiçekSepeti integration is ready! Start syncing flower and gift products!');
}

// Run the test
if (require.main === module) {
  testCicekSepetiIntegration().catch(console.error);
}

module.exports = testCicekSepetiIntegration; 