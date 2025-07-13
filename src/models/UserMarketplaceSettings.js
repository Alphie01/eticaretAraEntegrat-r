const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class UserMarketplaceSettings extends Model {}

// Initialize UserMarketplaceSettings model
const initUserMarketplaceSettings = () => {
  const sequelize = getSequelize();
  
  UserMarketplaceSettings.init({
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
    sync_products: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sync_orders: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sync_stock: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sync_prices: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'UserMarketplaceSettings',
    tableName: 'user_marketplace_settings'
  });

  return UserMarketplaceSettings;
};

// Define associations
const associateUserMarketplaceSettings = () => {
  const UserMarketplaceAccount = require('./UserMarketplaceAccount').UserMarketplaceAccount;

  // UserMarketplaceSettings belongs to UserMarketplaceAccount
  UserMarketplaceSettings.belongsTo(UserMarketplaceAccount, { 
    foreignKey: 'marketplace_account_id', 
    as: 'marketplaceAccount' 
  });
};

module.exports = {
  UserMarketplaceSettings,
  initUserMarketplaceSettings,
  associateUserMarketplaceSettings
}; 