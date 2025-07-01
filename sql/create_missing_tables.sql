-- Bu script eksik olan product tablolarını oluşturur
-- Çalıştırmadan önce database'e bağlandığınızdan emin olun

USE EticaretAraEntegrator;
GO

-- 1. Ürün varyantları tablosu
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'product_variants')
BEGIN
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
    PRINT 'product_variants tablosu oluşturuldu.';
END
ELSE
BEGIN
    PRINT 'product_variants tablosu zaten mevcut.';
END
GO

-- 2. Ürün görselleri tablosu
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'product_images')
BEGIN
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
    PRINT 'product_images tablosu oluşturuldu.';
END
ELSE
BEGIN
    PRINT 'product_images tablosu zaten mevcut.';
END
GO

-- 3. Pazaryeri ürün listeleri tablosu
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'product_marketplaces')
BEGIN
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
    PRINT 'product_marketplaces tablosu oluşturuldu.';
END
ELSE
BEGIN
    PRINT 'product_marketplaces tablosu zaten mevcut.';
END
GO

-- 4. İndeksler oluştur
CREATE NONCLUSTERED INDEX IX_product_variants_product_id ON product_variants(product_id);
CREATE NONCLUSTERED INDEX IX_product_variants_sku ON product_variants(sku);
CREATE NONCLUSTERED INDEX IX_product_images_product_id ON product_images(product_id);
CREATE NONCLUSTERED INDEX IX_product_marketplaces_product_id ON product_marketplaces(product_id);
CREATE NONCLUSTERED INDEX IX_product_marketplaces_marketplace ON product_marketplaces(marketplace);

PRINT 'Tüm eksik tablolar ve indeksler başarıyla oluşturuldu!'; 