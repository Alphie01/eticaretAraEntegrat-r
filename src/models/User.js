const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSequelize } = require('../config/database');

class User extends Model {
  // Password verification method
  async matchPassword(enteredPassword) {
    // Skip password check only for explicitly OAuth users or users without password
    if ((this.oauth_provider && this.oauth_provider !== 'local') || !this.password_hash) {
      return false;
    }
    return await bcrypt.compare(enteredPassword, this.password_hash);
  }

  // Generate JWT token
  getSignedJwtToken() {
    return jwt.sign(
      { id: this.id, role_id: this.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  // Generate password reset token
  getResetPasswordToken() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    this.reset_password_token = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    this.reset_password_expire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    return resetToken;
  }
  
  // Check if account is locked
  get isLocked() {
    return !!(this.lock_until && this.lock_until > new Date());
  }

  // Increment login attempts
  async incLoginAttempts() {
    const updates = {};
    
    if (this.lock_until && this.lock_until < new Date()) {
      updates.login_attempts = 0;
      updates.lock_until = null;
    } else {
      updates.login_attempts = (this.login_attempts || 0) + 1;
      
      if (updates.login_attempts >= 5 && !this.isLocked) {
        updates.lock_until = new Date(Date.now() + 2 * 60 * 60 * 1000); // Lock for 2 hours
      }
    }
    
    await this.update(updates);
    return this;
  }

  // Get marketplace account by name
  async getMarketplaceAccount(marketplace) {
    const UserMarketplaceAccount = require('./UserMarketplaceAccount');
    return await UserMarketplaceAccount.findOne({
      where: {
        user_id: this.id,
        marketplace: marketplace,
        is_active: true
      },
      include: ['credentials', 'settings']
    });
  }

  // Get user permissions
  async getPermissions() {
    const sequelize = getSequelize();
    const permissions = await sequelize.query(`
      SELECT DISTINCT p.permission_key, p.permission_name, p.category
      FROM users u
      INNER JOIN user_roles ur ON u.role_id = ur.id
      INNER JOIN role_permissions rp ON ur.id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = :userId AND u.is_active = 1 AND ur.is_active = 1 
        AND p.is_active = 1 AND rp.granted = 1
    `, {
      replacements: { userId: this.id },
      type: sequelize.QueryTypes.SELECT
    });
    
    return permissions;
  }

  // Check if user has permission
  async hasPermission(permissionKey) {
    const sequelize = getSequelize();
    const result = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM users u
      INNER JOIN user_roles ur ON u.role_id = ur.id
      INNER JOIN role_permissions rp ON ur.id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = :userId AND p.permission_key = :permissionKey
        AND u.is_active = 1 AND ur.is_active = 1 AND p.is_active = 1 AND rp.granted = 1
    `, {
      replacements: { userId: this.id, permissionKey },
      type: sequelize.QueryTypes.SELECT
    });
    
    return result[0].count > 0;
  }

  // Check if user is OAuth user
  isOAuthUser() {
    return this.oauth_provider && this.oauth_provider !== 'local';
  }

  // Get OAuth profile data
  getOAuthProfile() {
    return {
      provider: this.oauth_provider,
      google_id: this.google_id,
      facebook_id: this.facebook_id,
      apple_id: this.apple_id,
      avatar_url: this.avatar_url,
      email_verified: this.email_verified
    };
  }

  // Update OAuth tokens
  async updateOAuthTokens(accessToken, refreshToken = null) {
    await this.update({
      oauth_access_token: accessToken,
      oauth_refresh_token: refreshToken
    });
  }
}

// Initialize User model
const initUser = () => {
  const sequelize = getSequelize();
  
  User.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' },
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Please add a valid email' },
        notEmpty: { msg: 'Email is required' }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true, // Allow null for OAuth users
      field: 'password_hash'
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'user_roles',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_password_expire: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lock_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // OAuth fields
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    facebook_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    apple_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    oauth_provider: {
      type: DataTypes.ENUM('local', 'google', 'facebook', 'apple'),
      defaultValue: 'local'
    },
    oauth_access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    oauth_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          const salt = await bcrypt.genSalt(12);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      }
    }
  });

  return User;
};

// Define associations
const associateUser = () => {
  const { UserRole } = require('./UserRole');
  const { UserCompany } = require('./UserCompany');
  const { UserMarketplaceAccount } = require('./UserMarketplaceAccount');
  const { UserPreferences } = require('./UserPreferences');
  const { UserNotificationSettings } = require('./UserNotificationSettings');
  const { UserMarketplaceKeys } = require('./UserMarketplaceKeys');
  const { Product } = require('./Product');
  const { Order } = require('./Order');
  const { SyncLog } = require('./SyncLog');

  // User belongs to a role
  User.belongsTo(UserRole, { 
    foreignKey: 'role_id', 
    as: 'role' 
  });

  // User has one company
  User.hasOne(UserCompany, { 
    foreignKey: 'user_id', 
    as: 'company' 
  });

  // User has many marketplace accounts
  User.hasMany(UserMarketplaceAccount, { 
    foreignKey: 'user_id', 
    as: 'marketplaceAccounts' 
  });

  // User has one preferences
  User.hasOne(UserPreferences, { 
    foreignKey: 'user_id', 
    as: 'preferences' 
  });

  // User has one notification settings
  User.hasOne(UserNotificationSettings, { 
    foreignKey: 'user_id', 
    as: 'notificationSettings' 
  });

  // User has many marketplace keys
  User.hasMany(UserMarketplaceKeys, { 
    foreignKey: 'user_id', 
    as: 'marketplaceKeys' 
  });

  // User has many products
  User.hasMany(Product, { 
    foreignKey: 'user_id', 
    as: 'products' 
  });

  // User has many orders
  User.hasMany(Order, { 
    foreignKey: 'user_id', 
    as: 'orders' 
  });

  // User has many sync logs
  User.hasMany(SyncLog, { 
    foreignKey: 'user_id', 
    as: 'syncLogs' 
  });
};

module.exports = {
  User,
  initUser,
  associateUser
}; 