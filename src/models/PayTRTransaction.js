const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class PayTRTransaction extends Model {
  // Get transaction status in Turkish
  get statusText() {
    const statusTexts = {
      'success': 'Başarılı',
      'failed': 'Başarısız',
      'pending': 'Bekliyor',
      'cancelled': 'İptal Edildi',
      'refunded': 'İade Edildi'
    };
    return statusTexts[this.status] || this.status;
  }

  // Check if transaction is successful
  get isSuccessful() {
    return this.status === 'success';
  }

  // Get formatted amount
  getFormattedAmount() {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(this.amount / 100); // PayTR amounts are in kuruş
  }
}

// Initialize PayTRTransaction model
const initPayTRTransaction = () => {
  const sequelize = getSequelize();
  
  PayTRTransaction.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    payment_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    merchant_oid: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'PayTR merchant order ID'
    },
    paytr_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'PayTR token for the transaction'
    },
    merchant_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'PayTR merchant ID'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in kuruş (Turkish cents)',
      validate: {
        min: 100 // Minimum 1 TL
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TRY'
    },
    test_mode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['success', 'failed', 'pending', 'cancelled', 'refunded']]
      }
    },
    hash: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'PayTR hash for verification'
    },
    failed_reason_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    failed_reason_msg: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'card, bank, mobile, etc.'
    },
    installment_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    card_pan: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Masked card number'
    },
    card_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'visa, mastercard, etc.'
    },
    issuer_bank: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    debug_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Debug information from PayTR'
    },
    success_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fail_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    timeout_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: 'Timeout in minutes'
    },
    user_basket: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON encoded basket data'
    },
    user_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    user_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    user_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    no_installment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    max_installment: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    non_3d: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    non_3d_test_failed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    iframe_request: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sync_mode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    lang: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'tr'
    },
    raw_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raw response from PayTR'
    },
    webhook_received_at: {
      type: DataTypes.DATE,
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
    modelName: 'PayTRTransaction',
    tableName: 'paytr_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['payment_id']
      },
      {
        fields: ['merchant_oid']
      },
      {
        fields: ['status']
      },
      {
        fields: ['merchant_id']
      },
      {
        fields: ['test_mode']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return PayTRTransaction;
};

// Associate PayTRTransaction model
const associatePayTRTransaction = () => {
  const { Payment } = require('./Payment');

  // PayTRTransaction belongs to Payment
  PayTRTransaction.belongsTo(Payment, {
    foreignKey: 'payment_id',
    as: 'payment'
  });
};

module.exports = {
  PayTRTransaction,
  initPayTRTransaction,
  associatePayTRTransaction
}; 