-- Update marketplace CHECK constraints to include all supported marketplaces
-- This fixes the "Validation isIn on marketplace failed" error

-- Drop existing CHECK constraints
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_NAME LIKE '%marketplace%')
BEGIN
    DECLARE @sql NVARCHAR(MAX) = '';
    SELECT @sql = @sql + 'ALTER TABLE ' + TABLE_NAME + ' DROP CONSTRAINT ' + CONSTRAINT_NAME + '; '
    FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
    WHERE CONSTRAINT_NAME LIKE '%marketplace%';
    EXEC(@sql);
END

-- Add updated CHECK constraints with all supported marketplaces
ALTER TABLE user_marketplace_accounts 
ADD CONSTRAINT CK_user_marketplace_accounts_marketplace 
CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));

-- Also update any other tables that might have marketplace constraints
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'user_marketplace_credentials')
BEGIN
    -- Check if there's a marketplace column in credentials table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_marketplace_credentials' AND COLUMN_NAME = 'marketplace')
    BEGIN
        ALTER TABLE user_marketplace_credentials 
        ADD CONSTRAINT CK_user_marketplace_credentials_marketplace 
        CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));
    END
END

-- Update orders table marketplace constraint if it exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'orders')
BEGIN
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'marketplace')
    BEGIN
        ALTER TABLE orders 
        ADD CONSTRAINT CK_orders_marketplace 
        CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));
    END
END

-- Update product_marketplaces table constraint if it exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'product_marketplaces')
BEGIN
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'product_marketplaces' AND COLUMN_NAME = 'marketplace')
    BEGIN
        ALTER TABLE product_marketplaces 
        ADD CONSTRAINT CK_product_marketplaces_marketplace 
        CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));
    END
END

-- Update sync_logs table constraint if it exists  
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sync_logs')
BEGIN
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sync_logs' AND COLUMN_NAME = 'marketplace')
    BEGIN
        ALTER TABLE sync_logs 
        ADD CONSTRAINT CK_sync_logs_marketplace 
        CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));
    END
END

PRINT 'Marketplace CHECK constraints updated successfully to include all supported marketplaces';
