import React, { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  TrendingUp,
  ShoppingCart,
  Store,
  AccountBalance
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
  Area,
  AreaChart
} from 'recharts'
import api from '../services/api'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

function Reports() {
  const [period, setPeriod] = useState('7d')
  const [marketplace, setMarketplace] = useState('')

  // Fetch sales report
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery(
    ['reports-sales', period, marketplace],
    async () => {
      const params = new URLSearchParams()
      if (period) {
        const now = new Date()
        let startDate = new Date()
        
        switch (period) {
          case '7d':
            startDate.setDate(now.getDate() - 7)
            break
          case '30d':
            startDate.setDate(now.getDate() - 30)
            break
          case '90d':
            startDate.setDate(now.getDate() - 90)
            break
          default:
            startDate.setDate(now.getDate() - 7)
        }
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', now.toISOString())
      }
      if (marketplace) params.append('marketplace', marketplace)
      
      const response = await api.get(`/reports/sales?${params}`)
      return response.data
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  )

  // Fetch marketplace comparison
  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery(
    ['reports-marketplace'],
    async () => {
      const response = await api.get('/reports/marketplace-comparison')
      return response.data
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  )

  // Fetch financial summary
  const { data: financialData, isLoading: financialLoading } = useQuery(
    ['reports-financial', period],
    async () => {
      const params = new URLSearchParams()
      if (period) {
        const now = new Date()
        let startDate = new Date()
        
        switch (period) {
          case '7d':
            startDate.setDate(now.getDate() - 7)
            break
          case '30d':
            startDate.setDate(now.getDate() - 30)
            break
          case '90d':
            startDate.setDate(now.getDate() - 90)
            break
        }
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', now.toISOString())
      }
      
      const response = await api.get(`/reports/financial?${params}`)
      return response.data
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  )

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value)
  }

  const handleMarketplaceChange = (event) => {
    setMarketplace(event.target.value)
  }

  const refetchAll = () => {
    refetchSales()
  }

  const formatCurrency = (value) => {
    return `₺${parseFloat(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
  }

  const isLoading = salesLoading || marketplaceLoading || financialLoading

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Raporlar
        </Typography>
          <IconButton onClick={refetchAll} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Satış performansı ve analitik raporlarınızı görüntüleyin
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Zaman Aralığı"
                value={period}
                onChange={handlePeriodChange}
              >
                <MenuItem value="7d">Son 7 Gün</MenuItem>
                <MenuItem value="30d">Son 30 Gün</MenuItem>
                <MenuItem value="90d">Son 90 Gün</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Pazaryeri"
                value={marketplace}
                onChange={handleMarketplaceChange}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="trendyol">Trendyol</MenuItem>
                <MenuItem value="hepsiburada">Hepsiburada</MenuItem>
                <MenuItem value="amazon">Amazon</MenuItem>
                <MenuItem value="n11">N11</MenuItem>
                <MenuItem value="shopify">Shopify</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Toplam Gelir
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatCurrency(financialData?.data?.summary?.totalRevenue)}
                      </Typography>
                    </Box>
                    <AccountBalance sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Toplam Sipariş
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {financialData?.data?.summary?.totalOrders || 0}
                      </Typography>
                    </Box>
                    <ShoppingCart sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Ortalama Sipariş
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatCurrency(financialData?.data?.summary?.avgOrderValue)}
                      </Typography>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Kargo Bedeli
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatCurrency(financialData?.data?.summary?.totalShipping)}
                      </Typography>
                    </Box>
                    <Store sx={{ fontSize: 40, color: 'info.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Sales Trend */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Satış Trendi
                  </Typography>
                  {salesData?.data?.salesData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesData.data.salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'totalOrders' ? `${value} sipariş` : formatCurrency(value),
                            name === 'totalOrders' ? 'Sipariş Sayısı' : 'Gelir'
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="totalRevenue" 
                          stackId="1"
                          stroke="#1976d2" 
                          fill="#1976d2" 
                          fillOpacity={0.3}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalOrders" 
                          stroke="#2e7d32" 
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        Henüz satış verisi bulunmuyor
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Marketplace Performance */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                    Pazaryeri Performansı
                  </Typography>
                  {marketplaceData?.data?.orderComparison?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={marketplaceData.data.orderComparison}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="totalOrders"
                            label={(entry) => entry._id}
                          >
                            {marketplaceData.data.orderComparison.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} sipariş`, 'Sipariş']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2 }}>
                        {marketplaceData.data.orderComparison.slice(0, 4).map((item, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: COLORS[index % COLORS.length],
                                mr: 1,
                              }}
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {item._id || 'Bilinmeyen'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.totalOrders}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        Henüz pazaryeri verisi bulunmuyor
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Revenue by Payment Status */}
          {financialData?.data?.revenueByPaymentStatus?.length > 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                      Ödeme Durumuna Göre Gelir
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={financialData.data.revenueByPaymentStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(value), 'Gelir']} />
                        <Bar dataKey="totalRevenue" fill="#1976d2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* No Data Message */}
          {!salesData?.data?.salesData?.length && 
           !marketplaceData?.data?.orderComparison?.length && 
           !financialData?.data?.summary?.totalOrders && (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    📊 Henüz rapor verisi bulunmuyor
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Siparişler ve satışlar gerçekleştikçe raporlar burada görüntülenecektir.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  )
}

export default Reports 