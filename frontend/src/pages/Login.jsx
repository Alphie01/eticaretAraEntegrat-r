import React, { useState, useEffect } from 'react';
import { Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Paper,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Business,
  TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import OAuthButtons from '../components/OAuth/OAuthButtons';

const Login = () => {
  const { login, register, loading, error, isAuthenticated, clearError } = useAuth();
  const location = useLocation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Clear error when switching modes
  useEffect(() => {
    clearError();
  }, [isLoginMode, clearError]);

  // Handle error from location state (OAuth redirect)
  useEffect(() => {
    if (location.state?.error) {
      // OAuth error'unu AuthContext'e ilet
      // Bu geçici bir çözüm, normalde bu AuthContext'de handle edilmeli
      console.error('OAuth Error:', location.state.error);
    }
  }, [location.state]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoginMode) {
      await login(formData.email, formData.password);
    } else {
      await register(formData.name, formData.email, formData.password);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({
      name: '',
      email: '',
      password: ''
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          minHeight: 600
        }}
      >
        {/* Sol Panel - Branding */}
        <Box
          sx={{
            flex: 1,
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            padding: 4,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.1)',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }
          }}
        >
          <Box sx={{ textAlign: 'center', zIndex: 1 }}>
            <Business sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              E-Ticaret Ara Entegratör
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
              Tüm pazaryerlerinizi tek platformdan yönetin
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <TrendingUp sx={{ opacity: 0.8 }} />
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Satışlarınızı artırın, operasyonları basitleştirin
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Sağ Panel - Form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: { xs: 3, sm: 4, md: 5 }
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
              {isLoginMode ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isLoginMode 
                ? 'Hesabınıza giriş yapın ve e-ticaret yolculuğunuza devam edin' 
                : 'Yeni hesap oluşturun ve e-ticaret entegrasyonlarını keşfedin'
              }
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {!isLoginMode && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ad Soyad"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLoginMode}
                    variant="outlined"
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-posta"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  variant="outlined"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şifre"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  variant="outlined"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={togglePasswordVisibility}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    isLoginMode ? 'Giriş Yap' : 'Hesap Oluştur'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                veya
              </Typography>
            </Divider>
            
            <Typography variant="body2" color="text.secondary">
              {isLoginMode ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
              <Link
                component="button"
                type="button"
                onClick={toggleMode}
                sx={{
                  ml: 1,
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                disabled={loading}
              >
                {isLoginMode ? 'Kayıt Olun' : 'Giriş Yapın'}
              </Link>
            </Typography>
          </Box>

          {isLoginMode && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
                disabled={loading}
              >
                Şifrenizi mi unuttunuz?
              </Link>
            </Box>
          )}

          <OAuthButtons isLoginMode={isLoginMode} disabled={loading} />
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 