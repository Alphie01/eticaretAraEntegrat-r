const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class ProductCategory extends Model {}

// Initialize ProductCategory model
const initProductCategory = () => {
  const sequelize = getSequelize();
  
  ProductCategory.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parent_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'product_categories',
        key: 'id'
      }
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ProductCategory',
    tableName: 'product_categories',
    indexes: [
      {
        fields: ['parent_id']
      },
      {
        fields: ['slug']
      },
      {
        fields: ['level']
      }
    ]
  });

  return ProductCategory;
};

// Define associations
const associateProductCategory = () => {
  const Product = require('./Product').Product;

  // Self-referential association for parent-child categories
  ProductCategory.belongsTo(ProductCategory, { 
    foreignKey: 'parent_id', 
    as: 'parent' 
  });

  ProductCategory.hasMany(ProductCategory, { 
    foreignKey: 'parent_id', 
    as: 'children' 
  });

  // ProductCategory has many products (disabled until category_id column is added to products table)
  // ProductCategory.hasMany(Product, { 
  //   foreignKey: 'category_id', 
  //   as: 'products' 
  // });
};

module.exports = {
  ProductCategory,
  initProductCategory,
  associateProductCategory
}; 