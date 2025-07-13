const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class UserNotificationSettings extends Model {}

// Initialize UserNotificationSettings model
const initUserNotificationSettings = () => {
  const sequelize = getSequelize();
  
  UserNotificationSettings.init({
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
    email_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    order_updates: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    stock_alerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sync_errors: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'UserNotificationSettings',
    tableName: 'user_notification_settings'
  });

  return UserNotificationSettings;
};

// Define associations
const associateUserNotificationSettings = () => {
  const User = require('./User').User;

  // UserNotificationSettings belongs to User
  UserNotificationSettings.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
};

module.exports = {
  UserNotificationSettings,
  initUserNotificationSettings,
  associateUserNotificationSettings
}; 