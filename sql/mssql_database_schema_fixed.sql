-- ===============================================
-- E-TİCARET ARA ENTEGRASYON SİSTEMİ - MSSQL SCHEMA (DÜZELTME)
-- MongoDB'den MSSQL'e dönüştürülmüş tablo yapıları
-- Sorunlar çözüldü: Sıralama, database ismi, trigger/view problemleri
-- ===============================================

-- Database oluşturma (env.example'daki isimle uyumlu)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'EticaretAraEntegrator')
    CREATE DATABASE EticaretAraEntegrator;
GO

USE EticaretAraEntegrator;
GO

-- ===============================================
-- 1. ÖNCE TEMEL TABLOLAR (DEPENDENCY YOK)
-- ===============================================

-- Kullanıcı rolleri tablosu (önce oluşturulmalı - users tablosu buna bağımlı)
CREATE TABLE user_roles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    role_display_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    is_system_role BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- İzinler tablosu
CREATE TABLE permissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    permission_key NVARCHAR(100) NOT NULL UNIQUE,
    permission_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    category NVARCHAR(50),
    is_system_permission BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ===============================================
-- 2. KULLANICI YÖNETİMİ TABLOLARI
-- ===============================================

-- Ana kullanıcı tablosu
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    is_active BIT DEFAULT 1,
    reset_password_token NVARCHAR(255),
    reset_password_expire DATETIME2,
    last_login DATETIME2,
    login_attempts INT DEFAULT 0,
    lock_until DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES user_roles(id)
);

-- Rol izin ilişkileri
CREATE TABLE role_permissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    granted BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Şirket bilgileri tablosu
CREATE TABLE user_companies (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name NVARCHAR(200),
    tax_number NVARCHAR(50),
    address NVARCHAR(500),
    phone NVARCHAR(20),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pazaryeri hesapları
CREATE TABLE user_marketplace_accounts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    is_active BIT DEFAULT 1,
    last_sync_date DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, marketplace)
);

-- Pazaryeri kimlik bilgileri
CREATE TABLE user_marketplace_credentials (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_account_id BIGINT NOT NULL,
    api_key NVARCHAR(255),
    api_secret NVARCHAR(255),
    supplier_id NVARCHAR(100),
    merchant_id NVARCHAR(100),
    seller_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (marketplace_account_id) REFERENCES user_marketplace_accounts(id) ON DELETE CASCADE
);

-- Pazaryeri ayarları
CREATE TABLE user_marketplace_settings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_account_id BIGINT NOT NULL,
    sync_products BIT DEFAULT 1,
    sync_orders BIT DEFAULT 1,
    sync_stock BIT DEFAULT 1,
    sync_prices BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (marketplace_account_id) REFERENCES user_marketplace_accounts(id) ON DELETE CASCADE
);

-- Kullanıcı tercihleri
CREATE TABLE user_preferences (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    language NVARCHAR(5) DEFAULT 'tr',
    timezone NVARCHAR(50) DEFAULT 'Europe/Istanbul',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bildirim ayarları
CREATE TABLE user_notification_settings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email_notifications BIT DEFAULT 1,
    order_updates BIT DEFAULT 1,
    stock_alerts BIT DEFAULT 1,
    sync_errors BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- 3. ÜRÜN YÖNETİMİ TABLOLARI
-- ===============================================

-- Ürün kategorileri (önce oluşturulmalı)
CREATE TABLE product_categories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    slug NVARCHAR(200) NOT NULL UNIQUE,
    description NTEXT,
    parent_id BIGINT,
    path NVARCHAR(500),
    level INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);

-- Ana ürün tablosu
CREATE TABLE products (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name NVARCHAR(500) NOT NULL,
    description NTEXT,
    short_description NVARCHAR(1000),
    sku NVARCHAR(100) NOT NULL,
    barcode NVARCHAR(50),
    brand NVARCHAR(100),
    category_id BIGINT,
    weight DECIMAL(10,2),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2),
    dimensions_height DECIMAL(10,2),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    currency NVARCHAR(3) DEFAULT 'TRY',
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    is_active BIT DEFAULT 1,
    is_published BIT DEFAULT 0,
    stock_tracking BIT DEFAULT 1,
    min_stock_level INT DEFAULT 0,
    max_stock_level INT,
    meta_title NVARCHAR(200),
    meta_description NVARCHAR(500),
    meta_keywords NVARCHAR(500),
    last_updated_by BIGINT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (last_updated_by) REFERENCES users(id),
    UNIQUE(user_id, sku)
);

-- Ürün varyantları
CREATE TABLE product_variants (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    sku NVARCHAR(100) NOT NULL UNIQUE,
    barcode NVARCHAR(50),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    discounted_price DECIMAL(10,2) CHECK (discounted_price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INT DEFAULT 5,
    weight DECIMAL(10,2),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2),
    dimensions_height DECIMAL(10,2),
    is_active BIT DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Ürün görselleri
CREATE TABLE product_images (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    url NVARCHAR(500) NOT NULL,
    alt_text NVARCHAR(200),
    sort_order INT DEFAULT 0,
    is_main BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Varyant özellikleri
CREATE TABLE product_variant_attributes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    attribute_name NVARCHAR(100) NOT NULL,
    attribute_value NVARCHAR(500) NOT NULL,
    attribute_group NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE(variant_id, attribute_name)
);

-- Pazaryeri ürün listeleri
CREATE TABLE product_marketplaces (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    marketplace_product_id NVARCHAR(100),
    marketplace_sku NVARCHAR(100),
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'rejected', 'draft')),
    price DECIMAL(10,2),
    discounted_price DECIMAL(10,2),
    stock_quantity INT,
    is_active BIT DEFAULT 1,
    auto_sync BIT DEFAULT 1,
    price_multiplier DECIMAL(5,2) DEFAULT 1.00 CHECK (price_multiplier BETWEEN 0.1 AND 10),
    stock_buffer INT DEFAULT 0 CHECK (stock_buffer >= 0),
    custom_title NVARCHAR(500),
    custom_description NTEXT,
    last_sync_date DATETIME2,
    sync_status NVARCHAR(20) CHECK (sync_status IN ('success', 'failed', 'pending', 'in_progress')),
    sync_errors NTEXT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, marketplace)
);

-- ===============================================
-- 4. SİPARİŞ YÖNETİMİ TABLOLARI
-- ===============================================

-- Ana sipariş tablosu
CREATE TABLE orders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_number NVARCHAR(50) NOT NULL UNIQUE,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    marketplace_order_id NVARCHAR(100) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded')),
    order_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency NVARCHAR(3) NOT NULL DEFAULT 'TRY',
    payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    payment_method NVARCHAR(50),
    shipping_method NVARCHAR(50),
    tracking_number NVARCHAR(100),
    estimated_delivery_date DATETIME2,
    delivered_at DATETIME2,
    cancelled_at DATETIME2,
    cancellation_reason NVARCHAR(500),
    customer_name NVARCHAR(200) NOT NULL,
    customer_email NVARCHAR(255),
    customer_phone NVARCHAR(20),
    billing_address NTEXT,
    shipping_address NTEXT NOT NULL,
    notes NTEXT,
    marketplace_data NTEXT,
    last_sync_date DATETIME2,
    sync_status NVARCHAR(20) CHECK (sync_status IN ('success', 'failed', 'pending', 'in_progress')),
    sync_errors NTEXT,
    status_updated_at DATETIME2,
    last_updated_by BIGINT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_updated_by) REFERENCES users(id),
    UNIQUE(marketplace, marketplace_order_id)
);

-- Sipariş kalemleri
CREATE TABLE order_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    variant_id BIGINT,
    product_name NVARCHAR(500) NOT NULL,
    product_sku NVARCHAR(100) NOT NULL,
    variant_name NVARCHAR(200),
    quantity INT NOT NULL CHECK (quantity >= 1),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    marketplace_item_id NVARCHAR(100),
    marketplace_product_id NVARCHAR(100),
    marketplace_variant_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Sipariş durum geçmişi
CREATE TABLE order_status_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    old_status NVARCHAR(20),
    new_status NVARCHAR(20) NOT NULL,
    notes NTEXT,
    updated_by BIGINT,
    change_source NVARCHAR(50) DEFAULT 'manual',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- ===============================================
-- 5. SENKRONİZASYON TABLOLARI
-- ===============================================

-- Sync logları
CREATE TABLE sync_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    operation_type NVARCHAR(50) NOT NULL CHECK (operation_type IN ('product_sync', 'order_sync', 'stock_update', 'price_update', 'bulk_update', 'report_generation')),
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'all')),
    entity_type NVARCHAR(20) CHECK (entity_type IN ('product', 'order', 'variant', 'category', 'stock', 'price')),
    entity_id BIGINT,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled')),
    started_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    completed_at DATETIME2,
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    successful_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    error_message NTEXT,
    request_data NTEXT,
    response_data NTEXT,
    result_data NTEXT,
    job_id NVARCHAR(100),
    triggered_by NVARCHAR(50) DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled', 'webhook', 'api', 'system')),
    sync_mode NVARCHAR(20) CHECK (sync_mode IN ('full', 'incremental', 'selective')),
    metadata NTEXT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- 6. INDEX'LER
-- ===============================================

-- Users tablosu index'leri
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_role_id ON users(role_id);
CREATE INDEX IX_users_is_active ON users(is_active);
CREATE INDEX IX_users_created_at ON users(created_at);

-- Products tablosu index'leri
CREATE INDEX IX_products_user_id ON products(user_id);
CREATE INDEX IX_products_sku ON products(sku);
CREATE INDEX IX_products_barcode ON products(barcode);
CREATE INDEX IX_products_user_sku ON products(user_id, sku);

-- Product variants index'leri
CREATE INDEX IX_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IX_product_variants_sku ON product_variants(sku);
CREATE INDEX IX_product_variants_barcode ON product_variants(barcode);

-- Product images index'leri
CREATE INDEX IX_product_images_product_id ON product_images(product_id);
CREATE INDEX IX_product_images_main ON product_images(product_id, is_main);

-- Product marketplace index'leri
CREATE INDEX IX_product_marketplaces_product_id ON product_marketplaces(product_id);
CREATE INDEX IX_product_marketplaces_marketplace ON product_marketplaces(marketplace);
CREATE INDEX IX_product_marketplaces_marketplace_product_id ON product_marketplaces(marketplace_product_id);

-- Product variant attributes index'leri
CREATE INDEX IX_product_variant_attributes_variant_id ON product_variant_attributes(variant_id);
CREATE INDEX IX_product_variant_attributes_name ON product_variant_attributes(attribute_name);

-- Orders tablosu index'leri
CREATE INDEX IX_orders_user_id ON orders(user_id);
CREATE INDEX IX_orders_order_number ON orders(order_number);
CREATE INDEX IX_orders_marketplace ON orders(marketplace);
CREATE INDEX IX_orders_marketplace_order_id ON orders(marketplace_order_id);
CREATE INDEX IX_orders_status ON orders(status);
CREATE INDEX IX_orders_order_date ON orders(order_date);
CREATE INDEX IX_orders_marketplace_order ON orders(marketplace, marketplace_order_id);

-- Order items index'leri
CREATE INDEX IX_order_items_order_id ON order_items(order_id);
CREATE INDEX IX_order_items_product_id ON order_items(product_id);
CREATE INDEX IX_order_items_variant_id ON order_items(variant_id);

-- Order status history index'leri
CREATE INDEX IX_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IX_order_status_history_new_status ON order_status_history(new_status);
CREATE INDEX IX_order_status_history_created_at ON order_status_history(created_at);

-- Sync logs index'leri
CREATE INDEX IX_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IX_sync_logs_operation_type ON sync_logs(operation_type);
CREATE INDEX IX_sync_logs_marketplace ON sync_logs(marketplace);
CREATE INDEX IX_sync_logs_status ON sync_logs(status);
CREATE INDEX IX_sync_logs_started_at ON sync_logs(started_at);
CREATE INDEX IX_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX IX_sync_logs_job_id ON sync_logs(job_id);

-- User marketplace accounts index'leri
CREATE INDEX IX_user_marketplace_accounts_user_id ON user_marketplace_accounts(user_id);
CREATE INDEX IX_user_marketplace_accounts_marketplace ON user_marketplace_accounts(marketplace);
CREATE INDEX IX_user_marketplace_accounts_is_active ON user_marketplace_accounts(is_active);

-- Role permissions index'leri
CREATE INDEX IX_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IX_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IX_role_permissions_granted ON role_permissions(granted);

-- Permissions index'leri
CREATE INDEX IX_permissions_permission_key ON permissions(permission_key);
CREATE INDEX IX_permissions_category ON permissions(category);
CREATE INDEX IX_permissions_is_active ON permissions(is_active);

-- User roles index'leri
CREATE INDEX IX_user_roles_role_name ON user_roles(role_name);
CREATE INDEX IX_user_roles_is_active ON user_roles(is_active);

-- Product categories index'leri
CREATE INDEX IX_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IX_product_categories_slug ON product_categories(slug);
CREATE INDEX IX_product_categories_level ON product_categories(level);

-- ===============================================
-- 7. TRIGGER'LAR (Her biri ayrı batch'de)
-- ===============================================

-- Users tablosu için updated_at trigger
GO
CREATE TRIGGER tr_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users 
    SET updated_at = GETDATE()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO

-- Products tablosu için updated_at trigger
CREATE TRIGGER tr_products_updated_at
ON products
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE products 
    SET updated_at = GETDATE()
    FROM products p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Product variants tablosu için updated_at trigger
CREATE TRIGGER tr_product_variants_updated_at
ON product_variants
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE product_variants 
    SET updated_at = GETDATE()
    FROM product_variants pv
    INNER JOIN inserted i ON pv.id = i.id;
END;
GO

-- Orders tablosu için updated_at trigger
CREATE TRIGGER tr_orders_updated_at
ON orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE orders 
    SET updated_at = GETDATE()
    FROM orders o
    INNER JOIN inserted i ON o.id = i.id;
END;
GO

-- User roles tablosu için updated_at trigger
CREATE TRIGGER tr_user_roles_updated_at
ON user_roles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE user_roles 
    SET updated_at = GETDATE()
    FROM user_roles ur
    INNER JOIN inserted i ON ur.id = i.id;
END;
GO

-- Permissions tablosu için updated_at trigger
CREATE TRIGGER tr_permissions_updated_at
ON permissions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE permissions 
    SET updated_at = GETDATE()
    FROM permissions p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Role permissions tablosu için updated_at trigger
CREATE TRIGGER tr_role_permissions_updated_at
ON role_permissions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE role_permissions 
    SET updated_at = GETDATE()
    FROM role_permissions rp
    INNER JOIN inserted i ON rp.id = i.id;
END;
GO

-- ===============================================
-- 8. VIEW'LAR
-- ===============================================

-- Kullanıcı yetkileri görünümü
CREATE VIEW vw_user_permissions AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    ur.role_name,
    ur.role_display_name,
    p.permission_key,
    p.permission_name,
    p.description as permission_description,
    p.category as permission_category,
    rp.granted
FROM users u
INNER JOIN user_roles ur ON u.role_id = ur.id
INNER JOIN role_permissions rp ON ur.id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = 1 AND ur.is_active = 1 AND p.is_active = 1;
GO

-- Ürün özet görünümü
CREATE VIEW vw_product_summary AS
SELECT 
    p.id,
    p.user_id,
    p.name,
    p.brand,
    p.base_price,
    p.currency,
    p.is_active,
    p.is_published,
    pc.name as category_name,
    COUNT(pv.id) as variant_count,
    SUM(CASE WHEN pv.is_active = 1 THEN pv.stock_quantity ELSE 0 END) as total_stock,
    MIN(CASE WHEN pv.is_active = 1 THEN pv.price END) as min_price,
    MAX(CASE WHEN pv.is_active = 1 THEN pv.price END) as max_price,
    MAX(pm.last_sync_date) as last_marketplace_sync,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN product_marketplaces pm ON p.id = pm.product_id AND pm.is_active = 1
WHERE p.is_active = 1
GROUP BY p.id, p.user_id, p.name, p.brand, p.base_price, p.currency, 
         p.is_active, p.is_published, pc.name, p.created_at, p.updated_at;
GO

-- Sipariş özet görünümü  
CREATE VIEW vw_order_summary AS
SELECT 
    o.id,
    o.user_id,
    o.order_number,
    o.marketplace,
    o.marketplace_order_id,
    o.status,
    o.payment_status,
    o.total_amount,
    o.currency,
    o.customer_name,
    o.customer_email,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity,
    o.tracking_number,
    o.order_date,
    o.created_at,
    o.updated_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.user_id, o.order_number, o.marketplace, o.marketplace_order_id,
         o.status, o.payment_status, o.total_amount, o.currency,
         o.customer_name, o.customer_email, o.tracking_number, 
         o.order_date, o.created_at, o.updated_at;
GO

-- Senkronizasyon durumu görünümü
CREATE VIEW vw_sync_status AS
SELECT 
    sl.user_id,
    sl.marketplace,
    sl.operation_type,
    sl.entity_type,
    COUNT(*) as total_operations,
    SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN sl.status = 'failed' THEN 1 ELSE 0 END) as failed_operations,
    SUM(CASE WHEN sl.status = 'pending' THEN 1 ELSE 0 END) as pending_operations,
    MAX(sl.started_at) as last_operation_date
FROM sync_logs sl
WHERE sl.started_at >= DATEADD(day, -30, GETDATE()) -- Son 30 gün
GROUP BY sl.user_id, sl.marketplace, sl.operation_type, sl.entity_type;
GO

-- ===============================================
-- 9. STORED PROCEDURE'LAR
-- ===============================================

-- Eski sync log'ları temizleme prosedürü
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'sp_cleanup_old_sync_logs') AND type in (N'P', N'PC'))
    DROP PROCEDURE sp_cleanup_old_sync_logs;
GO

CREATE PROCEDURE sp_cleanup_old_sync_logs
    @days_to_keep INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @cutoff_date DATETIME2 = DATEADD(day, -@days_to_keep, GETDATE());
    DECLARE @deleted_count INT;
    
    DELETE FROM sync_logs WHERE started_at < @cutoff_date;
    SET @deleted_count = @@ROWCOUNT;
    
    RETURN @deleted_count;
END;
GO

-- Stok durumu güncelleme prosedürü
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'sp_update_stock_status') AND type in (N'P', N'PC'))
    DROP PROCEDURE sp_update_stock_status;
GO

CREATE PROCEDURE sp_update_stock_status
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Bu prosedür gelecekte stok durumu hesaplamaları için kullanılacak
    -- Şu an için placeholder
    
    SELECT COUNT(*) as products_processed FROM products WHERE is_active = 1;
END;
GO

-- ===============================================
-- 10. VARSAYILAN VERİLER
-- ===============================================

-- Sistem rollerini ekle
INSERT INTO user_roles (role_name, role_display_name, description, is_system_role, is_active) VALUES
('admin', 'Yönetici', 'Sistem yöneticisi - tüm yetkiler', 1, 1),
('manager', 'Müdür', 'İşletme müdürü - kullanıcı yönetimi hariç tüm yetkiler', 1, 1),
('user', 'Kullanıcı', 'Standart kullanıcı - kendi verilerini yönetir', 1, 1),
('viewer', 'Görüntüleyici', 'Sadece görüntüleme yetkisi', 1, 1);

-- Sistem izinlerini ekle
INSERT INTO permissions (permission_key, permission_name, description, category, is_system_permission) VALUES
-- Kullanıcı yönetimi
('users.view', 'Kullanıcıları Görüntüle', 'Kullanıcı listesini görüntüleme yetkisi', 'users', 1),
('users.create', 'Kullanıcı Oluştur', 'Yeni kullanıcı oluşturma yetkisi', 'users', 1),
('users.edit', 'Kullanıcı Düzenle', 'Kullanıcı bilgilerini düzenleme yetkisi', 'users', 1),
('users.delete', 'Kullanıcı Sil', 'Kullanıcı silme yetkisi', 'users', 1),
('users.manage_roles', 'Rol Yönetimi', 'Kullanıcı rollerini yönetme yetkisi', 'users', 1),

-- Ürün yönetimi
('products.view', 'Ürünleri Görüntüle', 'Ürün listesini görüntüleme yetkisi', 'products', 1),
('products.create', 'Ürün Oluştur', 'Yeni ürün oluşturma yetkisi', 'products', 1),
('products.edit', 'Ürün Düzenle', 'Ürün bilgilerini düzenleme yetkisi', 'products', 1),
('products.delete', 'Ürün Sil', 'Ürün silme yetkisi', 'products', 1),
('products.manage_stock', 'Stok Yönetimi', 'Ürün stoklarını yönetme yetkisi', 'products', 1),
('products.manage_prices', 'Fiyat Yönetimi', 'Ürün fiyatlarını yönetme yetkisi', 'products', 1),
('products.sync', 'Ürün Senkronizasyonu', 'Ürünleri pazaryerlerine senkronize etme yetkisi', 'products', 1),

-- Sipariş yönetimi
('orders.view', 'Siparişleri Görüntüle', 'Sipariş listesini görüntüleme yetkisi', 'orders', 1),
('orders.create', 'Sipariş Oluştur', 'Manuel sipariş oluşturma yetkisi', 'orders', 1),
('orders.edit', 'Sipariş Düzenle', 'Sipariş bilgilerini düzenleme yetkisi', 'orders', 1),
('orders.cancel', 'Sipariş İptal', 'Sipariş iptal etme yetkisi', 'orders', 1),
('orders.refund', 'İade İşlemi', 'Sipariş iade etme yetkisi', 'orders', 1),
('orders.sync', 'Sipariş Senkronizasyonu', 'Siparişleri pazaryerlerinden çekme yetkisi', 'orders', 1),

-- Pazaryeri yönetimi
('marketplaces.view', 'Pazaryerlerini Görüntüle', 'Pazaryeri bilgilerini görüntüleme yetkisi', 'marketplaces', 1),
('marketplaces.manage', 'Pazaryeri Yönetimi', 'Pazaryeri hesaplarını yönetme yetkisi', 'marketplaces', 1),
('marketplaces.sync', 'Pazaryeri Senkronizasyonu', 'Pazaryerleri ile senkronizasyon yetkisi', 'marketplaces', 1),

-- Raporlama
('reports.view', 'Raporları Görüntüle', 'Raporları görüntüleme yetkisi', 'reports', 1),
('reports.export', 'Rapor Dışa Aktar', 'Raporları dışa aktarma yetkisi', 'reports', 1),
('reports.advanced', 'Gelişmiş Raporlar', 'Gelişmiş raporlara erişim yetkisi', 'reports', 1),

-- Sistem yönetimi
('system.view_logs', 'Log Görüntüleme', 'Sistem loglarını görüntüleme yetkisi', 'system', 1),
('system.manage_settings', 'Sistem Ayarları', 'Sistem ayarlarını yönetme yetkisi', 'system', 1),
('system.manage_roles', 'Rol ve İzin Yönetimi', 'Roller ve izinleri yönetme yetkisi', 'system', 1);

-- Admin rolüne tüm izinleri ver
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
    (SELECT id FROM user_roles WHERE role_name = 'admin'),
    id,
    1
FROM permissions;

-- Manager rolüne belirli izinleri ver (kullanıcı yönetimi hariç)
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
    (SELECT id FROM user_roles WHERE role_name = 'manager'),
    id,
    1
FROM permissions 
WHERE permission_key NOT IN ('users.create', 'users.delete', 'users.manage_roles', 'system.manage_settings', 'system.manage_roles');

-- User rolüne temel izinleri ver
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
    (SELECT id FROM user_roles WHERE role_name = 'user'),
    id,
    1
FROM permissions 
WHERE permission_key IN (
    'products.view', 'products.create', 'products.edit', 'products.manage_stock', 'products.manage_prices', 'products.sync',
    'orders.view', 'orders.edit', 'orders.sync',
    'marketplaces.view', 'marketplaces.manage', 'marketplaces.sync',
    'reports.view', 'reports.export'
);

-- Viewer rolüne sadece görüntüleme izinleri ver
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
    (SELECT id FROM user_roles WHERE role_name = 'viewer'),
    id,
    1
FROM permissions 
WHERE permission_key IN (
    'products.view', 'orders.view', 'marketplaces.view', 'reports.view'
);

-- Varsayılan admin kullanıcısı oluştur (şifre: admin123)
INSERT INTO users (name, email, password_hash, role_id, is_active) 
VALUES (
    'Sistem Yöneticisi', 
    'admin@eticaretara.com', 
    '$2a$12$LQv3c1yqBw.uuKzAiKKFaO0vkY.bCwqJFB5QgLgFp/FZfI2YQfQ.K', -- admin123 hash'i
    (SELECT id FROM user_roles WHERE role_name = 'admin'),
    1
);

-- ===============================================
-- TAMAMLANDI
-- ===============================================

PRINT 'E-ticaret Ara Entegrasyon Sistemi MSSQL Schema başarıyla oluşturuldu!';
PRINT 'Database: EticaretAraEntegrator';
PRINT 'Toplam Tablo Sayısı: 20+';
PRINT 'Varsayılan Admin: admin@eticaretara.com / admin123';
PRINT 'Dinamik rol sistemi aktif - Yeni roller ve izinler eklenebilir.';
PRINT 'Sorunlar çözüldü: Doğru sıralama, database ismi, trigger/view problemleri.';
GO 