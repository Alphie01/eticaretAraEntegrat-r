import api from './api'

// Service health check cache
const serviceHealth = new Map()
const HEALTH_CHECK_TIMEOUT = 5000 // 5 seconds

const checkServiceHealth = async (serviceName) => {
  const lastCheck = serviceHealth.get(serviceName)
  const now = Date.now()
  
  // Return cached result if checked recently (within 1 minute)
  if (lastCheck && now - lastCheck.timestamp < 60000) {
    return lastCheck.healthy
  }
  
  try {
    const response = await Promise.race([
      api.get(`/${serviceName}-cargo/status`, { timeout: HEALTH_CHECK_TIMEOUT }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ])
    
    const isHealthy = response.status === 200
    serviceHealth.set(serviceName, { healthy: isHealthy, timestamp: now })
    return isHealthy
  } catch (error) {
    serviceHealth.set(serviceName, { healthy: false, timestamp: now })
    return false
  }
}

export const cargoService = {
  // MNG Kargo
  mng: {
    track: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('mng')
      if (!isHealthy) {
        throw new Error('MNG Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/mng-cargo/track/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackDetail: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('mng')
      if (!isHealthy) {
        throw new Error('MNG Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/mng-cargo/track/detail/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackBulk: async (trackingNumbers) => {
      const isHealthy = await checkServiceHealth('mng')
      if (!isHealthy) {
        throw new Error('MNG Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/mng-cargo/track/bulk', { trackingNumbers }, { timeout: 15000 })
    },
    
    calculatePrice: async (params) => {
      const isHealthy = await checkServiceHealth('mng')
      if (!isHealthy) {
        throw new Error('MNG Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/mng-cargo/pricing/calculate', params, { timeout: 8000 })
    },
    
    getStatus: () => 
      api.get('/mng-cargo/status', { timeout: 5000 }),
  },

  // Aras Kargo  
  aras: {
    track: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('aras')
      if (!isHealthy) {
        throw new Error('Aras Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/aras-cargo/track/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackDetail: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('aras')
      if (!isHealthy) {
        throw new Error('Aras Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/aras-cargo/track/detail/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackBulk: async (trackingNumbers) => {
      const isHealthy = await checkServiceHealth('aras')
      if (!isHealthy) {
        throw new Error('Aras Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/aras-cargo/track/bulk', { trackingNumbers }, { timeout: 15000 })
    },
    
    calculatePrice: async (params) => {
      const isHealthy = await checkServiceHealth('aras')
      if (!isHealthy) {
        throw new Error('Aras Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/aras-cargo/pricing/calculate', params, { timeout: 8000 })
    },
    
    getStatus: () => 
      api.get('/aras-cargo/status', { timeout: 5000 }),
  },

  // UPS Kargo
  ups: {
    track: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('ups')
      if (!isHealthy) {
        throw new Error('UPS Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/ups-cargo/track/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackDetail: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('ups')
      if (!isHealthy) {
        throw new Error('UPS Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/ups-cargo/track/detail/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackBulk: async (trackingNumbers) => {
      const isHealthy = await checkServiceHealth('ups')
      if (!isHealthy) {
        throw new Error('UPS Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/ups-cargo/track/bulk', { trackingNumbers }, { timeout: 15000 })
    },
    
    calculatePrice: async (params) => {
      const isHealthy = await checkServiceHealth('ups')
      if (!isHealthy) {
        throw new Error('UPS Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/ups-cargo/pricing/calculate', params, { timeout: 8000 })
    },
    
    getStatus: () => 
      api.get('/ups-cargo/status', { timeout: 5000 }),
  },

  // Yurtiçi Kargo
  yurtici: {
    track: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('yurtici')
      if (!isHealthy) {
        throw new Error('Yurtiçi Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/yurtici-cargo/track/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackDetail: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('yurtici')
      if (!isHealthy) {
        throw new Error('Yurtiçi Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/yurtici-cargo/track/detail/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackBulk: async (trackingNumbers) => {
      const isHealthy = await checkServiceHealth('yurtici')
      if (!isHealthy) {
        throw new Error('Yurtiçi Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/yurtici-cargo/track/bulk', { trackingNumbers }, { timeout: 15000 })
    },
    
    calculatePrice: async (params) => {
      const isHealthy = await checkServiceHealth('yurtici')
      if (!isHealthy) {
        throw new Error('Yurtiçi Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/yurtici-cargo/pricing/calculate', params, { timeout: 8000 })
    },
    
    getStatus: () => 
      api.get('/yurtici-cargo/status', { timeout: 5000 }),
  },

  // Sürat Kargo
  surat: {
    track: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('surat')
      if (!isHealthy) {
        throw new Error('Sürat Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/surat-cargo/track/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackDetail: async (trackingNumber) => {
      const isHealthy = await checkServiceHealth('surat')
      if (!isHealthy) {
        throw new Error('Sürat Kargo servisi şu anda kullanılamıyor')
      }
      return api.get(`/surat-cargo/track/detail/${trackingNumber}`, { timeout: 8000 })
    },
    
    trackBulk: async (trackingNumbers) => {
      const isHealthy = await checkServiceHealth('surat')
      if (!isHealthy) {
        throw new Error('Sürat Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/surat-cargo/track/bulk', { trackingNumbers }, { timeout: 15000 })
    },
    
    calculatePrice: async (params) => {
      const isHealthy = await checkServiceHealth('surat')
      if (!isHealthy) {
        throw new Error('Sürat Kargo servisi şu anda kullanılamıyor')
      }
      return api.post('/surat-cargo/pricing/calculate', params, { timeout: 8000 })
    },
    
    getStatus: () => 
      api.get('/surat-cargo/status', { timeout: 5000 }),
  },

  // Generic tracking (auto-detect company)
  track: (trackingNumber, company = null) => {
    if (company) {
      return cargoService[company.toLowerCase()]?.track(trackingNumber)
    }
    // Try to auto-detect or use a generic endpoint
    return api.get(`/cargo/track/${trackingNumber}`, { timeout: 8000 })
  },

  // Get all cargo companies status
  getAllStatus: async () => {
    try {
      // Set shorter timeout for each individual request
      const timeoutPromise = (promise, timeout = 5000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      }

      const [mng, aras, ups, yurtici, surat] = await Promise.allSettled([
        timeoutPromise(cargoService.mng.getStatus()),
        timeoutPromise(cargoService.aras.getStatus()), 
        timeoutPromise(cargoService.ups.getStatus()),
        timeoutPromise(cargoService.yurtici.getStatus()),
        timeoutPromise(cargoService.surat.getStatus()),
      ])

      const result = {
        mng: mng.status === 'fulfilled' ? mng.value.data : { 
          success: false, 
          error: mng.reason?.message || 'Service unavailable',
          status: 'offline'
        },
        aras: aras.status === 'fulfilled' ? aras.value.data : { 
          success: false, 
          error: aras.reason?.message || 'Service unavailable',
          status: 'offline'
        },
        ups: ups.status === 'fulfilled' ? ups.value.data : { 
          success: false, 
          error: ups.reason?.message || 'Service unavailable',
          status: 'offline'
        },
        yurtici: yurtici.status === 'fulfilled' ? yurtici.value.data : { 
          success: false, 
          error: yurtici.reason?.message || 'Service unavailable',
          status: 'offline'
        },
        surat: surat.status === 'fulfilled' ? surat.value.data : { 
          success: false, 
          error: surat.reason?.message || 'Service unavailable',
          status: 'offline'
        },
      }

      // Check if all services are offline
      const allOffline = Object.values(result).every(service => !service.success)
      if (allOffline) {
        throw new Error('Tüm kargo servisleri şu anda kullanılamıyor')
      }

      return result
    } catch (error) {
      console.error('Error getting cargo status:', error)
      throw error
    }
  },

  // Validate tracking number
  validateTrackingNumber: (trackingNumber, company) => {
    if (company && cargoService[company.toLowerCase()]) {
      return api.get(`/${company.toLowerCase()}-cargo/validate/${trackingNumber}`, { timeout: 5000 })
    }
    return api.get(`/cargo/validate/${trackingNumber}`, { timeout: 5000 })
  },
}

export default cargoService 