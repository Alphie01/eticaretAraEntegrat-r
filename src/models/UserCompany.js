const { DataTypes, Model } = require("sequelize");
const { getSequelize } = require("../config/database");

class UserCompany extends Model {}

// Initialize UserCompany model
const initUserCompany = () => {
  const sequelize = getSequelize();

  UserCompany.init(
    {
      company_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      tax_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "UserCompany",
      tableName: "user_companies",
    }
  );

  return UserCompany;
};

// Define associations
const associateUserCompany = () => {
  const User = require("./User").User;

  // UserCompany belongs to User
  UserCompany.hasMany(User, {
    foreignKey: "company_id",  // users tablosundaki companyID alanı
    as: "users",              // istediğin alias (şirketin kullanıcıları)
  });
};

module.exports = {
  UserCompany,
  initUserCompany,
  associateUserCompany,
};
