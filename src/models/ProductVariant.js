const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class ProductVariant extends Model {
  // Update stock level
  async updateStock(newStock) {
    await this.update({ stock: newStock });
    return this;
  }

  // Check if variant is in stock
  get isInStock() {
    return this.stock > 0;
  }
}

// Initialize ProductVariant model
const initProductVariant = () => {
  const sequelize = getSequelize();
  
  ProductVariant.init({
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    discounted_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ProductVariant',
    tableName: 'product_variants',
    indexes: [
      {
        fields: ['product_id']
      },
      {
        fields: ['sku']
      },
      {
        fields: ['barcode']
      },
      {
        unique: true,
        fields: ['sku']
      }
    ]
  });

  return ProductVariant;
};

// Define associations
const associateProductVariant = () => {
  const Product = require('./Product').Product;
  const ProductVariantAttribute = require('./ProductVariantAttribute').ProductVariantAttribute;

  // ProductVariant belongs to Product
  ProductVariant.belongsTo(Product, { 
    foreignKey: 'product_id', 
    as: 'product' 
  });

  // ProductVariant has many attributes
  ProductVariant.hasMany(ProductVariantAttribute, { 
    foreignKey: 'variant_id', 
    as: 'attributes' 
  });
};

module.exports = {
  ProductVariant,
  initProductVariant,
  associateProductVariant
}; 