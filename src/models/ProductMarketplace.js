const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class ProductMarketplace extends Model {}

// Initialize ProductMarketplace model
const initProductMarketplace = () => {
  const sequelize = getSequelize();
  
  ProductMarketplace.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    marketplace: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['trendyol', 'hepsiburada', 'amazon', 'n11']]
      }
    },
    marketplace_product_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    marketplace_sku: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['active', 'inactive', 'pending', 'rejected', 'draft']]
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    discounted_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    auto_sync: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    price_multiplier: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.00,
      validate: {
        min: 0.1,
        max: 10
      }
    },
    stock_buffer: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    custom_title: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    custom_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_sync_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sync_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['success', 'failed', 'pending', 'in_progress']]
      }
    },
    sync_errors: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProductMarketplace',
    tableName: 'product_marketplaces',
    indexes: [
      {
        fields: ['product_id']
      },
      {
        fields: ['marketplace']
      },
      {
        fields: ['marketplace_product_id']
      },
      {
        unique: true,
        fields: ['product_id', 'marketplace']
      }
    ]
  });

  return ProductMarketplace;
};

// Define associations
const associateProductMarketplace = () => {
  const Product = require('./Product').Product;

  // ProductMarketplace belongs to Product
  ProductMarketplace.belongsTo(Product, { 
    foreignKey: 'product_id', 
    as: 'product' 
  });
};

module.exports = {
  ProductMarketplace,
  initProductMarketplace,
  associateProductMarketplace
}; 