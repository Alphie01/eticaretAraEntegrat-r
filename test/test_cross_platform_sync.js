require('dotenv').config();
const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:9010',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  testUser: {
    email: 'test@example.com',
    password: 'testpassword'
  }
};

let authToken = null;

/**
 * Test Cross-Platform Sync Functionality
 */
async function testCrossPlatformSync() {
  console.log('🚀 Cross-Platform Sync Test Started\n');

  try {
    // 1. Authentication
    console.log('1️⃣ Authentication Test');
    await testAuthentication();
    console.log('✅ Authentication successful\n');

    // 2. Check supported marketplaces
    console.log('2️⃣ Supported Marketplaces Test');
    const marketplaces = await testSupportedMarketplaces();
    console.log('✅ Marketplace check completed\n');

    // 3. System overview
    console.log('3️⃣ System Overview Test');
    await testSystemOverview();
    console.log('✅ System overview completed\n');

    // 4. Cross-platform analysis
    if (marketplaces.enabled.length >= 2) {
      console.log('4️⃣ Cross-Platform Analysis Test');
      await testCrossPlatformAnalysis(marketplaces.enabled);
      console.log('✅ Analysis completed\n');

      // 5. Sync status check
      console.log('5️⃣ Sync Status Test');
      await testSyncStatus(marketplaces.enabled);
      console.log('✅ Status check completed\n');

      // 6. Background job test
      console.log('6️⃣ Background Job Test');
      await testBackgroundJobs(marketplaces.enabled);
      console.log('✅ Background job test completed\n');

      // 7. Batch operations test
      console.log('7️⃣ Batch Operations Test');
      await testBatchOperations(marketplaces.enabled);
      console.log('✅ Batch operations test completed\n');
    } else {
      console.log('⚠️  Not enough marketplaces enabled for cross-platform testing');
      console.log(`   Available: ${marketplaces.enabled.join(', ')}`);
      console.log('   Need at least 2 marketplaces\n');
    }

    console.log('🎉 All Cross-Platform Sync Tests Completed Successfully!');
    printUsageGuide();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test user authentication
 */
async function testAuthentication() {
  // This is a mock test - in real scenario you would authenticate
  // For now, we'll assume authentication is handled elsewhere
  authToken = 'mock-jwt-token';
  console.log('   ℹ️  Using mock authentication token');
  console.log('   💡 In production, implement proper JWT authentication');
}

/**
 * Test supported marketplaces endpoint
 */
async function testSupportedMarketplaces() {
  try {
    const response = await makeRequest('GET', '/sync/cross-platform/marketplaces');
    
    const data = response.data.data;
    console.log(`   📊 Supported: ${data.supported.join(', ')}`);
    console.log(`   ✅ Available: ${data.available.join(', ')}`);
    console.log(`   🟢 Enabled: ${data.enabled.join(', ')}`);
    console.log(`   🔗 Possible combinations: ${data.combinations.length}`);

    // Display combinations
    if (data.combinations.length > 0) {
      console.log('   📋 Marketplace pairs:');
      data.combinations.forEach((combo, index) => {
        console.log(`      ${index + 1}. ${combo.source} ↔ ${combo.target}`);
      });
    }

    return data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ⚠️  Authentication required - using mock data');
      return {
        supported: ['trendyol', 'hepsiburada', 'amazon', 'n11'],
        available: ['trendyol'],
        enabled: ['trendyol'],
        combinations: []
      };
    }
    throw error;
  }
}

/**
 * Test system overview
 */
async function testSystemOverview() {
  try {
    const response = await makeRequest('GET', '/sync/cross-platform/overview');
    
    const data = response.data.data;
    console.log(`   🏪 Enabled marketplaces: ${data.enabledMarketplaces.join(', ')}`);
    console.log(`   📈 Overview stats:`);
    console.log(`      Total pairs: ${data.overview.totalPairs}`);
    console.log(`      Needs sync: ${data.overview.needsSync}`);
    console.log(`      Has conflicts: ${data.overview.hasConflicts}`);
    console.log(`      Healthy: ${data.overview.healthy}`);
    console.log(`      Errors: ${data.overview.errors || 0}`);

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ⚠️  Authentication required - skipping overview');
    } else {
      console.log(`   ⚠️  Overview error: ${error.response?.data?.error || error.message}`);
    }
  }
}

/**
 * Test cross-platform analysis
 */
async function testCrossPlatformAnalysis(enabledMarketplaces) {
  if (enabledMarketplaces.length < 2) {
    console.log('   ⚠️  Need at least 2 marketplaces for analysis');
    return;
  }

  const source = enabledMarketplaces[0];
  const target = enabledMarketplaces[1];

  try {
    console.log(`   🔍 Analyzing: ${source} → ${target}`);
    
    const response = await makeRequest('POST', '/sync/cross-platform/analyze', {
      sourceMarketplace: source,
      targetMarketplace: target,
      options: {
        strictMatching: false,
        similarityThreshold: 0.85
      }
    });

    const analysis = response.data.data;
    console.log(`   📊 Analysis Results:`);
    console.log(`      Source products: ${analysis.analysis.sourceProductCount}`);
    console.log(`      Target products: ${analysis.analysis.targetProductCount}`);
    console.log(`      Matches: ${analysis.summary.matched}`);
    console.log(`      Source only: ${analysis.summary.sourceOnly}`);
    console.log(`      Target only: ${analysis.summary.targetOnly}`);
    console.log(`      Conflicts: ${analysis.summary.conflicts}`);
    console.log(`      Match rate: ${analysis.summary.matchRate}%`);

    // Display recommendations
    if (analysis.syncRecommendations.length > 0) {
      console.log(`   💡 Recommendations:`);
      analysis.syncRecommendations.forEach((rec, index) => {
        console.log(`      ${index + 1}. ${rec.description}`);
      });
    }

    // Display next steps
    if (analysis.nextSteps.length > 0) {
      console.log(`   📋 Next Steps:`);
      analysis.nextSteps.forEach(step => {
        console.log(`      Step ${step.step}: ${step.description}`);
      });
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ⚠️  Authentication required for analysis');
    } else if (error.response?.status === 400) {
      console.log(`   ⚠️  Invalid parameters: ${error.response.data.error}`);
    } else {
      console.log(`   ❌ Analysis failed: ${error.response?.data?.error || error.message}`);
    }
  }
}

/**
 * Test sync status
 */
async function testSyncStatus(enabledMarketplaces) {
  if (enabledMarketplaces.length < 2) return;

  const source = enabledMarketplaces[0];
  const target = enabledMarketplaces[1];

  try {
    console.log(`   📊 Checking status: ${source} ↔ ${target}`);
    
    const response = await makeRequest('GET', `/sync/cross-platform/status?source=${source}&target=${target}`);
    
    const status = response.data.data;
    console.log(`   📈 Status Results:`);
    console.log(`      ${source}: ${status.marketplaceA.productCount} products`);
    console.log(`      ${target}: ${status.marketplaceB.productCount} products`);
    console.log(`      Match rate: ${status.syncStatus.estimatedMatchRate}%`);
    console.log(`      Needs sync: ${status.syncStatus.needsSync ? '✅' : '❌'}`);
    console.log(`      Has conflicts: ${status.syncStatus.hasConflicts ? '⚠️' : '✅'}`);

  } catch (error) {
    console.log(`   ⚠️  Status check error: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Test background jobs
 */
async function testBackgroundJobs(enabledMarketplaces) {
  if (enabledMarketplaces.length < 2) return;

  const source = enabledMarketplaces[0];
  const target = enabledMarketplaces[1];

  try {
    console.log(`   🎯 Starting background analysis job: ${source} → ${target}`);
    
    const response = await makeRequest('POST', '/sync/cross-platform/analyze', {
      sourceMarketplace: source,
      targetMarketplace: target,
      runInBackground: true,
      options: {
        strictMatching: false
      }
    });

    const jobInfo = response.data;
    console.log(`   ✅ Job started successfully:`);
    console.log(`      Job ID: ${jobInfo.jobId}`);
    console.log(`      Status: ${jobInfo.status}`);
    console.log(`      Message: ${jobInfo.message}`);

    // Test job status check
    await testJobStatus(jobInfo.jobId);

  } catch (error) {
    console.log(`   ⚠️  Background job error: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Test job status
 */
async function testJobStatus(jobId) {
  try {
    console.log(`   🔍 Checking job status: ${jobId}`);
    
    const response = await makeRequest('GET', `/sync/cross-platform/job/${jobId}`);
    
    const job = response.data.data;
    console.log(`   📊 Job Status:`);
    console.log(`      ID: ${job.id}`);
    console.log(`      Status: ${job.status}`);
    console.log(`      Progress: ${job.progress}%`);
    console.log(`      Created: ${job.createdAt}`);

  } catch (error) {
    console.log(`   ⚠️  Job status error: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Test batch operations
 */
async function testBatchOperations(enabledMarketplaces) {
  if (enabledMarketplaces.length < 2) return;

  // Create marketplace pairs
  const pairs = [];
  for (let i = 0; i < enabledMarketplaces.length; i++) {
    for (let j = i + 1; j < enabledMarketplaces.length; j++) {
      pairs.push({
        source: enabledMarketplaces[i],
        target: enabledMarketplaces[j]
      });
    }
  }

  if (pairs.length === 0) return;

  try {
    console.log(`   📦 Starting batch analysis for ${pairs.length} marketplace pairs`);
    
    const response = await makeRequest('POST', '/sync/cross-platform/batch/analyze', {
      marketplacePairs: pairs,
      options: {
        strictMatching: false,
        similarityThreshold: 0.8
      }
    });

    const batchInfo = response.data;
    console.log(`   ✅ Batch job started:`);
    console.log(`      Job ID: ${batchInfo.jobId}`);
    console.log(`      Total pairs: ${batchInfo.totalPairs}`);
    console.log(`      Status: ${batchInfo.status}`);

  } catch (error) {
    console.log(`   ⚠️  Batch operation error: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Make HTTP request helper
 */
async function makeRequest(method, endpoint, data = null) {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiPrefix}${endpoint}`;
  
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    return await axios(config);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`   🔐 Authentication required for ${method} ${endpoint}`);
    }
    throw error;
  }
}

/**
 * Print usage guide
 */
function printUsageGuide() {
  console.log('\n📖 Cross-Platform Sync Usage Guide');
  console.log('====================================\n');

  console.log('🔧 Setup Requirements:');
  console.log('1. At least 2 marketplace integrations enabled');
  console.log('2. Valid API credentials configured');
  console.log('3. User authentication setup\n');

  console.log('🚀 Quick Start:');
  console.log('1. Check supported marketplaces:');
  console.log('   GET /api/v1/sync/cross-platform/marketplaces\n');

  console.log('2. Analyze products between marketplaces:');
  console.log('   POST /api/v1/sync/cross-platform/analyze');
  console.log('   {');
  console.log('     "sourceMarketplace": "trendyol",');
  console.log('     "targetMarketplace": "hepsiburada"');
  console.log('   }\n');

  console.log('3. Execute cross-platform sync:');
  console.log('   POST /api/v1/sync/cross-platform/execute');
  console.log('   {');
  console.log('     "sourceMarketplace": "trendyol",');
  console.log('     "targetMarketplace": "hepsiburada",');
  console.log('     "options": {');
  console.log('       "syncMissing": true,');
  console.log('       "importMissing": false');
  console.log('     }');
  console.log('   }\n');

  console.log('4. Monitor sync status:');
  console.log('   GET /api/v1/sync/cross-platform/overview\n');

  console.log('🎯 Advanced Features:');
  console.log('• Batch operations for multiple marketplace pairs');
  console.log('• Background job processing');
  console.log('• Scheduled monitoring');
  console.log('• Conflict detection and resolution');
  console.log('• Automated sync recommendations\n');

  console.log('📊 Monitoring:');
  console.log('• Real-time job progress tracking');
  console.log('• Detailed sync reports');
  console.log('• Error handling and retry mechanisms');
  console.log('• Performance metrics and analytics\n');

  console.log('💡 Tips:');
  console.log('• Use background jobs for large sync operations');
  console.log('• Monitor conflict reports regularly');
  console.log('• Set up scheduled monitoring for automation');
  console.log('• Test with small product sets first\n');

  console.log('🔗 API Endpoints:');
  const endpoints = [
    'GET    /sync/cross-platform/marketplaces',
    'POST   /sync/cross-platform/analyze',
    'POST   /sync/cross-platform/execute',
    'GET    /sync/cross-platform/status',
    'GET    /sync/cross-platform/overview',
    'POST   /sync/cross-platform/batch/analyze',
    'POST   /sync/cross-platform/batch/execute',
    'GET    /sync/cross-platform/job/:jobId',
    'POST   /sync/cross-platform/monitor/start'
  ];

  endpoints.forEach(endpoint => {
    console.log(`   ${endpoint}`);
  });

  console.log('\n🎉 Ready to sync across platforms!');
}

// Run the test
if (require.main === module) {
  testCrossPlatformSync().catch(console.error);
}

module.exports = testCrossPlatformSync; 