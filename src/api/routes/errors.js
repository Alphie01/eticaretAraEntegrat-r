const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { protect } = require('../../middleware/auth')
const logger = require('../../utils/logger')

// Error reporting endpoint
router.post('/report', async (req, res) => {
  try {
    const { errors, timestamp } = req.body

    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({
        success: false,
        message: 'Errors array is required'
      })
    }

    // Process each error
    const processedErrors = errors.map(error => {
      const errorData = {
        timestamp: error.timestamp || timestamp || new Date().toISOString(),
        severity: error.severity || 'error',
        type: error.type || 'unknown',
        title: error.title || 'Frontend Error',
        message: error.error?.message || error.message || 'Unknown error',
        stack: error.error?.stack || error.stack,
        url: error.url || 'unknown',
        userAgent: error.userAgent,
        sessionId: error.sessionId,
        userId: error.userId || 'anonymous',
        browserInfo: error.browserInfo,
        additionalData: error.additionalData || error.details || {}
      }

      // Log to application logger based on severity
      const logMessage = `Frontend Error: ${errorData.title} - ${errorData.message}`
      const logContext = {
        errorType: errorData.type,
        severity: errorData.severity,
        userId: errorData.userId,
        sessionId: errorData.sessionId,
        url: errorData.url,
        userAgent: errorData.userAgent,
        stack: errorData.stack,
        additionalData: errorData.additionalData
      }

      switch (errorData.severity) {
        case 'error':
          logger.error(logMessage, logContext)
          break
        case 'warning':
          logger.warn(logMessage, logContext)
          break
        case 'info':
          logger.info(logMessage, logContext)
          break
        default:
          logger.error(logMessage, logContext)
      }

      return errorData
    })

    // If critical errors, send immediate notification
    const criticalErrors = processedErrors.filter(error => 
      error.severity === 'error' && 
      ['react', 'api', 'network'].includes(error.type)
    )

    if (criticalErrors.length > 0) {
      // Here you could integrate with external monitoring services like Sentry, LogRocket, etc.
      logger.error(`Critical frontend errors detected: ${criticalErrors.length} errors`, {
        criticalErrors: criticalErrors.map(e => ({
          type: e.type,
          message: e.message,
          url: e.url,
          userId: e.userId
        }))
      })
    }

    res.json({
      success: true,
      message: `Processed ${processedErrors.length} error reports`,
      processedCount: processedErrors.length,
      criticalCount: criticalErrors.length
    })

  } catch (error) {
    logger.error('Error processing error reports:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    })

    res.status(500).json({
      success: false,
      message: 'Failed to process error reports'
    })
  }
})

// Get error statistics (optional, for admin dashboard)
router.get('/stats', protect, async (req, res) => {
  try {
    // This is a mock response - you would implement actual error storage if needed
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: [],
      topErrors: []
    }

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('Error fetching error statistics:', {
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: 'Failed to fetch error statistics'
    })
  }
})

// Get error logs for debugging (admin only)
router.get('/logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, type, userId } = req.query

    // This would typically read from your logging system or database
    // For now, we'll return a mock response
    const logs = {
      errors: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    }

    res.json({
      success: true,
      data: logs
    })

  } catch (error) {
    logger.error('Error fetching error logs:', {
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      message: 'Failed to fetch error logs'
    })
  }
})

// Health check for error reporting service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Error reporting service is healthy',
    timestamp: new Date().toISOString()
  })
})

module.exports = router 