// Script to seed marketplace configurations from frontend constants
const { connectDB } = require('../src/config/database');
const { MarketplaceConfiguration, MarketplaceCredentialField } = require('../src/models/MarketplaceConfiguration');
const logger = require('../src/utils/logger');

// Frontend marketplace configurations
const MARKETPLACE_CONFIGS = {
  trendyol: {
    name: "Trendyol",
    logo: "🛒",
    color: "#f27a1a",
    description: "Türkiye'nin en büyük e-ticaret platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "supplierId", label: "Supplier ID", type: "text", required: true },
    ],
  },
  hepsiburada: {
    name: "Hepsiburada",
    logo: "🏪",
    color: "#ff6000",
    description: "Teknoloji ve genel ürün kategorileri (API bilgileri sistem yöneticisi tarafından yapılandırılır)",
    credentials: [
      { key: "merchantId", label: "Merchant ID", type: "text", required: true },
    ],
  },
  amazon: {
    name: "Amazon",
    logo: "📦",
    color: "#ff9900",
    description: "Uluslararası e-ticaret platformu",
    credentials: [
      { key: "accessKeyId", label: "Access Key ID", type: "text", required: true },
      { key: "secretAccessKey", label: "Secret Access Key", type: "password", required: true },
      { key: "merchantId", label: "Merchant ID", type: "text", required: false },
    ],
  },
  n11: {
    name: "N11",
    logo: "🛍️",
    color: "#f5a623",
    description: "Çok kategorili alışveriş sitesi",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
    ],
  },
  shopify: {
    name: "Shopify",
    logo: "🏬",
    color: "#95bf47",
    description: "Kendi mağazanız için e-ticaret platform",
    credentials: [
      { key: "shopDomain", label: "Shop Domain", type: "text", required: true },
      { key: "accessToken", label: "Access Token", type: "password", required: true },
    ],
  },
  ciceksepeti: {
    name: "ÇiçekSepeti",
    logo: "🌸",
    color: "#e91e63",
    description: "Çiçek ve hediye platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
  pazarama: {
    name: "Pazarama",
    logo: "🛒",
    color: "#2196f3",
    description: "Pazaryeri platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
  pttavm: {
    name: "PTT AVM",
    logo: "📮",
    color: "#ffeb3b",
    description: "PTT'nin e-ticaret platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
  gittigidiyor: {
    name: "GittiGidiyor",
    logo: "🏪",
    color: "#4caf50",
    description: "GittiGidiyor pazaryeri platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", required: true },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
};

const SUPPORTED_MARKETPLACES = [
  'trendyol',
  'hepsiburada',
  'amazon',
  'n11',
  'shopify',
  'ciceksepeti',
  'pazarama',
  'pttavm',
  'gittigidiyor'
];

async function seedMarketplaceConfigurations() {
  try {
    console.log('🌱 Starting marketplace configurations seeding...');
    
    // Connect to database
    await connectDB();
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (let i = 0; i < SUPPORTED_MARKETPLACES.length; i++) {
      const marketplaceId = SUPPORTED_MARKETPLACES[i];
      const config = MARKETPLACE_CONFIGS[marketplaceId];
      
      if (!config) {
        console.log(`⚠️ No configuration found for ${marketplaceId}, skipping...`);
        continue;
      }
      
      console.log(`\n🔧 Processing ${marketplaceId}...`);
      
      // Check if marketplace configuration already exists
      let marketplaceConfig = await MarketplaceConfiguration.findOne({
        where: { marketplace_id: marketplaceId }
      });
      
      if (marketplaceConfig) {
        // Update existing configuration
        await marketplaceConfig.update({
          name: config.name,
          logo: config.logo,
          color: config.color,
          description: config.description,
          sort_order: i
        });
        console.log(`✅ Updated marketplace configuration for ${marketplaceId}`);
        updatedCount++;
      } else {
        // Create new configuration
        marketplaceConfig = await MarketplaceConfiguration.create({
          marketplace_id: marketplaceId,
          name: config.name,
          logo: config.logo,
          color: config.color,
          description: config.description,
          sort_order: i,
          is_active: true
        });
        console.log(`✅ Created marketplace configuration for ${marketplaceId}`);
        createdCount++;
      }
      
      // Clear existing credential fields for this marketplace
      await MarketplaceCredentialField.destroy({
        where: { marketplace_id: marketplaceId }
      });
      
      // Create credential fields
      for (let j = 0; j < config.credentials.length; j++) {
        const credential = config.credentials[j];
        
        await MarketplaceCredentialField.create({
          marketplace_id: marketplaceId,
          field_key: credential.key,
          field_label: credential.label,
          field_type: credential.type,
          is_required: credential.required,
          sort_order: j
        });
      }
      
      console.log(`✅ Created ${config.credentials.length} credential fields for ${marketplaceId}`);
    }
    
    console.log(`\n🎉 Marketplace configurations seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${createdCount} marketplace configurations`);
    console.log(`   - Updated: ${updatedCount} marketplace configurations`);
    console.log(`   - Total processed: ${SUPPORTED_MARKETPLACES.length} marketplaces`);
    
  } catch (error) {
    console.error('❌ Error seeding marketplace configurations:', error);
    throw error;
  }
}

// Run the seeding
if (require.main === module) {
  seedMarketplaceConfigurations()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedMarketplaceConfigurations };
