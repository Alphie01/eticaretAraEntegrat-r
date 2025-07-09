const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');
const { SUPPORTED_MARKETPLACES } = require('../constants/marketplaces');

// Debug logging to check constants
console.log('UserMarketplaceKeys - SUPPORTED_MARKETPLACES:', SUPPORTED_MARKETPLACES);

class UserMarketplaceKeys extends Model {
  // Safe decryption method that handles both encrypted and non-encrypted data
  safeDecrypt(value) {
    if (!value) return null;
    
    // If the value doesn't contain ':' it's likely not encrypted
    if (!value.includes(':')) {
      return value; // Return as plain text
    }
    
    try {
      return decrypt(value);
    } catch (error) {
      console.warn(`Failed to decrypt value, returning as plain text: ${error.message}`);
      return value; // Return as plain text if decryption fails
    }
  }

  // API key'i deşifrele
  getDecryptedApiKey() {
    return this.safeDecrypt(this.encrypted_api_key);
  }

  // API secret'ı deşifrele
  getDecryptedApiSecret() {
    return this.safeDecrypt(this.encrypted_api_secret);
  }

  // Supplier ID'yi deşifrele (Trendyol için)
  getDecryptedSupplierId() {
    return this.safeDecrypt(this.encrypted_supplier_id);
  }

  // Tüm credentials'ı deşifrele (marketplace'e göre farklı formatlarda)
  getDecryptedCredentials() {
    const baseCredentials = {
      marketplace: this.marketplace,
      isActive: this.is_active
    };

    // Marketplace'e göre farklı field isimleri döndür
    switch (this.marketplace) {
      case 'trendyol':
        return {
          ...baseCredentials,
          apiKey: this.getDecryptedApiKey(),
          apiSecret: this.getDecryptedApiSecret(),
          supplierId: this.getDecryptedSupplierId()
        };
      
      case 'hepsiburada':
        return {
          ...baseCredentials,
          username: this.getDecryptedApiKey(),        // API Key alanını username olarak kullan
          password: this.getDecryptedApiSecret(),     // API Secret alanını password olarak kullan
          merchantId: this.getDecryptedSupplierId()   // Supplier ID alanını merchantId olarak kullan
        };
      
      case 'amazon':
        return {
          ...baseCredentials,
          accessKeyId: this.getDecryptedApiKey(),
          secretAccessKey: this.getDecryptedApiSecret(),
          merchantId: this.getDecryptedSupplierId()
        };
      
      case 'n11':
        return {
          ...baseCredentials,
          apiKey: this.getDecryptedApiKey(),
          apiSecret: this.getDecryptedApiSecret()
        };
      
      default:
        // Genel format
        return {
          ...baseCredentials,
          apiKey: this.getDecryptedApiKey(),
          apiSecret: this.getDecryptedApiSecret(),
          supplierId: this.getDecryptedSupplierId()
        };
    }
  }

  // Key'leri şifrele ve kaydet (marketplace'e göre farklı parametreler)
  async setCredentials(credentials) {
    switch (this.marketplace) {
      case 'trendyol':
        this.encrypted_api_key = encrypt(credentials.apiKey);
        this.encrypted_api_secret = encrypt(credentials.apiSecret);
        if (credentials.supplierId) {
          this.encrypted_supplier_id = encrypt(credentials.supplierId);
        }
        break;
      
      case 'hepsiburada':
        this.encrypted_api_key = encrypt(credentials.username);
        this.encrypted_api_secret = encrypt(credentials.password);
        if (credentials.merchantId) {
          this.encrypted_supplier_id = encrypt(credentials.merchantId);
        }
        break;
      
      case 'amazon':
        this.encrypted_api_key = encrypt(credentials.accessKeyId);
        this.encrypted_api_secret = encrypt(credentials.secretAccessKey);
        if (credentials.merchantId) {
          this.encrypted_supplier_id = encrypt(credentials.merchantId);
        }
        break;
      
      case 'n11':
        this.encrypted_api_key = encrypt(credentials.apiKey);
        this.encrypted_api_secret = encrypt(credentials.apiSecret);
        break;
      
      default:
        // Genel format (legacy support)
        this.encrypted_api_key = encrypt(credentials.apiKey);
        this.encrypted_api_secret = encrypt(credentials.apiSecret);
        if (credentials.supplierId) {
          this.encrypted_supplier_id = encrypt(credentials.supplierId);
        }
        break;
    }
    
    await this.save();
  }
}

// Initialize UserMarketplaceKeys model
const initUserMarketplaceKeys = () => {
  const sequelize = getSequelize();
  
  UserMarketplaceKeys.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    marketplace: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: {
          args: [SUPPORTED_MARKETPLACES],
          msg: `Marketplace must be one of: ${SUPPORTED_MARKETPLACES.join(', ')}`
        },
        customValidator(value) {
          console.log('UserMarketplaceKeys validation - marketplace value:', value);
          console.log('UserMarketplaceKeys validation - allowed values:', SUPPORTED_MARKETPLACES);
          if (!SUPPORTED_MARKETPLACES.includes(value)) {
            throw new Error(`Invalid marketplace: ${value}. Allowed: ${SUPPORTED_MARKETPLACES.join(', ')}`);
          }
        }
      }
    },
    encrypted_api_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Şifrelenmiş API Key'
    },
    encrypted_api_secret: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş API Secret (bazı marketplace\'ler için gerekli)'
    },
    encrypted_supplier_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş Supplier ID (Trendyol için gerekli)'
    },
    key_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Kullanıcının key\'e verdiği isim'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'UserMarketplaceKeys',
    tableName: 'user_marketplace_keys',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_id', 'marketplace'],
        unique: true // Bir kullanıcının her marketplace için sadece bir key'i olabilir
      },
      {
        fields: ['marketplace']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return UserMarketplaceKeys;
};

// Define associations
const associateUserMarketplaceKeys = () => {
  const User = require('./User').User;

  // UserMarketplaceKeys belongs to User
  UserMarketplaceKeys.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
};

module.exports = {
  UserMarketplaceKeys,
  initUserMarketplaceKeys,
  associateUserMarketplaceKeys
}; 