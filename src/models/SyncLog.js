const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');
const { SUPPORTED_MARKETPLACES } = require('../constants/marketplaces');

class SyncLog extends Model {
  // Check if sync was successful
  get isSuccessful() {
    return this.status === 'success';
  }

  // Check if sync failed
  get isFailed() {
    return this.status === 'failed';
  }

  // Get duration in seconds
  get durationInSeconds() {
    if (this.started_at && this.completed_at) {
      return Math.round((new Date(this.completed_at) - new Date(this.started_at)) / 1000);
    }
    return 0;
  }

  // Mark sync as completed with status
  async markCompleted(status, errorMessage = null, results = null) {
    await this.update({
      status: status,
      completed_at: new Date(),
      error_message: errorMessage,
      result_data: results ? JSON.stringify(results) : null
    });
    return this;
  }
}

// Initialize SyncLog model
const initSyncLog = () => {
  const sequelize = getSequelize();
  
  SyncLog.init({
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
    operation: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['product_sync', 'product_create', 'product_update', 'product_delete', 'stock_sync', 'price_sync', 'order_sync', 'order_import', 'order_status_update', 'bulk_sync', 'category_sync']]
      }
    },
    marketplace: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [SUPPORTED_MARKETPLACES]
      }
    },
    entity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['product', 'order', 'stock', 'price', 'category']]
      }
    },
    entity_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    entity_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'in_progress', 'success', 'warning', 'error']]
      }
    },
    direction: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['import', 'export', 'bidirectional']]
      }
    },
    is_bulk_operation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    execution_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    next_retry_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    processed_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    successful_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    failed_items: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    response_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    result_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    job_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    triggered_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'manual',
      validate: {
        isIn: [['manual', 'scheduled', 'webhook', 'api', 'system']]
      }
    },
    sync_mode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['full', 'incremental', 'selective']]
      }
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SyncLog',
    tableName: 'sync_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['operation']
      },
      {
        fields: ['marketplace']
      },
      {
        fields: ['status']
      },
      {
        fields: ['started_at']
      },
      {
        fields: ['entity', 'entity_id']
      },
      {
        fields: ['job_id']
      }
    ]
  });

  return SyncLog;
};

// Define associations
const associateSyncLog = () => {
  const User = require('./User').User;

  // SyncLog belongs to user
  SyncLog.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
};

module.exports = {
  SyncLog,
  initSyncLog,
  associateSyncLog
}; 