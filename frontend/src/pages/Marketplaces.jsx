import React, { useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import {
  Store as StoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Quiz as TestIcon,
} from "@mui/icons-material";
import {
  useMarketplaces,
  useMarketplaceStats,
  useSyncMarketplace,
  useTestMarketplaceConnection,
  useUpdateMarketplaceSettings,
} from "../hooks/useMarketplaces";
import toast from "react-hot-toast";

const supportedMarketplaces = [
  {
    id: "trendyol",
    name: "Trendyol",
    logo: "🛒",
    color: "#f27a1a",
    description: "Türkiye'nin en büyük e-ticaret platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      {
        key: "apiSecret",
        label: "API Secret",
        type: "password",
        required: true,
      },
      { key: "supplierId", label: "Supplier ID", type: "text", required: true },
    ],
  },
  {
    id: "hepsiburada",
    name: "Hepsiburada",
    logo: "🏪",
    color: "#ff6000",
    description: "Teknoloji ve genel ürün kategorileri",
    credentials: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "password", label: "Password", type: "password", required: true },
      {
        key: "merchantId",
        label: "Merchant ID",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "amazon",
    name: "Amazon",
    logo: "📦",
    color: "#ff9900",
    description: "Uluslararası e-ticaret platformu",
    credentials: [
      {
        key: "accessKeyId",
        label: "Access Key ID",
        type: "text",
        required: true,
      },
      {
        key: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
      },
      {
        key: "merchantId",
        label: "Merchant ID",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "n11",
    name: "N11",
    logo: "🛍️",
    color: "#f5a623",
    description: "Çok kategorili alışveriş sitesi",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      {
        key: "apiSecret",
        label: "API Secret",
        type: "password",
        required: true,
      },
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    logo: "🏬",
    color: "#95bf47",
    description: "Kendi mağazanız için e-ticaret platform",
    credentials: [
      { key: "shopDomain", label: "Shop Domain", type: "text", required: true },
      {
        key: "accessToken",
        label: "Access Token",
        type: "password",
        required: true,
      },
    ],
  },
  {
    id: "ciceksepeti",
    name: "ÇiçekSepeti",
    logo: "🌸",
    color: "#e91e63",
    description: "Çiçek ve hediye platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
  {
    id: "pazarama",
    name: "Pazarama",
    logo: "🛒",
    color: "#2196f3",
    description: "Pazaryeri platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      {
        key: "apiSecret",
        label: "API Secret",
        type: "password",
        required: true,
      },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
  {
    id: "pttavm",
    name: "PTT AVM",
    logo: "📮",
    color: "#ffeb3b",
    description: "PTT'nin e-ticaret platformu",
    credentials: [
      { key: "apiKey", label: "API Key", type: "text", required: true },
      {
        key: "apiSecret",
        label: "API Secret",
        type: "password",
        required: true,
      },
      { key: "sellerId", label: "Seller ID", type: "text", required: false },
    ],
  },
];

function MarketplaceCard({ marketplace, onEdit, onTest, onSync }) {
  const [syncEnabled, setSyncEnabled] = useState(
    marketplace.status === "connected"
  );
  const [testLoading, setTestLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const getStatusIcon = () => {
    switch (marketplace.status) {
      case "connected":
        return <CheckIcon sx={{ color: "success.main" }} />;
      case "warning":
        return <WarningIcon sx={{ color: "warning.main" }} />;
      case "error":
        return <ErrorIcon sx={{ color: "error.main" }} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    console.log(marketplace);
    switch (marketplace.status) {
      case "connected":
        return "Bağlı";
      case "warning":
        return "Uyarı";
      case "error":
        return "Hata";
      default:
        return "Yapılandırılmamış";
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      await onTest(marketplace.id);
      toast.success(`${marketplace.name} bağlantı testi başarılı`);
    } catch (error) {
      toast.error(`${marketplace.name} bağlantı testi başarısız`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      await onSync(marketplace.id);
      toast.success(`${marketplace.name} senkronizasyonu başarılı`);
    } catch (error) {
      toast.error(`${marketplace.name} senkronizasyonu başarısız`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncToggle = (enabled) => {
    setSyncEnabled(enabled);
    // Implement auto sync settings update
  };

  return (
    <Card className="stat-card">
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                fontSize: "2rem",
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: marketplace.color + "20",
                borderRadius: 2,
              }}
            >
              {marketplace.logo}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {marketplace.name}
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
              >
                {getStatusIcon()}
                <Typography variant="body2" color="text.secondary">
                  {getStatusText()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton size="small" onClick={() => onEdit(marketplace.id)}>
              {marketplace.hasCredentials ? <EditIcon /> : <AddIcon />}
            </IconButton>
            {marketplace.hasCredentials && (
              <IconButton
                size="small"
                onClick={handleTest}
                disabled={testLoading}
              >
                {testLoading ? <CircularProgress size={16} /> : <TestIcon />}
              </IconButton>
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {marketplace.description}
        </Typography>

        {marketplace.hasCredentials && (
          <>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: marketplace.color }}
                >
                  {marketplace.orders || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sipariş
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: marketplace.color }}
                >
                  {marketplace.products || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ürün
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: marketplace.color }}
                >
                  {marketplace.revenue || "₺0"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Gelir
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2">Otomatik Senkronizasyon</Typography>
                <Switch
                  checked={syncEnabled}
                  onChange={(e) => handleSyncToggle(e.target.checked)}
                  size="small"
                  disabled={marketplace.status !== "connected"}
                />
              </Box>
              <Button
                size="small"
                startIcon={
                  syncLoading ? <CircularProgress size={16} /> : <SyncIcon />
                }
                disabled={marketplace.status !== "connected" || syncLoading}
                onClick={handleSync}
              >
                {syncLoading ? "Senkronize Ediliyor..." : "Senkronize Et"}
              </Button>
            </Box>
          </>
        )}

        {!marketplace.hasCredentials && (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bu pazaryeri henüz yapılandırılmamış
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onEdit(marketplace.id)}
              sx={{ backgroundColor: marketplace.color }}
            >
              Kimlik Bilgilerini Ekle
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function CredentialsModal({ open, onClose, marketplace, onSubmit }) {
  const [credentials, setCredentials] = useState({});
  const [loading, setLoading] = useState(false);

  const marketplaceConfig = supportedMarketplaces.find(
    (m) => m.id === marketplace
  );

  const handleSubmit = async () => {
    if (!marketplaceConfig) return;

    // Validate required fields
    const requiredFields = marketplaceConfig.credentials.filter(
      (c) => c.required
    );
    const missingFields = requiredFields.filter(
      (field) => !credentials[field.key]
    );

    if (missingFields.length > 0) {
      toast.error(
        `Lütfen gerekli alanları doldurun: ${missingFields.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit(marketplace, credentials);
      onClose();
      toast.success(`${marketplaceConfig.name} kimlik bilgileri kaydedildi`);
    } catch (error) {
      console.log(error);
      toast.error(`Kimlik bilgileri kaydedilemedi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setCredentials((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!marketplaceConfig) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ fontSize: "1.5rem" }}>{marketplaceConfig.logo}</Box>
          <Box>
            <Typography variant="h6">
              {marketplaceConfig.name} Kimlik Bilgileri
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {marketplaceConfig.description}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {marketplaceConfig.credentials.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              type={field.type}
              value={credentials[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              required={field.required}
              fullWidth
              variant="outlined"
            />
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Marketplaces() {
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);

  // API hooks
  const {
    data: marketplacesData,
    isLoading: marketplacesLoading,
    isError: marketplacesError,
    refetch,
  } = useMarketplaces();
  const { data: statsData, isLoading: statsLoading } = useMarketplaceStats();

  // Debug logging
  console.log("🔍 Marketplaces API Response:", {
    data: marketplacesData,
    isLoading: marketplacesLoading,
    isError: marketplacesError,
    dataType: typeof marketplacesData?.data,
    isArray: Array.isArray(marketplacesData?.data),
    dataKeys: marketplacesData?.data
      ? Object.keys(marketplacesData.data)
      : null,
    fullResponse: marketplacesData,
  });

  // Get marketplace data - merge with supported marketplaces
  const marketplaceData = supportedMarketplaces.map((supported) => {
    // Find user's credentials for this marketplace from the database
    // Handle different possible data structures
    let userCredentials = null;
    let statusData = null;

    // The API returns data in this structure:
    // { success: true, data: [...], configurations: [...], marketplaces: [...] }
    if (marketplacesData?.data) {
      // First try to get credentials from the main data array
      if (Array.isArray(marketplacesData.data)) {
        userCredentials = marketplacesData.data.find(
          (cred) => cred.marketplace === supported.id
        );
      }
      // If not found, try configurations array
      if (
        !userCredentials &&
        marketplacesData.data.configurations &&
        Array.isArray(marketplacesData.data.configurations)
      ) {
        userCredentials = marketplacesData.data.configurations.find(
          (config) => config.marketplace === supported.id
        );
      }
      // If still not found, try the root level configurations
      if (
        !userCredentials &&
        marketplacesData.configurations &&
        Array.isArray(marketplacesData.configurations)
      ) {
        userCredentials = marketplacesData.configurations.find(
          (config) => config.marketplace === supported.id
        );
      }

      // Get status data from marketplaces array
      if (
        marketplacesData.data.marketplaces &&
        Array.isArray(marketplacesData.data.marketplaces)
      ) {
        statusData = marketplacesData.data.marketplaces.find(
          (m) => m.id === supported.id
        );
      }
      // If not found, try root level marketplaces
      if (
        !statusData &&
        marketplacesData.marketplaces &&
        Array.isArray(marketplacesData.marketplaces)
      ) {
        statusData = marketplacesData.marketplaces.find(
          (m) => m.id === supported.id
        );
      }
    }

    // Safety check - if no credentials found, assume none exist
    if (!userCredentials) {
      console.log(`No credentials found for ${supported.id}`);
    }

    console.log("Marketplace data:", marketplacesData?.data);
    console.log("User credentials for", supported.id, ":", userCredentials);

    return {
      ...supported,
      hasCredentials: !!userCredentials,
      isActive: userCredentials?.is_active || false,
      isConnected: !!userCredentials?.has_api_key,
      status:
        statusData?.status ||
        (userCredentials?.has_api_key ? "connected" : "error"),
      orders: statusData?.orders || 0,
      products: statusData?.products || 0,
      revenue: statusData?.revenue || "₺0",
      lastUsed: userCredentials?.last_sync_date,
      credentialsId: userCredentials?.id,
    };
  });

  const activeCount = marketplaceData.filter((m) => m.isConnected).length;
  const configuredCount = marketplaceData.filter(
    (m) => m.hasCredentials
  ).length;

  const handleEditMarketplace = (marketplaceId) => {
    setSelectedMarketplace(marketplaceId);
    setCredentialsModalOpen(true);
  };

  const handleSaveCredentials = async (marketplaceId, credentials) => {
    try {
      // Map frontend credentials to backend format
      const mappedCredentials = {};

      // Map based on marketplace type
      const marketplaceConfig = supportedMarketplaces.find(
        (m) => m.id === marketplaceId
      );

      if (marketplaceConfig) {
        // Map field names to standard backend fields
        marketplaceConfig.credentials.forEach((field) => {
          if (credentials[field.key]) {
            switch (field.key) {
              case "apiKey":
                mappedCredentials.api_key = credentials[field.key];
                break;
              case "apiSecret":
                mappedCredentials.api_secret = credentials[field.key];
                break;
              case "supplierId":
                mappedCredentials.supplier_id = credentials[field.key];
                break;
              case "merchantId":
                mappedCredentials.merchant_id = credentials[field.key];
                break;
              case "username":
                mappedCredentials.api_key = credentials[field.key]; // Hepsiburada username -> api_key
                break;
              case "password":
                mappedCredentials.api_secret = credentials[field.key]; // Hepsiburada password -> api_secret
                break;
              case "accessKeyId":
                mappedCredentials.api_key = credentials[field.key]; // Amazon accessKeyId -> api_key
                break;
              case "secretAccessKey":
                mappedCredentials.api_secret = credentials[field.key]; // Amazon secretAccessKey -> api_secret
                break;
              case "shopDomain":
                mappedCredentials.shop_domain = credentials[field.key]; // Shopify shopDomain -> shop_domain
                break;
              case "accessToken":
                mappedCredentials.api_secret = credentials[field.key]; // Shopify accessToken -> api_secret
                break;
              case "sellerId":
                mappedCredentials.seller_id = credentials[field.key];
                break;
              default:
                mappedCredentials[field.key] = credentials[field.key];
            }
          }
        });
      }

      console.log("🔑 Sending credentials to backend:", {
        marketplaceId,
        mappedCredentials: {
          ...mappedCredentials,
          api_key: mappedCredentials.api_key ? "***" : undefined,
          api_secret: mappedCredentials.api_secret ? "***" : undefined,
        },
      });

      // Call API to save credentials
      const response = await fetch(
        `http://localhost:25628/api/v1/marketplace-keys/${marketplaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(mappedCredentials),
        }
      );

      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            errorData.error ||
            "Kimlik bilgileri kaydedilemedi"
        );
      }

      // Refresh data
      refetch();
    } catch (error) {
      throw error;
    }
  };

  const handleTestConnection = async (marketplaceId) => {
    const response = await fetch(
      `http://localhost:25628/api/v1/marketplace-keys/${marketplaceId}/test`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || errorData.error || "Bağlantı testi başarısız"
      );
    }
  };

  const handleSyncMarketplace = async (marketplaceId) => {
    console.log({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        operation: "getProducts",
        marketplaces: [marketplaceId],
      }),
    });
    const response = await fetch(
      "http://localhost:25628/api/v1/marketplace/sync",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          operation: "getProducts",
          marketplaces: [marketplaceId],
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Senkronizasyon başarısız");
    }
  };

  // Loading state
  if (marketplacesLoading) {
    return (
      <Box
        className="fade-in"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  // Error state
  if (marketplacesError) {
    return (
      <Box className="fade-in">
        <Alert severity="error">
          Pazaryeri bilgileri yüklenirken hata oluştu. Lütfen sayfayı yenileyin.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="fade-in">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Pazaryerleri
        </Typography>
        <Typography variant="body1" color="text.secondary">
          E-ticaret platformlarınızı yönetin ve kimlik bilgilerinizi
          yapılandırın
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Aktif Platform
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {activeCount}/{supportedMarketplaces.length}
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 40, color: "primary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Yapılandırılmış
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {configuredCount}/{supportedMarketplaces.length}
                  </Typography>
                </Box>
                <SettingsIcon sx={{ fontSize: 40, color: "warning.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Toplam Ürün
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {(statsData?.data?.totalProducts || 0).toLocaleString()}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {configuredCount === 0 && (
        <Alert severity="info" sx={{ mb: 4 }}>
          Henüz hiçbir pazaryeri yapılandırılmamış. Başlamak için pazaryeri
          kartlarındaki "Kimlik Bilgilerini Ekle" butonuna tıklayın.
        </Alert>
      )}

      {configuredCount > 0 && activeCount === 0 && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Pazaryeri kimlik bilgileri yapılandırılmış ancak bağlantılar test
          edilmemiş. Bağlantı testlerini yapmak için test butonlarını kullanın.
        </Alert>
      )}

      {/* Marketplace Cards */}
      <Grid container spacing={3}>
        {marketplaceData.map((marketplace) => (
          <Grid item xs={12} md={6} lg={4} key={marketplace.id}>
            <MarketplaceCard
              marketplace={marketplace}
              onEdit={handleEditMarketplace}
              onTest={handleTestConnection}
              onSync={handleSyncMarketplace}
            />
          </Grid>
        ))}
      </Grid>

      {/* Credentials Modal */}
      <CredentialsModal
        open={credentialsModalOpen}
        onClose={() => setCredentialsModalOpen(false)}
        marketplace={selectedMarketplace}
        onSubmit={handleSaveCredentials}
      />
    </Box>
  );
}

export default Marketplaces;
