import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material'
import { useError } from '../../contexts/ErrorContext'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our error service
    this.setState({
      error,
      errorInfo,
      hasError: true
    })

    // If we have access to error context, use it
    if (this.props.onError) {
      const errorId = this.props.onError(error, errorInfo, this.props.componentName || 'Unknown Component')
      this.setState({ errorId })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  copyErrorToClipboard = () => {
    const errorText = `
Error: ${this.state.error?.message || 'Unknown error'}
Component: ${this.props.componentName || 'Unknown'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim()

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy error details')
    })
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      const { 
        fallbackComponent: FallbackComponent,
        showDetails = true,
        componentName = 'Component',
        level = 'component' // 'app', 'page', 'component'
      } = this.props

      // If a custom fallback component is provided, use it
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            onRetry={this.handleRetry}
            onGoHome={this.handleGoHome}
            componentName={componentName}
          />
        )
      }

      // Default fallback UI
      const getSeverityAndActions = () => {
        switch (level) {
          case 'app':
            return {
              severity: 'error',
              title: 'Application Error',
              description: 'The application has encountered an unexpected error.',
              actions: [
                { label: 'Reload Page', action: () => window.location.reload(), icon: <RefreshIcon /> },
                { label: 'Go Home', action: this.handleGoHome, icon: <HomeIcon /> }
              ]
            }
          case 'page':
            return {
              severity: 'error',
              title: 'Page Error',
              description: 'This page has encountered an error.',
              actions: [
                { label: 'Try Again', action: this.handleRetry, icon: <RefreshIcon /> },
                { label: 'Go Home', action: this.handleGoHome, icon: <HomeIcon /> }
              ]
            }
          default:
            return {
              severity: 'warning',
              title: 'Component Error',
              description: `The ${componentName} component has encountered an error.`,
              actions: [
                { label: 'Retry', action: this.handleRetry, icon: <RefreshIcon /> }
              ]
            }
        }
      }

      const { severity, title, description, actions } = getSeverityAndActions()

      return (
        <Box
          sx={{
            p: level === 'app' ? 4 : 2,
            minHeight: level === 'app' ? '100vh' : 'auto',
            display: 'flex',
            alignItems: level === 'app' ? 'center' : 'flex-start',
            justifyContent: 'center',
            backgroundColor: level === 'app' ? 'background.default' : 'transparent'
          }}
        >
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              backgroundColor: level === 'app' ? 'background.paper' : 'warning.light',
              border: `1px solid`,
              borderColor: severity === 'error' ? 'error.main' : 'warning.main'
            }}
          >
            <CardContent>
              <Stack spacing={3}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ErrorIcon 
                    color={severity === 'error' ? 'error' : 'warning'}
                    sx={{ fontSize: 40 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                      {title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                </Box>

                {/* Error Info Chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<BugReportIcon />}
                    label={componentName}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={new Date().toLocaleTimeString()}
                    size="small"
                    variant="outlined"
                  />
                  {this.state.errorId && (
                    <Chip
                      label={`ID: ${this.state.errorId.toString().slice(-8)}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Error Message */}
                {error?.message && (
                  <Alert severity={severity} sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Error:</strong> {error.message}
                    </Typography>
                  </Alert>
                )}

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={index === 0 ? 'contained' : 'outlined'}
                      color={severity === 'error' ? 'error' : 'warning'}
                      startIcon={action.icon}
                      onClick={action.action}
                      size="small"
                    >
                      {action.label}
                    </Button>
                  ))}
                  
                  <Tooltip title="Copy error details to clipboard">
                    <IconButton
                      onClick={this.copyErrorToClipboard}
                      size="small"
                      color="primary"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Technical Details (collapsible) */}
                {showDetails && (error?.stack || errorInfo?.componentStack) && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" color="text.secondary">
                        Technical Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {error?.stack && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Error Stack:
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                backgroundColor: 'grey.100',
                                p: 1,
                                borderRadius: 1,
                                overflow: 'auto',
                                maxHeight: 200,
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {error.stack}
                            </Box>
                          </Box>
                        )}

                        {errorInfo?.componentStack && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Component Stack:
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                backgroundColor: 'grey.100',
                                p: 1,
                                borderRadius: 1,
                                overflow: 'auto',
                                maxHeight: 200,
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {errorInfo.componentStack}
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}

// HOC wrapper for easier usage with Error Context
export const withErrorBoundary = (
  WrappedComponent,
  errorBoundaryProps = {}
) => {
  const ErrorBoundaryWrapper = React.forwardRef((props, ref) => {
    const { handleReactError } = useError()

    return (
      <ErrorBoundary
        onError={handleReactError}
        componentName={WrappedComponent.displayName || WrappedComponent.name}
        {...errorBoundaryProps}
      >
        <WrappedComponent {...props} ref={ref} />
      </ErrorBoundary>
    )
  })

  ErrorBoundaryWrapper.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return ErrorBoundaryWrapper
}

export default ErrorBoundary 