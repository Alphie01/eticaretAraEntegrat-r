const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class OrderStatusHistory extends Model {}

// Initialize OrderStatusHistory model
const initOrderStatusHistory = () => {
  const sequelize = getSequelize();
  
  OrderStatusHistory.init({
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
    old_status: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    change_source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'manual'
    }
  }, {
    sequelize,
    modelName: 'OrderStatusHistory',
    tableName: 'order_status_history',
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['new_status']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return OrderStatusHistory;
};

// Define associations
const associateOrderStatusHistory = () => {
  const Order = require('./Order').Order;
  const User = require('./User').User;

  // OrderStatusHistory belongs to Order
  OrderStatusHistory.belongsTo(Order, { 
    foreignKey: 'order_id', 
    as: 'order' 
  });

  // OrderStatusHistory belongs to User (who made the change)
  OrderStatusHistory.belongsTo(User, { 
    foreignKey: 'updated_by', 
    as: 'updatedBy' 
  });
};

module.exports = {
  OrderStatusHistory,
  initOrderStatusHistory,
  associateOrderStatusHistory
}; 