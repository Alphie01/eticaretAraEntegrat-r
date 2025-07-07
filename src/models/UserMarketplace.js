const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

class UserMarketplace extends Model {
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
    return this.safeDecrypt(this.api_key);
  }

  // API secret'ı deşifrele
  getDecryptedApiSecret() {
    return this.safeDecrypt(this.api_secret);
  }

  // Supplier ID'yi deşifrele
  getDecryptedSupplierId() {
    return this.safeDecrypt(this.supplier_id);
  }

  // Merchant ID'yi deşifrele
  getDecryptedMerchantId() {
    return this.safeDecrypt(this.merchant_id);
  }

  // Seller ID'yi deşifrele
  getDecryptedSellerId() {
    return this.safeDecrypt(this.seller_id);
  }

  // Tüm credentials'ı deşifrele (marketplace'e göre farklı formatlarda)
  getDecryptedCredentials() {
    // Get marketplace from the associated account
    const marketplace = this.marketplaceAccount?.marketplace || 'unknown';
    
    const baseCredentials = {
      marketplace: marketplace,
      isActive: true
    };

    // Marketplace'e göre farklı field isimleri döndür
    switch (marketplace) {
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
          merchantId: this.getDecryptedMerchantId()   // Merchant ID alanını kullan
        };
      
      case 'amazon':
        return {
          ...baseCredentials,
          accessKeyId: this.getDecryptedApiKey(),
          secretAccessKey: this.getDecryptedApiSecret(),
          merchantId: this.getDecryptedMerchantId()
        };
      
      case 'n11':
        return {
          ...baseCredentials,
          apiKey: this.getDecryptedApiKey(),
          apiSecret: this.getDecryptedApiSecret()
        };
      
      case 'shopify':
        return {
          ...baseCredentials,
          shopDomain: this.shop_domain,
          accessToken: this.getDecryptedApiSecret()
        };
      
      default:
        // Genel format
        return {
          ...baseCredentials,
          apiKey: this.getDecryptedApiKey(),
          apiSecret: this.getDecryptedApiSecret(),
          supplierId: this.getDecryptedSupplierId(),
          merchantId: this.getDecryptedMerchantId(),
          sellerId: this.getDecryptedSellerId()
        };
    }
  }

  // Key'leri şifrele ve kaydet (marketplace'e göre farklı parametreler)
  async setCredentials(credentials) {
    // Get marketplace from the associated account
    const marketplace = this.marketplaceAccount?.marketplace || 'unknown';
    
    switch (marketplace) {
      case 'trendyol':
        this.api_key = encrypt(credentials.apiKey);
        this.api_secret = encrypt(credentials.apiSecret);
        if (credentials.supplierId) {
          this.supplier_id = encrypt(credentials.supplierId);
        }
        break;
      
      case 'hepsiburada':
        this.api_key = encrypt(credentials.username);
        this.api_secret = encrypt(credentials.password);
        if (credentials.merchantId) {
          this.merchant_id = encrypt(credentials.merchantId);
        }
        break;
      
      case 'amazon':
        this.api_key = encrypt(credentials.accessKeyId);
        this.api_secret = encrypt(credentials.secretAccessKey);
        if (credentials.merchantId) {
          this.merchant_id = encrypt(credentials.merchantId);
        }
        break;
      
      case 'n11':
        this.api_key = encrypt(credentials.apiKey);
        this.api_secret = encrypt(credentials.apiSecret);
        break;
      
      case 'shopify':
        this.shop_domain = credentials.shopDomain;
        this.api_secret = encrypt(credentials.accessToken);
        break;
      
      default:
        // Genel format (legacy support)
        this.api_key = encrypt(credentials.apiKey);
        this.api_secret = encrypt(credentials.apiSecret);
        if (credentials.supplierId) {
          this.supplier_id = encrypt(credentials.supplierId);
        }
        if (credentials.merchantId) {
          this.merchant_id = encrypt(credentials.merchantId);
        }
        if (credentials.sellerId) {
          this.seller_id = encrypt(credentials.sellerId);
        }
        break;
    }
    
    await this.save();
  }
}

// Initialize UserMarketplace model
const initUserMarketplace = () => {
  const sequelize = getSequelize();
  
  UserMarketplace.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    marketplace_account_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'user_marketplace_accounts',
        key: 'id'
      }
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş API Key'
    },
    api_secret: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş API Secret'
    },
    supplier_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş Supplier ID'
    },
    merchant_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş Merchant ID'
    },
    seller_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Şifrelenmiş Seller ID'
    },
    shop_domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Shopify shop domain'
    },
    environment_value: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Environment (production, sandbox, etc.)'
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
    modelName: 'UserMarketplace',
    tableName: 'user_marketplace_credentials',
    timestamps: true,
    indexes: [
      {
        fields: ['marketplace_account_id']
      },
      {
        fields: ['api_key']
      },
      {
        fields: ['created_at']
      }
    ]
  });
};

// Associate UserMarketplace model
const associateUserMarketplace = () => {
  const { UserMarketplaceAccount } = require('./UserMarketplaceAccount');
  
  UserMarketplace.belongsTo(UserMarketplaceAccount, {
    foreignKey: 'marketplace_account_id',
    as: 'marketplaceAccount'
  });
};

module.exports = {
  UserMarketplace,
  initUserMarketplace,
  associateUserMarketplace
}; 