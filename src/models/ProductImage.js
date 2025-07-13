const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class ProductImage extends Model {}

// Initialize ProductImage model
const initProductImage = () => {
  const sequelize = getSequelize();
  
  ProductImage.init({
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
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    alt_text: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_main: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'ProductImage',
    tableName: 'product_images',
    timestamps: true,
    updatedAt: false, // Database doesn't have updated_at column
    indexes: [
      {
        fields: ['product_id']
      },
      {
        fields: ['product_id', 'is_main']
      }
    ]
  });

  return ProductImage;
};

// Define associations
const associateProductImage = () => {
  const Product = require('./Product').Product;

  // ProductImage belongs to Product
  ProductImage.belongsTo(Product, { 
    foreignKey: 'product_id', 
    as: 'product' 
  });
};

module.exports = {
  ProductImage,
  initProductImage,
  associateProductImage
}; 