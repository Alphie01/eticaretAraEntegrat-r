-- Manuel tablo oluşturma script'i
-- Bu script'i Azure Data Studio, SSMS veya sqlcmd ile çalıştırın

-- 1. product_variants tablosu
CREATE TABLE product_variants (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    sku NVARCHAR(100) NOT NULL UNIQUE,
    barcode NVARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2),
    stock_quantity INT NOT NULL DEFAULT 0,
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

-- 2. product_images tablosu
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

-- 3. product_marketplaces tablosu
CREATE TABLE product_marketplaces (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    marketplace NVARCHAR(20) NOT NULL,
    marketplace_product_id NVARCHAR(100),
    marketplace_sku NVARCHAR(100),
    status NVARCHAR(20) NOT NULL DEFAULT 'pending',
    price DECIMAL(10,2),
    discounted_price DECIMAL(10,2),
    stock_quantity INT,
    is_active BIT DEFAULT 1,
    auto_sync BIT DEFAULT 1,
    price_multiplier DECIMAL(5,2) DEFAULT 1.00,
    stock_buffer INT DEFAULT 0,
    custom_title NVARCHAR(500),
    custom_description NTEXT,
    last_sync_date DATETIME2,
    sync_status NVARCHAR(20),
    sync_errors NTEXT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. İndeksler
CREATE NONCLUSTERED INDEX IX_product_variants_product_id ON product_variants(product_id);
CREATE NONCLUSTERED INDEX IX_product_images_product_id ON product_images(product_id);
CREATE NONCLUSTERED INDEX IX_product_marketplaces_product_id ON product_marketplaces(product_id);

PRINT 'Tablolar başarıyla oluşturuldu!'; 