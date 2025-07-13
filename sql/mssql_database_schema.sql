-- ===============================================
-- E-TİCARET ARA ENTEGRASYON SİSTEMİ - MSSQL SCHEMA
-- MongoDB'den MSSQL'e dönüştürülmüş tablo yapıları
-- ===============================================

-- Database oluşturma
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'EticaretAraEntegrator')
    CREATE DATABASE EticaretAraEntegrator;
GO

USE EticaretAraEntegrator;
GO

-- ===============================================
-- KULLANICI YÖNETİMİ TABLOLARI
-- ===============================================

-- Ana kullanıcı tablosu
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    is_active BIT DEFAULT 1,
    reset_password_token NVARCHAR(255),
    reset_password_expire DATETIME2,
    last_login DATETIME2,
    login_attempts INT DEFAULT 0,
    lock_until DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
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
-- ÜRÜN YÖNETİMİ TABLOLARI
-- ===============================================

-- Ana ürün tablosu
CREATE TABLE products (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(2000) NOT NULL,
    short_description NVARCHAR(500),
    brand NVARCHAR(100) NOT NULL,
    base_price DECIMAL(18,2) NOT NULL CHECK (base_price >= 0),
    currency NVARCHAR(3) DEFAULT 'TRY' CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP')),
    status NVARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    published_at DATETIME2,
    total_stock INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    review_count INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vergi bilgileri
CREATE TABLE product_tax_info (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    rate DECIMAL(5,2) DEFAULT 18 CHECK (rate >= 0 AND rate <= 100),
    included BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Kategori bilgileri
CREATE TABLE product_categories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    path NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Pazaryeri kategorileri
CREATE TABLE product_marketplace_categories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    category_id NVARCHAR(100),
    category_name NVARCHAR(200),
    category_path NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Ürün varyantları
CREATE TABLE product_variants (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    sku NVARCHAR(100) NOT NULL UNIQUE,
    barcode NVARCHAR(50),
    price DECIMAL(18,2) NOT NULL CHECK (price >= 0),
    discounted_price DECIMAL(18,2) CHECK (discounted_price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    weight DECIMAL(10,3),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Varyant görselleri
CREATE TABLE variant_images (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Varyant özellikleri
CREATE TABLE variant_attributes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    attribute_name NVARCHAR(100) NOT NULL,
    attribute_value NVARCHAR(200) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Varyant pazaryeri verileri
CREATE TABLE variant_marketplace_data (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    marketplace_product_id NVARCHAR(100),
    marketplace_variant_id NVARCHAR(100),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
    marketplace_price DECIMAL(18,2),
    marketplace_discounted_price DECIMAL(18,2),
    marketplace_stock INT,
    last_sync_date DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Varyant pazaryeri hataları
CREATE TABLE variant_marketplace_sync_errors (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    variant_marketplace_data_id BIGINT NOT NULL,
    error_message NVARCHAR(1000),
    error_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (variant_marketplace_data_id) REFERENCES variant_marketplace_data(id) ON DELETE CASCADE
);

-- Ürün görselleri
CREATE TABLE product_images (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    alt_text NVARCHAR(200),
    display_order INT DEFAULT 0,
    is_main BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Ürün etiketleri
CREATE TABLE product_tags (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    tag NVARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Ürün özellikleri
CREATE TABLE product_specifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    spec_name NVARCHAR(100) NOT NULL,
    spec_value NVARCHAR(200) NOT NULL,
    spec_group NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- SEO bilgileri
CREATE TABLE product_seo (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    seo_title NVARCHAR(200),
    seo_description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- SEO anahtar kelimeleri
CREATE TABLE product_seo_keywords (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_seo_id BIGINT NOT NULL,
    keyword NVARCHAR(100) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_seo_id) REFERENCES product_seo(id) ON DELETE CASCADE
);

-- Kargo bilgileri
CREATE TABLE product_shipping (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    weight DECIMAL(10,3),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    free_shipping BIT DEFAULT 0,
    shipping_class NVARCHAR(50),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stok yönetimi
CREATE TABLE product_inventory (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    track_stock BIT DEFAULT 1,
    allow_backorder BIT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    stock_status NVARCHAR(20) DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Pazaryeri ayarları
CREATE TABLE product_marketplace_settings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    is_active BIT DEFAULT 1,
    auto_sync BIT DEFAULT 1,
    price_multiplier DECIMAL(5,2) DEFAULT 1 CHECK (price_multiplier >= 0.1 AND price_multiplier <= 10),
    stock_buffer INT DEFAULT 0 CHECK (stock_buffer >= 0),
    custom_title NVARCHAR(200),
    custom_description NVARCHAR(1000),
    last_sync_date DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, marketplace)
);

-- Pazaryeri ayarları özel görseller
CREATE TABLE product_marketplace_custom_images (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_setting_id BIGINT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (marketplace_setting_id) REFERENCES product_marketplace_settings(id) ON DELETE CASCADE
);

-- Pazaryeri ayarları sync hataları
CREATE TABLE product_marketplace_sync_errors (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_setting_id BIGINT NOT NULL,
    error_message NVARCHAR(1000),
    error_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (marketplace_setting_id) REFERENCES product_marketplace_settings(id) ON DELETE CASCADE
);

-- ===============================================
-- SİPARİŞ YÖNETİMİ TABLOLARI
-- ===============================================

-- Ana sipariş tablosu
CREATE TABLE orders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_number NVARCHAR(50) NOT NULL UNIQUE,
    marketplace_name NVARCHAR(20) NOT NULL CHECK (marketplace_name IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'website')),
    marketplace_order_id NVARCHAR(100) NOT NULL,
    marketplace_order_number NVARCHAR(100),
    marketplace_order_date DATETIME2,
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned')),
    payment_status NVARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial_refund')),
    fulfillment_status NVARCHAR(20) DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'returned')),
    currency NVARCHAR(3) DEFAULT 'TRY',
    subtotal DECIMAL(18,2) NOT NULL,
    shipping_cost DECIMAL(18,2) DEFAULT 0,
    tax_amount DECIMAL(18,2) DEFAULT 0,
    discount_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Müşteri bilgileri
CREATE TABLE order_customers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    customer_id NVARCHAR(100),
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255),
    phone NVARCHAR(20),
    tax_number NVARCHAR(50),
    is_company BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Sipariş kalemleri
CREATE TABLE order_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT,
    variant_id BIGINT,
    product_name NVARCHAR(200) NOT NULL,
    sku NVARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(18,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(18,2) NOT NULL CHECK (total_price >= 0),
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(18,2),
    marketplace_product_id NVARCHAR(100),
    marketplace_variant_id NVARCHAR(100),
    marketplace_item_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Adres bilgileri
CREATE TABLE order_addresses (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    address_type NVARCHAR(20) NOT NULL CHECK (address_type IN ('shipping', 'billing')),
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    company NVARCHAR(200),
    address_line1 NVARCHAR(500) NOT NULL,
    address_line2 NVARCHAR(500),
    city NVARCHAR(100) NOT NULL,
    state NVARCHAR(100),
    postal_code NVARCHAR(20) NOT NULL,
    country NVARCHAR(3) DEFAULT 'TR',
    phone NVARCHAR(20),
    email NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Kargo bilgileri
CREATE TABLE order_shipping (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    shipping_method NVARCHAR(100),
    tracking_number NVARCHAR(100),
    carrier_code NVARCHAR(50),
    estimated_delivery DATETIME2,
    actual_delivery DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Ödeme bilgileri
CREATE TABLE order_payments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    payment_method NVARCHAR(50),
    transaction_id NVARCHAR(100),
    payment_amount DECIMAL(18,2),
    payment_date DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Sipariş durum geçmişi
CREATE TABLE order_status_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status NVARCHAR(20) NOT NULL,
    note NVARCHAR(500),
    updated_by NVARCHAR(100) DEFAULT 'system',
    status_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Sipariş notları
CREATE TABLE order_notes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    note NVARCHAR(1000) NOT NULL,
    is_private BIT DEFAULT 0,
    created_by NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Sipariş etiketleri
CREATE TABLE order_tags (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    tag NVARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- İade bilgileri
CREATE TABLE order_refunds (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    refund_amount DECIMAL(18,2) NOT NULL,
    refund_reason NVARCHAR(500),
    refund_status NVARCHAR(20) DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'rejected', 'processed')),
    request_date DATETIME2 DEFAULT GETDATE(),
    processed_date DATETIME2,
    refund_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- İptal bilgileri
CREATE TABLE order_cancellations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    cancellation_reason NVARCHAR(500),
    cancelled_by NVARCHAR(100),
    cancelled_at DATETIME2 DEFAULT GETDATE(),
    refund_amount DECIMAL(18,2),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Pazaryerine özel veriler
CREATE TABLE order_marketplace_specific_data (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL,
    data_key NVARCHAR(100) NOT NULL,
    data_value NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Senkronizasyon durumu
CREATE TABLE order_sync_status (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    last_sync_date DATETIME2,
    needs_sync BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Senkronizasyon hataları
CREATE TABLE order_sync_errors (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    error_message NVARCHAR(1000),
    error_date DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ===============================================
-- SENKRONİZASYON LOG TABLOLARI
-- ===============================================

-- Ana senkronizasyon log tablosu
CREATE TABLE sync_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11')),
    operation NVARCHAR(50) NOT NULL CHECK (operation IN ('product_sync', 'product_create', 'product_update', 'product_delete', 'stock_sync', 'price_sync', 'order_sync', 'order_import', 'order_status_update', 'bulk_sync', 'category_sync')),
    entity NVARCHAR(20) NOT NULL CHECK (entity IN ('product', 'order', 'stock', 'price', 'category')),
    entity_id BIGINT,
    entity_type NVARCHAR(20),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'warning', 'error')),
    direction NVARCHAR(20) NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
    is_bulk_operation BIT DEFAULT 0,
    execution_time_ms INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at DATETIME2,
    started_at DATETIME2 DEFAULT GETDATE(),
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bulk işlem istatistikleri
CREATE TABLE sync_log_bulk_stats (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    total_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Request/Response verileri
CREATE TABLE sync_log_data (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    data_type NVARCHAR(20) NOT NULL CHECK (data_type IN ('request', 'response', 'changes')),
    data_content NVARCHAR(MAX), -- JSON formatında veri
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Hata detayları
CREATE TABLE sync_log_errors (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    error_code NVARCHAR(100),
    error_message NVARCHAR(1000),
    error_details NVARCHAR(MAX), -- JSON formatında detaylar
    error_stack NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Uyarılar
CREATE TABLE sync_log_warnings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    warning_message NVARCHAR(1000),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Metadata
CREATE TABLE sync_log_metadata (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    user_agent NVARCHAR(500),
    ip_address NVARCHAR(45),
    api_version NVARCHAR(20),
    request_id NVARCHAR(100),
    batch_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Pazaryeri yanıt bilgileri
CREATE TABLE sync_log_marketplace_responses (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    status_code INT,
    response_headers NVARCHAR(MAX), -- JSON formatında
    response_body NVARCHAR(MAX), -- JSON formatında
    rate_limit_info NVARCHAR(MAX), -- JSON formatında
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- Etiketler
CREATE TABLE sync_log_tags (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sync_log_id BIGINT NOT NULL,
    tag NVARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (sync_log_id) REFERENCES sync_logs(id) ON DELETE CASCADE
);

-- ===============================================
-- DİNAMİK YETKİ YÖNETİMİ TABLOLARI
-- ===============================================

-- Yetki seviyeleri (Roller)
CREATE TABLE user_roles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    role_display_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    is_system_role BIT DEFAULT 0, -- Sistem rolleri (admin, user) silinemez
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- İzin anahtarları (Permissions)
CREATE TABLE permissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    permission_key NVARCHAR(100) NOT NULL UNIQUE,
    permission_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    category NVARCHAR(50), -- products, orders, users, reports, etc.
    is_system_permission BIT DEFAULT 0, -- Sistem izinleri silinemez
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Rol-İzin İlişkisi (Many-to-Many)
CREATE TABLE role_permissions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    granted BIT DEFAULT 1, -- İzin verildi mi?
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- ===============================================
-- USERS TABLOSUNU GÜNCELLEME
-- ===============================================

-- Önce users tablosuna role_id kolonu ekleyelim
ALTER TABLE users ADD role_id BIGINT;

-- Foreign key constraint ekleyelim
ALTER TABLE users ADD CONSTRAINT FK_users_role_id 
    FOREIGN KEY (role_id) REFERENCES user_roles(id);

-- ===============================================
-- SİSTEM ROLLERİ VE İZİNLERİNİ EKLEME
-- ===============================================

-- Sistem rollerini ekle
INSERT INTO user_roles (role_name, role_display_name, description, is_system_role, is_active) VALUES
('admin', 'Sistem Yöneticisi', 'Tüm sistem yetkilerine sahip kullanıcı', 1, 1),
('manager', 'Yönetici', 'Yönetim seviyesi yetkilerine sahip kullanıcı', 1, 1),
('user', 'Kullanıcı', 'Temel kullanıcı yetkileri', 1, 1),
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

-- Mevcut kullanıcıların rollerini güncelle (eski role field'ına göre)
UPDATE users SET role_id = (SELECT id FROM user_roles WHERE role_name = users.role);

-- role_id'yi NOT NULL yap ve eski role kolonunu kaldır
ALTER TABLE users ALTER COLUMN role_id BIGINT NOT NULL;
ALTER TABLE users DROP COLUMN role;

-- ===============================================
-- PERFORMANS İÇİN INDEX'LER
-- ===============================================

-- Users tablosu index'leri
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_role_id ON users(role_id);
CREATE INDEX IX_users_is_active ON users(is_active);
CREATE INDEX IX_users_created_at ON users(created_at);

-- Products tablosu index'leri
CREATE INDEX IX_products_user_id ON products(user_id);
CREATE INDEX IX_products_name ON products(name);
CREATE INDEX IX_products_status ON products(status);
CREATE INDEX IX_products_brand ON products(brand);
CREATE INDEX IX_products_created_at ON products(created_at);
CREATE INDEX IX_products_user_status ON products(user_id, status);

-- Product variants index'leri
CREATE INDEX IX_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IX_product_variants_sku ON product_variants(sku);
CREATE INDEX IX_product_variants_barcode ON product_variants(barcode);
CREATE INDEX IX_product_variants_is_active ON product_variants(is_active);

-- Product categories index'leri
CREATE INDEX IX_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IX_product_categories_name ON product_categories(name);

-- Product marketplace categories index'leri
CREATE INDEX IX_product_marketplace_categories_product_id ON product_marketplace_categories(product_id);
CREATE INDEX IX_product_marketplace_categories_marketplace ON product_marketplace_categories(marketplace);

-- Product tags index'leri
CREATE INDEX IX_product_tags_product_id ON product_tags(product_id);
CREATE INDEX IX_product_tags_tag ON product_tags(tag);

-- Product marketplace settings index'leri
CREATE INDEX IX_product_marketplace_settings_product_id ON product_marketplace_settings(product_id);
CREATE INDEX IX_product_marketplace_settings_marketplace ON product_marketplace_settings(marketplace);
CREATE INDEX IX_product_marketplace_settings_is_active ON product_marketplace_settings(is_active);

-- Orders tablosu index'leri
CREATE INDEX IX_orders_user_id ON orders(user_id);
CREATE INDEX IX_orders_order_number ON orders(order_number);
CREATE INDEX IX_orders_marketplace_order_id ON orders(marketplace_name, marketplace_order_id);
CREATE INDEX IX_orders_status ON orders(status);
CREATE INDEX IX_orders_payment_status ON orders(payment_status);
CREATE INDEX IX_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IX_orders_created_at ON orders(created_at);
CREATE INDEX IX_orders_user_status ON orders(user_id, status);

-- Order items index'leri
CREATE INDEX IX_order_items_order_id ON order_items(order_id);
CREATE INDEX IX_order_items_product_id ON order_items(product_id);
CREATE INDEX IX_order_items_variant_id ON order_items(variant_id);
CREATE INDEX IX_order_items_sku ON order_items(sku);

-- Order customers index'leri
CREATE INDEX IX_order_customers_order_id ON order_customers(order_id);
CREATE INDEX IX_order_customers_email ON order_customers(email);

-- Sync logs index'leri
CREATE INDEX IX_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IX_sync_logs_marketplace ON sync_logs(marketplace);
CREATE INDEX IX_sync_logs_operation ON sync_logs(operation);
CREATE INDEX IX_sync_logs_status ON sync_logs(status);
CREATE INDEX IX_sync_logs_entity ON sync_logs(entity, entity_id);
CREATE INDEX IX_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IX_sync_logs_user_marketplace ON sync_logs(user_id, marketplace);

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

-- ===============================================
-- VERİ TÜTÜNLÜLÜKLERİ VE KURAL TANIMLARI
-- ===============================================

-- Otomatik updated_at güncelleme trigger'ları

-- Users tablosu için trigger
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

-- Products tablosu için trigger
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

-- Product variants tablosu için trigger
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

-- Orders tablosu için trigger
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

-- User roles tablosu için trigger
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

-- Permissions tablosu için trigger
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

-- Role permissions tablosu için trigger
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
-- KULLANIŞLI VIEW'LER
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
    p.status,
    p.total_stock,
    p.total_sales,
    p.average_rating,
    p.review_count,
    pc.name as category_name,
    pi.stock_status,
    COUNT(pv.id) as variant_count,
    MAX(pms.last_sync_date) as last_marketplace_sync,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
LEFT JOIN product_inventory pi ON p.id = pi.product_id
LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
LEFT JOIN product_marketplace_settings pms ON p.id = pms.product_id AND pms.is_active = 1
WHERE p.is_active = 1
GROUP BY p.id, p.user_id, p.name, p.brand, p.base_price, p.currency, p.status, 
         p.total_stock, p.total_sales, p.average_rating, p.review_count,
         pc.name, pi.stock_status, p.created_at, p.updated_at;
GO

-- Sipariş özet görünümü  
CREATE VIEW vw_order_summary AS
SELECT 
    o.id,
    o.user_id,
    o.order_number,
    o.marketplace_name,
    o.marketplace_order_id,
    o.status,
    o.payment_status,
    o.fulfillment_status,
    o.total_amount,
    o.currency,
    oc.first_name + ' ' + oc.last_name as customer_name,
    oc.email as customer_email,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity,
    os.tracking_number,
    o.created_at,
    o.updated_at
FROM orders o
LEFT JOIN order_customers oc ON o.id = oc.order_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_shipping os ON o.id = os.order_id
WHERE o.is_active = 1
GROUP BY o.id, o.user_id, o.order_number, o.marketplace_name, o.marketplace_order_id,
         o.status, o.payment_status, o.fulfillment_status, o.total_amount, o.currency,
         oc.first_name, oc.last_name, oc.email, os.tracking_number, o.created_at, o.updated_at;
GO

-- Senkronizasyon durumu görünümü
CREATE VIEW vw_sync_status AS
SELECT 
    sl.user_id,
    sl.marketplace,
    sl.operation,
    sl.entity,
    COUNT(*) as total_operations,
    SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN sl.status = 'error' THEN 1 ELSE 0 END) as failed_operations,
    SUM(CASE WHEN sl.status = 'warning' THEN 1 ELSE 0 END) as warning_operations,
    AVG(sl.execution_time_ms) as avg_execution_time,
    MAX(sl.created_at) as last_operation_date
FROM sync_logs sl
WHERE sl.created_at >= DATEADD(day, -30, GETDATE()) -- Son 30 gün
GROUP BY sl.user_id, sl.marketplace, sl.operation, sl.entity;
GO

-- ===============================================
-- TEMİZLİK VE BAKIM İŞLEMLERİ
-- ===============================================

-- Eski sync log'ları temizleme prosedürü
CREATE PROCEDURE sp_cleanup_old_sync_logs
    @days_to_keep INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @cutoff_date DATETIME2 = DATEADD(day, -@days_to_keep, GETDATE());
    
    -- Sync log'ları ve bağlı verileri sil
    DELETE FROM sync_log_tags WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_marketplace_responses WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_metadata WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_warnings WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_errors WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_data WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_log_bulk_stats WHERE sync_log_id IN (
        SELECT id FROM sync_logs WHERE created_at < @cutoff_date
    );
    
    DELETE FROM sync_logs WHERE created_at < @cutoff_date;
    
    SELECT @@ROWCOUNT as deleted_records;
END;
GO

-- Stok durumu güncelleme prosedürü
CREATE PROCEDURE sp_update_stock_status
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Stok durumlarını güncelle
    UPDATE pi 
    SET stock_status = CASE 
        WHEN p.total_stock = 0 THEN 'out_of_stock'
        WHEN p.total_stock <= pi.low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END
    FROM product_inventory pi
    INNER JOIN products p ON pi.product_id = p.id
    WHERE pi.track_stock = 1;
    
    -- Toplam stok hesapla
    UPDATE p 
    SET total_stock = ISNULL(variant_stocks.total, 0)
    FROM products p
    LEFT JOIN (
        SELECT 
            product_id,
            SUM(stock) as total
        FROM product_variants 
        WHERE is_active = 1
        GROUP BY product_id
    ) variant_stocks ON p.id = variant_stocks.product_id;
    
END;
GO

-- ===============================================
-- İLK KURULUM VERİLERİ
-- ===============================================

-- Varsayılan admin kullanıcısı oluştur (şifre: admin123)
INSERT INTO users (name, email, password_hash, role_id, is_active) 
VALUES (
    'Sistem Yöneticisi', 
    'admin@eticaretara.com', 
    '$2a$12$LQv3c1yqBw.uuKzAiKKFaO0vkY.bCwqJFB5QgLgFp/FZfI2YQfQ.K', -- admin123 hash'i
    (SELECT id FROM user_roles WHERE role_name = 'admin'),
    1
);

-- Örnek kategoriler
INSERT INTO product_categories (product_id, name, path) VALUES
(0, 'Elektronik', 'Elektronik'),
(0, 'Giyim', 'Giyim'),
(0, 'Ev & Yaşam', 'Ev & Yaşam'),
(0, 'Spor & Outdoor', 'Spor & Outdoor'),
(0, 'Kozmetik', 'Kozmetik');

-- ===============================================
-- TAMAMLANDI
-- ===============================================

PRINT 'E-ticaret Ara Entegrasyon Sistemi MSSQL Schema başarıyla oluşturuldu!';
PRINT 'Toplam Tablo Sayısı: 50+';
PRINT 'Varsayılan Admin: admin@eticaretara.com / admin123';
PRINT 'Dinamik rol sistemi aktif - Yeni roller ve izinler eklenebilir.';
GO 