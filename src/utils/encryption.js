const crypto = require('crypto');

// AES-256-CBC şifreleme algoritması
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // AES için 16 byte IV

/**
 * Text'i şifreler
 * @param {string} text - Şifrelenecek text
 * @returns {string} - Şifrelenmiş text (hex format)
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // IV'yi şifrelenmiş data'nın başına ekle
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Şifrelenmiş text'i deşifreler
 * @param {string} encryptedText - Şifrelenmiş text
 * @returns {string} - Deşifrelenmiş text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Şifreleme key'ini generate eder (ilk setup için)
 * @returns {string} - 32 byte hex key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * API key'in geçerliliğini test eder
 * @param {string} key - Test edilecek key
 * @returns {boolean} - Key geçerli mi?
 */
function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  
  // Temel format kontrolü
  return key.length >= 10 && key.length <= 200;
}

module.exports = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  validateApiKey
}; 