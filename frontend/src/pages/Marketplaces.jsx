import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  Store as StoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { 
  useMarketplaces, 
  useMarketplaceStats, 
  useSyncMarketplace, 
  useTestMarketplaceConnection,
  useUpdateMarketplaceSettings 
} from '../hooks/useMarketplaces'
import toast from 'react-hot-toast'

const marketplaces = [
  {
    id: 'trendyol',
    name: 'Trendyol',
    logo: '🛒',
    status: 'connected',
    orders: 456,
    products: 1234,
    revenue: '₺45,600',
    color: '#f27a1a',
    description: 'Türkiye\'nin en büyük e-ticaret platformu',
  },
  {
    id: 'hepsiburada',
    name: 'Hepsiburada',
    logo: '🏪',
    status: 'connected',
    orders: 234,
    products: 987,
    revenue: '₺23,400',
    color: '#ff6000',
    description: 'Teknoloji ve genel ürün kategorileri',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: '📦',
    status: 'connected',
    orders: 189,
    products: 543,
    revenue: '₺18,900',
    color: '#ff9900',
    description: 'Uluslararası e-ticaret platformu',
  },
  {
    id: 'n11',
    name: 'N11',
    logo: '🛍️',
    status: 'connected',
    orders: 167,
    products: 654,
    revenue: '₺16,700',
    color: '#f5a623',
    description: 'Çok kategorili alışveriş sitesi',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    logo: '🏬',
    status: 'warning',
    orders: 145,
    products: 432,
    revenue: '₺14,500',
    color: '#95bf47',
    description: 'Kendi mağazanız için e-ticaret platform',
  },
  {
    id: 'ciceksepeti',
    name: 'ÇiçekSepeti',
    logo: '🌸',
    status: 'connected',
    orders: 89,
    products: 234,
    revenue: '₺8,900',
    color: '#e91e63',
    description: 'Çiçek ve hediye platformu',
  },
  {
    id: 'pazarama',
    name: 'Pazarama',
    logo: '🛒',
    status: 'error',
    orders: 0,
    products: 0,
    revenue: '₺0',
    color: '#2196f3',
    description: 'Pazaryeri platformu',
  },
  {
    id: 'pttavm',
    name: 'PTT AVM',
    logo: '📮',
    status: 'connected',
    orders: 56,
    products: 178,
    revenue: '₺5,600',
    color: '#ffeb3b',
    description: 'PTT\'nin e-ticaret platformu',
  },
]

function MarketplaceCard({ marketplace }) {
  const [syncEnabled, setSyncEnabled] = useState(marketplace.status === 'connected')

  // API hooks
  const { mutate: syncMarketplace, isLoading: syncLoading } = useSyncMarketplace()
  const { mutate: testConnection, isLoading: testLoading } = useTestMarketplaceConnection()
  const { mutate: updateSettings, isLoading: settingsLoading } = useUpdateMarketplaceSettings()

  const getStatusIcon = () => {
    switch (marketplace.status) {
      case 'connected':
        return <CheckIcon sx={{ color: 'success.main' }} />
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (marketplace.status) {
      case 'connected':
        return 'Bağlı'
      case 'warning':
        return 'Uyarı'
      case 'error':
        return 'Hata'
      default:
        return 'Bilinmiyor'
    }
  }

  const handleSync = () => {
    syncMarketplace(marketplace.id)
  }

  const handleSyncToggle = (enabled) => {
    setSyncEnabled(enabled)
    updateSettings({
      marketplaceId: marketplace.id,
      settings: { autoSync: enabled }
    })
  }

  const handleTestConnection = () => {
    testConnection(marketplace.id)
  }

  return (
    <Card className="stat-card">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                fontSize: '2rem',
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: marketplace.color + '20',
                borderRadius: 2,
              }}
            >
              {marketplace.logo}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {marketplace.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {getStatusIcon()}
                <Typography variant="body2" color="text.secondary">
                  {getStatusText()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton size="small">
            <SettingsIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {marketplace.description}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: marketplace.color }}>
              {marketplace.orders}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sipariş
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: marketplace.color }}>
              {marketplace.products}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ürün
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: marketplace.color }}>
              {marketplace.revenue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gelir
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              Otomatik Senkronizasyon
            </Typography>
            <Switch
              checked={syncEnabled}
              onChange={(e) => handleSyncToggle(e.target.checked)}
              size="small"
              disabled={settingsLoading}
            />
          </Box>
          <Button
            size="small"
            startIcon={syncLoading ? <CircularProgress size={16} /> : <SyncIcon />}
            disabled={marketplace.status === 'error' || syncLoading}
            onClick={handleSync}
          >
            {syncLoading ? 'Senkronize Ediliyor...' : 'Senkronize Et'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

function Marketplaces() {
  // API hooks
  const { data: marketplacesData, isLoading: marketplacesLoading, isError: marketplacesError } = useMarketplaces()
  const { data: statsData, isLoading: statsLoading } = useMarketplaceStats()

  // Use API data or fallback to mock data
  const actualMarketplaces = marketplacesData?.data?.success ? marketplacesData.data.result : marketplaces
  const actualStats = statsData?.data?.success ? statsData.data.result : {
    connectedCount: marketplaces.filter(m => m.status === 'connected').length,
    totalOrders: marketplaces.reduce((sum, m) => sum + m.orders, 0),
    totalProducts: marketplaces.reduce((sum, m) => sum + m.products, 0),
  }

  // Loading state
  if (marketplacesLoading) {
    return (
      <Box className="fade-in" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  // Error state
  if (marketplacesError) {
    return (
      <Box className="fade-in">
        <Alert severity="error">
          Pazaryeri bilgileri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.
        </Alert>
      </Box>
    )
  }

  const connectedCount = actualStats.connectedCount || actualMarketplaces.filter(m => m.status === 'connected').length
  const totalOrders = actualStats.totalOrders || actualMarketplaces.reduce((sum, m) => sum + m.orders, 0)
  const totalProducts = actualStats.totalProducts || actualMarketplaces.reduce((sum, m) => sum + m.products, 0)

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Pazaryerleri
        </Typography>
        <Typography variant="body1" color="text.secondary">
          E-ticaret platformlarınızı yönetin
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Bağlı Platform
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {connectedCount}/{marketplaces.length}
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Toplam Sipariş
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {totalOrders.toLocaleString()}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Toplam Ürün
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {totalProducts.toLocaleString()}
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      <Box sx={{ mb: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Shopify bağlantısında sorun tespit edildi. Lütfen ayarlarınızı kontrol edin.
        </Alert>
        <Alert severity="error">
          Pazarama bağlantısı kurulamadı. API anahtarlarınızı doğrulayın.
        </Alert>
      </Box>

      {/* Marketplace Cards */}
      <Grid container spacing={3}>
        {actualMarketplaces.map((marketplace) => (
          <Grid item xs={12} md={6} lg={4} key={marketplace.id}>
            <MarketplaceCard marketplace={marketplace} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default Marketplaces 