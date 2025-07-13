-- ===============================================
-- last_updated_by kolonlarını ekleme scripti
-- ===============================================

USE EticaretAraEntegrator;
GO

-- Products tablosuna last_updated_by kolonu ekle
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('products') AND name = 'last_updated_by')
BEGIN
    ALTER TABLE products ADD last_updated_by NVARCHAR(100);
    PRINT 'last_updated_by kolonu products tablosuna eklendi';
END
ELSE
BEGIN
    PRINT 'last_updated_by kolonu products tablosunda zaten mevcut';
END
GO

-- Orders tablosuna last_updated_by kolonu ekle
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'last_updated_by')
BEGIN
    ALTER TABLE orders ADD last_updated_by NVARCHAR(100);
    PRINT 'last_updated_by kolonu orders tablosuna eklendi';
END
ELSE
BEGIN
    PRINT 'last_updated_by kolonu orders tablosunda zaten mevcut';
END
GO

-- Product variants tablosuna da ekleyelim (gelecekte kullanılabilir)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('product_variants') AND name = 'last_updated_by')
BEGIN
    ALTER TABLE product_variants ADD last_updated_by NVARCHAR(100);
    PRINT 'last_updated_by kolonu product_variants tablosuna eklendi';
END
ELSE
BEGIN
    PRINT 'last_updated_by kolonu product_variants tablosunda zaten mevcut';
END
GO

-- Sync logs tablosuna da ekleyelim
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sync_logs') AND name = 'last_updated_by')
BEGIN
    ALTER TABLE sync_logs ADD last_updated_by NVARCHAR(100);
    PRINT 'last_updated_by kolonu sync_logs tablosuna eklendi';
END
ELSE
BEGIN
    PRINT 'last_updated_by kolonu sync_logs tablosunda zaten mevcut';
END
GO

PRINT 'Database güncelleme tamamlandı!'; 