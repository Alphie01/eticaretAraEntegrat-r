const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class Payment extends Model {
  // Get payment status in Turkish
  get statusText() {
    const statusTexts = {
      'pending': 'Bekliyor',
      'processing': 'İşleniyor',
      'completed': 'Tamamlandı',
      'failed': 'Başarısız',
      'cancelled': 'İptal Edildi',
      'refunded': 'İade Edildi',
      'partial_refund': 'Kısmi İade'
    };
    return statusTexts[this.status] || this.status;
  }

  // Get payment method in Turkish
  get methodText() {
    const methodTexts = {
      'credit_card': 'Kredi Kartı',
      'debit_card': 'Banka Kartı',
      'bank_transfer': 'Havale/EFT',
      'mobile_payment': 'Mobil Ödeme',
      'installment': 'Taksitli Ödeme'
    };
    return methodTexts[this.payment_method] || this.payment_method;
  }

  // Check if payment can be refunded
  get canRefund() {
    return this.status === 'completed' && !this.refunded_at;
  }

  // Check if payment is successful
  get isSuccessful() {
    return this.status === 'completed';
  }

  // Format amount for display
  getFormattedAmount() {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: this.currency || 'TRY'
    }).format(this.amount);
  }
}

// Initialize Payment model
const initPayment = () => {
  const sequelize = getSequelize();
  
  Payment.init({
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
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    payment_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Internal payment ID'
    },
    gateway: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'paytr',
      validate: {
        isIn: [['paytr', 'iyzico', 'stripe', 'bank_transfer']]
      }
    },
    gateway_payment_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Payment ID from gateway (PayTR)'
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Transaction ID from gateway'
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TRY'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partial_refund']]
      }
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['credit_card', 'debit_card', 'bank_transfer', 'mobile_payment', 'installment']]
      }
    },
    installment_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 12
      }
    },
    card_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'visa, mastercard, amex, etc.'
    },
    card_last_four: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    gateway_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raw response from payment gateway'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    error_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refunded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refund_amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['gateway']
      },
      {
        fields: ['gateway_payment_id']
      },
      {
        fields: ['transaction_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Payment;
};

// Associate Payment model
const associatePayment = () => {
  const { Order } = require('./Order');
  const { User } = require('./User');
  const { PayTRTransaction } = require('./PayTRTransaction');

  // Payment belongs to Order
  Payment.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order'
  });

  // Payment belongs to User
  Payment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Payment has one PayTR transaction
  Payment.hasOne(PayTRTransaction, {
    foreignKey: 'payment_id',
    as: 'paytr_transaction'
  });
};

module.exports = {
  Payment,
  initPayment,
  associatePayment
}; 