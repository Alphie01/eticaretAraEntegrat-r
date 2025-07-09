const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');
const { SUPPORTED_MARKETPLACES } = require('../constants/marketplaces');

// Debug logging to check constants
console.log('UserMarketplaceAccount - SUPPORTED_MARKETPLACES:', SUPPORTED_MARKETPLACES);

class UserMarketplaceAccount extends Model {}

// Initialize UserMarketplaceAccount model
const initUserMarketplaceAccount = () => {
  const sequelize = getSequelize();
  
  UserMarketplaceAccount.init({
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
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: {
          args: [SUPPORTED_MARKETPLACES],
          msg: `Marketplace must be one of: ${SUPPORTED_MARKETPLACES.join(', ')}`
        },
        customValidator(value) {
          console.log('UserMarketplaceAccount validation - marketplace value:', value);
          console.log('UserMarketplaceAccount validation - allowed values:', SUPPORTED_MARKETPLACES);
          if (!SUPPORTED_MARKETPLACES.includes(value)) {
            throw new Error(`Invalid marketplace: ${value}. Allowed: ${SUPPORTED_MARKETPLACES.join(', ')}`);
          }
        }
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_sync_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'UserMarketplaceAccount',
    tableName: 'user_marketplace_accounts',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'marketplace']
      }
    ]
  });

  return UserMarketplaceAccount;
};

// Define associations
const associateUserMarketplaceAccount = () => {
  const User = require('./User').User;
  const UserMarketplaceCredentials = require('./UserMarketplaceCredentials').UserMarketplaceCredentials;
  const UserMarketplaceSettings = require('./UserMarketplaceSettings').UserMarketplaceSettings;
  const UserMarketplace = require('./UserMarketplace').UserMarketplace;

  // UserMarketplaceAccount belongs to User
  UserMarketplaceAccount.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // UserMarketplaceAccount has one credentials (legacy)
  UserMarketplaceAccount.hasOne(UserMarketplaceCredentials, { 
    foreignKey: 'marketplace_account_id', 
    as: 'credentials' 
  });

  // UserMarketplaceAccount has one settings
  UserMarketplaceAccount.hasOne(UserMarketplaceSettings, { 
    foreignKey: 'marketplace_account_id', 
    as: 'settings' 
  });

  // UserMarketplaceAccount has one marketplace credentials (new)
  UserMarketplaceAccount.hasOne(UserMarketplace, { 
    foreignKey: 'marketplace_account_id', 
    as: 'marketplaceCredentials' 
  });
};

module.exports = {
  UserMarketplaceAccount,
  initUserMarketplaceAccount,
  associateUserMarketplaceAccount
}; 