import { useQuery, useMutation, useQueryClient } from 'react-query'
import dashboardService from '../services/dashboardService'
import marketplaceService from '../services/marketplaceService'
import cargoService from '../services/cargoService'
import toast from 'react-hot-toast'

// Get dashboard statistics
export const useDashboardStats = () => {
  return useQuery(
    ['dashboard', 'stats'],
    () => dashboardService.getStats(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: (data, query) => {
        // Stop refetching if there are errors
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 60 * 1000 // 1 minute
      },
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false
        }
        return true
      },
      onError: (error) => {
        console.error('Dashboard stats error:', error)
        toast.error('Dashboard istatistikleri alınamadı', { id: 'dashboard-stats-error' })
      }
    }
  )
}

// Get recent orders
export const useRecentOrders = (limit = 10) => {
  return useQuery(
    ['dashboard', 'recentOrders', limit],
    () => dashboardService.getRecentOrders(limit),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: (data, query) => {
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 60 * 1000 // Increased to 1 minute
      },
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false
        }
        return true
      },
      onError: (error) => {
        console.error('Recent orders error:', error)
        toast.error('Son siparişler alınamadı', { id: 'recent-orders-error' })
      }
    }
  )
}

// Get system health
export const useSystemHealth = () => {
  return useQuery(
    ['dashboard', 'health'],
    () => dashboardService.getSystemHealth(),
    {
      staleTime: 5 * 60 * 1000, // Increased to 5 minutes
      refetchInterval: (data, query) => {
        // Stop refetching if there are errors (like 404)
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 2 * 60 * 1000 // Increased to 2 minutes
      },
      retry: (failureCount, error) => {
        // Don't retry if it's a 404 error (endpoint doesn't exist)
        if (error?.response?.status === 404) {
          return false
        }
        if (failureCount >= 1) {
          return false
        }
        return true
      },
      onError: (error) => {
        // Only log 404 errors, don't show toast for missing health endpoint
        if (error?.response?.status === 404) {
          console.warn('Health endpoint not available (404)')
        } else {
          console.error('System health error:', error)
        }
      }
    }
  )
}

// Get sales trends
export const useSalesTrends = (period = '7d') => {
  return useQuery(
    ['dashboard', 'salesTrends', period],
    () => dashboardService.getSalesTrends(period),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false
        }
        return true
      },
      onError: (error) => {
        console.error('Sales trends error:', error)
        toast.error('Satış trendleri alınamadı', { id: 'sales-trends-error' })
      }
    }
  )
}

// Get marketplace performance
export const useMarketplacePerformance = () => {
  return useQuery(
    ['dashboard', 'marketplacePerformance'],
    () => dashboardService.getMarketplacePerformance(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: (data, query) => {
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 5 * 60 * 1000 // Increased to 5 minutes
      },
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false
        }
        return true
      },
      onError: (error) => {
        console.error('Marketplace performance error:', error)
        toast.error('Pazaryeri performansı alınamadı', { id: 'marketplace-performance-error' })
      }
    }
  )
}

// Get cargo performance
export const useCargoPerformance = () => {
  return useQuery(
    ['dashboard', 'cargoPerformance'],
    () => dashboardService.getCargoPerformance(),
    {
      staleTime: 10 * 60 * 1000, // Increased to 10 minutes
      refetchInterval: (data, query) => {
        // Stop refetching if there are errors (auth issues)
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 10 * 60 * 1000 // Increased to 10 minutes
      },
      retry: (failureCount, error) => {
        // Don't retry cargo performance if auth fails
        if (error?.response?.status === 401) {
          return false
        }
        if (failureCount >= 1) {
          return false
        }
        return true
      },
      onError: (error) => {
        // Don't show toast for auth errors, just log
        if (error?.response?.status === 401) {
          console.warn('Cargo performance endpoint requires authentication')
        } else {
          console.error('Cargo performance error:', error)
          toast.error('Kargo performansı alınamadı', { id: 'cargo-performance-error' })
        }
      }
    }
  )
}

// Get notifications
export const useNotifications = () => {
  return useQuery(
    ['dashboard', 'notifications'],
    () => dashboardService.getNotifications(),
    {
      staleTime: 5 * 60 * 1000, // Increased to 5 minutes
      refetchInterval: (data, query) => {
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        return 2 * 60 * 1000 // Increased to 2 minutes
      },
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) {
          return false
        }
        if (failureCount >= 1) {
          return false
        }
        return true
      },
      onError: (error) => {
        if (error?.response?.status === 401) {
          console.warn('Notifications endpoint requires authentication')
        } else {
          console.error('Notifications error:', error)
        }
      }
    }
  )
}

// Mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (notificationId) => dashboardService.markNotificationRead(notificationId),
    {
      onSuccess: () => {
        // Invalidate notifications query
        queryClient.invalidateQueries(['dashboard', 'notifications'])
      },
      onError: (error) => {
        console.error('Mark notification read error:', error)
        toast.error('Bildirim işaretlenemedi')
      }
    }
  )
}

// Get combined dashboard data
export const useDashboardData = () => {
  const stats = useDashboardStats()
  const recentOrders = useRecentOrders(4)
  const health = useSystemHealth()
  const salesTrends = useSalesTrends()
  const marketplacePerformance = useMarketplacePerformance()
  const cargoPerformance = useCargoPerformance()

  return {
    stats,
    recentOrders,
    health,
    salesTrends,
    marketplacePerformance,
    cargoPerformance,
    isLoading: stats.isLoading || recentOrders.isLoading || health.isLoading,
    isError: stats.isError || recentOrders.isError || health.isError,
    refetchAll: () => {
      stats.refetch()
      recentOrders.refetch()
      health.refetch()
      salesTrends.refetch()
      marketplacePerformance.refetch()
      cargoPerformance.refetch()
    }
  }
} 