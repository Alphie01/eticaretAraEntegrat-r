// Script to check and fix database CHECK constraints for marketplace columns
const { connectDB, getSequelize } = require('./src/config/database');
const { SUPPORTED_MARKETPLACES } = require('./src/constants/marketplaces');

async function checkAndFixDatabaseConstraints() {
  try {
    console.log('🔍 Checking database CHECK constraints for marketplace columns...');
    console.log('Expected marketplaces:', SUPPORTED_MARKETPLACES);
    
    // Connect to database
    await connectDB();
    const sequelize = getSequelize();
    
    // Query to find all CHECK constraints related to marketplace columns
    const checkConstraintsQuery = `
      SELECT 
        t.table_name,
        cc.constraint_name,
        cc.check_clause
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc 
        ON tc.constraint_name = cc.constraint_name
      JOIN INFORMATION_SCHEMA.TABLES t 
        ON tc.table_name = t.table_name
      WHERE cc.check_clause LIKE '%marketplace%'
      ORDER BY t.table_name, cc.constraint_name;
    `;

    console.log('\n📋 Current marketplace CHECK constraints:');
    const constraints = await sequelize.query(checkConstraintsQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    if (constraints.length === 0) {
      console.log('❌ No marketplace CHECK constraints found!');
    }

    for (const constraint of constraints) {
      console.log(`\nTable: ${constraint.table_name}`);
      console.log(`Constraint: ${constraint.constraint_name}`);
      console.log(`Check Clause: ${constraint.check_clause}`);
      
      // Check if this constraint includes all supported marketplaces
      const hasAllMarketplaces = SUPPORTED_MARKETPLACES.every(mp => 
        constraint.check_clause.includes(`'${mp}'`)
      );
      
      if (hasAllMarketplaces) {
        console.log('✅ This constraint includes all supported marketplaces');
      } else {
        console.log('❌ This constraint is missing some marketplaces');
        
        // Find missing marketplaces
        const missingMarketplaces = SUPPORTED_MARKETPLACES.filter(mp => 
          !constraint.check_clause.includes(`'${mp}'`)
        );
        console.log('Missing marketplaces:', missingMarketplaces);
      }
    }

    // Check which tables have marketplace columns
    const tablesWithMarketplaceQuery = `
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE COLUMN_NAME LIKE '%marketplace%'
      ORDER BY TABLE_NAME, COLUMN_NAME;
    `;

    console.log('\n📋 Tables with marketplace columns:');
    const marketplaceColumns = await sequelize.query(tablesWithMarketplaceQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    for (const column of marketplaceColumns) {
      console.log(`${column.TABLE_NAME}.${column.COLUMN_NAME} (${column.DATA_TYPE}, ${column.IS_NULLABLE})`);
    }

    // Now let's try to fix the constraints
    console.log('\n🔧 Attempting to fix marketplace constraints...');
    
    const marketplacesList = SUPPORTED_MARKETPLACES.map(mp => `'${mp}'`).join(', ');
    
    const fixQueries = [
      // Drop and recreate constraints for main tables
      `ALTER TABLE user_marketplace_accounts DROP CONSTRAINT IF EXISTS CK_user_marketplace_accounts_marketplace;`,
      `ALTER TABLE user_marketplace_accounts ADD CONSTRAINT CK_user_marketplace_accounts_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`,
        
      `ALTER TABLE user_marketplaces DROP CONSTRAINT IF EXISTS CK_user_marketplaces_marketplace;`,
      `ALTER TABLE user_marketplaces ADD CONSTRAINT CK_user_marketplaces_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`,
        
      `ALTER TABLE user_marketplace_keys DROP CONSTRAINT IF EXISTS CK_user_marketplace_keys_marketplace;`,
      `ALTER TABLE user_marketplace_keys ADD CONSTRAINT CK_user_marketplace_keys_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`,
        
      `ALTER TABLE product_marketplaces DROP CONSTRAINT IF EXISTS CK_product_marketplaces_marketplace;`,
      `ALTER TABLE product_marketplaces ADD CONSTRAINT CK_product_marketplaces_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`,
        
      `ALTER TABLE orders DROP CONSTRAINT IF EXISTS CK_orders_marketplace;`,
      `ALTER TABLE orders ADD CONSTRAINT CK_orders_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`,
        
      `ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS CK_sync_logs_marketplace;`,
      `ALTER TABLE sync_logs ADD CONSTRAINT CK_sync_logs_marketplace 
        CHECK (marketplace IN (${marketplacesList}));`
    ];

    for (const query of fixQueries) {
      try {
        console.log(`Executing: ${query.substring(0, 80)}...`);
        await sequelize.query(query);
        console.log('✅ Success');
      } catch (error) {
        if (error.message.includes('does not exist') || error.message.includes('Cannot find')) {
          console.log('ℹ️ Constraint or table does not exist, skipping');
        } else {
          console.log('❌ Error:', error.message);
        }
      }
    }

    console.log('\n🔍 Re-checking constraints after fix...');
    const updatedConstraints = await sequelize.query(checkConstraintsQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    for (const constraint of updatedConstraints) {
      console.log(`\n${constraint.table_name}.${constraint.constraint_name}:`);
      console.log(`${constraint.check_clause}`);
      
      const hasAllMarketplaces = SUPPORTED_MARKETPLACES.every(mp => 
        constraint.check_clause.includes(`'${mp}'`)
      );
      console.log(hasAllMarketplaces ? '✅ OK' : '❌ Still missing marketplaces');
    }

  } catch (error) {
    console.error('❌ Error checking database constraints:', error);
  }
}

// Run the check
checkAndFixDatabaseConstraints().then(() => {
  console.log('\n🔍 Database constraint check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Database constraint check failed:', error);
  process.exit(1);
});
