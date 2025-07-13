const crypto = require('crypto');

// AES-256-CBC şifreleme algoritması
const ALGORITHM = 'aes-256-cbc';
const DEBUG_MODE = process.env.ENCRYPTION_DEBUG === 'true';

// Debug logging helper
function debugLog(message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[ENCRYPTION DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set. Please add a 32-byte (64 hex char) key to your .env to enable encryption/decryption. You can generate one using \"node -e \"console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))\"\"');
}

if (process.env.ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes) long.');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // AES için 16 byte IV

/**
 * Text'i şifreler
 * @param {string} text - Şifrelenecek text
 * @returns {string} - Şifrelenmiş text (hex format)
 */
function encrypt(text) {
  if (!text) return null;
  
  try {
    debugLog('Encrypting text', { textLength: text.length });
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // IV'yi şifrelenmiş data'nın başına ekle
    const result = iv.toString('hex') + ':' + encrypted;
    
    debugLog('Encryption successful', { 
      ivLength: iv.toString('hex').length, 
      encryptedLength: encrypted.length,
      resultLength: result.length 
    });
    
    return result;
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
  
  // Eğer ':' karakteri yoksa, muhtemelen şifrelenmemiş veri
  if (!encryptedText.includes(':')) {
    debugLog('Data does not appear to be encrypted (no IV separator found)', { data: encryptedText.substring(0, 20) + '...' });
    return encryptedText;
  }
  
  try {
    const textParts = encryptedText.split(':');
    
    // Eğer parça sayısı yeterli değilse, şifrelenmemiş veri olabilir
    if (textParts.length < 2) {
      debugLog('Invalid encrypted data format, returning as plain text', { partsLength: textParts.length });
      return encryptedText;
    }
    
    const ivHex = textParts.shift();
    const encrypted = textParts.join(':');
    
    debugLog('Decryption attempt', { 
      ivHexLength: ivHex.length, 
      encryptedLength: encrypted.length 
    });
    
    // IV'nin geçerli hex formatında olup olmadığını kontrol et
    if (ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
      debugLog('Invalid IV format, returning as plain text', { ivHex: ivHex.substring(0, 10) + '...' });
      return encryptedText;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    debugLog('Decryption successful', { decryptedLength: decrypted.length });
    return decrypted;
  } catch (error) {
    debugLog('Decryption failed', { error: error.message, data: encryptedText.substring(0, 20) + '...' });
    console.warn('Decryption failed, data might not be encrypted or using different key:', error.message);
    // Şifre çözme başarısız olursa, orijinal veriyi döndür (düz metin olabilir)
    return encryptedText;
  }
}

/**
 * Veri şifrelenmiş mi kontrol eder
 * @param {string} text - Kontrol edilecek text
 * @returns {boolean} - Şifrelenmiş mi?
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Şifrelenmiş veri formatı: iv:encryptedData
  const parts = text.split(':');
  if (parts.length < 2) return false;
  
  const ivPart = parts[0];
  // IV 32 karakter hex string olmalı (16 byte)
  return ivPart.length === 32 && /^[0-9a-fA-F]+$/.test(ivPart);
}

/**
 * Güvenli şifreleme - sadece henüz şifrelenmemiş veriyi şifreler
 * @param {string} text - Şifrelenecek text
 * @returns {string} - Şifrelenmiş text (hex format)
 */
function safeEncrypt(text) {
  if (!text) return null;
  
  // Eğer zaten şifrelenmiş ise, tekrar şifreleme
  if (isEncrypted(text)) {
    console.log('Data is already encrypted, skipping encryption');
    return text;
  }
  
  return encrypt(text);
}

/**
 * Güvenli şifre çözme - hem şifrelenmiş hem de düz metni işler
 * @param {string} text - Şifre çözülecek text
 * @returns {string} - Şifre çözülmüş text
 */
function safeDecrypt(text) {
  if (!text) return null;
  
  // Eğer şifrelenmiş değilse, düz metin olarak döndür
  if (!isEncrypted(text)) {
    return text;
  }
  
  return decrypt(text);
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
  safeEncrypt,
  safeDecrypt,
  isEncrypted,
  generateEncryptionKey,
  validateApiKey
};