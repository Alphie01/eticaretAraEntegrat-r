-- Simple marketplace constraint update
-- First, drop the existing constraint
ALTER TABLE user_marketplace_accounts DROP CONSTRAINT CK__user_mark__marke__4F47C5E3;

-- Add the new constraint with all supported marketplaces
ALTER TABLE user_marketplace_accounts 
ADD CONSTRAINT CK_user_marketplace_accounts_marketplace 
CHECK (marketplace IN ('trendyol', 'hepsiburada', 'amazon', 'n11', 'shopify', 'ciceksepeti', 'pazarama', 'pttavm', 'gittigidiyor'));
