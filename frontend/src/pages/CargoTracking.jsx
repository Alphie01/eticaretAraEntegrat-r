import React, { useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  Search as SearchIcon,
  LocalShipping as ShippingIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { DataGrid } from '@mui/x-data-grid'
import { useCargoStatus, useTrackShipment, useTrackShipmentDetail, useBulkTracking } from '../hooks/useCargoTracking'
import toast from 'react-hot-toast'

// Mock data
const cargoCompanies = [
  { id: 'mng', name: 'MNG Kargo', color: '#dc004e', active: 145 },
  { id: 'aras', name: 'Aras Kargo', color: '#1976d2', active: 89 },
  { id: 'yurtici', name: 'Yurtiçi Kargo', color: '#2e7d32', active: 67 },
  { id: 'surat', name: 'Sürat Kargo', color: '#ed6c02', active: 34 },
  { id: 'ups', name: 'UPS Kargo', color: '#9c27b0', active: 23 },
]

const recentTrackings = [
  {
    id: 1,
    trackingNumber: '1234567890123',
    company: 'MNG Kargo',
    status: 'delivered',
    statusText: 'Teslim Edildi',
    recipient: 'Ahmet Yılmaz',
    city: 'İstanbul',
    updatedAt: '2024-01-15 14:30',
  },
  {
    id: 2,
    trackingNumber: '9876543210987',
    company: 'Aras Kargo',
    status: 'shipped',
    statusText: 'Dağıtımda',
    recipient: 'Elif Demir',
    city: 'Ankara',
    updatedAt: '2024-01-15 12:15',
  },
  {
    id: 3,
    trackingNumber: '5555666677778',
    company: 'Yurtiçi Kargo',
    status: 'processing',
    statusText: 'Transfer Merkezinde',
    recipient: 'Mehmet Özkan',
    city: 'İzmir',
    updatedAt: '2024-01-15 10:45',
  },
  {
    id: 4,
    trackingNumber: '1111222233334',
    company: 'Sürat Kargo',
    status: 'pending',
    statusText: 'Kargo Alındı',
    recipient: 'Ayşe Kaya',
    city: 'Bursa',
    updatedAt: '2024-01-15 09:20',
  },
]

const trackingHistory = [
  {
    date: '2024-01-15 14:30',
    location: 'İstanbul Kadıköy Şubesi',
    status: 'Teslim Edildi',
    description: 'Kargo alıcıya teslim edilmiştir.',
  },
  {
    date: '2024-01-15 09:15',
    location: 'İstanbul Dağıtım Merkezi',
    status: 'Dağıtıma Çıkarıldı',
    description: 'Kargo dağıtım için kurye aracına yüklenmiştir.',
  },
  {
    date: '2024-01-14 22:30',
    location: 'İstanbul Transfer Merkezi',
    status: 'Transfer Merkezinde',
    description: 'Kargo varış transfer merkezine ulaşmıştır.',
  },
  {
    date: '2024-01-14 15:45',
    location: 'Ankara Transfer Merkezi',
    status: 'Yolda',
    description: 'Kargo İstanbul\'a doğru yola çıkmıştır.',
  },
  {
    date: '2024-01-14 10:20',
    location: 'Ankara Çankaya Şubesi',
    status: 'Kargo Alındı',
    description: 'Kargo gönderen tarafından teslim alınmıştır.',
  },
]

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

function StatusChip({ status }) {
  const getStatusProps = () => {
    switch (status) {
      case 'delivered':
        return { label: 'Teslim Edildi', color: 'success', icon: <CheckIcon /> }
      case 'shipped':
        return { label: 'Dağıtımda', color: 'info', icon: <ShippingIcon /> }
      case 'processing':
        return { label: 'İşlemde', color: 'warning', icon: <WarningIcon /> }
      case 'pending':
        return { label: 'Bekliyor', color: 'default', icon: <InfoIcon /> }
      default:
        return { label: status, color: 'default', icon: <InfoIcon /> }
    }
  }

  const { label, color, icon } = getStatusProps()
  return (
    <Chip 
      label={label} 
      color={color} 
      size="small" 
      icon={icon}
      sx={{ fontWeight: 500 }}
    />
  )
}

function CargoCompanyCard({ company }) {
  return (
    <Card className="stat-card">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {company.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {company.active} aktif gönderi
            </Typography>
          </Box>
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2,
              backgroundColor: company.color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: company.color,
            }}
          >
            <ShippingIcon />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function CargoTracking() {
  const [tabValue, setTabValue] = useState(0)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [detailDialog, setDetailDialog] = useState(false)
  const [selectedTracking, setSelectedTracking] = useState(null)
  const [bulkTrackingNumbers, setBulkTrackingNumbers] = useState('')

  // API hooks
  const { data: cargoStatusData, isLoading: statusLoading, refetch: refetchStatus, error: statusError } = useCargoStatus()
  const { mutate: trackShipment, isLoading: trackingLoading } = useTrackShipment()
  const { data: trackingDetailData, isLoading: detailLoading } = useTrackShipmentDetail(
    selectedTracking?.trackingNumber,
    selectedTracking?.company?.toLowerCase(),
    { enabled: !!selectedTracking }
  )
  const { mutate: bulkTrack, isLoading: bulkLoading } = useBulkTracking()

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Lütfen takip numarası girin')
      return
    }

    // Convert company name to lowercase for API
    const companyId = selectedCompany ? cargoCompanies.find(c => c.name === selectedCompany)?.id : 'mng'
    
    trackShipment(
      { trackingNumber, company: companyId },
      {
        onSuccess: (response) => {
          const data = response.data
          if (data.success) {
            setSearchResult({
              trackingNumber: trackingNumber,
              company: selectedCompany || 'MNG Kargo',
              status: data.result?.statusCode?.toLowerCase() || 'pending',
              statusText: data.result?.status || 'Bilinmiyor',
              recipient: data.result?.recipient || 'Bilinmiyor',
              city: data.result?.currentLocation || 'Bilinmiyor',
              updatedAt: data.result?.lastUpdate || new Date().toLocaleString('tr-TR'),
            })
            toast.success('Takip sorgulaması başarılı')
          } else {
            toast.error(data.message || 'Takip bulunamadı')
            setSearchResult(null)
          }
        },
        onError: (error) => {
          console.error('Tracking error:', error)
          toast.error('Takip sorgulaması başarısız oldu')
          setSearchResult(null)
        }
      }
    )
  }

  const handleBulkTrack = () => {
    const numbers = bulkTrackingNumbers
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0)

    if (numbers.length === 0) {
      toast.error('Lütfen takip numaralarını girin')
      return
    }

    if (numbers.length > 50) {
      toast.error('Maksimum 50 takip numarası sorgulayabilirsiniz')
      return
    }

    const companyId = selectedCompany ? cargoCompanies.find(c => c.name === selectedCompany)?.id : 'mng'

    bulkTrack(
      { trackingNumbers: numbers, company: companyId },
      {
        onSuccess: (response) => {
          const data = response.data
          if (data.success) {
            toast.success(`${numbers.length} takip numarası sorgulandı`)
          } else {
            toast.error(data.message || 'Toplu takip sorgulaması başarısız')
          }
        }
      }
    )
  }

  const handleViewDetail = (tracking) => {
    setSelectedTracking(tracking)
    setDetailDialog(true)
  }

  const columns = [
    {
      field: 'trackingNumber',
      headerName: 'Takip Numarası',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'company',
      headerName: 'Kargo Firması',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'status',
      headerName: 'Durum',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'recipient',
      headerName: 'Alıcı',
      width: 150,
    },
    {
      field: 'city',
      headerName: 'Şehir',
      width: 120,
    },
    {
      field: 'updatedAt',
      headerName: 'Son Güncelleme',
      width: 160,
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 120,
      renderCell: (params) => (
        <IconButton 
          size="small" 
          onClick={() => handleViewDetail(params.row)}
          color="primary"
        >
          <TimelineIcon />
        </IconButton>
      ),
    },
  ]

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Kargo Takip
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tüm kargo firmalarından gönderi takibi yapın
        </Typography>
      </Box>

      {/* Cargo Companies Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cargoCompanies.map((company) => (
          <Grid item xs={12} sm={6} lg={2.4} key={company.id}>
            <CargoCompanyCard company={company} />
          </Grid>
        ))}
      </Grid>

      {/* Error Alert for Cargo Services */}
      {statusError && (
        <Alert 
          severity="warning" 
          sx={{ mb: 4 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
              startIcon={statusLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              {statusLoading ? 'Kontrol Ediliyor...' : 'Tekrar Dene'}
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Kargo servisleri şu anda kullanılamıyor.</strong>
            <br />
            Bağlantı sorunları yaşanabilir. Lütfen daha sonra tekrar deneyin.
          </Typography>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Takip Sorgula" />
            <Tab label="Son Takipler" />
            <Tab label="Toplu Takip" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Single Tracking Search */}
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2} alignItems="end">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Kargo Firması</InputLabel>
                  <Select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    label="Kargo Firması"
                  >
                    <MenuItem value="">Otomatik Tespit</MenuItem>
                    {cargoCompanies.map((company) => (
                      <MenuItem key={company.id} value={company.name}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Takip Numarası"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Takip numaranızı girin"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSearch}
                  disabled={trackingLoading || !trackingNumber.trim()}
                  startIcon={trackingLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{ height: 56 }}
                >
                  {trackingLoading ? 'Sorgulanıyor...' : 'Sorgula'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Search Result */}
          {searchResult && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Takip Sonucu
                  </Typography>
                  <StatusChip status={searchResult.status} />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Takip Numarası
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {searchResult.trackingNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Kargo Firması
                    </Typography>
                    <Typography variant="body1">
                      {searchResult.company}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Alıcı
                    </Typography>
                    <Typography variant="body1">
                      {searchResult.recipient}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Son Güncelleme
                    </Typography>
                    <Typography variant="body1">
                      {searchResult.updatedAt}
                    </Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<TimelineIcon />}
                    onClick={() => handleViewDetail(searchResult)}
                  >
                    Detaylı Geçmiş
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Recent Trackings Table */}
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={recentTrackings}
              columns={columns}
              pageSize={25}
              rowsPerPageOptions={[25, 50, 100]}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f0f0f0',
                },
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Bulk Tracking */}
          <Alert severity="info" sx={{ mb: 3 }}>
            Birden fazla takip numarasını aynı anda sorgulayabilirsiniz. Her satıra bir takip numarası yazın.
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={10}
                label="Takip Numaraları"
                placeholder="Her satıra bir takip numarası yazın..."
                variant="outlined"
                value={bulkTrackingNumbers}
                onChange={(e) => setBulkTrackingNumbers(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={bulkLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{ mr: 2 }}
                  onClick={handleBulkTrack}
                  disabled={bulkLoading || !bulkTrackingNumbers.trim()}
                >
                  {bulkLoading ? 'Sorgulanıyor...' : 'Toplu Sorgula'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => setBulkTrackingNumbers('')}
                >
                  Temizle
                </Button>
              </Box>
              
              <Paper sx={{ p: 2, height: 300, overflow: 'auto' }}>
                <Typography variant="body2" color="text.secondary">
                  Sonuçlar burada görünecek...
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Kargo Takip Detayı
          {selectedTracking && (
            <Typography variant="body2" color="text.secondary">
              {selectedTracking.trackingNumber} - {selectedTracking.company}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <List>
            {trackingHistory.map((item, index) => (
              <React.Fragment key={index}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.date}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.location}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < trackingHistory.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CargoTracking 