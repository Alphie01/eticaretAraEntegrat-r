import { useQuery, useMutation, useQueryClient } from 'react-query'
import marketplaceService from '../services/marketplaceService'
import toast from 'react-hot-toast'

// Get all marketplaces status
export const useMarketplaces = () => {
  return useQuery(
    ['marketplaces'],
    () => marketplaceService.getMarketplaces(),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 60 * 1000, // 1 minute
      onError: (error) => {
        console.error('Marketplaces error:', error)
        toast.error('Pazaryeri bilgileri alınamadı')
      }
    }
  )
}

// Get marketplace statistics
export const useMarketplaceStats = () => {
  return useQuery(
    ['marketplaces', 'stats'],
    () => marketplaceService.getMarketplaceStats(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 2 * 60 * 1000, // 2 minutes
      onError: (error) => {
        console.error('Marketplace stats error:', error)
        toast.error('Pazaryeri istatistikleri alınamadı')
      }
    }
  )
}

// Sync marketplace
export const useSyncMarketplace = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (marketplaceId) => marketplaceService.syncMarketplace(marketplaceId),
    {
      onSuccess: (data, marketplaceId) => {
        toast.success(`${marketplaceId} senkronizasyonu başlatıldı`)
        // Invalidate marketplace queries
        queryClient.invalidateQueries(['marketplaces'])
        queryClient.invalidateQueries(['marketplace', marketplaceId])
      },
      onError: (error, marketplaceId) => {
        console.error(`${marketplaceId} sync error:`, error)
        toast.error(`${marketplaceId} senkronizasyonu başarısız oldu`)
      }
    }
  )
}

// Get marketplace orders
export const useMarketplaceOrders = (marketplaceId, params = {}) => {
  return useQuery(
    ['marketplace', marketplaceId, 'orders', params],
    () => marketplaceService.getOrders(marketplaceId, params),
    {
      enabled: !!marketplaceId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error(`${marketplaceId} orders error:`, error)
        toast.error(`${marketplaceId} siparişleri alınamadı`)
      }
    }
  )
}

// Get marketplace products
export const useMarketplaceProducts = (marketplaceId, params = {}) => {
  return useQuery(
    ['marketplace', marketplaceId, 'products', params],
    () => marketplaceService.getProducts(marketplaceId, params),
    {
      enabled: !!marketplaceId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error(`${marketplaceId} products error:`, error)
        toast.error(`${marketplaceId} ürünleri alınamadı`)
      }
    }
  )
}

// Update marketplace settings
export const useUpdateMarketplaceSettings = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ marketplaceId, settings }) => marketplaceService.updateSettings(marketplaceId, settings),
    {
      onSuccess: (data, { marketplaceId }) => {
        toast.success(`${marketplaceId} ayarları güncellendi`)
        // Invalidate marketplace queries
        queryClient.invalidateQueries(['marketplaces'])
        queryClient.invalidateQueries(['marketplace', marketplaceId])
      },
      onError: (error, { marketplaceId }) => {
        console.error(`${marketplaceId} settings update error:`, error)
        toast.error(`${marketplaceId} ayarları güncellenemedi`)
      }
    }
  )
}

// Test marketplace connection
export const useTestMarketplaceConnection = () => {
  return useMutation(
    (marketplaceId) => marketplaceService.testConnection(marketplaceId),
    {
      onSuccess: (data, marketplaceId) => {
        if (data.data?.success) {
          toast.success(`${marketplaceId} bağlantısı başarılı`)
        } else {
          toast.error(`${marketplaceId} bağlantısı başarısız`)
        }
      },
      onError: (error, marketplaceId) => {
        console.error(`${marketplaceId} connection test error:`, error)
        toast.error(`${marketplaceId} bağlantı testi başarısız`)
      }
    }
  )
}

// Specific marketplace hooks
export const useTrendyolData = () => {
  const orders = useQuery(['trendyol', 'orders'], () => marketplaceService.trendyol.getOrders())
  const products = useQuery(['trendyol', 'products'], () => marketplaceService.trendyol.getProducts())
  
  return { orders, products }
}

export const useHepsiburadaData = () => {
  const orders = useQuery(['hepsiburada', 'orders'], () => marketplaceService.hepsiburada.getOrders())
  const products = useQuery(['hepsiburada', 'products'], () => marketplaceService.hepsiburada.getProducts())
  
  return { orders, products }
}

export const useAmazonData = () => {
  const orders = useQuery(['amazon', 'orders'], () => marketplaceService.amazon.getOrders())
  const products = useQuery(['amazon', 'products'], () => marketplaceService.amazon.getProducts())
  
  return { orders, products }
}

export const useN11Data = () => {
  const orders = useQuery(['n11', 'orders'], () => marketplaceService.n11.getOrders())
  const products = useQuery(['n11', 'products'], () => marketplaceService.n11.getProducts())
  
  return { orders, products }
}

export const useShopifyData = () => {
  const orders = useQuery(['shopify', 'orders'], () => marketplaceService.shopify.getOrders())
  const products = useQuery(['shopify', 'products'], () => marketplaceService.shopify.getProducts())
  
  return { orders, products }
}

export const useCiceksepetiData = () => {
  const orders = useQuery(['ciceksepeti', 'orders'], () => marketplaceService.ciceksepeti.getOrders())
  const products = useQuery(['ciceksepeti', 'products'], () => marketplaceService.ciceksepeti.getProducts())
  
  return { orders, products }
}

export const usePazaramaData = () => {
  const orders = useQuery(['pazarama', 'orders'], () => marketplaceService.pazarama.getOrders())
  const products = useQuery(['pazarama', 'products'], () => marketplaceService.pazarama.getProducts())
  
  return { orders, products }
}

export const usePTTAVMData = () => {
  const orders = useQuery(['pttavm', 'orders'], () => marketplaceService.pttavm.getOrders())
  const products = useQuery(['pttavm', 'products'], () => marketplaceService.pttavm.getProducts())
  
  return { orders, products }
} 