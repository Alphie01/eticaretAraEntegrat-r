const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class Product extends Model {
  // Get variants for this product
  async getVariants() {
    const ProductVariant = require('./ProductVariant').ProductVariant;
    return await ProductVariant.findAll({
      where: { product_id: this.id, is_active: true },
      order: [['created_at', 'DESC']]
    });
  }

  // Get marketplace listings
  async getMarketplaceListings() {
    const ProductMarketplace = require('./ProductMarketplace').ProductMarketplace;
    return await ProductMarketplace.findAll({
      where: { product_id: this.id, is_active: true }
    });
  }

  // Get active marketplace listing for specific marketplace
  async getMarketplaceListing(marketplace) {
    const ProductMarketplace = require('./ProductMarketplace').ProductMarketplace;
    return await ProductMarketplace.findOne({
      where: { 
        product_id: this.id, 
        marketplace: marketplace,
        is_active: true 
      }
    });
  }

  // Calculate total stock from variants
  async getTotalStock() {
    const variants = await this.getVariants();
    return variants.reduce((total, variant) => total + (variant.stock_quantity || 0), 0);
  }

  // Get minimum price from variants
  async getMinPrice() {
    const variants = await this.getVariants();
    if (variants.length === 0) return 0;
    return Math.min(...variants.map(v => v.price || 0));
  }

  // Get maximum price from variants
  async getMaxPrice() {
    const variants = await this.getVariants();
    if (variants.length === 0) return 0;
    return Math.max(...variants.map(v => v.price || 0));
  }

  // Update marketplace sync status
  async updateSyncStatus(marketplace, status, lastSyncDate = new Date()) {
    const ProductMarketplace = require('./ProductMarketplace').ProductMarketplace;
    const listing = await this.getMarketplaceListing(marketplace);
    
    if (listing) {
      await listing.update({
        sync_status: status,
        last_sync_date: lastSyncDate
      });
    }
  }
}

// Initialize Product model
const initProduct = () => {
  const sequelize = getSequelize();
  
  Product.init({
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
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Product name is required' },
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.STRING(2000),
      allowNull: false
    },
    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    base_price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'TRY'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'active', 'inactive', 'archived']]
      }
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_sales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },
    review_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['brand']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Product;
};

// Define associations
const associateProduct = () => {
  const User = require('./User').User;
  const ProductVariant = require('./ProductVariant').ProductVariant;
  const ProductImage = require('./ProductImage').ProductImage;
  const ProductMarketplace = require('./ProductMarketplace').ProductMarketplace;
  const ProductCategory = require('./ProductCategory').ProductCategory;

  // Product belongs to user
  Product.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // Product belongs to category (disabled until column is added)
  // Product.belongsTo(ProductCategory, { 
  //   foreignKey: 'category_id', 
  //   as: 'category' 
  // });

  // Product has many variants
  Product.hasMany(ProductVariant, { 
    foreignKey: 'product_id', 
    as: 'variants' 
  });

  // Product has many images
  Product.hasMany(ProductImage, { 
    foreignKey: 'product_id', 
    as: 'images' 
  });

  // Product has many marketplace listings
  Product.hasMany(ProductMarketplace, { 
    foreignKey: 'product_id', 
    as: 'marketplaceListings' 
  });

  // Product updated by user (disabled until column is properly configured)
  // Product.belongsTo(User, { 
  //   foreignKey: 'last_updated_by', 
  //   as: 'updatedBy' 
  // });
};

module.exports = {
  Product,
  initProduct,
  associateProduct
}; 