const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');
const { ORDER_MARKETPLACES } = require('../constants/marketplaces');

class Order extends Model {
  // Calculate total amount from items
  async calculateTotalAmount() {
    const OrderItem = require('./OrderItem').OrderItem;
    const items = await OrderItem.findAll({
      where: { order_id: this.id }
    });
    
    const subtotal = items.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0);
    
    const taxAmount = subtotal * (this.tax_rate / 100);
    const total = subtotal + taxAmount + (this.shipping_cost || 0) - (this.discount_amount || 0);
    
    return {
      subtotal,
      taxAmount,
      total
    };
  }

  // Update order status with tracking
  async updateStatus(newStatus, updatedBy = null) {
    const oldStatus = this.status;
    
    await this.update({
      status: newStatus,
      last_updated_by: updatedBy,
      status_updated_at: new Date()
    });

    // Create status history record
    const OrderStatusHistory = require('./OrderStatusHistory').OrderStatusHistory;
    await OrderStatusHistory.create({
      order_id: this.id,
      old_status: oldStatus,
      new_status: newStatus,
      updated_by: updatedBy,
      notes: `Status changed from ${oldStatus} to ${newStatus}`
    });

    return this;
  }

  // Get order items
  async getItems() {
    const OrderItem = require('./OrderItem').OrderItem;
    return await OrderItem.findAll({
      where: { order_id: this.id },
      include: ['product', 'variant']
    });
  }

  // Check if order can be cancelled
  get canBeCancelled() {
    const cancellableStatuses = ['pending', 'confirmed', 'processing'];
    return cancellableStatuses.includes(this.status);
  }

  // Check if order is completed
  get isCompleted() {
    return this.status === 'delivered';
  }
}

// Initialize Order model
const initOrder = () => {
  const sequelize = getSequelize();
  
  Order.init({
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
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    marketplace_name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [ORDER_MARKETPLACES]
      }
    },
    marketplace_order_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    marketplace_order_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    marketplace_order_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned']]
      }
    },
    payment_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'paid', 'failed', 'refunded', 'partial_refund']]
      }
    },
    fulfillment_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'shipped', 'delivered', 'returned']]
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TRY'
    },
    subtotal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    shipping_cost: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    discount_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    // last_updated_by: {
    //   type: DataTypes.BIGINT,
    //   allowNull: true,
    //   references: {
    //     model: 'users',
    //     key: 'id'
    //   }
    // },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['order_number']
      },
      {
        fields: ['marketplace_name']
      },
      {
        fields: ['marketplace_order_id']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['marketplace_name', 'marketplace_order_id']
      }
    ]
  });

  return Order;
};

// Define associations
const associateOrder = () => {
  const User = require('./User').User;
  const OrderItem = require('./OrderItem').OrderItem;
  const OrderStatusHistory = require('./OrderStatusHistory').OrderStatusHistory;

  // Order belongs to user
  Order.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // Order has many items
  Order.hasMany(OrderItem, { 
    foreignKey: 'order_id', 
    as: 'items' 
  });

  // Order has many status history records
  Order.hasMany(OrderStatusHistory, { 
    foreignKey: 'order_id', 
    as: 'statusHistory' 
  });

  // Order updated by user (disabled until column is added)
  // Order.belongsTo(User, { 
  //   foreignKey: 'last_updated_by', 
  //   as: 'updatedBy' 
  // });
};

module.exports = {
  Order,
  initOrder,
  associateOrder
}; 