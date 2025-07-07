import axios from 'axios'
import errorService from './errorService'

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
    const token = localStorage.getItem('token')
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
    
    // Log error to error service
    const context = error.config?.url || 'Unknown API endpoint'
    errorService.handleApiError(error, context)
    
    // Handle common errors
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      
      // Don't redirect to login for cargo status endpoints
      const isCargoStatusEndpoint = url.includes('/status') || url.includes('/health')
      const isCargoEndpoint = url.includes('-cargo/') || url.includes('/cargo/')
      const isAuthEndpoint = url.includes('/auth/')
      
      if (isCargoStatusEndpoint || isCargoEndpoint || isAuthEndpoint) {
        // Just log the error for cargo and auth endpoints, don't redirect
        console.warn('Service authentication failed:', url)
        return Promise.reject(error)
      }
      
      // Only redirect to login for authenticated endpoints
      localStorage.removeItem('token')
      console.warn('Authentication failed, redirecting to login')
      
      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    
    // Handle network errors
    if (!error.response) {
      errorService.logError('Network Error', {
        type: 'network',
        message: error.message,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        timeout: error.code === 'ECONNABORTED'
      }, 'error', { context })
    }
    
    return Promise.reject(error)
  }
)

export default api 