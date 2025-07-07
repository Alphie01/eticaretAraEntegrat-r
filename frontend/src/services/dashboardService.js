import api from './api'

export const dashboardService = {
  // Get dashboard statistics
  async getStats() {
    try {
      const response = await api.get('/reports/dashboard-stats');
      return response.data || { success: false, result: null };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // Return fallback data structure instead of throwing
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Dashboard stats failed',
        result: {
          totalOrders: 0,
          orderGrowth: 0,
          totalProducts: 0,
          productGrowth: 0,
          totalMarketplaces: 8,
          marketplaceGrowth: 0,
          totalShipments: 0,
          shipmentGrowth: 0,
          totalRevenue: 0,
          revenueGrowth: 0
        }
      };
    }
  },

  // Get recent orders
  async getRecentOrders(limit = 10) {
    try {
      const response = await api.get(`/reports/recent-orders?limit=${limit}`);
      return response.data || { success: false, result: [] };
    } catch (error) {
      console.error('Recent orders error:', error);
      // Return fallback data structure instead of throwing
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Recent orders failed',
        result: []
      };
    }
  },

  // Get system health
  async getSystemHealth() {
    try {
      const response = await api.get('/health');
      return response.data || { success: false };
    } catch (error) {
      console.warn('System health error:', error);
      // Don't fail dashboard for health check issues
      return {
        success: false,
        error: error.response?.data?.message || 'Health check failed',
        status: 'Service Unavailable'
      };
    }
  },

  // Get sales trends
  async getSalesTrends(period = '7d') {
    try {
      const response = await api.get(`/reports/sales-trends?period=${period}`);
      return response.data || { success: false, result: [] };
    } catch (error) {
      console.error('Sales trends error:', error);
      // Return fallback data structure instead of throwing
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Sales trends failed',
        result: []
      };
    }
  },

  // Get marketplace performance
  async getMarketplacePerformance() {
    try {
      const response = await api.get('/reports/marketplace-performance');
      return response.data || { success: false, result: [] };
    } catch (error) {
      console.error('Marketplace performance error:', error);
      // Return fallback data structure instead of throwing
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Marketplace performance failed',
        result: []
      };
    }
  },

  // Get cargo performance
  async getCargoPerformance() {
    try {
      const response = await api.get('/reports/cargo-performance');
      return response.data || { success: false };
    } catch (error) {
      console.warn('Cargo performance error:', error);
      // Don't fail dashboard for cargo issues
      return {
        success: false,
        error: error.response?.data?.message || 'Cargo performance failed'
      };
    }
  },

  // Get notifications
  async getNotifications() {
    try {
      const response = await api.get('/notifications');
      return response.data || { success: false, result: [] };
    } catch (error) {
      console.warn('Notifications error:', error);
      // Don't fail dashboard for notification issues
      return {
        success: false,
        error: error.response?.data?.message || 'Notifications failed',
        result: []
      };
    }
  },

  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data || { success: false };
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  },
}

export default dashboardService 