-- Add missing updated_at column to marketplace_credential_fields table
ALTER TABLE marketplace_credential_fields 
ADD updated_at DATETIME2 DEFAULT GETDATE();
