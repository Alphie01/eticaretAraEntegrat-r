-- Add OAuth columns to users table
-- This script adds OAuth authentication support to existing users table

USE EticaretAraEntegrator;

-- Check if columns don't already exist before adding them
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id')
BEGIN
    ALTER TABLE users ADD google_id NVARCHAR(255) NULL;
    CREATE UNIQUE INDEX IX_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'facebook_id')
BEGIN
    ALTER TABLE users ADD facebook_id NVARCHAR(255) NULL;
    CREATE UNIQUE INDEX IX_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'apple_id')
BEGIN
    ALTER TABLE users ADD apple_id NVARCHAR(255) NULL;
    CREATE UNIQUE INDEX IX_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url')
BEGIN
    ALTER TABLE users ADD avatar_url NTEXT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified')
BEGIN
    ALTER TABLE users ADD email_verified BIT NOT NULL DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_provider')
BEGIN
    ALTER TABLE users ADD oauth_provider NVARCHAR(20) NOT NULL DEFAULT 'local';
    ALTER TABLE users ADD CONSTRAINT CK_users_oauth_provider CHECK (oauth_provider IN ('local', 'google', 'facebook', 'apple'));
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_access_token')
BEGIN
    ALTER TABLE users ADD oauth_access_token NTEXT NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'oauth_refresh_token')
BEGIN
    ALTER TABLE users ADD oauth_refresh_token NTEXT NULL;
END

-- Make password_hash nullable for OAuth users
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash' AND IS_NULLABLE = 'NO')
BEGIN
    ALTER TABLE users ALTER COLUMN password_hash NVARCHAR(255) NULL;
END

-- Update existing users to have 'local' oauth_provider
UPDATE users SET oauth_provider = 'local' WHERE oauth_provider IS NULL;

PRINT 'OAuth columns added successfully to users table'; 