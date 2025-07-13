import React, { useState } from 'react'
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Box,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider
} from '@mui/material'
import {
  BugReport as BugIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  NetworkWifi as NetworkIcon,
  Api as ApiIcon,
  Code as CodeIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'
import { useError } from '../contexts/ErrorContext'
import api from '../services/api'

const ErrorDemo = () => {
  const {
    handleCustomError,
    handleApiError,
    handleValidationError,
    handleNetworkError,
    logPerformanceIssue,
    errors,
    errorService,
    getErrorStats,
    clearAllErrors
  } = useError()

  const [lastError, setLastError] = useState(null)

  // Test different types of errors
  const testReactError = () => {
    try {
      // Simulate a React error
      throw new Error('Test React Component Error - This is a simulated error for testing')
    } catch (error) {
      const errorData = handleCustomError(error.message, {
        severity: 'error',
        component: 'ErrorDemo',
        action: 'test_react_error',
        details: {
          testType: 'react_error',
          userInitiated: true
        }
      })
      setLastError(errorData)
    }
  }

  const testApiError = async () => {
    try {
      // Make a request to a non-existent endpoint
      await api.get('/test/non-existent-endpoint')
    } catch (error) {
      const errorData = handleApiError(error, 'Error Demo Test')
      setLastError(errorData)
    }
  }

  const testNetworkError = () => {
    // Simulate a network error
    const networkError = new Error('Network connection failed')
    networkError.code = 'NETWORK_ERROR'
    
    const errorData = handleNetworkError(networkError, 'Error Demo Network Test')
    setLastError(errorData)
  }

  const testValidationError = () => {
    const errorData = handleValidationError(
      'email',
      'Email format is invalid',
      { email: 'invalid-email', username: 'testuser' }
    )
    setLastError(errorData)
  }

  const testPerformanceIssue = () => {
    const errorData = logPerformanceIssue(
      'component_render',
      1250, // ms
      1000, // threshold
      'ErrorDemo'
    )
    setLastError(errorData)
  }

  const testCustomWarning = () => {
    const errorData = handleCustomError('This is a test warning message', {
      severity: 'warning',
      component: 'ErrorDemo',
      action: 'test_warning',
      details: {
        warningType: 'user_action',
        context: 'demo_page'
      }
    })
    setLastError(errorData)
  }

  const testCustomInfo = () => {
    const errorData = handleCustomError('This is a test info message', {
      severity: 'info',
      component: 'ErrorDemo',
      action: 'test_info',
      details: {
        infoType: 'user_feedback',
        context: 'demo_page'
      }
    })
    setLastError(errorData)
  }

  const testJavaScriptError = () => {
    // This will trigger a global JavaScript error
    setTimeout(() => {
      throw new Error('Global JavaScript Error - This is a simulated global error')
    }, 100)
  }

  const testPromiseRejection = () => {
    // This will trigger an unhandled promise rejection
    Promise.reject(new Error('Unhandled Promise Rejection - This is a simulated promise rejection'))
  }

  const testMultipleErrors = () => {
    // Trigger multiple errors quickly
    testCustomError()
    setTimeout(() => testValidationError(), 100)
    setTimeout(() => testCustomWarning(), 200)
    setTimeout(() => testPerformanceIssue(), 300)
  }

  const testCustomError = () => {
    const errorData = handleCustomError('Multiple error test - Error ' + Date.now(), {
      severity: 'error',
      component: 'ErrorDemo',
      action: 'multiple_error_test'
    })
    setLastError(errorData)
  }

  const getStoredLogs = () => {
    const logs = errorService.getStoredLogs()
    console.log('Stored Error Logs:', logs)
    alert(`Found ${logs.length} stored error logs. Check console for details.`)
  }

  const clearStoredLogs = () => {
    errorService.clearStoredLogs()
    alert('Stored error logs cleared!')
  }

  const stats = getErrorStats()

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🐛 Error Reporting Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Bu sayfa error reporting sistemini test etmek için kullanılır. Farklı türde hatalar oluşturabilir ve 
        sistem nasıl yanıt verdiğini görebilirsiniz.
      </Typography>

      <Grid container spacing={3}>
        {/* Error Test Buttons */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Test Controls
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<ErrorIcon />}
                    onClick={testReactError}
                  >
                    React Error
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<ApiIcon />}
                    onClick={testApiError}
                  >
                    API Error
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<NetworkIcon />}
                    onClick={testNetworkError}
                  >
                    Network Error
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<WarningIcon />}
                    onClick={testValidationError}
                  >
                    Validation Error
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<SpeedIcon />}
                    onClick={testPerformanceIssue}
                  >
                    Performance Issue
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    startIcon={<WarningIcon />}
                    onClick={testCustomWarning}
                  >
                    Warning Message
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="info"
                    startIcon={<BugIcon />}
                    onClick={testCustomInfo}
                  >
                    Info Message
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<CodeIcon />}
                    onClick={testJavaScriptError}
                  >
                    Global JS Error
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<CodeIcon />}
                    onClick={testPromiseRejection}
                  >
                    Promise Rejection
                  </Button>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    onClick={testMultipleErrors}
                  >
                    Test Multiple Errors
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Statistics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Statistics
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Errors
                  </Typography>
                  <Typography variant="h4" color="error">
                    {stats.total}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Recent (24h)
                  </Typography>
                  <Typography variant="h6">
                    {stats.recent}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    By Severity
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(stats.bySeverity).map(([severity, count]) => (
                      <Chip
                        key={severity}
                        label={`${severity}: ${count}`}
                        size="small"
                        color={severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info'}
                      />
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    By Type
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type}: ${count}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={getStoredLogs}
                  >
                    View Logs
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={clearStoredLogs}
                  >
                    Clear Logs
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={clearAllErrors}
                  >
                    Clear All
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Last Error Details */}
        {lastError && (
          <Grid item xs={12}>
            <Alert severity={lastError.severity || 'error'} sx={{ mb: 2 }}>
              <Typography variant="h6">
                Last Triggered Error
              </Typography>
              <Typography variant="body2">
                {lastError.message}
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* Recent Errors List */}
        {errors.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Errors ({errors.length})
                </Typography>
                
                <Stack spacing={1}>
                  {errors.slice(0, 5).map((error, index) => (
                    <Accordion key={error.id}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Chip
                            label={error.severity}
                            size="small"
                            color={error.severity === 'error' ? 'error' : error.severity === 'warning' ? 'warning' : 'info'}
                          />
                          <Chip
                            label={error.type}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {error.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box component="pre" sx={{ 
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 200
                        }}>
                          {JSON.stringify(error, null, 2)}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  )
}

export default ErrorDemo 