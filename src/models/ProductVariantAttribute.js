const { DataTypes, Model } = require("sequelize");
const { getSequelize } = require("../config/database");

class ProductVariantAttribute extends Model {}

// Initialize ProductVariantAttribute model
const initProductVariantAttribute = () => {
  const sequelize = getSequelize();

  ProductVariantAttribute.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      variant_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "product_variants",
          key: "id",
        },
      },
      attribute_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      attribute_value: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      attribute_group: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ProductVariantAttribute",
      tableName: "variant_attributes",
      indexes: [
        {
          fields: ["variant_id"],
        },

        {
          fields: ["attribute_name"],
        },
        {
          unique: true,
          fields: ["variant_id", "attribute_name"],
        },
      ],
    }
  );

  return ProductVariantAttribute;
};

// Define associations
const associateProductVariantAttribute = () => {
  const ProductVariant = require("./ProductVariant").ProductVariant;

  // ProductVariantAttribute belongs to ProductVariant
  ProductVariantAttribute.belongsTo(ProductVariant, {
    foreignKey: "variant_id",
    as: "variant",
  });
};

module.exports = {
  ProductVariantAttribute,
  initProductVariantAttribute,
  associateProductVariantAttribute,
};
