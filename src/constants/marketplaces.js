/**
 * Desteklenen marketplace'lerin merkezi listesi
 * Bu dosya tüm modeller, validasyonlar ve business logic'te kullanılır
 */

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

const MARKETPLACE_DISPLAY_NAMES = {
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

const MARKETPLACE_COLORS = {
  'trendyol': '#f27a1a',
  'hepsiburada': '#ff6000', 
  'amazon': '#ff9900',
  'n11': '#f5a623',
  'shopify': '#95bf47',
  'ciceksepeti': '#e91e63',
  'pazarama': '#2196f3',
  'pttavm': '#ffeb3b',
  'gittigidiyor': '#9c27b0'
};

const MARKETPLACE_LOGOS = {
  'trendyol': '🛒',
  'hepsiburada': '🏪',
  'amazon': '📦',
  'n11': '🛍️',
  'shopify': '🏬',
  'ciceksepeti': '🌸',
  'pazarama': '🛒',
  'pttavm': '📮',
  'gittigidiyor': '🛍️'
};

const MARKETPLACE_DESCRIPTIONS = {
  'trendyol': 'Türkiye\'nin en büyük e-ticaret platformu',
  'hepsiburada': 'Teknoloji ve genel ürün kategorileri',
  'amazon': 'Uluslararası e-ticaret platformu',
  'n11': 'Çok kategorili alışveriş sitesi',
  'shopify': 'Kendi mağazanız için e-ticaret platform',
  'ciceksepeti': 'Çiçek ve hediye platformu',
  'pazarama': 'Pazaryeri platformu',
  'pttavm': 'PTT\'nin e-ticaret platformu',
  'gittigidiyor': 'Çok kategorili alışveriş platformu'
};

// Order marketplace'lerde website de olabilir
const ORDER_MARKETPLACES = [...SUPPORTED_MARKETPLACES, 'website'];

/**
 * Marketplace'in desteklenip desteklenmediğini kontrol eder
 * @param {string} marketplace 
 * @returns {boolean}
 */
function isMarketplaceSupported(marketplace) {
  return SUPPORTED_MARKETPLACES.includes(marketplace);
}

/**
 * Marketplace için display name döndürür
 * @param {string} marketplace 
 * @returns {string}
 */
function getMarketplaceDisplayName(marketplace) {
  return MARKETPLACE_DISPLAY_NAMES[marketplace] || marketplace;
}

/**
 * Marketplace için renk döndürür
 * @param {string} marketplace 
 * @returns {string}
 */
function getMarketplaceColor(marketplace) {
  return MARKETPLACE_COLORS[marketplace] || '#666666';
}

/**
 * Marketplace için logo döndürür
 * @param {string} marketplace 
 * @returns {string}
 */
function getMarketplaceLogo(marketplace) {
  return MARKETPLACE_LOGOS[marketplace] || '🏪';
}

/**
 * Marketplace için açıklama döndürür
 * @param {string} marketplace 
 * @returns {string}
 */
function getMarketplaceDescription(marketplace) {
  return MARKETPLACE_DESCRIPTIONS[marketplace] || 'E-ticaret platformu';
}

/**
 * API için desteklenen marketplace'lerin bilgilerini döndürür
 * @returns {Array}
 */
function getSupportedMarketplacesInfo() {
  const marketplaceInfoMap = {
    'trendyol': {
      name: 'trendyol',
      display_name: 'Trendyol',
      required_fields: ['api_key', 'api_secret', 'supplier_id'],
      documentation_url: 'https://developers.trendyol.com/',
    },
    'hepsiburada': {
      name: 'hepsiburada',
      display_name: 'Hepsiburada',
      required_fields: ['api_key'],
      documentation_url: 'https://developer.hepsiburada.com/',
    },
    'amazon': {
      name: 'amazon',
      display_name: 'Amazon',
      required_fields: ['api_key', 'api_secret'],
      documentation_url: 'https://developer.amazonservices.com/',
    },
    'n11': {
      name: 'n11',
      display_name: 'N11',
      required_fields: ['api_key', 'api_secret'],
      documentation_url: 'https://www.n11.com/api/',
    },
    'shopify': {
      name: 'shopify',
      display_name: 'Shopify',
      required_fields: ['shop_domain', 'access_token'],
      documentation_url: 'https://shopify.dev/',
    },
    'ciceksepeti': {
      name: 'ciceksepeti',
      display_name: 'ÇiçekSepeti',
      required_fields: ['api_key', 'seller_id'],
      documentation_url: 'https://developers.ciceksepeti.com/',
    },
    'pazarama': {
      name: 'pazarama',
      display_name: 'Pazarama',
      required_fields: ['api_key', 'api_secret', 'seller_id'],
      documentation_url: 'https://pazarama.com/',
    },
    'pttavm': {
      name: 'pttavm',
      display_name: 'PTT AVM',
      required_fields: ['api_key', 'api_secret', 'seller_id'],
      documentation_url: 'https://pttavm.com/',
    },
    'gittigidiyor': {
      name: 'gittigidiyor',
      display_name: 'GittiGidiyor',
      required_fields: ['api_key', 'api_secret', 'seller_id'],
      documentation_url: 'https://gittigidiyor.com/',
    }
  };

  return SUPPORTED_MARKETPLACES.map(marketplace => marketplaceInfoMap[marketplace]).filter(Boolean);
}

module.exports = {
  SUPPORTED_MARKETPLACES,
  ORDER_MARKETPLACES,
  MARKETPLACE_DISPLAY_NAMES,
  MARKETPLACE_COLORS,
  MARKETPLACE_LOGOS,
  MARKETPLACE_DESCRIPTIONS,
  isMarketplaceSupported,
  getMarketplaceDisplayName,
  getMarketplaceColor,
  getMarketplaceLogo,
  getMarketplaceDescription,
  getSupportedMarketplacesInfo
};
