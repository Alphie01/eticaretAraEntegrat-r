# Veritabanı Modelleri ve İlişkiler

## 📋 İçindekiler

- [Model Genel Bakış](#model-genel-bakış)
- [Kullanıcı Modelleri](#kullanıcı-modelleri)
- [Ürün Modelleri](#ürün-modelleri)
- [Sipariş Modelleri](#sipariş-modelleri)
- [Sistem Modelleri](#sistem-modelleri)
- [Model İlişkileri](#model-i̇lişkileri)
- [Veri Tipleri](#veri-tipleri)
- [Indexler ve Performans](#indexler-ve-performans)

## 🎯 Model Genel Bakış

Sistem, kullanıcı bazlı izolasyon ile çoklu marketplace entegrasyonunu destekleyen bir veritabanı yapısına sahiptir.

### Temel Model Kategorileri

1. **Kullanıcı Yönetimi**: User, UserMarketplaceKeys, UserRole
2. **Ürün Yönetimi**: Product, ProductVariant, ProductImage, ProductMarketplace
3. **Sipariş Yönetimi**: Order, OrderItem, OrderStatusHistory
4. **Sistem Yönetimi**: SyncLog, ProductCategory

### Database Schema Diyagramı

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Users       │────│  UserCompany    │────│   Companies     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              
         ├────┐                                         
         │    │                                         
         ▼    ▼                                         
┌─────────────┐  ┌──────────────────┐                  
│ UserRoles   │  │UserMarketplace   │                  
│             │  │Keys              │                  
└─────────────┘  └──────────────────┘                  
         │                 │                           
         ▼                 ▼                           
┌─────────────┐    ┌─────────────────┐                 
│Permissions  │    │   Products      │◄────────────────┐
└─────────────┘    └─────────────────┘                 │
                            │                          │
                    ┌───────┼──────────┐               │
                    ▼       ▼          ▼               │
            ┌──────────┐ ┌────────┐ ┌─────────────┐    │
            │ProductVar│ │Product │ │ProductMarket│    │
            │iants     │ │Images  │ │places       │    │
            └──────────┘ └────────┘ └─────────────┘    │
                    │                          │       │
                    ▼                          ▼       │
            ┌──────────────┐              ┌─────────────┐
            │ Orders       │◄─────────────│ OrderItems  │
            └──────────────┘              └─────────────┘
                    │                              
                    ▼                              
            ┌──────────────┐                       
            │OrderStatus   │                       
            │History       │                       
            └──────────────┘                       
```

## 👥 Kullanıcı Modelleri

### User Model
Ana kullanıcı modeli. Sistem genelinde user_id ile veri izolasyonu sağlar.

```javascript
// src/models/User.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  email_verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

**İlişkiler:**
- `hasOne` UserCompany
- `hasMany` UserMarketplaceKeys
- `hasMany` Products
- `hasMany` Orders
- `belongsToMany` Roles (through UserRole)

### UserMarketplaceKeys Model
Kullanıcıların marketplace API anahtarlarını AES-256-CBC ile şifreleyerek saklar.

```javascript
// src/models/UserMarketplaceKeys.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  marketplace: {
    type: DataTypes.ENUM,
    values: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'],
    allowNull: false
  },
  encrypted_api_key: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  encrypted_api_secret: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  encrypted_supplier_id: {
    type: DataTypes.TEXT,
    allowNull: true // Only for Trendyol
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

**Metodlar:**
- `setCredentials(credentials)` - API anahtarlarını şifreler ve kaydeder
- `getDecryptedCredentials()` - Şifrelenmiş anahtarları çözer
- `testConnection()` - API bağlantısını test eder

### UserRole Model
Kullanıcı rol yönetimi için basit enum tabanlı sistem.

```javascript
// src/models/UserRole.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: { model: 'Users', key: 'id' }
  },
  role: {
    type: DataTypes.ENUM,
    values: ['admin', 'user', 'manager'],
    defaultValue: 'user'
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}
```

## 📦 Ürün Modelleri

### Product Model
Ana ürün modeli. Marketplace ID bazlı duplicate kontrolü destekler.

```javascript
// src/models/Product.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ProductCategories', key: 'id' }
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  length: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  width: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  height: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM,
    values: ['active', 'inactive', 'draft'],
    defaultValue: 'active'
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

**İlişkiler:**
- `belongsTo` User
- `belongsTo` ProductCategory
- `hasMany` ProductVariants
- `hasMany` ProductImages
- `hasMany` ProductMarketplaces
- `hasMany` OrderItems

### ProductVariant Model
Ürün varyantları. Renk, beden gibi farklı seçenekler için.

```javascript
// src/models/ProductVariant.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Products', key: 'id' }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  length: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  width: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  height: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

### ProductImage Model
Ürün resimleri. Display order ile sıralama destekler.

```javascript
// src/models/ProductImage.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Products', key: 'id' }
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  alt_text: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: { 
    type: DataTypes.DATE,
    allowNull: false
  }
}
```

### ProductMarketplace Model
Marketplace entegrasyonu için. Her ürün-marketplace çifti için tekil kayıt.

```javascript
// src/models/ProductMarketplace.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Products', key: 'id' }
  },
  marketplace: {
    type: DataTypes.ENUM,
    values: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'],
    allowNull: false
  },
  marketplace_product_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  marketplace_sku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM,
    values: ['active', 'inactive', 'pending'],
    defaultValue: 'active'
  },
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sync_errors: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

### ProductCategory Model
```javascript
// src/models/ProductCategory.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ProductCategories', key: 'id' }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  marketplace: {
    type: DataTypes.ENUM,
    values: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'],
    allowNull: true
  },
  marketplace_category_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

## 📋 Sipariş Modelleri

### Order Model
Ana sipariş modeli. 9 farklı durum destekler.

```javascript
// src/models/Order.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  marketplace: {
    type: DataTypes.ENUM,
    values: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'],
    allowNull: false
  },
  marketplace_order_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM,
    values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    defaultValue: 'pending'
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customer_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  billing_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shipping_city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'TRY'
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  order_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  shipped_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shipping_company: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

### OrderItem Model
Sipariş kalemleri. Ürün ve variant referansları ile.

```javascript
// src/models/OrderItem.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Orders', key: 'id' }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Products', key: 'id' }
  },
  product_variant_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ProductVariants', key: 'id' }
  },
  product_name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  product_sku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  variant_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  marketplace_item_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
}
```

### OrderStatusHistory Model
Sipariş durum değişiklik geçmişi.

```javascript
// src/models/OrderStatusHistory.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Orders', key: 'id' }
  },
  old_status: {
    type: DataTypes.ENUM,
    values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    allowNull: true
  },
  new_status: {
    type: DataTypes.ENUM,
    values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    allowNull: false
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}
```

## 🛠️ Sistem Modelleri

### SyncLog Model
Senkronizasyon işlemlerinin logları ve istatistikleri.

```javascript
// src/models/SyncLog.js
{
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  marketplace: {
    type: DataTypes.ENUM,
    values: ['trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'],
    allowNull: false
  },
  sync_type: {
    type: DataTypes.ENUM,
    values: ['products', 'orders', 'stock', 'prices'],
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM,
    values: ['running', 'completed', 'failed', 'cancelled'],
    defaultValue: 'running'
  },
  items_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  items_success: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  items_failed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  execution_time: {
    type: DataTypes.INTEGER, // milliseconds
    allowNull: true
  }
}
```

## 🔗 Model İlişkileri

### Ana İlişkiler

```javascript
// User İlişkileri
User.hasOne(UserCompany, { foreignKey: 'user_id', as: 'company' });
User.hasMany(UserMarketplaceKeys, { foreignKey: 'user_id', as: 'marketplaceKeys' });
User.hasMany(Products, { foreignKey: 'user_id', as: 'products' });
User.hasMany(Orders, { foreignKey: 'user_id', as: 'orders' });
User.belongsToMany(Permission, { 
  through: UserRole, 
  foreignKey: 'user_id',
  as: 'permissions' 
});

// Product İlişkileri
Product.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Product.belongsTo(ProductCategory, { foreignKey: 'category_id', as: 'category' });
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
Product.hasMany(ProductMarketplace, { foreignKey: 'product_id', as: 'marketplaces' });

// ProductVariant İlişkileri
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductVariant.hasMany(ProductVariantAttribute, { foreignKey: 'variant_id', as: 'attributes' });

// Order İlişkileri
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });

// OrderItem İlişkileri
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'product_variant_id', as: 'variant' });

// Category İlişkileri (Self-referencing)
ProductCategory.hasMany(ProductCategory, { 
  foreignKey: 'parent_id', 
  as: 'children' 
});
ProductCategory.belongsTo(ProductCategory, { 
  foreignKey: 'parent_id', 
  as: 'parent' 
});
```

### Composite Keys ve Unique Constraints

```javascript
// UserMarketplaceKeys - Her kullanıcı için marketplace başına 1 kayıt
UserMarketplaceKeys.addIndex(['user_id', 'marketplace'], { 
  unique: true, 
  name: 'unique_user_marketplace' 
});

// ProductMarketplace - Her ürün için marketplace başına 1 kayıt
ProductMarketplace.addIndex(['product_id', 'marketplace'], { 
  unique: true, 
  name: 'unique_product_marketplace' 
});

// ProductImage - Display order per product
ProductImage.addIndex(['product_id', 'display_order'], { 
  name: 'idx_product_image_order' 
});
```

## 📊 Veri Tipleri

### Enum Değerleri

```javascript
// Marketplace Types
const MARKETPLACES = [
  'trendyol',
  'hepsiburada', 
  'amazon',
  'n11',
  'gittigidiyor'
];

// Order Statuses
const ORDER_STATUSES = [
  'pending',     // Beklemede
  'confirmed',   // Onaylandı
  'processing',  // İşleniyor
  'shipped',     // Kargoya verildi
  'delivered',   // Teslim edildi
  'cancelled',   // İptal edildi
  'returned'     // İade edildi
];

// Product Statuses
const PRODUCT_STATUSES = [
  'active',      // Aktif
  'inactive',    // Pasif
  'draft'        // Taslak
];

// User Roles
const USER_ROLES = [
  'admin',       // Yönetici
  'manager',     // Müdür
  'user'         // Kullanıcı
];

// Sync Types
const SYNC_TYPES = [
  'products',    // Ürün senkronizasyonu
  'orders',      // Sipariş senkronizasyonu
  'stock',       // Stok senkronizasyonu
  'prices'       // Fiyat senkronizasyonu
];
```

### Decimal Precision

```javascript
// Fiyat alanları: DECIMAL(10,2)
// - Maksimum: 99,999,999.99
// - Precision: 2 decimal places

// Ağırlık alanları: DECIMAL(8,2)
// - Maksimum: 999,999.99 kg
// - Precision: 2 decimal places

// Boyut alanları: DECIMAL(8,2)
// - Maksimum: 999,999.99 cm
// - Precision: 2 decimal places
```

## 🚀 Indexler ve Performans

### Temel Indexler

```sql
-- User tablosu
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_active ON Users(is_active);

-- Product tablosu
CREATE INDEX idx_products_user_id ON Products(user_id);
CREATE INDEX idx_products_sku ON Products(sku);
CREATE INDEX idx_products_status ON Products(status);
CREATE INDEX idx_products_category ON Products(category_id);

-- Order tablosu
CREATE INDEX idx_orders_user_id ON Orders(user_id);
CREATE INDEX idx_orders_marketplace ON Orders(marketplace);
CREATE INDEX idx_orders_status ON Orders(status);
CREATE INDEX idx_orders_date ON Orders(order_date);
CREATE INDEX idx_orders_marketplace_id ON Orders(marketplace_order_id);

-- ProductMarketplace tablosu
CREATE INDEX idx_product_marketplace_product ON ProductMarketplaces(product_id);
CREATE INDEX idx_product_marketplace_type ON ProductMarketplaces(marketplace);
CREATE INDEX idx_product_marketplace_external_id ON ProductMarketplaces(marketplace_product_id);

-- UserMarketplaceKeys tablosu
CREATE INDEX idx_user_marketplace_keys_user ON UserMarketplaceKeys(user_id);
CREATE INDEX idx_user_marketplace_keys_type ON UserMarketplaceKeys(marketplace);
CREATE INDEX idx_user_marketplace_keys_active ON UserMarketplaceKeys(is_active);
```

### Composite Indexler

```sql
-- Performans için composite indexler
CREATE INDEX idx_products_user_status ON Products(user_id, status);
CREATE INDEX idx_orders_user_marketplace ON Orders(user_id, marketplace);
CREATE INDEX idx_orders_user_status ON Orders(user_id, status);
CREATE INDEX idx_product_images_product_order ON ProductImages(product_id, display_order);
CREATE INDEX idx_order_items_order_product ON OrderItems(order_id, product_id);
```

### Query Optimization Örnekleri

```javascript
// Kullanıcının aktif ürünlerini getir
const products = await Product.findAll({
  where: {
    user_id: userId,
    status: 'active'
  },
  include: [
    {
      model: ProductVariant,
      as: 'variants',
      where: { is_active: true },
      required: false
    },
    {
      model: ProductImage,
      as: 'images',
      order: [['display_order', 'ASC']],
      limit: 5
    }
  ],
  order: [['updated_at', 'DESC']]
});

// Marketplace'e göre siparişleri getir
const orders = await Order.findAll({
  where: {
    user_id: userId,
    marketplace: 'trendyol',
    status: ['confirmed', 'processing', 'shipped']
  },
  include: [
    {
      model: OrderItem,
      as: 'items',
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku']
        }
      ]
    }
  ],
  order: [['order_date', 'DESC']]
});
```

## 🔒 Güvenlik Considerations

### Sensitive Data Handling

```javascript
// UserMarketplaceKeys - API anahtarları şifrelenir
beforeCreate: async (userMarketplaceKey) => {
  if (userMarketplaceKey.api_key) {
    userMarketplaceKey.encrypted_api_key = encrypt(userMarketplaceKey.api_key);
  }
  if (userMarketplaceKey.api_secret) {
    userMarketplaceKey.encrypted_api_secret = encrypt(userMarketplaceKey.api_secret);
  }
};

// User - Şifreler hash'lenir
beforeCreate: async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
};
```

### Data Isolation

```javascript
// Her query user_id ile filtreli olmalı
const getUserProducts = async (userId) => {
  return await Product.findAll({
    where: { user_id: userId }
  });
};

// Middleware ile otomatik user_id kontrolü
const ensureOwnership = (req, res, next) => {
  req.query.user_id = req.user.id;
  next();
};
```

---

Bu dokümantasyon, sistemin veritabanı yapısını ve model ilişkilerini kapsamlı şekilde açıklamaktadır. Her model, gerçek kullanım senaryolarında optimize edilmiş performans ve güvenlik özellikleri içermektedir. 