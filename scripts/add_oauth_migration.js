const { connectDB, closeDB } = require('../src/config/database');
const { getSequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

async function runOAuthMigration() {
  try {
    logger.info('Starting OAuth migration...');
    
    // Connect to database
    await connectDB();
    const sequelize = getSequelize();
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '../sql/add_oauth_columns.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL script by lines and filter out comments and empty lines
    const sqlStatements = sqlScript
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '' && line.trim() !== 'GO')
      .join('\n');
    
    // Execute the migration
    await sequelize.query(sqlStatements, { 
      type: sequelize.QueryTypes.RAW 
    });
    
    logger.info('OAuth migration completed successfully!');
    
    // Test if demo user exists and can be accessed
    const testQuery = `
      SELECT id, name, email, oauth_provider, 
             CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password
      FROM users 
      WHERE email = 'demo@eticaret.com'
    `;
    
    const result = await sequelize.query(testQuery, { 
      type: sequelize.QueryTypes.SELECT 
    });
    
    if (result.length > 0) {
      logger.info('Demo user found:', result[0]);
    } else {
      logger.warn('Demo user not found. Creating demo user...');
      
      // Create demo user
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('demo123', salt);
      
      await sequelize.query(`
        INSERT INTO users (name, email, password_hash, role_id, oauth_provider, email_verified)
        VALUES ('Demo User', 'demo@eticaret.com', ?, 1, 'local', 0)
      `, {
        replacements: [hashedPassword],
        type: sequelize.QueryTypes.INSERT
      });
      
      logger.info('Demo user created successfully!');
    }
    
  } catch (error) {
    logger.error('OAuth migration failed:', error);
    throw error;
  } finally {
    await closeDB();
  }
}

// Run migration if called directly
if (require.main === module) {
  runOAuthMigration()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runOAuthMigration }; 