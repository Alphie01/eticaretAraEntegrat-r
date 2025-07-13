import api from './api'

class ErrorService {
  constructor() {
    this.isInitialized = false
    this.errorQueue = []
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  // Initialize error service
  init() {
    if (this.isInitialized) return

    // Global error handlers
    this.setupGlobalErrorHandlers()
    
    // Setup unhandled promise rejection handler
    this.setupUnhandledPromiseHandler()
    
    this.isInitialized = true
    console.log('🔧 Error Service initialized')
  }

  // Setup global window error handler
  setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      const error = {
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      this.logError('Global Error', error, 'error')
    })

    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        type: 'unhandled_promise',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        reason: event.reason
      }
      
      this.logError('Unhandled Promise Rejection', error, 'error')
    })
  }

  // Setup unhandled promise rejection handler
  setupUnhandledPromiseHandler() {
    const originalUnhandledRejection = window.onunhandledrejection
    
    window.onunhandledrejection = (event) => {
      const error = {
        type: 'promise_rejection',
        message: event.reason?.message || 'Promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      this.logError('Promise Rejection', error, 'error')
      
      // Call original handler if exists
      if (originalUnhandledRejection) {
        originalUnhandledRejection.call(window, event)
      }
    }
  }

  // Log error with different severity levels
  logError(title, error, severity = 'error', additionalData = {}) {
    const errorData = {
      title,
      severity, // 'error', 'warning', 'info'
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      browserInfo: this.getBrowserInfo(),
      error: {
        message: error?.message || error,
        stack: error?.stack,
        name: error?.name,
        ...error
      },
      additionalData
    }

    // Console logging
    this.logToConsole(errorData)
    
    // Queue for backend reporting
    this.queueForReporting(errorData)
    
    // Store locally for offline access
    this.storeLocally(errorData)

    return errorData
  }

  // Console logging with colors
  logToConsole(errorData) {
    const { severity, title, error } = errorData
    const style = this.getConsoleStyle(severity)
    
    console.group(`%c🚨 ${severity.toUpperCase()}: ${title}`, style)
    console.error('Error Details:', error)
    console.log('Full Error Data:', errorData)
    console.groupEnd()
  }

  // Get console style based on severity
  getConsoleStyle(severity) {
    const styles = {
      error: 'color: #ff4444; font-weight: bold; font-size: 12px;',
      warning: 'color: #ff8800; font-weight: bold; font-size: 12px;',
      info: 'color: #4488ff; font-weight: bold; font-size: 12px;'
    }
    return styles[severity] || styles.error
  }

  // Queue error for backend reporting
  queueForReporting(errorData) {
    this.errorQueue.push(errorData)
    
    // Send immediately for critical errors
    if (errorData.severity === 'error') {
      this.sendErrorsToBackend()
    }
  }

  // Send errors to backend
  async sendErrorsToBackend() {
    if (this.errorQueue.length === 0) return

    const errorsToSend = [...this.errorQueue]
    this.errorQueue = []

    try {
      await api.post('/errors/report', {
        errors: errorsToSend,
        timestamp: new Date().toISOString()
      })
      
      console.log(`✅ Reported ${errorsToSend.length} errors to backend`)
    } catch (error) {
      console.warn('❌ Failed to report errors to backend:', error.message)
      
      // Re-queue errors for retry
      this.errorQueue.unshift(...errorsToSend)
      
      // Retry with exponential backoff
      setTimeout(() => {
        if (this.errorQueue.length > 0) {
          this.sendErrorsToBackend()
        }
      }, this.retryDelay)
    }
  }

  // Store error locally for offline access
  storeLocally(errorData) {
    try {
      const stored = localStorage.getItem('error_logs') || '[]'
      const logs = JSON.parse(stored)
      
      logs.push(errorData)
      
      // Keep only last 50 errors
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50)
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs))
    } catch (error) {
      console.warn('Failed to store error locally:', error)
    }
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }

  // Get user ID
  getUserId() {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.userId || payload.id || 'authenticated_user'
      }
    } catch (error) {
      // Ignore token parsing errors
    }
    return 'anonymous'
  }

  // Get browser info
  getBrowserInfo() {
    return {
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
  }

  // API Error helper
  handleApiError(error, context = '') {
    const errorData = {
      type: 'api',
      context,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      responseData: error.response?.data,
      requestData: error.config?.data
    }

    return this.logError('API Error', errorData, 'error', { context })
  }

  // React Error Boundary helper
  handleReactError(error, errorInfo, componentStack) {
    const errorData = {
      type: 'react',
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundaryStack: componentStack
    }

    return this.logError('React Error', errorData, 'error')
  }

  // Custom error logging
  logCustomError(message, data = {}, severity = 'error') {
    return this.logError('Custom Error', { message, ...data }, severity)
  }

  // Get stored error logs
  getStoredLogs() {
    try {
      const stored = localStorage.getItem('error_logs') || '[]'
      return JSON.parse(stored)
    } catch (error) {
      console.warn('Failed to get stored logs:', error)
      return []
    }
  }

  // Clear stored logs
  clearStoredLogs() {
    try {
      localStorage.removeItem('error_logs')
      console.log('📝 Error logs cleared')
    } catch (error) {
      console.warn('Failed to clear stored logs:', error)
    }
  }

  // Performance monitoring
  logPerformanceIssue(metric, value, threshold) {
    if (value > threshold) {
      this.logError('Performance Issue', {
        type: 'performance',
        metric,
        value,
        threshold,
        timestamp: new Date().toISOString()
      }, 'warning')
    }
  }
}

// Create singleton instance
const errorService = new ErrorService()

export default errorService 