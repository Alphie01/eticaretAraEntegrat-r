import api from './api'

export const dashboardService = {
  // Get dashboard statistics
  async getStats() {
    try {
      // Test endpoint kullan (auth gerekmez)
      const response = await api.get('/reports/test/dashboard-stats');
      return response.data;
    } catch (error) {
      console.error('Dashboard stats error:', error);
      throw error;
    }
  },

  // Get recent orders
  async getRecentOrders(limit = 10) {
    try {
      // Test endpoint kullan
      const response = await api.get(`/orders/test/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Recent orders error:', error);
      throw error;
    }
  },

  // Get system health
  getSystemHealth: () => 
    api.get('/health'),

  // Get sales trends
  async getSalesTrends(period = '7d') {
    try {
      // Test endpoint kullan
      const response = await api.get(`/reports/test/sales-trends?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Sales trends error:', error);
      throw error;
    }
  },

  // Get marketplace performance
  async getMarketplacePerformance() {
    try {
      // Test endpoint kullan
      const response = await api.get('/reports/test/marketplace-performance');
      return response.data;
    } catch (error) {
      console.error('Marketplace performance error:', error);
      throw error;
    }
  },

  // Get cargo performance
  getCargoPerformance: () => 
    api.get('/reports/cargo-performance'),

  // Get notifications
  getNotifications: () => 
    api.get('/notifications'),

  // Mark notification as read
  markNotificationRead: (notificationId) => 
    api.patch(`/notifications/${notificationId}/read`),
}

export default dashboardService 