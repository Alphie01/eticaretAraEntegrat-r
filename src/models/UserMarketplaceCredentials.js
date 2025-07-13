const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class UserMarketplaceCredentials extends Model {}

// Initialize UserMarketplaceCredentials model
const initUserMarketplaceCredentials = () => {
  const sequelize = getSequelize();
  
  UserMarketplaceCredentials.init({
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
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    supplier_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    merchant_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    seller_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'UserMarketplaceCredentials',
    tableName: 'user_marketplace_credentials'
  });

  return UserMarketplaceCredentials;
};

// Define associations
const associateUserMarketplaceCredentials = () => {
  const UserMarketplaceAccount = require('./UserMarketplaceAccount').UserMarketplaceAccount;

  // UserMarketplaceCredentials belongs to UserMarketplaceAccount
  UserMarketplaceCredentials.belongsTo(UserMarketplaceAccount, { 
    foreignKey: 'marketplace_account_id', 
    as: 'marketplaceAccount' 
  });
};

module.exports = {
  UserMarketplaceCredentials,
  initUserMarketplaceCredentials,
  associateUserMarketplaceCredentials
}; 