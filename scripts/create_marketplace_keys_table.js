const { connectDB, getSequelize } = require('../src/config/database');
const logger = require('../src/utils/logger');

const createMarketplaceKeysTable = async () => {
  try {
    // Connect to database
    await connectDB();
    const sequelize = getSequelize();
    
    if (!sequelize) {
      throw new Error('Database connection failed');
    }

    // Create table SQL
    const createTableSQL = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_marketplace_keys' AND xtype='U')
      BEGIN
          CREATE TABLE user_marketplace_keys (
              id BIGINT IDENTITY(1,1) PRIMARY KEY,
              user_id BIGINT NOT NULL,
              marketplace NVARCHAR(50) NOT NULL,
              encrypted_api_key NTEXT NOT NULL,
              encrypted_api_secret NTEXT NULL,
              encrypted_supplier_id NTEXT NULL,
              key_name NVARCHAR(100) NULL,
              is_active BIT NOT NULL DEFAULT 1,
              last_used_at DATETIME2 NULL,
              created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
              updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
              
              -- Foreign key constraint
              CONSTRAINT FK_user_marketplace_keys_user_id 
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              
              -- Unique constraint - her kullanıcının her marketplace için sadece bir key'i olabilir
              CONSTRAINT UQ_user_marketplace_keys_user_marketplace 
                  UNIQUE (user_id, marketplace),
              
              -- Check constraint - marketplace değerleri
              CONSTRAINT CK_user_marketplace_keys_marketplace 
                  CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'))
          );
          
          PRINT 'user_marketplace_keys tablosu oluşturuldu.';
      END
      ELSE
      BEGIN
          PRINT 'user_marketplace_keys tablosu zaten mevcut.';
      END
    `;

    // Execute the SQL
    await sequelize.query(createTableSQL);
    
    // Create indexes
    const createIndexesSQL = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_user_id')
      BEGIN
          CREATE INDEX IX_user_marketplace_keys_user_id 
          ON user_marketplace_keys (user_id);
      END

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_marketplace')
      BEGIN
          CREATE INDEX IX_user_marketplace_keys_marketplace 
          ON user_marketplace_keys (marketplace);
      END

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_is_active')
      BEGIN
          CREATE INDEX IX_user_marketplace_keys_is_active 
          ON user_marketplace_keys (is_active);
      END
    `;

    await sequelize.query(createIndexesSQL);
    
    logger.info('✅ user_marketplace_keys table created successfully');
    
    // Verify table exists
    const [results] = await sequelize.query("SELECT COUNT(*) as count FROM user_marketplace_keys");
    logger.info(`Table verification: ${results[0].count} records found`);
    
  } catch (error) {
    logger.error('❌ Error creating user_marketplace_keys table:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createMarketplaceKeysTable()
    .then(() => {
      console.log('✅ Table creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Table creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createMarketplaceKeysTable }; 