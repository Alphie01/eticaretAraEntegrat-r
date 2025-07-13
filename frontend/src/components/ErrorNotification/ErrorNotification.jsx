import React, { useState, useEffect } from 'react'
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Collapse,
  Typography,
  Chip,
  Stack,
  Portal
} from '@mui/material'
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import { useError } from '../../contexts/ErrorContext'

const ErrorNotification = () => {
  const { errors, removeError } = useError()
  const [expandedErrors, setExpandedErrors] = useState(new Set())
  const [notificationQueue, setNotificationQueue] = useState([])
  const [currentNotification, setCurrentNotification] = useState(null)

  // Process new errors and add to notification queue
  useEffect(() => {
    const newErrors = errors.filter(error => 
      !notificationQueue.some(notif => notif.id === error.id) &&
      (!currentNotification || currentNotification.id !== error.id)
    )

    if (newErrors.length > 0) {
      setNotificationQueue(prev => [...prev, ...newErrors])
    }
  }, [errors, notificationQueue, currentNotification])

  // Show notifications from queue
  useEffect(() => {
    if (!currentNotification && notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0]
      setCurrentNotification(nextNotification)
      setNotificationQueue(prev => prev.slice(1))
    }
  }, [currentNotification, notificationQueue])

  const handleClose = (errorId, reason) => {
    if (reason === 'clickaway') return
    
    setCurrentNotification(null)
    
    // Remove from notification queue if exists
    setNotificationQueue(prev => prev.filter(error => error.id !== errorId))
  }

  const handleRemoveError = (errorId) => {
    removeError(errorId)
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      newSet.delete(errorId)
      return newSet
    })
  }

  const toggleExpanded = (errorId) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(errorId)) {
        newSet.delete(errorId)
      } else {
        newSet.add(errorId)
      }
      return newSet
    })
  }

  const getErrorIcon = (severity) => {
    const iconProps = { fontSize: 'small' }
    switch (severity) {
      case 'error':
        return <ErrorIcon {...iconProps} />
      case 'warning':
        return <WarningIcon {...iconProps} />
      case 'info':
        return <InfoIcon {...iconProps} />
      default:
        return <BugReportIcon {...iconProps} />
    }
  }

  const getErrorSeverity = (errorType, severity) => {
    // Map error types to Material-UI Alert severity
    if (severity) return severity

    switch (errorType) {
      case 'api':
      case 'network':
      case 'react':
        return 'error'
      case 'validation':
      case 'performance':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'error'
    }
  }

  const getAutoHideDuration = (severity, type) => {
    // Auto-hide duration based on severity
    switch (severity) {
      case 'error':
        return type === 'network' ? 8000 : 6000
      case 'warning':
        return 5000
      case 'info':
        return 4000
      default:
        return 6000
    }
  }

  const formatErrorTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const shouldShowNotification = (error) => {
    // Don't show notifications for certain error types in development
    if (process.env.NODE_ENV === 'development' && error.type === 'performance') {
      return false
    }
    
    // Always show critical errors
    if (error.severity === 'error') {
      return true
    }
    
    // Show warnings and info based on settings
    return true
  }

  if (!currentNotification || !shouldShowNotification(currentNotification)) {
    return null
  }

  const error = currentNotification
  const isExpanded = expandedErrors.has(error.id)
  const severity = getErrorSeverity(error.type, error.severity)
  const autoHideDuration = getAutoHideDuration(severity, error.type)

  return (
    <Portal>
      <Snackbar
        open={true}
        autoHideDuration={autoHideDuration}
        onClose={(event, reason) => handleClose(error.id, reason)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }} // Margin to avoid header
      >
        <Alert
          severity={severity}
          variant="filled"
          sx={{
            minWidth: 400,
            maxWidth: 600,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Toggle details button */}
              {(error.stack || error.details) && (
                <IconButton
                  size="small"
                  onClick={() => toggleExpanded(error.id)}
                  sx={{ color: 'inherit', opacity: 0.8 }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
              
              {/* Close button */}
              <IconButton
                size="small"
                onClick={() => handleClose(error.id)}
                sx={{ color: 'inherit', opacity: 0.8 }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        >
          <Box>
            {/* Main Error Message */}
            <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getErrorIcon(severity)}
              <Typography variant="subtitle2" component="span">
                {error.type === 'api' ? 'API Error' :
                 error.type === 'network' ? 'Network Error' :
                 error.type === 'validation' ? 'Validation Error' :
                 error.type === 'react' ? 'Application Error' :
                 error.type === 'performance' ? 'Performance Warning' :
                 'Error'}
              </Typography>
            </AlertTitle>

            <Typography variant="body2" sx={{ mb: 1 }}>
              {error.message}
            </Typography>

            {/* Error metadata chips */}
            <Stack direction="row" spacing={1} sx={{ mb: isExpanded ? 2 : 0 }}>
              <Chip
                label={formatErrorTime(error.timestamp)}
                size="small"
                variant="outlined"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'inherit',
                  borderColor: 'rgba(255,255,255,0.3)'
                }}
              />
              
              {error.component && (
                <Chip
                  label={error.component}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                />
              )}
            </Stack>

            {/* Expandable details */}
            <Collapse in={isExpanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                {/* API Error Details */}
                {error.type === 'api' && error.details && (
                  <Stack spacing={1}>
                    {error.details.status && (
                      <Typography variant="caption">
                        <strong>Status:</strong> {error.details.status} {error.details.statusText}
                      </Typography>
                    )}
                    {error.details.url && (
                      <Typography variant="caption">
                        <strong>URL:</strong> {error.details.method} {error.details.url}
                      </Typography>
                    )}
                    {error.details.context && (
                      <Typography variant="caption">
                        <strong>Context:</strong> {error.details.context}
                      </Typography>
                    )}
                  </Stack>
                )}

                {/* Network Error Details */}
                {error.type === 'network' && error.details && (
                  <Stack spacing={1}>
                    <Typography variant="caption">
                      <strong>Connection:</strong> {error.details.offline ? 'Offline' : 'Online'}
                    </Typography>
                    {error.details.connectionType && (
                      <Typography variant="caption">
                        <strong>Type:</strong> {error.details.connectionType}
                      </Typography>
                    )}
                  </Stack>
                )}

                {/* Validation Error Details */}
                {error.type === 'validation' && error.details && (
                  <Stack spacing={1}>
                    {error.details.field && (
                      <Typography variant="caption">
                        <strong>Field:</strong> {error.details.field}
                      </Typography>
                    )}
                    {error.details.validationMessage && (
                      <Typography variant="caption">
                        <strong>Message:</strong> {error.details.validationMessage}
                      </Typography>
                    )}
                  </Stack>
                )}

                {/* Performance Error Details */}
                {error.type === 'performance' && error.details && (
                  <Stack spacing={1}>
                    <Typography variant="caption">
                      <strong>Metric:</strong> {error.details.metric}
                    </Typography>
                    <Typography variant="caption">
                      <strong>Value:</strong> {error.details.value}ms (threshold: {error.details.threshold}ms)
                    </Typography>
                  </Stack>
                )}

                {/* Generic error details */}
                {error.details && typeof error.details === 'object' && Object.keys(error.details).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="inherit">
                      <strong>Details:</strong>
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 100,
                        mt: 0.5,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {JSON.stringify(error.details, null, 2)}
                    </Box>
                  </Box>
                )}

                {/* Stack trace (if available) */}
                {error.stack && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="inherit">
                      <strong>Stack Trace:</strong>
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 100,
                        mt: 0.5,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {error.stack.split('\n').slice(0, 3).join('\n')}
                    </Box>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        </Alert>
      </Snackbar>
    </Portal>
  )
}

export default ErrorNotification 