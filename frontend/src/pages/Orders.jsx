import React, { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Pagination,
  InputAdornment
} from '@mui/material'
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material'
import api from '../services/api'

const statusColors = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  returned: 'default'
}

const statusLabels = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
  returned: 'İade Edildi'
}

function Orders() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [marketplace, setMarketplace] = useState('')

  const { data: ordersData, isLoading, isError, refetch } = useQuery(
    ['orders', page, search, status, marketplace],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (search) params.append('search', search)
      if (status) params.append('status', status)
      if (marketplace) params.append('marketplace', marketplace)

      const response = await api.get(`/orders?${params}`)
      return response.data
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  const handlePageChange = (event, newPage) => {
    setPage(newPage)
  }

  const handleSearch = (event) => {
    setSearch(event.target.value)
    setPage(1) // Reset to first page when searching
  }

  const handleStatusChange = (event) => {
    setStatus(event.target.value)
    setPage(1)
  }

  const handleMarketplaceChange = (event) => {
    setMarketplace(event.target.value)
    setPage(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount) => {
    if (!amount) return '₺0'
    return `₺${parseFloat(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
  }

  if (isError) {
    return (
      <Box className="fade-in">
        <Alert 
          severity="error" 
          action={
            <IconButton onClick={refetch} size="small">
              <RefreshIcon />
            </IconButton>
          }
        >
          Siparişler yüklenirken hata oluştu. Yenilemek için butona tıklayın.
        </Alert>
      </Box>
    )
  }

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Siparişler
        </Typography>
          <IconButton onClick={refetch} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Tüm pazaryerlerinden gelen siparişlerinizi yönetin
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sipariş ara..."
                value={search}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Durum"
                value={status}
                onChange={handleStatusChange}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="pending">Bekliyor</MenuItem>
                <MenuItem value="processing">Hazırlanıyor</MenuItem>
                <MenuItem value="shipped">Kargoda</MenuItem>
                <MenuItem value="delivered">Teslim Edildi</MenuItem>
                <MenuItem value="cancelled">İptal Edildi</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
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

      {/* Orders Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : ordersData?.data?.length > 0 ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sipariş No</TableCell>
                      <TableCell>Müşteri</TableCell>
                      <TableCell>Pazaryeri</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Tutar</TableCell>
                      <TableCell>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordersData.data.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {order.order_number || order.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {order.customer_name || 'Bilinmeyen'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.customer_email || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={order.marketplace_name || 'Website'} 
                            size="small" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[order.status] || order.status}
                            color={statusColors[order.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(order.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatAmount(order.total_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary">
                            <ViewIcon />
                          </IconButton>
                          <IconButton size="small" color="primary">
                            <ShippingIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {ordersData.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={ordersData.pages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                📦 Henüz sipariş bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pazaryerlerinizden siparişler geldiğinde burada görüntülenecektir.
          </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {ordersData?.total > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Toplam {ordersData.total} sipariş bulundu
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default Orders 