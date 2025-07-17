/**
 * Frontend marketplace constants - synchronized with backend
 * These should match the backend constants exactly
 */

export const SUPPORTED_MARKETPLACES = [
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

export const MARKETPLACE_DISPLAY_NAMES = {
  'trendyol': 'Trendyol',
  'hepsiburada': 'Hepsiburada',
  'amazon': 'Amazon',
  'n11': 'N11',
  'shopify': 'Shopify',
  'ciceksepeti': 'ÇiçekSepeti',
  'pazarama': 'Pazarama',
  'pttavm': 'PTT AVM',
  'gittigidiyor': 'GittiGidiyor'
};

export const MARKETPLACE_CONFIGS = {
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

// Convert configs to array format for backwards compatibility
export const supportedMarketplaces = SUPPORTED_MARKETPLACES.map(id => ({
  id,
  ...MARKETPLACE_CONFIGS[id]
}));

// Helper functions
export const isValidMarketplace = (marketplace) => {
  return SUPPORTED_MARKETPLACES.includes(marketplace);
};

export const getMarketplaceDisplayName = (marketplace) => {
  return MARKETPLACE_DISPLAY_NAMES[marketplace] || marketplace;
};

export const getMarketplaceConfig = (marketplace) => {
  return MARKETPLACE_CONFIGS[marketplace];
};
