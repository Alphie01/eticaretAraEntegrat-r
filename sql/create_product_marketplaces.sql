-- product_marketplaces tablosunu oluştur
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

-- Index oluştur
CREATE NONCLUSTERED INDEX IX_product_marketplaces_product_id ON product_marketplaces(product_id);
CREATE NONCLUSTERED INDEX IX_product_marketplaces_marketplace ON product_marketplaces(marketplace);

PRINT 'product_marketplaces tablosu oluşturuldu!'; 