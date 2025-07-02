import { useQuery, useMutation, useQueryClient } from 'react-query'
import cargoService from '../services/cargoService'
import toast from 'react-hot-toast'

// Circuit breaker for failed services
const failedServices = new Set()
const lastFailureTime = new Map()

const isServiceBlocked = (service) => {
  if (!failedServices.has(service)) return false
  
  const lastFail = lastFailureTime.get(service)
  const now = Date.now()
  
  // Block service for 5 minutes after failure
  if (now - lastFail < 5 * 60 * 1000) {
    return true
  }
  
  // Remove from blocked list after 5 minutes
  failedServices.delete(service)
  lastFailureTime.delete(service)
  return false
}

const markServiceAsFailed = (service) => {
  failedServices.add(service)
  lastFailureTime.set(service, Date.now())
}

// Get all cargo companies status
export const useCargoStatus = () => {
  return useQuery(
    ['cargo', 'status'],
    () => {
      // Check if all services are blocked
      const allBlocked = ['mng', 'aras', 'ups', 'yurtici', 'surat'].every(service => 
        isServiceBlocked(service)
      )
      
      if (allBlocked) {
        throw new Error('Tüm kargo servisleri geçici olarak devre dışı')
      }
      
      return cargoService.getAllStatus()
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - increased
      refetchInterval: (data, query) => {
        // Stop refetching if there are errors or if all services are blocked
        if (query.state.error || query.state.status === 'error') {
          return false
        }
        
        // Check if too many services are failing
        if (failedServices.size >= 3) {
          return false
        }
        
        return 60 * 1000 // 1 minute - increased interval
      },
      retry: (failureCount, error) => {
        // Max 2 retries, then stop
        if (failureCount >= 2) {
          // Mark all services as potentially failed
          ['mng', 'aras', 'ups', 'yurtici', 'surat'].forEach(service => {
            markServiceAsFailed(service)
          })
          return false
        }
        return true
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 60000), // Max 1 minute
      onError: (error) => {
        console.error('Cargo status error:', error)
        toast.error('Kargo servisleri şu anda kullanılamıyor', { 
          id: 'cargo-status-error',
          duration: 10000 
        })
      }
    }
  )
}

// Track single shipment (converted to mutation)
export const useTrackShipment = () => {
  return useMutation(
    ({ trackingNumber, company }) => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      if (company && cargoService[company.toLowerCase()]) {
        return cargoService[company.toLowerCase()].track(trackingNumber)
      }
      return cargoService.track(trackingNumber)
    },
    {
      onError: (error, variables) => {
        console.error('Tracking error:', error)
        
        // Mark service as failed if specific company error
        if (variables.company) {
          markServiceAsFailed(variables.company)
        }
        
        toast.error('Takip sorgulaması başarısız oldu')
      }
    }
  )
}

// Track shipment detail with history
export const useTrackShipmentDetail = (trackingNumber, company, options = {}) => {
  return useQuery(
    ['cargo', 'trackDetail', trackingNumber, company],
    () => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      if (company && cargoService[company.toLowerCase()]) {
        return cargoService[company.toLowerCase()].trackDetail(trackingNumber)
      }
      return cargoService.track(trackingNumber)
    },
    {
      enabled: !!trackingNumber && !!company && !isServiceBlocked(company),
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // No retries for detail tracking to avoid spam
        if (failureCount >= 1) {
          if (company) {
            markServiceAsFailed(company)
          }
          return false
        }
        return true
      },
      retryDelay: 5000, // 5 seconds
      ...options,
      onError: (error) => {
        console.error('Detail tracking error:', error)
        toast.error('Detaylı takip bilgisi alınamadı')
      }
    }
  )
}

// Bulk tracking mutation
export const useBulkTracking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ trackingNumbers, company }) => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      if (company && cargoService[company.toLowerCase()]) {
        return cargoService[company.toLowerCase()].trackBulk(trackingNumbers)
      }
      return Promise.reject(new Error('Kargo firması seçilmesi gerekli'))
    },
    {
      onSuccess: (data) => {
        toast.success('Toplu takip sorgulaması tamamlandı')
        // Invalidate related queries
        queryClient.invalidateQueries(['cargo'])
      },
      onError: (error, variables) => {
        console.error('Bulk tracking error:', error)
        
        if (variables.company) {
          markServiceAsFailed(variables.company)
        }
        
        toast.error('Toplu takip sorgulaması başarısız oldu')
      }
    }
  )
}

// Calculate shipping price
export const useCalculateShippingPrice = () => {
  return useMutation(
    ({ company, params }) => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      if (company && cargoService[company.toLowerCase()]) {
        return cargoService[company.toLowerCase()].calculatePrice(params)
      }
      throw new Error('Geçersiz kargo firması')
    },
    {
      onSuccess: () => {
        toast.success('Fiyat hesaplama tamamlandı')
      },
      onError: (error, variables) => {
        console.error('Price calculation error:', error)
        
        if (variables.company) {
          markServiceAsFailed(variables.company)
        }
        
        toast.error('Fiyat hesaplaması başarısız oldu')
      }
    }
  )
}

// Validate tracking number
export const useValidateTrackingNumber = (trackingNumber, company) => {
  return useQuery(
    ['cargo', 'validate', trackingNumber, company],
    () => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      return cargoService.validateTrackingNumber(trackingNumber, company)
    },
    {
      enabled: !!trackingNumber && trackingNumber.length > 3 && !isServiceBlocked(company),
      staleTime: Infinity, // Validation results don't change
      retry: false, // Don't retry validation failures
      onError: (error) => {
        console.error('Validation error:', error)
      }
    }
  )
}

// Get specific cargo company status
export const useCargoCompanyStatus = (company) => {
  return useQuery(
    ['cargo', company, 'status'],
    () => {
      if (isServiceBlocked(company)) {
        throw new Error(`${company} servisi geçici olarak kullanılamıyor`)
      }
      
      if (company && cargoService[company.toLowerCase()]) {
        return cargoService[company.toLowerCase()].getStatus()
      }
      throw new Error('Geçersiz kargo firması')
    },
    {
      enabled: !!company && !isServiceBlocked(company),
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: (data, query) => {
        // Stop refetching if there are errors or service is blocked
        if (query.state.error || query.state.status === 'error' || isServiceBlocked(company)) {
          return false
        }
        return 2 * 60 * 1000 // 2 minutes - increased interval
      },
      retry: (failureCount, error) => {
        // Max 1 retry for individual company status
        if (failureCount >= 1) {
          markServiceAsFailed(company)
          return false
        }
        return true
      },
      retryDelay: 10000, // 10 seconds
      onError: (error) => {
        console.error(`${company} status error:`, error)
        markServiceAsFailed(company)
      }
    }
  )
} 