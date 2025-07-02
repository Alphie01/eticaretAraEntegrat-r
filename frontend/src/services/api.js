import axios from 'axios'

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:25628'

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data || error.message)
    
    // Handle common errors
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      
      // Don't redirect to login for cargo status endpoints
      const isCargoStatusEndpoint = url.includes('/status') || url.includes('/health')
      const isCargoEndpoint = url.includes('-cargo/') || url.includes('/cargo/')
      
      if (isCargoStatusEndpoint || isCargoEndpoint) {
        // Just log the error for cargo endpoints, don't redirect
        console.warn('Cargo service authentication failed:', url)
        return Promise.reject(error)
      }
      
      // Only redirect to login for non-cargo endpoints
      localStorage.removeItem('auth_token')
      console.warn('Authentication failed, redirecting to login')
      // window.location.href = '/login' // Disabled until login page is implemented
    }
    
    return Promise.reject(error)
  }
)

export default api 