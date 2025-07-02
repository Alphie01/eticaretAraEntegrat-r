import api from './api'

export const marketplaceService = {
  // Get all marketplaces status
  getMarketplaces: () => 
    api.get('/marketplace/status'),

  // Get marketplace statistics
  getMarketplaceStats: () => 
    api.get('/marketplace/stats'),

  // Sync specific marketplace
  syncMarketplace: (marketplaceId) => 
    api.post(`/marketplace/${marketplaceId}/sync`),

  // Get marketplace orders
  getOrders: (marketplaceId, params = {}) => 
    api.get(`/marketplace/${marketplaceId}/orders`, { params }),

  // Get marketplace products
  getProducts: (marketplaceId, params = {}) => 
    api.get(`/marketplace/${marketplaceId}/products`, { params }),

  // Update marketplace settings
  updateSettings: (marketplaceId, settings) => 
    api.put(`/marketplace/${marketplaceId}/settings`, settings),

  // Test marketplace connection
  testConnection: (marketplaceId) => 
    api.get(`/marketplace/${marketplaceId}/test`),

  // Specific marketplace services
  trendyol: {
    getOrders: (params) => api.get('/marketplace/trendyol/orders', { params }),
    getProducts: (params) => api.get('/marketplace/trendyol/products', { params }),
    sync: () => api.post('/marketplace/trendyol/sync'),
  },

  hepsiburada: {
    getOrders: (params) => api.get('/marketplace/hepsiburada/orders', { params }),
    getProducts: (params) => api.get('/marketplace/hepsiburada/products', { params }),
    sync: () => api.post('/marketplace/hepsiburada/sync'),
  },

  amazon: {
    getOrders: (params) => api.get('/marketplace/amazon/orders', { params }),
    getProducts: (params) => api.get('/marketplace/amazon/products', { params }),
    sync: () => api.post('/marketplace/amazon/sync'),
  },

  n11: {
    getOrders: (params) => api.get('/marketplace/n11/orders', { params }),
    getProducts: (params) => api.get('/marketplace/n11/products', { params }),
    sync: () => api.post('/marketplace/n11/sync'),
  },

  shopify: {
    getOrders: (params) => api.get('/marketplace/shopify/orders', { params }),
    getProducts: (params) => api.get('/marketplace/shopify/products', { params }),
    sync: () => api.post('/marketplace/shopify/sync'),
  },

  ciceksepeti: {
    getOrders: (params) => api.get('/marketplace/ciceksepeti/orders', { params }),
    getProducts: (params) => api.get('/marketplace/ciceksepeti/products', { params }),
    sync: () => api.post('/marketplace/ciceksepeti/sync'),
  },

  pazarama: {
    getOrders: (params) => api.get('/marketplace/pazarama/orders', { params }),
    getProducts: (params) => api.get('/marketplace/pazarama/products', { params }),
    sync: () => api.post('/marketplace/pazarama/sync'),
  },

  pttavm: {
    getOrders: (params) => api.get('/marketplace/pttavm/orders', { params }),
    getProducts: (params) => api.get('/marketplace/pttavm/products', { params }),
    sync: () => api.post('/marketplace/pttavm/sync'),
  },
}

export default marketplaceService 