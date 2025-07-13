import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import errorService from '../services/errorService'

// Error action types
const ERROR_ACTIONS = {
  ADD_ERROR: 'ADD_ERROR',
  REMOVE_ERROR: 'REMOVE_ERROR',
  CLEAR_ALL_ERRORS: 'CLEAR_ALL_ERRORS',
  SET_ERROR_REPORTING_ENABLED: 'SET_ERROR_REPORTING_ENABLED',
  INCREMENT_ERROR_COUNT: 'INCREMENT_ERROR_COUNT'
}

// Initial state
const initialState = {
  errors: [],
  errorCount: 0,
  isErrorReportingEnabled: true,
  lastError: null
}

// Error reducer
const errorReducer = (state, action) => {
  switch (action.type) {
    case ERROR_ACTIONS.ADD_ERROR:
      const newError = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        ...action.payload
      }
      
      return {
        ...state,
        errors: [newError, ...state.errors].slice(0, 100), // Keep last 100 errors
        lastError: newError,
        errorCount: state.errorCount + 1
      }

    case ERROR_ACTIONS.REMOVE_ERROR:
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload.id)
      }

    case ERROR_ACTIONS.CLEAR_ALL_ERRORS:
      return {
        ...state,
        errors: [],
        lastError: null
      }

    case ERROR_ACTIONS.SET_ERROR_REPORTING_ENABLED:
      return {
        ...state,
        isErrorReportingEnabled: action.payload
      }

    case ERROR_ACTIONS.INCREMENT_ERROR_COUNT:
      return {
        ...state,
        errorCount: state.errorCount + 1
      }

    default:
      return state
  }
}

// Create context
const ErrorContext = createContext()

// Error provider component
export const ErrorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState)

  // Initialize error service
  useEffect(() => {
    errorService.init()
  }, [])

  // Add error to context
  const addError = useCallback((error) => {
    if (!state.isErrorReportingEnabled) return

    const errorData = {
      message: error.message || 'An unknown error occurred',
      severity: error.severity || 'error',
      type: error.type || 'generic',
      details: error.details || {},
      stack: error.stack,
      component: error.component,
      action: error.action,
      url: window.location.href,
      userId: errorService.getUserId(),
      sessionId: errorService.getSessionId()
    }

    dispatch({
      type: ERROR_ACTIONS.ADD_ERROR,
      payload: errorData
    })

    // Log to error service
    errorService.logError(
      error.title || 'Application Error',
      errorData,
      error.severity || 'error',
      error.additionalData || {}
    )

    return errorData
  }, [state.isErrorReportingEnabled])

  // Remove specific error
  const removeError = useCallback((errorId) => {
    dispatch({
      type: ERROR_ACTIONS.REMOVE_ERROR,
      payload: { id: errorId }
    })
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    dispatch({
      type: ERROR_ACTIONS.CLEAR_ALL_ERRORS
    })
  }, [])

  // Toggle error reporting
  const setErrorReportingEnabled = useCallback((enabled) => {
    dispatch({
      type: ERROR_ACTIONS.SET_ERROR_REPORTING_ENABLED,
      payload: enabled
    })
  }, [])

  // Handle API errors
  const handleApiError = useCallback((error, context = '') => {
    const apiError = {
      message: error.response?.data?.message || error.message || 'API Error',
      severity: 'error',
      type: 'api',
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        context
      },
      stack: error.stack,
      action: context
    }

    return addError(apiError)
  }, [addError])

  // Handle React errors
  const handleReactError = useCallback((error, errorInfo, component) => {
    const reactError = {
      message: error.message,
      severity: 'error',
      type: 'react',
      details: {
        componentStack: errorInfo.componentStack,
        errorBoundary: component
      },
      stack: error.stack,
      component
    }

    return addError(reactError)
  }, [addError])

  // Handle custom errors
  const handleCustomError = useCallback((message, options = {}) => {
    const customError = {
      message,
      severity: options.severity || 'error',
      type: 'custom',
      details: options.details || {},
      component: options.component,
      action: options.action,
      stack: options.stack || new Error().stack
    }

    return addError(customError)
  }, [addError])

  // Handle form validation errors
  const handleValidationError = useCallback((field, message, formData = {}) => {
    const validationError = {
      message: `Validation Error: ${message}`,
      severity: 'warning',
      type: 'validation',
      details: {
        field,
        formData,
        validationMessage: message
      },
      action: 'form_validation'
    }

    return addError(validationError)
  }, [addError])

  // Handle network errors
  const handleNetworkError = useCallback((error, context = '') => {
    const networkError = {
      message: 'Network connection error',
      severity: 'error',
      type: 'network',
      details: {
        context,
        offline: !navigator.onLine,
        connectionType: navigator.connection?.effectiveType,
        errorMessage: error.message
      },
      action: context
    }

    return addError(networkError)
  }, [addError])

  // Performance issue logging
  const logPerformanceIssue = useCallback((metric, value, threshold, component) => {
    const performanceError = {
      message: `Performance issue: ${metric} (${value}ms) exceeds threshold (${threshold}ms)`,
      severity: 'warning',
      type: 'performance',
      details: {
        metric,
        value,
        threshold,
        component,
        timestamp: Date.now()
      },
      component,
      action: 'performance_monitoring'
    }

    return addError(performanceError)
  }, [addError])

  // Get error statistics
  const getErrorStats = useCallback(() => {
    const errors = state.errors
    const stats = {
      total: errors.length,
      byType: {},
      bySeverity: {},
      recent: errors.filter(error => 
        Date.now() - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
      ).length
    }

    errors.forEach(error => {
      // By type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
      
      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1
    })

    return stats
  }, [state.errors])

  // Context value
  const value = {
    // State
    errors: state.errors,
    errorCount: state.errorCount,
    lastError: state.lastError,
    isErrorReportingEnabled: state.isErrorReportingEnabled,
    
    // Error handling methods
    addError,
    removeError,
    clearAllErrors,
    handleApiError,
    handleReactError,
    handleCustomError,
    handleValidationError,
    handleNetworkError,
    logPerformanceIssue,
    
    // Utility methods
    setErrorReportingEnabled,
    getErrorStats,
    
    // Error service access
    errorService
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

// Custom hook to use error context
export const useError = () => {
  const context = useContext(ErrorContext)
  
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  
  return context
}

// HOC for error handling
export const withErrorHandling = (WrappedComponent, componentName = 'Component') => {
  return React.forwardRef((props, ref) => {
    const { handleReactError } = useError()

    const ErrorBoundaryWrapper = ({ children }) => {
      try {
        return children
      } catch (error) {
        handleReactError(error, { componentStack: '' }, componentName)
        return null
      }
    }

    return (
      <ErrorBoundaryWrapper>
        <WrappedComponent {...props} ref={ref} />
      </ErrorBoundaryWrapper>
    )
  })
}

export default ErrorContext 