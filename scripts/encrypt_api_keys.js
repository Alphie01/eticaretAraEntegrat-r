require('dotenv').config();
const { connectDB, getSequelize } = require('../src/config/database');
const { safeEncrypt, isEncrypted } = require('../src/utils/encryption');
const logger = require('../src/utils/logger');

/**
 * Veritabanındaki düz metin API anahtarlarını şifreler
 */
async function migrateUnencryptedApiKeys() {
  const sequelize = getSequelize();
  
  try {
    logger.info('Starting API key encryption migration...');
    
    // Tüm UserMarketplace kayıtlarını al
    const [results] = await sequelize.query(`
      SELECT id, api_key, api_secret, supplier_id, merchant_id, seller_id 
      FROM user_marketplace_credentials 
      WHERE 1=1
    `);
    
    let encryptedCount = 0;
    let skippedCount = 0;
    
    for (const record of results) {
      const updates = {};
      let hasUpdates = false;
      
      // API Key kontrolü ve şifreleme
      if (record.api_key && !isEncrypted(record.api_key)) {
        updates.api_key = safeEncrypt(record.api_key);
        hasUpdates = true;
      }
      
      // API Secret kontrolü ve şifreleme
      if (record.api_secret && !isEncrypted(record.api_secret)) {
        updates.api_secret = safeEncrypt(record.api_secret);
        hasUpdates = true;
      }
      
      // Supplier ID kontrolü ve şifreleme
      if (record.supplier_id && !isEncrypted(record.supplier_id)) {
        updates.supplier_id = safeEncrypt(record.supplier_id);
        hasUpdates = true;
      }
      
      // Merchant ID kontrolü ve şifreleme
      if (record.merchant_id && !isEncrypted(record.merchant_id)) {
        updates.merchant_id = safeEncrypt(record.merchant_id);
        hasUpdates = true;
      }
      
      // Seller ID kontrolü ve şifreleme
      if (record.seller_id && !isEncrypted(record.seller_id)) {
        updates.seller_id = safeEncrypt(record.seller_id);
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        // Güncelleme yap
        const setClause = Object.keys(updates)
          .map(key => `${key} = :${key}`)
          .join(', ');
        
        await sequelize.query(`
          UPDATE user_marketplace_credentials 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = :id
        `, {
          replacements: { ...updates, id: record.id }
        });
        
        encryptedCount++;
        logger.info(`Encrypted credentials for UserMarketplace ID: ${record.id}`);
      } else {
        skippedCount++;
      }
    }
    
    logger.info(`Migration completed! Encrypted: ${encryptedCount}, Skipped: ${skippedCount}`);
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Test fonksiyonu - şifreleme/şifre çözmenin çalışıp çalışmadığını kontrol eder
 */
async function testEncryption() {
  const { safeEncrypt, safeDecrypt } = require('../src/utils/encryption');
  
  console.log('Testing encryption/decryption...');
  
  const testData = [
    'test-api-key-123',
    'secret-key-456',
    '12345',
    'some-supplier-id'
  ];
  
  for (const data of testData) {
    try {
      const encrypted = safeEncrypt(data);
      const decrypted = safeDecrypt(encrypted);
      
      console.log(`Original: ${data}`);
      console.log(`Encrypted: ${encrypted}`);
      console.log(`Decrypted: ${decrypted}`);
      console.log(`Match: ${data === decrypted ? '✅' : '❌'}`);
      console.log('---');
    } catch (error) {
      console.error(`Test failed for "${data}":`, error);
    }
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    testEncryption();
  } else if (args.includes('--migrate')) {
    connectDB()
      .then(() => migrateUnencryptedApiKeys())
      .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node scripts/encrypt_api_keys.js --test    # Test encryption');
    console.log('  node scripts/encrypt_api_keys.js --migrate # Migrate unencrypted keys');
  }
}

module.exports = {
  migrateUnencryptedApiKeys,
  testEncryption
};
