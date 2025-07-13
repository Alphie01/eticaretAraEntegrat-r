// Quick script to create marketplace tables using running server's DB connection
const { getSequelize } = require('../src/config/database');

async function createMarketplaceTables() {
  const sequelize = getSequelize();
  
  try {
    console.log('Creating marketplace_configurations table...');
    await sequelize.query(`
      CREATE TABLE marketplace_configurations (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          marketplace_id NVARCHAR(50) NOT NULL UNIQUE,
          name NVARCHAR(100) NOT NULL,
          logo NVARCHAR(10),
          color NVARCHAR(20),
          description NVARCHAR(500),
          is_active BIT DEFAULT 1,
          sort_order INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    
    console.log('Creating marketplace_credential_fields table...');
    await sequelize.query(`
      CREATE TABLE marketplace_credential_fields (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          marketplace_id NVARCHAR(50) NOT NULL,
          field_key NVARCHAR(50) NOT NULL,
          field_label NVARCHAR(100) NOT NULL,
          field_type NVARCHAR(20) NOT NULL DEFAULT 'text',
          is_required BIT DEFAULT 0,
          sort_order INT DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (marketplace_id) REFERENCES marketplace_configurations(marketplace_id)
      );
    `);
    
    console.log('Creating indexes...');
    await sequelize.query(`
      CREATE INDEX IX_marketplace_credential_fields_marketplace_id 
      ON marketplace_credential_fields(marketplace_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IX_marketplace_configurations_marketplace_id 
      ON marketplace_configurations(marketplace_id);
    `);
    
    console.log('✅ Tables created successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('already an object')) {
      console.log('📋 Tables already exist, checking for missing columns...');
      
      // Check if updated_at column exists in marketplace_credential_fields
      try {
        await sequelize.query(`
          SELECT updated_at FROM marketplace_credential_fields WHERE 1=0
        `);
        console.log('✅ updated_at column already exists');
      } catch (columnError) {
        if (columnError.message.includes('Invalid column name')) {
          console.log('🔧 Adding missing updated_at column...');
          await sequelize.query(`
            ALTER TABLE marketplace_credential_fields 
            ADD updated_at DATETIME2 DEFAULT GETDATE()
          `);
          console.log('✅ updated_at column added successfully');
        }
      }
    } else {
      console.error('❌ Error creating tables:', error.message);
      throw error;
    }
  }
}

module.exports = { createMarketplaceTables };
