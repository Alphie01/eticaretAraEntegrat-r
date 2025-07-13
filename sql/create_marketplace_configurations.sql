-- Create marketplace configurations table
CREATE TABLE marketplace_configurations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_id NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    logo NVARCHAR(10),
    color NVARCHAR(20),
    description NVARCHAR(500),
    is_active BIT DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Create marketplace credential fields table
CREATE TABLE marketplace_credential_fields (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    marketplace_id NVARCHAR(50) NOT NULL,
    field_key NVARCHAR(50) NOT NULL,
    field_label NVARCHAR(100) NOT NULL,
    field_type NVARCHAR(20) NOT NULL DEFAULT 'text',
    is_required BIT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (marketplace_id) REFERENCES marketplace_configurations(marketplace_id)
);

-- Create index for better performance
CREATE INDEX IX_marketplace_credential_fields_marketplace_id 
ON marketplace_credential_fields(marketplace_id);

-- Create index for marketplace_id
CREATE INDEX IX_marketplace_configurations_marketplace_id 
ON marketplace_configurations(marketplace_id);
