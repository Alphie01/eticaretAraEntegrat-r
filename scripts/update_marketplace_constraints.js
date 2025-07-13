// Script to run SQL migrations for marketplace constraints
require('dotenv').config();
const { connectDB, getSequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

async function runMarketplaceConstraintMigration() {
  try {
    await connectDB();
    const sequelize = getSequelize();
    
    if (!sequelize) {
      throw new Error('Database connection not available');
    }

    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'sql', 'update_marketplace_constraints.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    logger.info('Starting marketplace constraint migration...');
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement && !trimmedStatement.startsWith('--')) {
        try {
          await sequelize.query(trimmedStatement);
          logger.info(`Executed: ${trimmedStatement.substring(0, 50)}...`);
        } catch (error) {
          // Some statements might fail if constraints don't exist, that's OK
          logger.warn(`Statement failed (this might be expected): ${error.message}`);
        }
      }
    }
    
    logger.info('Marketplace constraint migration completed successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  runMarketplaceConstraintMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMarketplaceConstraintMigration };
