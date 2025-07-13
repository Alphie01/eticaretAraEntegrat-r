const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class MarketplaceConfiguration extends Model {}
class MarketplaceCredentialField extends Model {}

// Initialize MarketplaceConfiguration model
const initMarketplaceConfiguration = () => {
  const sequelize = getSequelize();
  
  MarketplaceConfiguration.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    marketplace_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'MarketplaceConfiguration',
    tableName: 'marketplace_configurations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return MarketplaceConfiguration;
};

// Initialize MarketplaceCredentialField model
const initMarketplaceCredentialField = () => {
  const sequelize = getSequelize();
  
  MarketplaceCredentialField.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    marketplace_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'marketplace_configurations',
        key: 'marketplace_id'
      }
    },
    field_key: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    field_label: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    field_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'text'
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'MarketplaceCredentialField',
    tableName: 'marketplace_credential_fields',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return MarketplaceCredentialField;
};

// Define associations
const associateMarketplaceConfiguration = () => {
  // MarketplaceConfiguration has many credential fields
  MarketplaceConfiguration.hasMany(MarketplaceCredentialField, { 
    foreignKey: 'marketplace_id',
    sourceKey: 'marketplace_id',
    as: 'credentialFields' 
  });

  // MarketplaceCredentialField belongs to configuration
  MarketplaceCredentialField.belongsTo(MarketplaceConfiguration, { 
    foreignKey: 'marketplace_id',
    targetKey: 'marketplace_id',
    as: 'configuration' 
  });
};

module.exports = {
  MarketplaceConfiguration,
  MarketplaceCredentialField,
  initMarketplaceConfiguration,
  initMarketplaceCredentialField,
  associateMarketplaceConfiguration
};
