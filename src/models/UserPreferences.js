const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class UserPreferences extends Model {}

// Initialize UserPreferences model
const initUserPreferences = () => {
  const sequelize = getSequelize();
  
  UserPreferences.init({
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
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'tr'
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Europe/Istanbul'
    }
  }, {
    sequelize,
    modelName: 'UserPreferences',
    tableName: 'user_preferences'
  });

  return UserPreferences;
};

// Define associations
const associateUserPreferences = () => {
  const User = require('./User').User;

  // UserPreferences belongs to User
  UserPreferences.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
};

module.exports = {
  UserPreferences,
  initUserPreferences,
  associateUserPreferences
}; 