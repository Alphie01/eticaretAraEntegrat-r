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
  InputAdornment,
  Avatar
} from '@mui/material'
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Add as AddIcon
} from '@mui/icons-material'
import api from '../services/api'

const statusColors = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
  archived: 'error'
}

const statusLabels = {
  active: 'Aktif',
  inactive: 'Pasif',
  draft: 'Taslak',
  archived: 'Arşivlenmiş'
}

function Products() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')

  const { data: productsData, isLoading, isError, refetch } = useQuery(
    ['products', page, search, status, category],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (search) params.append('search', search)
      if (status) params.append('status', status)
      if (category) params.append('category', category)

      const response = await api.get(`/products?${params}`)
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

  const handleCategoryChange = (event) => {
    setCategory(event.target.value)
    setPage(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatPrice = (price) => {
    if (!price) return '₺0'
    return `₺${parseFloat(price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
  }

  const getStockStatus = (stock) => {
    if (!stock || stock === 0) return { label: 'Stokta Yok', color: 'error' }
    if (stock < 10) return { label: 'Az Stok', color: 'warning' }
    return { label: 'Stokta Var', color: 'success' }
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
          Ürünler yüklenirken hata oluştu. Yenilemek için butona tıklayın.
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
            Ürünler
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={refetch} color="primary">
              <RefreshIcon />
            </IconButton>
            <IconButton color="primary">
              <AddIcon />
            </IconButton>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Ürün envanterinizi ve pazaryeri entegrasyonlarını yönetin
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Ürün ara..."
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
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="inactive">Pasif</MenuItem>
                <MenuItem value="draft">Taslak</MenuItem>
                <MenuItem value="archived">Arşivlenmiş</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Kategori"
                value={category}
                onChange={handleCategoryChange}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="electronics">Elektronik</MenuItem>
                <MenuItem value="clothing">Giyim</MenuItem>
                <MenuItem value="home">Ev & Yaşam</MenuItem>
                <MenuItem value="books">Kitap</MenuItem>
                <MenuItem value="sports">Spor</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : productsData?.data?.length > 0 ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ürün</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Kategori</TableCell>
                      <TableCell>Fiyat</TableCell>
                      <TableCell>Stok</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>Güncelleme</TableCell>
                      <TableCell>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productsData.data.map((product) => {
                      const stockStatus = getStockStatus(product.total_stock)
                      return (
                        
                        <TableRow key={product.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                src={product.main_image || product.images[0].image_url}
                                sx={{ width: 40, height: 40 }}
                              >
                                {product.name?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {product.name || 'İsimsiz Ürün'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {product.brand || ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {product.variants.length} varyant
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {product.sku || product.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {product.category_name || product.category || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatPrice(product.base_price || product.sale_price)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {product.total_stock || 0}
                              </Typography>
                              <Chip
                                label={stockStatus.label}
                                color={stockStatus.color}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabels[product.status] || product.status || 'Bilinmeyen'}
                              color={statusColors[product.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(product.updated_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="primary">
                              <ViewIcon />
                            </IconButton>
                            <IconButton size="small" color="primary">
                              <EditIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {productsData.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={productsData.pages}
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
                📱 Henüz ürün bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ürün ekleyerek envanter yönetiminize başlayabilirsiniz.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {productsData?.total > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Toplam {productsData.total} ürün bulundu
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default Products 