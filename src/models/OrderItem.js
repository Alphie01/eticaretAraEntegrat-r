const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class OrderItem extends Model {
  // Calculate total price for this item
  get totalPrice() {
    return this.quantity * this.unit_price;
  }

  // Calculate tax amount for this item
  get taxAmount() {
    return this.totalPrice * (this.tax_rate / 100);
  }
}

// Initialize OrderItem model
const initOrderItem = () => {
  const sequelize = getSequelize();
  
  OrderItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    variant_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      }
    },
    product_name: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    product_sku: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    variant_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 18.00
    },
    marketplace_item_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    marketplace_product_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    marketplace_variant_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['variant_id']
      }
    ]
  });

  return OrderItem;
};

// Define associations
const associateOrderItem = () => {
  const Order = require('./Order').Order;
  const Product = require('./Product').Product;
  const ProductVariant = require('./ProductVariant').ProductVariant;

  // OrderItem belongs to Order
  OrderItem.belongsTo(Order, { 
    foreignKey: 'order_id', 
    as: 'order' 
  });

  // OrderItem belongs to Product
  OrderItem.belongsTo(Product, { 
    foreignKey: 'product_id', 
    as: 'product' 
  });

  // OrderItem belongs to ProductVariant (optional)
  OrderItem.belongsTo(ProductVariant, { 
    foreignKey: 'variant_id', 
    as: 'variant' 
  });
};

module.exports = {
  OrderItem,
  initOrderItem,
  associateOrderItem
}; 