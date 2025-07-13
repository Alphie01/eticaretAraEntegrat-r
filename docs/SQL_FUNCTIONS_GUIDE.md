# Backend SQL Sorguları ve Fonksiyon Ekleme Rehberi

## 📋 İçindekiler
1. [SQL Kullanım Alanları](#sql-kullanım-alanları)
2. [Sequelize Model Sorguları](#sequelize-model-sorguları)
3. [Raw SQL Sorguları](#raw-sql-sorguları)
4. [SQL Temel İşlemler (CRUD)](#sql-temel-işlemler-crud)
5. [Yeni Fonksiyon Ekleme](#yeni-fonksiyon-ekleme)
6. [Database Migration](#database-migration)
7. [En İyi Uygulamalar](#en-iyi-uygulamalar)
8. [Örnekler](#örnekler)

---

## 🗂️ SQL Kullanım Alanları

### 1. **Sequelize Modelleri** (`src/models/`)
- ORM tabanlı database işlemleri
- Model tanımları ve associations
- Hooks ve validations

### 2. **Raw SQL Sorguları** (`src/api/routes/`)
- Karmaşık raporlama sorguları
- Performans odaklı sorgular
- Özel business logic

### 3. **Migration Scriptleri** (`sql/` ve `scripts/`)
- Database schema değişiklikleri
- Veri migrasyonları
- Yeni tablo/alan ekleme

### 4. **Database Configuration** (`src/config/database.js`)
- Bağlantı ayarları
- Connection pooling
- Sequelize setup

---

## 📊 SQL Temel İşlemler (CRUD)

### 1. **SELECT İşlemleri**

#### Sequelize Model ile SELECT
```javascript
// Tekil kayıt getirme
const user = await User.findByPk(userId);
const user = await User.findOne({ where: { email: 'demo@eticaret.com' } });

// Çoklu kayıt getirme
const users = await User.findAll({
  where: { is_active: true },
  include: ['role', 'company'],
  limit: 10,
  offset: 0,
  order: [['created_at', 'DESC']]
});

// Sayma işlemi
const userCount = await User.count({
  where: { is_active: true }
});

// Agregasyon
const orderStats = await Order.findAll({
  attributes: [
    'marketplace',
    [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
    [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue'],
    [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_order_value']
  ],
  where: { user_id: userId },
  group: ['marketplace']
});
```

#### Raw SQL ile SELECT
```javascript
// Basit SELECT
const getUserById = async (userId) => {
  const sequelize = getSequelize();
  
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.oauth_provider,
      ur.role_name,
      uc.company_name
    FROM users u
    LEFT JOIN user_roles ur ON u.role_id = ur.id
    LEFT JOIN user_companies uc ON u.id = uc.user_id
    WHERE u.id = :userId AND u.is_active = 1
  `;
  
  const result = await sequelize.query(query, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
};

// Karmaşık SELECT (JOIN ve agregasyon)
const getOrderSummary = async (userId, startDate, endDate) => {
  const sequelize = getSequelize();
  
  const query = `
    SELECT 
      o.marketplace,
      COUNT(o.id) as order_count,
      SUM(o.total_amount) as total_revenue,
      AVG(o.total_amount) as avg_order_value,
      COUNT(DISTINCT o.customer_email) as unique_customers,
      MIN(o.created_at) as first_order,
      MAX(o.created_at) as last_order,
      
      -- Status breakdown
      SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
      
      -- Revenue breakdown
      SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as completed_revenue,
      
      -- Percentage calculations
      CAST(
        SUM(CASE WHEN o.status = 'completed' THEN 1.0 ELSE 0 END) / COUNT(o.id) * 100 
        AS DECIMAL(5,2)
      ) as completion_rate
      
    FROM orders o
    WHERE o.user_id = :userId
      AND o.created_at >= :startDate
      AND o.created_at <= :endDate
    GROUP BY o.marketplace
    ORDER BY total_revenue DESC
  `;
  
  const results = await sequelize.query(query, {
    replacements: { userId, startDate, endDate },
    type: sequelize.QueryTypes.SELECT
  });
  
  return results;
};

// Pagination ile SELECT
const getPaginatedOrders = async (userId, page = 1, limit = 20) => {
  const sequelize = getSequelize();
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT 
      o.id,
      o.order_number,
      o.marketplace,
      o.customer_name,
      o.customer_email,
      o.total_amount,
      o.status,
      o.created_at,
      COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = :userId
    GROUP BY o.id, o.order_number, o.marketplace, o.customer_name, 
             o.customer_email, o.total_amount, o.status, o.created_at
    ORDER BY o.created_at DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;
  
  // Toplam sayı için ayrı sorgu
  const countQuery = `
    SELECT COUNT(*) as total
    FROM orders o
    WHERE o.user_id = :userId
  `;
  
  const [data, countResult] = await Promise.all([
    sequelize.query(query, {
      replacements: { userId, offset, limit },
      type: sequelize.QueryTypes.SELECT
    }),
    sequelize.query(countQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    })
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: countResult[0].total,
      totalPages: Math.ceil(countResult[0].total / limit)
    }
  };
};
```

### 2. **INSERT İşlemleri**

#### Sequelize Model ile INSERT
```javascript
// Tekil kayıt ekleme
const createUser = async (userData) => {
  const user = await User.create({
    name: userData.name,
    email: userData.email,
    password_hash: userData.password,
    role_id: userData.role_id || 1,
    oauth_provider: 'local'
  });
  
  return user;
};

// Bulk insert (toplu ekleme)
const createMultipleProducts = async (productsData) => {
  const products = await Product.bulkCreate(productsData, {
    validate: true,
    returning: true // MSSQL için gerekli
  });
  
  return products;
};

// Transaction ile güvenli insert
const createOrderWithItems = async (orderData, orderItems) => {
  const sequelize = getSequelize();
  const transaction = await sequelize.transaction();
  
  try {
    // Order oluştur
    const order = await Order.create(orderData, { transaction });
    
    // Order items'a order_id ekle
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));
    
    // Order items oluştur
    const items = await OrderItem.bulkCreate(itemsWithOrderId, { 
      transaction,
      returning: true 
    });
    
    await transaction.commit();
    
    return { order, items };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

#### Raw SQL ile INSERT
```javascript
// Tekil INSERT
const insertProduct = async (productData) => {
  const sequelize = getSequelize();
  
  const query = `
    INSERT INTO products (
      user_id, name, sku, description, price, cost_price, 
      stock_quantity, category_id, is_active, created_at
    )
    OUTPUT INSERTED.id, INSERTED.name, INSERTED.sku
    VALUES (
      :userId, :name, :sku, :description, :price, :costPrice,
      :stockQuantity, :categoryId, 1, GETDATE()
    )
  `;
  
  const result = await sequelize.query(query, {
    replacements: {
      userId: productData.user_id,
      name: productData.name,
      sku: productData.sku,
      description: productData.description,
      price: productData.price,
      costPrice: productData.cost_price,
      stockQuantity: productData.stock_quantity,
      categoryId: productData.category_id
    },
    type: sequelize.QueryTypes.INSERT
  });
  
  return result[0][0]; // İlk kayıt döndürülür
};

// Bulk INSERT
const bulkInsertOrders = async (ordersData) => {
  const sequelize = getSequelize();
  
  // VALUES kısmını dinamik oluştur
  const values = ordersData.map((_, index) => {
    const paramIndex = index * 6; // 6 parametre per order
    return `(
      :userId${index}, :orderNumber${index}, :marketplace${index},
      :totalAmount${index}, :status${index}, GETDATE()
    )`;
  }).join(', ');
  
  // Replacements objesini oluştur
  const replacements = {};
  ordersData.forEach((order, index) => {
    replacements[`userId${index}`] = order.user_id;
    replacements[`orderNumber${index}`] = order.order_number;
    replacements[`marketplace${index}`] = order.marketplace;
    replacements[`totalAmount${index}`] = order.total_amount;
    replacements[`status${index}`] = order.status;
  });
  
  const query = `
    INSERT INTO orders (user_id, order_number, marketplace, total_amount, status, created_at)
    OUTPUT INSERTED.id, INSERTED.order_number
    VALUES ${values}
  `;
  
  const result = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.INSERT
  });
  
  return result[0]; // Inserted records
};

// Conditional INSERT (mevcut değilse ekle)
const insertUserIfNotExists = async (userData) => {
  const sequelize = getSequelize();
  
  const query = `
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = :email)
    BEGIN
      INSERT INTO users (name, email, password_hash, role_id, oauth_provider, created_at)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email
      VALUES (:name, :email, :passwordHash, :roleId, :oauthProvider, GETDATE())
    END
    ELSE
    BEGIN
      SELECT id, name, email, 'EXISTS' as status
      FROM users 
      WHERE email = :email
    END
  `;
  
  const result = await sequelize.query(query, {
    replacements: {
      name: userData.name,
      email: userData.email,
      passwordHash: userData.password_hash,
      roleId: userData.role_id || 1,
      oauthProvider: userData.oauth_provider || 'local'
    },
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
};
```

### 3. **UPDATE İşlemleri**

#### Sequelize Model ile UPDATE
```javascript
// Tekil kayıt güncelleme
const updateUser = async (userId, updateData) => {
  const [affectedCount, affectedRows] = await User.update(updateData, {
    where: { id: userId },
    returning: true // MSSQL için
  });
  
  return { affectedCount, user: affectedRows[0] };
};

// Şartlı güncelleme
const updateOrderStatus = async (orderId, newStatus) => {
  const [affectedCount] = await Order.update(
    { 
      status: newStatus,
      updated_at: new Date()
    },
    { 
      where: { 
        id: orderId,
        status: { [Op.ne]: 'cancelled' } // İptal edilmiş siparişleri güncelleme
      }
    }
  );
  
  return affectedCount > 0;
};

// Bulk update
const updateProductPrices = async (userId, priceIncrease) => {
  const [affectedCount] = await Product.update(
    {
      price: sequelize.literal(`price * ${1 + (priceIncrease / 100)}`),
      updated_at: new Date()
    },
    {
      where: { 
        user_id: userId,
        is_active: true
      }
    }
  );
  
  return affectedCount;
};
```

#### Raw SQL ile UPDATE
```javascript
// Basit UPDATE
const updateProductStock = async (productId, newStock) => {
  const sequelize = getSequelize();
  
  const query = `
    UPDATE products 
    SET 
      stock_quantity = :newStock,
      updated_at = GETDATE(),
      last_stock_update = GETDATE()
    OUTPUT INSERTED.id, INSERTED.name, INSERTED.stock_quantity
    WHERE id = :productId AND is_active = 1
  `;
  
  const result = await sequelize.query(query, {
    replacements: { productId, newStock },
    type: sequelize.QueryTypes.UPDATE
  });
  
  return result[0][0];
};

// Şartlı UPDATE
const updateOrderStatusWithHistory = async (orderId, newStatus, userId) => {
  const sequelize = getSequelize();
  
  const query = `
    DECLARE @OldStatus NVARCHAR(50);
    
    -- Eski status'u al
    SELECT @OldStatus = status FROM orders WHERE id = :orderId;
    
    -- Order'ı güncelle
    UPDATE orders 
    SET 
      status = :newStatus,
      updated_at = GETDATE()
    WHERE id = :orderId 
      AND status != 'cancelled' -- İptal edilmiş siparişleri güncelleme
      AND status != :newStatus; -- Aynı status'a güncelleme
    
    -- Status history'ye kayıt ekle
    IF @@ROWCOUNT > 0
    BEGIN
      INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, created_at)
      VALUES (:orderId, @OldStatus, :newStatus, :userId, GETDATE());
      
      SELECT 'SUCCESS' as result, @@ROWCOUNT as affected_rows;
    END
    ELSE
    BEGIN
      SELECT 'NO_CHANGE' as result, 0 as affected_rows;
    END
  `;
  
  const result = await sequelize.query(query, {
    replacements: { orderId, newStatus, userId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
};

// Hesaplamalı UPDATE
const updateOrderTotals = async (orderId) => {
  const sequelize = getSequelize();
  
  const query = `
    UPDATE orders 
    SET 
      total_amount = (
        SELECT SUM(oi.price * oi.quantity)
        FROM order_items oi
        WHERE oi.order_id = orders.id
      ),
      item_count = (
        SELECT COUNT(*)
        FROM order_items oi
        WHERE oi.order_id = orders.id
      ),
      updated_at = GETDATE()
    OUTPUT 
      INSERTED.id,
      INSERTED.total_amount,
      INSERTED.item_count
    WHERE id = :orderId
  `;
  
  const result = await sequelize.query(query, {
    replacements: { orderId },
    type: sequelize.QueryTypes.UPDATE
  });
  
  return result[0][0];
};

// Batch UPDATE (toplu güncelleme)
const batchUpdateProductCategories = async (categoryMappings) => {
  const sequelize = getSequelize();
  
  // CASE WHEN yapısı oluştur
  const caseWhen = categoryMappings.map((mapping, index) => 
    `WHEN id = :productId${index} THEN :categoryId${index}`
  ).join(' ');
  
  const replacements = {};
  const productIds = [];
  
  categoryMappings.forEach((mapping, index) => {
    replacements[`productId${index}`] = mapping.productId;
    replacements[`categoryId${index}`] = mapping.categoryId;
    productIds.push(mapping.productId);
  });
  
  const query = `
    UPDATE products 
    SET 
      category_id = CASE ${caseWhen} END,
      updated_at = GETDATE()
    OUTPUT INSERTED.id, INSERTED.name, INSERTED.category_id
    WHERE id IN (${productIds.map((_, i) => `:productId${i}`).join(', ')})
  `;
  
  const result = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.UPDATE
  });
  
  return result[0];
};
```

### 4. **DELETE İşlemleri**

#### Sequelize Model ile DELETE
```javascript
// Tekil kayıt silme
const deleteProduct = async (productId, userId) => {
  const deletedCount = await Product.destroy({
    where: { 
      id: productId,
      user_id: userId 
    }
  });
  
  return deletedCount > 0;
};

// Soft delete (mantıksal silme)
const softDeleteUser = async (userId) => {
  const [affectedCount] = await User.update(
    { 
      is_active: false,
      deleted_at: new Date()
    },
    { 
      where: { id: userId }
    }
  );
  
  return affectedCount > 0;
};

// Şartlı silme
const deleteOldOrders = async (userId, daysOld = 365) => {
  const deletedCount = await Order.destroy({
    where: {
      user_id: userId,
      status: 'cancelled',
      created_at: {
        [Op.lt]: new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000))
      }
    }
  });
  
  return deletedCount;
};
```

#### Raw SQL ile DELETE
```javascript
// Basit DELETE
const deleteProductById = async (productId, userId) => {
  const sequelize = getSequelize();
  
  const query = `
    DELETE FROM products
    OUTPUT DELETED.id, DELETED.name, DELETED.sku
    WHERE id = :productId AND user_id = :userId
  `;
  
  const result = await sequelize.query(query, {
    replacements: { productId, userId },
    type: sequelize.QueryTypes.DELETE
  });
  
  return result[0][0];
};

// Cascade DELETE (ilişkili kayıtlarla birlikte silme)
const deleteOrderWithItems = async (orderId, userId) => {
  const sequelize = getSequelize();
  
  const query = `
    BEGIN TRANSACTION;
    
    DECLARE @DeletedOrderId BIGINT;
    DECLARE @DeletedItemsCount INT;
    
    -- Order items'ı sil
    DELETE FROM order_items 
    WHERE order_id = :orderId;
    
    SET @DeletedItemsCount = @@ROWCOUNT;
    
    -- Order'ı sil
    DELETE FROM orders
    OUTPUT DELETED.id INTO @DeletedOrderId
    WHERE id = :orderId AND user_id = :userId;
    
    IF @DeletedOrderId IS NOT NULL
    BEGIN
      COMMIT TRANSACTION;
      SELECT 
        @DeletedOrderId as order_id,
        @DeletedItemsCount as deleted_items_count,
        'SUCCESS' as result;
    END
    ELSE
    BEGIN
      ROLLBACK TRANSACTION;
      SELECT 
        NULL as order_id,
        0 as deleted_items_count,
        'ORDER_NOT_FOUND' as result;
    END
  `;
  
  const result = await sequelize.query(query, {
    replacements: { orderId, userId },
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
};

// Soft DELETE
const softDeleteProducts = async (productIds, userId) => {
  const sequelize = getSequelize();
  
  const query = `
    UPDATE products 
    SET 
      is_active = 0,
      deleted_at = GETDATE(),
      updated_at = GETDATE()
    OUTPUT 
      INSERTED.id,
      INSERTED.name,
      INSERTED.sku
    WHERE id IN (${productIds.map((_, i) => `:productId${i}`).join(', ')})
      AND user_id = :userId
      AND is_active = 1
  `;
  
  const replacements = { userId };
  productIds.forEach((id, index) => {
    replacements[`productId${index}`] = id;
  });
  
  const result = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.UPDATE
  });
  
  return result[0];
};

// Conditional DELETE (şartlı silme)
const cleanupExpiredSessions = async () => {
  const sequelize = getSequelize();
  
  const query = `
    DELETE FROM user_sessions
    OUTPUT DELETED.id, DELETED.user_id, DELETED.expires_at
    WHERE expires_at < GETDATE()
      OR last_activity < DATEADD(day, -30, GETDATE())
  `;
  
  const result = await sequelize.query(query, {
    type: sequelize.QueryTypes.DELETE
  });
  
  return result[0];
};
```

### 5. **UPSERT İşlemleri (INSERT or UPDATE)**

#### Sequelize ile UPSERT
```javascript
// Model upsert
const upsertProduct = async (productData) => {
  const [product, created] = await Product.upsert(productData, {
    returning: true
  });
  
  return { product, created };
};
```

#### Raw SQL ile UPSERT
```javascript
// MERGE kullanarak UPSERT
const upsertUserSettings = async (userId, settings) => {
  const sequelize = getSequelize();
  
  const query = `
    MERGE user_preferences AS target
    USING (SELECT :userId as user_id, :settings as preferences_json) AS source
    ON target.user_id = source.user_id
    
    WHEN MATCHED THEN
      UPDATE SET 
        preferences_json = source.preferences_json,
        updated_at = GETDATE()
    
    WHEN NOT MATCHED THEN
      INSERT (user_id, preferences_json, created_at, updated_at)
      VALUES (source.user_id, source.preferences_json, GETDATE(), GETDATE())
    
    OUTPUT 
      $action as operation,
      INSERTED.id,
      INSERTED.user_id;
  `;
  
  const result = await sequelize.query(query, {
    replacements: { 
      userId, 
      settings: JSON.stringify(settings) 
    },
    type: sequelize.QueryTypes.SELECT
  });
  
  return result[0];
};
```

---

## 🏗️ Sequelize Model Sorguları

### Model Dosya Yapısı
```javascript
// src/models/ExampleModel.js
const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class ExampleModel extends Model {
  // Custom instance methods
  async customInstanceMethod() {
    // Model-specific business logic
  }
  
  // Static methods
  static async customStaticMethod(params) {
    // Model-specific queries
  }
}

const initExampleModel = () => {
  const sequelize = getSequelize();
  
  ExampleModel.init({
    // Field definitions
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ExampleModel',
    tableName: 'example_table'
  });
  
  return ExampleModel;
};

module.exports = { ExampleModel, initExampleModel };
```

### Mevcut Model Örnekleri
- **User Model** (`src/models/User.js`)
- **Product Model** (`src/models/Product.js`)
- **Order Model** (`src/models/Order.js`)

---

## 🔍 Raw SQL Sorguları

### Kullanım Alanları

#### 1. **Reports Endpoint'leri** (`src/api/routes/reports.js`)
```javascript
// Dashboard istatistikleri
router.get('/dashboard-stats', protect, async (req, res) => {
  try {
    const sequelize = getSequelize();
    
    // Raw SQL sorgusu
    const query = `
      SELECT 
        COUNT(DISTINCT o.id) as totalOrders,
        COUNT(DISTINCT p.id) as totalProducts,
        COALESCE(SUM(o.total_amount), 0) as totalRevenue,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completedOrders
      FROM orders o
      LEFT JOIN products p ON o.user_id = p.user_id
      WHERE o.user_id = :userId
        AND o.created_at >= DATEADD(day, -30, GETDATE())
    `;
    
    const result = await sequelize.query(query, {
      replacements: { userId: req.user.id },
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json({ success: true, data: result[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 2. **User Permissions** (`src/models/User.js`)
```javascript
async getPermissions() {
  const sequelize = getSequelize();
  const permissions = await sequelize.query(`
    SELECT DISTINCT p.permission_key, p.permission_name, p.category
    FROM users u
    INNER JOIN user_roles ur ON u.role_id = ur.id
    INNER JOIN role_permissions rp ON ur.id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = :userId AND u.is_active = 1
  `, {
    replacements: { userId: this.id },
    type: sequelize.QueryTypes.SELECT
  });
  
  return permissions;
}
```

---

## ➕ Yeni Fonksiyon Ekleme

### 1. **Model'e Yeni Method Ekleme**

#### Instance Method Örneği
```javascript
// src/models/User.js içinde
class User extends Model {
  // Yeni instance method
  async getRecentOrders(limit = 10) {
    const sequelize = getSequelize();
    
    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        o.marketplace
      FROM orders o
      WHERE o.user_id = :userId
      ORDER BY o.created_at DESC
      OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const orders = await sequelize.query(query, {
      replacements: { 
        userId: this.id, 
        limit: parseInt(limit) 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    return orders;
  }
}
```

#### Static Method Örneği
```javascript
// src/models/Product.js içinde
class Product extends Model {
  // Yeni static method
  static async getTopSellingProducts(userId, limit = 5) {
    const sequelize = getSequelize();
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as total_sold,
        SUM(oi.price * oi.quantity) as total_revenue
      FROM products p
      INNER JOIN order_items oi ON p.id = oi.product_id
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE p.user_id = :userId
        AND o.status = 'completed'
        AND o.created_at >= DATEADD(day, -30, GETDATE())
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC
      OFFSET 0 ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const products = await sequelize.query(query, {
      replacements: { userId, limit: parseInt(limit) },
      type: sequelize.QueryTypes.SELECT
    });
    
    return products;
  }
}
```

### 2. **Yeni Route Endpoint'i Ekleme**

#### Yeni Report Endpoint'i
```javascript
// src/api/routes/reports.js içinde

// @desc    Get inventory analysis
// @route   GET /api/v1/reports/inventory-analysis
// @access  Private
router.get('/inventory-analysis', protect, async (req, res) => {
  try {
    const sequelize = getSequelize();
    const { category, low_stock_threshold = 10 } = req.query;
    
    let whereClause = 'WHERE p.user_id = :userId';
    const replacements = { userId: req.user.id };
    
    if (category) {
      whereClause += ' AND pc.name = :category';
      replacements.category = category;
    }
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        pc.name as category_name,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'out_of_stock'
          WHEN p.stock_quantity <= :threshold THEN 'low_stock'
          WHEN p.stock_quantity <= :threshold * 2 THEN 'medium_stock'
          ELSE 'high_stock'
        END as stock_status,
        p.price,
        p.cost_price,
        (p.price - p.cost_price) * p.stock_quantity as potential_profit
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      ${whereClause}
      ORDER BY p.stock_quantity ASC, p.name
    `;
    
    replacements.threshold = parseInt(low_stock_threshold);
    
    const inventory = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    // Özet istatistikleri hesapla
    const summary = {
      total_products: inventory.length,
      out_of_stock: inventory.filter(p => p.stock_status === 'out_of_stock').length,
      low_stock: inventory.filter(p => p.stock_status === 'low_stock').length,
      total_inventory_value: inventory.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
      total_potential_profit: inventory.reduce((sum, p) => sum + (p.potential_profit || 0), 0)
    };
    
    logger.info(`Inventory analysis requested by user: ${req.user.id}`);
    
    res.json({
      success: true,
      data: {
        summary,
        products: inventory
      }
    });
    
  } catch (error) {
    logger.error('Inventory analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error during inventory analysis'
    });
  }
});
```

### 3. **Yeni Service Fonksiyonu Ekleme**

#### Yeni Service Dosyası
```javascript
// src/services/AnalyticsService.js
const { getSequelize } = require('../config/database');
const logger = require('../utils/logger');

class AnalyticsService {
  
  /**
   * Pazaryeri performans analizi
   */
  static async getMarketplacePerformance(userId, startDate, endDate) {
    try {
      const sequelize = getSequelize();
      
      const query = `
        SELECT 
          o.marketplace,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_revenue,
          AVG(o.total_amount) as avg_order_value,
          COUNT(DISTINCT o.customer_email) as unique_customers,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          CAST(SUM(CASE WHEN o.status = 'completed' THEN 1.0 ELSE 0 END) / COUNT(o.id) * 100 AS DECIMAL(5,2)) as completion_rate
        FROM orders o
        WHERE o.user_id = :userId
          AND o.created_at >= :startDate
          AND o.created_at <= :endDate
        GROUP BY o.marketplace
        ORDER BY total_revenue DESC
      `;
      
      const results = await sequelize.query(query, {
        replacements: { userId, startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });
      
      return results;
    } catch (error) {
      logger.error('Marketplace performance analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Ürün kategori analizi
   */
  static async getCategoryAnalysis(userId, period = '30d') {
    try {
      const sequelize = getSequelize();
      
      const days = parseInt(period.replace('d', ''));
      
      const query = `
        SELECT 
          pc.name as category_name,
          COUNT(DISTINCT p.id) as product_count,
          COUNT(oi.id) as total_sales,
          SUM(oi.quantity) as total_quantity_sold,
          SUM(oi.price * oi.quantity) as total_revenue,
          AVG(oi.price) as avg_selling_price,
          SUM(p.stock_quantity) as total_inventory
        FROM product_categories pc
        LEFT JOIN products p ON pc.id = p.category_id AND p.user_id = :userId
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATEADD(day, -:days, GETDATE())
        GROUP BY pc.id, pc.name
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY total_revenue DESC
      `;
      
      const results = await sequelize.query(query, {
        replacements: { userId, days },
        type: sequelize.QueryTypes.SELECT
      });
      
      return results;
    } catch (error) {
      logger.error('Category analysis failed:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
```

---

## 🔄 Database Migration

### 1. **Yeni Migration Script Oluşturma**

```javascript
// scripts/add_analytics_tables.js
const { connectDB, closeDB, getSequelize } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function createAnalyticsTables() {
  try {
    await connectDB();
    const sequelize = getSequelize();
    
    // Analytics events tablosu
    const createAnalyticsEventsTable = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='analytics_events' AND xtype='U')
      BEGIN
        CREATE TABLE analytics_events (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          user_id BIGINT NOT NULL,
          event_type NVARCHAR(50) NOT NULL,
          event_data NTEXT NULL,
          marketplace NVARCHAR(50) NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE INDEX IX_analytics_events_user_id ON analytics_events(user_id);
        CREATE INDEX IX_analytics_events_type_date ON analytics_events(event_type, created_at);
      END
    `;
    
    await sequelize.query(createAnalyticsEventsTable);
    logger.info('Analytics events table created successfully');
    
    // Performance metrics tablosu
    const createPerformanceMetricsTable = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='performance_metrics' AND xtype='U')
      BEGIN
        CREATE TABLE performance_metrics (
          id BIGINT IDENTITY(1,1) PRIMARY KEY,
          user_id BIGINT NOT NULL,
          metric_type NVARCHAR(50) NOT NULL,
          metric_value DECIMAL(15,2) NOT NULL,
          marketplace NVARCHAR(50) NULL,
          period_start DATETIME2 NOT NULL,
          period_end DATETIME2 NOT NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE INDEX IX_performance_metrics_user_type ON performance_metrics(user_id, metric_type);
        CREATE INDEX IX_performance_metrics_period ON performance_metrics(period_start, period_end);
      END
    `;
    
    await sequelize.query(createPerformanceMetricsTable);
    logger.info('Performance metrics table created successfully');
    
  } catch (error) {
    logger.error('Analytics tables creation failed:', error);
    throw error;
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  createAnalyticsTables()
    .then(() => {
      logger.info('Analytics tables migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Analytics tables migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createAnalyticsTables };
```

### 2. **SQL Dosyası Kullanarak Migration**

```sql
-- sql/create_analytics_tables.sql
USE EticaretAraEntegrator;

-- Analytics Events Tablosu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='analytics_events' AND xtype='U')
BEGIN
    CREATE TABLE analytics_events (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        event_type NVARCHAR(50) NOT NULL,
        event_data NTEXT NULL,
        marketplace NVARCHAR(50) NULL,
        ip_address NVARCHAR(45) NULL,
        user_agent NVARCHAR(500) NULL,
        session_id NVARCHAR(255) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_analytics_events_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    -- İndeksler
    CREATE INDEX IX_analytics_events_user_id ON analytics_events(user_id);
    CREATE INDEX IX_analytics_events_type_date ON analytics_events(event_type, created_at);
    CREATE INDEX IX_analytics_events_marketplace ON analytics_events(marketplace);
    
    PRINT 'Analytics events table created successfully';
END
ELSE
BEGIN
    PRINT 'Analytics events table already exists';
END

-- Performance Metrics Tablosu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='performance_metrics' AND xtype='U')
BEGIN
    CREATE TABLE performance_metrics (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        metric_type NVARCHAR(50) NOT NULL,
        metric_value DECIMAL(15,2) NOT NULL,
        marketplace NVARCHAR(50) NULL,
        period_start DATETIME2 NOT NULL,
        period_end DATETIME2 NOT NULL,
        metadata NTEXT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_performance_metrics_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    -- İndeksler
    CREATE INDEX IX_performance_metrics_user_type ON performance_metrics(user_id, metric_type);
    CREATE INDEX IX_performance_metrics_period ON performance_metrics(period_start, period_end);
    CREATE INDEX IX_performance_metrics_marketplace ON performance_metrics(marketplace);
    
    PRINT 'Performance metrics table created successfully';
END
ELSE
BEGIN
    PRINT 'Performance metrics table already exists';
END
```

---

## ✅ En İyi Uygulamalar

### 1. **SQL Güvenliği**
```javascript
// ❌ Yanlış - SQL Injection riski
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Doğru - Parameterized query
const query = `SELECT * FROM users WHERE email = :email`;
const result = await sequelize.query(query, {
  replacements: { email },
  type: sequelize.QueryTypes.SELECT
});
```

### 2. **Error Handling**
```javascript
// ✅ Kapsamlı error handling
try {
  const result = await sequelize.query(complexQuery, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT
  });
  
  logger.info(`Query executed successfully: ${queryName}`);
  return result;
  
} catch (error) {
  logger.error(`Query failed: ${queryName}`, {
    error: error.message,
    params,
    stack: error.stack
  });
  
  // Business-friendly error mesajı
  if (error.name === 'SequelizeTimeoutError') {
    throw new Error('Query took too long to execute');
  } else if (error.name === 'SequelizeConnectionError') {
    throw new Error('Database connection failed');
  } else {
    throw new Error('Database operation failed');
  }
}
```

### 3. **Performance Optimizasyonu**
```javascript
// ✅ Pagination için OFFSET/FETCH kullanımı
const getPaginatedResults = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.status,
      o.created_at
    FROM orders o
    WHERE o.user_id = :userId
    ORDER BY o.created_at DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;
  
  const countQuery = `
    SELECT COUNT(*) as total
    FROM orders o
    WHERE o.user_id = :userId
  `;
  
  const [data, countResult] = await Promise.all([
    sequelize.query(query, {
      replacements: { userId, offset, limit },
      type: sequelize.QueryTypes.SELECT
    }),
    sequelize.query(countQuery, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    })
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: countResult[0].total,
      totalPages: Math.ceil(countResult[0].total / limit)
    }
  };
};
```

### 4. **Query Optimizasyonu**
```javascript
// ✅ İndeks kullanımını optimize eden sorgu
const getOrdersByDateRange = async (userId, startDate, endDate) => {
  const query = `
    SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.status,
      o.marketplace,
      o.created_at,
      -- Hesaplanmış alanlar
      DATEDIFF(day, o.created_at, GETDATE()) as days_since_order
    FROM orders o WITH (INDEX(IX_orders_user_date)) -- İndex hint
    WHERE o.user_id = :userId
      AND o.created_at >= :startDate
      AND o.created_at <= :endDate
      AND o.is_deleted = 0 -- Soft delete kontrolü
    ORDER BY o.created_at DESC
  `;
  
  return await sequelize.query(query, {
    replacements: { userId, startDate, endDate },
    type: sequelize.QueryTypes.SELECT
  });
};
```

---

## 🎯 Örnekler

### Örnek 1: Pazaryeri Satış Raporu
```javascript
// src/api/routes/reports.js
router.get('/marketplace-sales/:marketplace', protect, async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let dateFormat, dateGroup;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        dateGroup = 'YEAR(o.created_at), MONTH(o.created_at), DAY(o.created_at), HOUR(o.created_at)';
        break;
      case 'week':
        dateFormat = '%Y-W%u';
        dateGroup = 'YEAR(o.created_at), WEEK(o.created_at)';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        dateGroup = 'YEAR(o.created_at), MONTH(o.created_at)';
        break;
      default: // day
        dateFormat = '%Y-%m-%d';
        dateGroup = 'YEAR(o.created_at), MONTH(o.created_at), DAY(o.created_at)';
    }
    
    const query = `
      SELECT 
        FORMAT(o.created_at, 'yyyy-MM-dd') as date_period,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_email) as unique_customers,
        SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as completed_revenue,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders
      FROM orders o
      WHERE o.user_id = :userId
        AND o.marketplace = :marketplace
        AND o.created_at >= :startDate
        AND o.created_at <= :endDate
      GROUP BY ${dateGroup}
      ORDER BY o.created_at ASC
    `;
    
    const results = await sequelize.query(query, {
      replacements: { 
        userId: req.user.id, 
        marketplace, 
        startDate, 
        endDate 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Toplam özet
    const summaryQuery = `
      SELECT 
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.customer_email) as total_customers
      FROM orders o
      WHERE o.user_id = :userId
        AND o.marketplace = :marketplace
        AND o.created_at >= :startDate
        AND o.created_at <= :endDate
    `;
    
    const summary = await sequelize.query(summaryQuery, {
      replacements: { 
        userId: req.user.id, 
        marketplace, 
        startDate, 
        endDate 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      data: {
        marketplace,
        period: { startDate, endDate, groupBy },
        summary: summary[0],
        timeline: results
      }
    });
    
  } catch (error) {
    logger.error('Marketplace sales report failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Örnek 2: Ürün Performans Analizi
```javascript
// src/services/ProductAnalyticsService.js
class ProductAnalyticsService {
  
  static async getProductPerformance(userId, productId, period = '30d') {
    try {
      const sequelize = getSequelize();
      const days = parseInt(period.replace('d', ''));
      
      const query = `
        WITH ProductMetrics AS (
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.price,
            p.cost_price,
            p.stock_quantity,
            
            -- Satış metrikleri
            COUNT(oi.id) as total_sales,
            SUM(oi.quantity) as total_quantity_sold,
            SUM(oi.price * oi.quantity) as total_revenue,
            AVG(oi.price) as avg_selling_price,
            
            -- Karlılık metrikleri
            SUM((oi.price - p.cost_price) * oi.quantity) as total_profit,
            AVG((oi.price - p.cost_price) / oi.price * 100) as profit_margin_percent,
            
            -- Zaman bazlı metrikler
            MIN(o.created_at) as first_sale_date,
            MAX(o.created_at) as last_sale_date,
            
            -- Pazaryeri dağılımı
            COUNT(DISTINCT o.marketplace) as marketplace_count,
            STRING_AGG(DISTINCT o.marketplace, ', ') as marketplaces
            
          FROM products p
          LEFT JOIN order_items oi ON p.id = oi.product_id
          LEFT JOIN orders o ON oi.order_id = o.id 
            AND o.status = 'completed'
            AND o.created_at >= DATEADD(day, -:days, GETDATE())
          WHERE p.user_id = :userId
            AND (:productId IS NULL OR p.id = :productId)
          GROUP BY p.id, p.name, p.sku, p.price, p.cost_price, p.stock_quantity
        ),
        
        -- Kategori ortalamaları
        CategoryAverages AS (
          SELECT 
            pc.id as category_id,
            AVG(pm.total_revenue) as avg_category_revenue,
            AVG(pm.total_quantity_sold) as avg_category_sales
          FROM ProductMetrics pm
          INNER JOIN products p ON pm.id = p.id
          INNER JOIN product_categories pc ON p.category_id = pc.id
          GROUP BY pc.id
        )
        
        SELECT 
          pm.*,
          ca.avg_category_revenue,
          ca.avg_category_sales,
          
          -- Performans skorları
          CASE 
            WHEN pm.total_revenue > ca.avg_category_revenue THEN 'Above Average'
            WHEN pm.total_revenue = 0 THEN 'No Sales'
            ELSE 'Below Average'
          END as performance_rating,
          
          -- Stok durumu analizi
          CASE 
            WHEN pm.stock_quantity = 0 THEN 'Out of Stock'
            WHEN pm.stock_quantity <= 5 THEN 'Low Stock'
            WHEN pm.stock_quantity <= 20 THEN 'Medium Stock'
            ELSE 'High Stock'
          END as stock_status,
          
          -- Velocity analizi (günlük ortalama satış)
          CAST(pm.total_quantity_sold AS FLOAT) / :days as daily_velocity
          
        FROM ProductMetrics pm
        LEFT JOIN products p ON pm.id = p.id
        LEFT JOIN CategoryAverages ca ON p.category_id = ca.category_id
        ORDER BY pm.total_revenue DESC
      `;
      
      const results = await sequelize.query(query, {
        replacements: { userId, productId, days },
        type: sequelize.QueryTypes.SELECT
      });
      
      return results;
      
    } catch (error) {
      logger.error('Product performance analysis failed:', error);
      throw error;
    }
  }
}
```

---

## 📊 Package.json Script Ekleme

```json
{
  "scripts": {
    "db:migrate-analytics": "node scripts/add_analytics_tables.js",
    "db:backup": "node scripts/backup_database.js",
    "db:restore": "node scripts/restore_database.js",
    "analytics:calculate": "node scripts/calculate_performance_metrics.js"
  }
}
```

---

## 🔍 Debug ve Monitoring

### SQL Query Logger
```javascript
// src/utils/queryLogger.js
class QueryLogger {
  static logQuery(queryName, query, params, executionTime) {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`SQL Query: ${queryName}`, {
        query: query.replace(/\s+/g, ' ').trim(),
        params,
        executionTime: `${executionTime}ms`
      });
    }
  }
  
  static async executeWithLogging(queryName, queryFn) {
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      
      this.logQuery(queryName, '', {}, executionTime);
      
      if (executionTime > 5000) { // 5 saniyeden uzun sorgular için uyarı
        logger.warn(`Slow query detected: ${queryName}`, { executionTime });
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Query failed: ${queryName}`, { 
        error: error.message, 
        executionTime 
      });
      throw error;
    }
  }
}

module.exports = QueryLogger;
```

Bu dokümantasyon, backend'deki SQL kullanımını ve yeni fonksiyon ekleme süreçlerini kapsamlı şekilde açıklamaktadır. Her örnek gerçek kullanım senaryolarını yansıtır ve en iyi uygulamaları içerir. 