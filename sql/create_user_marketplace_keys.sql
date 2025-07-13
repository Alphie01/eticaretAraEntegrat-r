-- user_marketplace_keys tablosunu oluştur
-- Kullanıcıların marketplace API key'lerini şifreleyerek saklamak için

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_marketplace_keys' AND xtype='U')
BEGIN
    CREATE TABLE user_marketplace_keys (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        marketplace NVARCHAR(50) NOT NULL,
        encrypted_api_key NTEXT NOT NULL,
        encrypted_api_secret NTEXT NULL,
        encrypted_supplier_id NTEXT NULL,
        key_name NVARCHAR(100) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        last_used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Foreign key constraint
        CONSTRAINT FK_user_marketplace_keys_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        -- Unique constraint - her kullanıcının her marketplace için sadece bir key'i olabilir
        CONSTRAINT UQ_user_marketplace_keys_user_marketplace 
            UNIQUE (user_id, marketplace),
        
        -- Check constraint - marketplace değerleri
        CONSTRAINT CK_user_marketplace_keys_marketplace 
            CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'gittigidiyor'))
    );
    
    PRINT 'user_marketplace_keys tablosu oluşturuldu.';
END
ELSE
BEGIN
    PRINT 'user_marketplace_keys tablosu zaten mevcut.';
END

-- Index'leri oluştur
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_user_id')
BEGIN
    CREATE INDEX IX_user_marketplace_keys_user_id 
    ON user_marketplace_keys (user_id);
    PRINT 'IX_user_marketplace_keys_user_id index oluşturuldu.';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_marketplace')
BEGIN
    CREATE INDEX IX_user_marketplace_keys_marketplace 
    ON user_marketplace_keys (marketplace);
    PRINT 'IX_user_marketplace_keys_marketplace index oluşturuldu.';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_user_marketplace_keys_is_active')
BEGIN
    CREATE INDEX IX_user_marketplace_keys_is_active 
    ON user_marketplace_keys (is_active);
    PRINT 'IX_user_marketplace_keys_is_active index oluşturuldu.';
END

-- Update trigger oluştur
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_user_marketplace_keys_updated_at')
BEGIN
    EXEC('
    CREATE TRIGGER TR_user_marketplace_keys_updated_at
    ON user_marketplace_keys
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE user_marketplace_keys 
        SET updated_at = GETDATE()
        FROM user_marketplace_keys umk
        INNER JOIN inserted i ON umk.id = i.id;
    END
    ');
    PRINT 'TR_user_marketplace_keys_updated_at trigger oluşturuldu.';
END

PRINT 'user_marketplace_keys tablo kurulumu tamamlandı!'; 