const { getSequelize } = require('../config/database');

// Import model initializers
const { User, initUser, associateUser } = require('./User');
const { UserRole, initUserRole, associateUserRole } = require('./UserRole');
const { Permission, initPermission, associatePermission } = require('./Permission');
const { RolePermission, initRolePermission, associateRolePermission } = require('./RolePermission');
const { UserCompany, initUserCompany, associateUserCompany } = require('./UserCompany');
const { UserMarketplaceAccount, initUserMarketplaceAccount, associateUserMarketplaceAccount } = require('./UserMarketplaceAccount');
const { UserMarketplaceCredentials, initUserMarketplaceCredentials, associateUserMarketplaceCredentials } = require('./UserMarketplaceCredentials');
const { UserMarketplaceSettings, initUserMarketplaceSettings, associateUserMarketplaceSettings } = require('./UserMarketplaceSettings');
const { UserPreferences, initUserPreferences, associateUserPreferences } = require('./UserPreferences');
const { UserNotificationSettings, initUserNotificationSettings, associateUserNotificationSettings } = require('./UserNotificationSettings');
const { UserMarketplaceKeys, initUserMarketplaceKeys, associateUserMarketplaceKeys } = require('./UserMarketplaceKeys');
const { UserMarketplace, initUserMarketplace, associateUserMarketplace } = require('./UserMarketplace');

// Product related models
const { Product, initProduct, associateProduct } = require('./Product');
const { ProductVariant, initProductVariant, associateProductVariant } = require('./ProductVariant');
const { ProductImage, initProductImage, associateProductImage } = require('./ProductImage');
const { ProductMarketplace, initProductMarketplace, associateProductMarketplace } = require('./ProductMarketplace');
const { ProductCategory, initProductCategory, associateProductCategory } = require('./ProductCategory');
const { ProductVariantAttribute, initProductVariantAttribute, associateProductVariantAttribute } = require('./ProductVariantAttribute');

// Order related models
const { Order, initOrder, associateOrder } = require('./Order');
const { OrderItem, initOrderItem, associateOrderItem } = require('./OrderItem');
const { OrderStatusHistory, initOrderStatusHistory, associateOrderStatusHistory } = require('./OrderStatusHistory');

// Sync related models
const { SyncLog, initSyncLog, associateSyncLog } = require('./SyncLog');

let modelsInitialized = false;

// Initialize all models
const initModels = () => {
  if (modelsInitialized) {
    return;
  }

  try {
    // Initialize user system models
    initUserRole();
    initPermission();
    initRolePermission();
    initUser();
    initUserCompany();
    initUserMarketplaceAccount();
    initUserMarketplaceCredentials();
    initUserMarketplaceSettings();
    initUserPreferences();
    initUserNotificationSettings();
    initUserMarketplaceKeys();
    initUserMarketplace();

    // Initialize product models
    initProductCategory();
    initProduct();
    initProductVariant();
    initProductImage();
    initProductMarketplace();
    initProductVariantAttribute();

    // Initialize order models
    initOrder();
    initOrderItem();
    initOrderStatusHistory();

    // Initialize sync models
    initSyncLog();
    
    modelsInitialized = true;
    console.log('All models initialized successfully');
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
};

// Associate all models
const associateModels = () => {
  try {
    // Associate user system models
    associateUserRole();
    associatePermission();
    associateRolePermission();
    associateUser();
    associateUserCompany();
    associateUserMarketplaceAccount();
    associateUserMarketplaceCredentials();
    associateUserMarketplaceSettings();
    associateUserPreferences();
    associateUserNotificationSettings();
    associateUserMarketplaceKeys();
    associateUserMarketplace();

    // Associate product models
    associateProductCategory();
    associateProduct();
    associateProductVariant();
    associateProductImage();
    associateProductMarketplace();
    associateProductVariantAttribute();

    // Associate order models
    associateOrder();
    associateOrderItem();
    associateOrderStatusHistory();

    // Associate sync models
    associateSyncLog();
    
    console.log('All model associations created successfully');
  } catch (error) {
    console.error('Error creating model associations:', error);
    throw error;
  }
};

// Initialize and associate all models
const setupModels = () => {
  try {
    // Check if database connection exists
    const sequelize = getSequelize();
    if (!sequelize) {
      throw new Error('Database connection not available');
    }
    
    initModels();
    associateModels();
  } catch (error) {
    console.error('Cannot setup models without database connection:', error.message);
    throw error;
  }
};

// Export models
module.exports = {
  // Database
  sequelize: getSequelize,
  
  // Setup function
  setupModels,
  
  // User related models
  User,
  UserRole,
  Permission,
  RolePermission,
  UserCompany,
  UserMarketplaceAccount,
  UserMarketplaceCredentials,
  UserMarketplaceSettings,
  UserPreferences,
  UserNotificationSettings,
  UserMarketplaceKeys,
  UserMarketplace,
  
  // Product related models
  Product,
  ProductVariant,
  ProductImage,
  ProductMarketplace,
  ProductCategory,
  ProductVariantAttribute,
  
  // Order related models
  Order,
  OrderItem,
  OrderStatusHistory,
  
  // Sync related models
  SyncLog
}; 