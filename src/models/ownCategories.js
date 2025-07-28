const { DataTypes, Model } = require("sequelize");
const { getSequelize } = require("../config/database");

class OwnCategories extends Model {}

// Initialize OwnCategories model
const initOwnCategories = () => {
  const sequelize = getSequelize();

  OwnCategories.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      displayName: {
        type: DataTypes.STRING(100),
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      marketplace: {
        type: DataTypes.STRING(100),
      },
      categoryId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      parentId: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "OwnCategories",
      tableName: "ownCategories",
      indexes: [
        {
          fields: ["name"],
        },
        {
          fields: ["slug"],
        },
        {
          fields: ["isActive"],
        },
      ],
    }
  );
  return OwnCategories;
};

// Define associations
const associateOwnCategories = () => {
  // Self-referential association for parent-child categories
  /*   OwnCategories.belongsTo(OwnCategories, {
    foreignKey: "parent_id",
    as: "parent",
  });

  OwnCategories.hasMany(OwnCategories, {
    foreignKey: "parent_id",
    as: "children",
  });
 */
  // OwnCategories has many products (disabled until category_id column is added to products table)
  // OwnCategories.hasMany(Product, {
  //   foreignKey: 'category_id',
  //   as: 'products'
  // });
};

module.exports = {
  OwnCategories,
  initOwnCategories,
  associateOwnCategories,
};
