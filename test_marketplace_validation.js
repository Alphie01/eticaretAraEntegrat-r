// Test marketplace validation after constraint fix
require('dotenv').config();
const { connectDB, getSequelize } = require('./src/config/database');
const { SUPPORTED_MARKETPLACES } = require('./src/constants/marketplaces');

async function testMarketplaceValidation() {
  try {
    await connectDB();
    const sequelize = getSequelize();
    
    console.log('🧪 Testing marketplace validation for all supported marketplaces...\n');
    
    for (const marketplace of SUPPORTED_MARKETPLACES) {
      try {
        // Try to insert a test record for each marketplace
        await sequelize.query(`
          INSERT INTO user_marketplace_accounts (user_id, marketplace, is_active) 
          VALUES (999999, '${marketplace}', 1)
        `);
        
        // If successful, delete the test record
        await sequelize.query(`
          DELETE FROM user_marketplace_accounts 
          WHERE user_id = 999999 AND marketplace = '${marketplace}'
        `);
        
        console.log(`✅ ${marketplace}: Validation PASSED`);
        
      } catch (error) {
        console.log(`❌ ${marketplace}: Validation FAILED - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Marketplace validation test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMarketplaceValidation()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
