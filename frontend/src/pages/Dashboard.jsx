import React from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  ShoppingCart as OrderIcon,
  Inventory as ProductIcon,
  Store as StoreIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDashboardData } from '../hooks/useDashboard'
import { useCargoStatus } from '../hooks/useCargoTracking'
import { useMarketplaces } from '../hooks/useMarketplaces'
import toast from 'react-hot-toast'

// Mock data
const statsData = [
  {
    title: 'Toplam Sipariş',
    value: '1,247',
    change: '+12%',
    changeType: 'positive',
    icon: <OrderIcon />,
    color: '#1976d2',
  },
  {
    title: 'Aktif Ürün',
    value: '3,856',
    change: '+5%',
    changeType: 'positive',
    icon: <ProductIcon />,
    color: '#2e7d32',
  },
  {
    title: 'Pazaryeri',
    value: '8',
    change: '0%',
    changeType: 'neutral',
    icon: <StoreIcon />,
    color: '#ed6c02',
  },
  {
    title: 'Kargo Takip',
    value: '456',
    change: '+18%',
    changeType: 'positive',
    icon: <ShippingIcon />,
    color: '#9c27b0',
  },
]

const recentOrders = [
  { id: '#12345', platform: 'Trendyol', amount: '₺245', status: 'delivered', time: '2 saat önce' },
  { id: '#12344', platform: 'Hepsiburada', amount: '₺189', status: 'shipped', time: '4 saat önce' },
  { id: '#12343', platform: 'Amazon', amount: '₺456', status: 'processing', time: '6 saat önce' },
  { id: '#12342', platform: 'N11', amount: '₺129', status: 'pending', time: '8 saat önce' },
]

const marketplaceData = [
  { name: 'Trendyol', orders: 456, color: '#f27a1a' },
  { name: 'Hepsiburada', orders: 234, color: '#ff6000' },
  { name: 'Amazon', orders: 189, color: '#ff9900' },
  { name: 'N11', orders: 167, color: '#f5a623' },
  { name: 'Shopify', orders: 145, color: '#95bf47' },
  { name: 'Diğer', orders: 56, color: '#6c757d' },
]

const salesData = [
  { name: 'Pzt', orders: 24, revenue: 2400 },
  { name: 'Sal', orders: 13, revenue: 1398 },
  { name: 'Çar', orders: 32, revenue: 3200 },
  { name: 'Per', orders: 28, revenue: 2800 },
  { name: 'Cum', orders: 45, revenue: 4500 },
  { name: 'Cmt', orders: 67, revenue: 6700 },
  { name: 'Paz', orders: 52, revenue: 5200 },
]

const cargoStatus = [
  { company: 'MNG Kargo', active: 145, delivered: 1234, pending: 23, status: 'active' },
  { company: 'Aras Kargo', active: 89, delivered: 876, pending: 12, status: 'active' },
  { company: 'Yurtiçi Kargo', active: 67, delivered: 654, pending: 8, status: 'active' },
  { company: 'Sürat Kargo', active: 34, delivered: 432, pending: 5, status: 'active' },
  { company: 'UPS Kargo', active: 23, delivered: 298, pending: 3, status: 'warning' },
]

function StatCard({ title, value, change, changeType, icon, color }) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'success.main'
      case 'negative': return 'error.main'
      default: return 'text.secondary'
    }
  }

  return (
    <Card className="stat-card" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {value}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: getChangeColor(),
                fontWeight: 500,
              }}
            >
              {change} bu ay
            </Typography>
          </Box>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              backgroundColor: color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function StatusChip({ status }) {
  const getStatusProps = () => {
    switch (status) {
      case 'delivered':
        return { label: 'Teslim Edildi', color: 'success' }
      case 'shipped':
        return { label: 'Kargoda', color: 'info' }
      case 'processing':
        return { label: 'Hazırlanıyor', color: 'warning' }
      case 'pending':
        return { label: 'Bekliyor', color: 'default' }
      default:
        return { label: status, color: 'default' }
    }
  }

  const { label, color } = getStatusProps()
  return <Chip label={label} color={color} size="small" />
}

function Dashboard() {
  // API hooks
  const {
    stats,
    recentOrders,
    health,
    salesTrends,
    marketplacePerformance,
    cargoPerformance,
    isLoading,
    isError,
    refetchAll
  } = useDashboardData()

  const { data: cargoStatusData, isLoading: cargoLoading } = useCargoStatus()
  const { data: marketplacesData, isLoading: marketplacesLoading } = useMarketplaces()

  // Loading state
  if (isLoading) {
    return (
      <Box className="fade-in" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  // Error state
  if (isError) {
    return (
      <Box className="fade-in">
        <Alert 
          severity="error" 
          action={
            <IconButton onClick={refetchAll} size="small">
              <RefreshIcon />
            </IconButton>
          }
        >
          Dashboard verileri yüklenirken hata oluştu. Yenilemek için butona tıklayın.
        </Alert>
      </Box>
    )
  }

  // Use API data or fallback to mock data
  const actualStatsData = stats?.data?.success ? [
    {
      title: 'Toplam Sipariş',
      value: stats.data.result?.totalOrders?.toString() || '0',
      change: `+${stats.data.result?.orderGrowth || 0}%`,
      changeType: 'positive',
      icon: <OrderIcon />,
      color: '#1976d2',
    },
    {
      title: 'Aktif Ürün',
      value: stats.data.result?.totalProducts?.toString() || '0',
      change: `+${stats.data.result?.productGrowth || 0}%`,
      changeType: 'positive',
      icon: <ProductIcon />,
      color: '#2e7d32',
    },
    {
      title: 'Pazaryeri',
      value: stats.data.result?.totalMarketplaces?.toString() || '8',
      change: '0%',
      changeType: 'neutral',
      icon: <StoreIcon />,
      color: '#ed6c02',
    },
    {
      title: 'Kargo Takip',
      value: stats.data.result?.totalShipments?.toString() || '0',
      change: `+${stats.data.result?.shipmentGrowth || 0}%`,
      changeType: 'positive',
      icon: <ShippingIcon />,
      color: '#9c27b0',
    },
  ] : statsData

  const actualRecentOrders = recentOrders?.data?.success ? recentOrders.data.result : recentOrders
  const actualSalesData = salesTrends?.data?.success ? salesTrends.data.result : salesData
  const actualMarketplaceData = marketplacePerformance?.data?.success ? marketplacePerformance.data.result : marketplaceData
  const actualCargoStatus = cargoStatusData?.success ? Object.entries(cargoStatusData).map(([company, data]) => ({
    company: company.toUpperCase() + ' Kargo',
    active: data.activeShipments || 0,
    delivered: data.deliveredShipments || 0,
    pending: data.pendingShipments || 0,
    status: data.success ? 'active' : 'warning'
  })) : cargoStatus

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          E-ticaret entegrasyon sisteminizin genel durumu
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {actualStatsData.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Charts and Recent Activity */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Haftalık Satış Trendi
                </Typography>
                <IconButton size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={actualSalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'orders' ? `${value} sipariş` : `₺${value}`,
                      name === 'orders' ? 'Sipariş' : 'Gelir'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#1976d2" 
                    strokeWidth={3}
                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2e7d32" 
                    strokeWidth={3}
                    dot={{ fill: '#2e7d32', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Marketplace Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Pazaryeri Dağılımı
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={actualMarketplaceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="orders"
                  >
                    {actualMarketplaceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} sipariş`, 'Sipariş']} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {actualMarketplaceData.slice(0, 4).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.orders}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders and Cargo Status */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Son Siparişler
              </Typography>
              <List>
                {actualRecentOrders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <OrderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {order.id}
                            </Typography>
                            <Chip label={order.platform} size="small" variant="outlined" />
                          </Box>
                        }
                        secondary={order.time}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {order.amount}
                        </Typography>
                        <StatusChip status={order.status} />
                      </Box>
                    </ListItem>
                    {index < actualRecentOrders.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Cargo Status */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Kargo Durumu
              </Typography>
              <List>
                {actualCargoStatus.map((cargo, index) => (
                  <React.Fragment key={cargo.company}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <ShippingIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {cargo.company}
                            </Typography>
                            <CheckIcon 
                              sx={{ 
                                fontSize: 16, 
                                color: cargo.status === 'active' ? 'success.main' : 'warning.main' 
                              }} 
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Aktif: {cargo.active} | Teslim: {cargo.delivered} | Bekleyen: {cargo.pending}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < actualCargoStatus.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard 