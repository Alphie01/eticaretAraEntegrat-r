# Error Reporting Sistemi Kullanım Kılavuzu

## 📋 Genel Bakış

Bu proje, kapsamlı bir frontend error reporting sistemi içerir. Sistem, hataları otomatik olarak yakalar, kategorize eder, kullanıcıya bildirim gösterir ve backend'e rapor eder.

## 🎯 Özellikler

### 🔍 Error Detection
- **React Error Boundary**: Component hatalarını yakalar
- **Global Error Handler**: JavaScript runtime hatalarını yakalar  
- **Promise Rejection Handler**: Unhandled promise rejection'ları yakalar
- **API Error Handler**: HTTP request hatalarını yakalar
- **Network Error Detection**: Bağlantı sorunlarını tespit eder
- **Performance Monitoring**: Yavaş render'ları ve performans sorunlarını izler

### 📊 Error Categories
- **React Errors**: Component lifecycle hataları
- **API Errors**: HTTP request/response hataları
- **Network Errors**: Bağlantı kesilmeleri, timeout'lar
- **Validation Errors**: Form ve veri doğrulama hataları
- **Performance Issues**: Yavaş işlemler ve render sorunları
- **Custom Errors**: Manuel olarak loglanan hatalar

### 🔔 Notification System
- **Toast Notifications**: Kullanıcıya anlık bildirimler
- **Error Severity**: Error, Warning, Info kategorileri
- **Auto-hide**: Önem derecesine göre otomatik kapanma
- **Expandable Details**: Teknik detayları gösterme/gizleme
- **Queue Management**: Çoklu hata bildirimleri yönetimi

### 💾 Error Storage & Reporting
- **Local Storage**: Offline erişim için local kayıt
- **Backend Reporting**: Server'a otomatik hata gönderimi
- **Session Tracking**: Kullanıcı oturumu ile ilişkilendirme
- **User Context**: Kullanıcı ve browser bilgileri ile zenginleştirme

## 🚀 Kurulum ve Kullanım

### 1. Error Provider Setup

```jsx
// App.jsx
import { ErrorProvider } from './contexts/ErrorContext'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import ErrorNotification from './components/ErrorNotification/ErrorNotification'

function App() {
  return (
    <ErrorProvider>
      <ErrorBoundary level="app" componentName="App">
        <YourAppContent />
        <ErrorNotification />
      </ErrorBoundary>
    </ErrorProvider>
  )
}
```

### 2. Hook Kullanımı

```jsx
import { useError } from '../contexts/ErrorContext'

function MyComponent() {
  const { 
    handleApiError, 
    handleCustomError, 
    handleValidationError 
  } = useError()

  const handleSubmit = async (data) => {
    try {
      await api.post('/submit', data)
    } catch (error) {
      handleApiError(error, 'Form Submission')
    }
  }

  const validateForm = (data) => {
    if (!data.email) {
      handleValidationError('email', 'Email is required', data)
      return false
    }
    return true
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 3. Error Boundary Kullanımı

```jsx
// Component seviyesinde
<ErrorBoundary level="component" componentName="UserProfile">
  <UserProfile />
</ErrorBoundary>

// Page seviyesinde
<ErrorBoundary level="page" componentName="Dashboard">
  <Dashboard />
</ErrorBoundary>

// HOC olarak
export default withErrorBoundary(MyComponent, {
  level: 'component',
  showDetails: true
})
```

## 🛠️ API Entegrasyonu

### Frontend API Error Handling

```javascript
// services/api.js - API interceptor otomatik entegre edilmiştir
import errorService from './errorService'

api.interceptors.response.use(
  response => response,
  error => {
    errorService.handleApiError(error, error.config?.url)
    return Promise.reject(error)
  }
)
```

### Backend Error Endpoint

```javascript
// POST /api/v1/errors/report
{
  "errors": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "severity": "error",
      "type": "api",
      "title": "API Error",
      "message": "Request failed with status 500",
      "stack": "Error: Request failed...",
      "url": "/dashboard",
      "userAgent": "Mozilla/5.0...",
      "sessionId": "session_123",
      "userId": "user_456",
      "browserInfo": {...},
      "additionalData": {...}
    }
  ]
}
```

## 🎮 Error Demo Sayfası

Development modunda `/error-demo` sayfasına gidip farklı hata türlerini test edebilirsiniz:

- **React Error**: Component hata simülasyonu
- **API Error**: HTTP request hatası
- **Network Error**: Bağlantı hatası simülasyonu  
- **Validation Error**: Form doğrulama hatası
- **Performance Issue**: Yavaş işlem uyarısı
- **Global Errors**: JavaScript runtime hataları

## 📈 Error Analytics

### Error Statistics
```javascript
const { getErrorStats } = useError()

const stats = getErrorStats()
// {
//   total: 25,
//   recent: 5,
//   byType: { api: 10, react: 8, network: 7 },
//   bySeverity: { error: 15, warning: 8, info: 2 }
// }
```

### Stored Logs Access
```javascript
const { errorService } = useError()

// Get stored logs
const logs = errorService.getStoredLogs()

// Clear stored logs  
errorService.clearStoredLogs()
```

## ⚙️ Konfigürasyon

### Error Service Ayarları

```javascript
// services/errorService.js
class ErrorService {
  constructor() {
    this.maxRetries = 3        // Backend retry sayısı
    this.retryDelay = 1000     // Retry gecikmesi (ms)
    this.maxStoredLogs = 50    // Local storage limit
  }
}
```

### Error Context Ayarları

```javascript
// contexts/ErrorContext.jsx
const initialState = {
  errors: [],                    // Active errors
  maxErrors: 100,               // Memory'de tutulacak max hata
  isErrorReportingEnabled: true  // Error reporting on/off
}
```

### Notification Ayarları

```javascript
// components/ErrorNotification/ErrorNotification.jsx
const getAutoHideDuration = (severity, type) => {
  switch (severity) {
    case 'error': return type === 'network' ? 8000 : 6000
    case 'warning': return 5000
    case 'info': return 4000
    default: return 6000
  }
}
```

## 🔒 Güvenlik Considerations

### Sensitive Data Protection
- Stack trace'ler production'da filtrelenir
- User credential'ları loglanmaz
- Personal information sanitize edilir
- API key'leri ve token'lar log'a yazılmaz

### Privacy Settings
```javascript
const { setErrorReportingEnabled } = useError()

// Kullanıcı error reporting'i kapatabilir
setErrorReportingEnabled(false)
```

## 🚨 Best Practices

### 1. Error Handling Stratejisi
```javascript
// ✅ İYİ: Specific error handling
try {
  await api.post('/users', userData)
} catch (error) {
  if (error.response?.status === 409) {
    handleValidationError('email', 'Email already exists', userData)
  } else {
    handleApiError(error, 'User Creation')
  }
}

// ❌ KÖTÜ: Generic error handling  
try {
  await api.post('/users', userData)
} catch (error) {
  console.error(error) // Sadece console log
}
```

### 2. Performance Monitoring
```javascript
// Component render time monitoring
const { logPerformanceIssue } = useError()

useEffect(() => {
  const startTime = performance.now()
  
  return () => {
    const renderTime = performance.now() - startTime
    if (renderTime > 100) { // 100ms threshold
      logPerformanceIssue('component_render', renderTime, 100, 'MyComponent')
    }
  }
}, [])
```

### 3. Error Recovery
```javascript
// Error Boundary ile graceful fallback
<ErrorBoundary 
  level="component"
  fallbackComponent={({ error, onRetry }) => (
    <Box textAlign="center" p={3}>
      <Typography>Bir hata oluştu</Typography>
      <Button onClick={onRetry}>Tekrar Dene</Button>
    </Box>
  )}
>
  <CriticalComponent />
</ErrorBoundary>
```

## 📱 Mobile Considerations

### Touch-friendly Error UI
- Error notification'lar mobile-responsive
- Touch gesture'lar için optimize edilmiş butonlar
- Small screen'lerde collapsed details

### Network-aware Error Handling
```javascript
// Network durumu kontrolü
const handleNetworkError = (error) => {
  if (!navigator.onLine) {
    handleCustomError('Offline mode - changes will sync when online', {
      severity: 'warning',
      type: 'network'
    })
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Error notifications gösterilmiyor**
   - ErrorProvider'ın App root'unda olduğunu kontrol edin
   - ErrorNotification component'inin render edildiğini kontrol edin

2. **Backend'e error report'lar gitmiyor**  
   - Network tab'da `/api/v1/errors/report` endpoint'ini kontrol edin
   - CORS ayarlarını kontrol edin

3. **Performance impact**
   - Error logging'in sadece development'ta verbose olduğunu kontrol edin
   - Production'da stack trace'lerin filtrelendiğini kontrol edin

### Debug Mode
```javascript
// Console'da error service'i debug etmek için
window.errorService = errorService
window.errorService.getStoredLogs()
```

## 📚 Related Files

### Core Files
- `frontend/src/services/errorService.js` - Ana error service
- `frontend/src/contexts/ErrorContext.jsx` - Error state management
- `frontend/src/components/ErrorBoundary/ErrorBoundary.jsx` - React error boundary
- `frontend/src/components/ErrorNotification/ErrorNotification.jsx` - Toast notifications

### Backend Files  
- `src/api/routes/errors.js` - Error reporting endpoint
- `src/utils/logger.js` - Backend logging utility

### Demo & Testing
- `frontend/src/pages/ErrorDemo.jsx` - Test sayfası
- Development menu'de "Error Demo" linki

---

Bu sistem sayesinde kullanıcı deneyimini bozmadan hataları etkili şekilde yakalayabilir, analiz edebilir ve çözebilirsiniz. 🚀 