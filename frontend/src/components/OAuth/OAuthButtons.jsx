import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Google, Facebook, Apple } from '@mui/icons-material';

const OAuthButtons = ({ isLoginMode = true, disabled = false }) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:25628';

  const handleGoogleAuth = () => {
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  const handleFacebookAuth = () => {
    window.location.href = `${apiUrl}/api/v1/auth/facebook`;
  };

  const handleAppleAuth = () => {
    // Apple Sign-In henüz implement edilmedi
    alert('Apple Sign-In yakında kullanıma sunulacak!');
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ textAlign: 'center', mb: 2 }}
      >
        {isLoginMode ? 'Sosyal hesaplarınızla giriş yapın' : 'Sosyal hesaplarınızla kayıt olun'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Google Butonu */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleGoogleAuth}
          disabled={disabled}
          sx={{
            py: 1.5,
            borderColor: '#dadce0',
            color: '#3c4043',
            textTransform: 'none',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&:hover': {
              backgroundColor: '#f8f9fa',
              borderColor: '#dadce0'
            }
          }}
        >
          <Google sx={{ color: '#4285f4' }} />
          <Typography variant="body1">
            Google ile {isLoginMode ? 'giriş yap' : 'kayıt ol'}
          </Typography>
        </Button>

        {/* Facebook Butonu */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleFacebookAuth}
          disabled={disabled}
          sx={{
            py: 1.5,
            borderColor: '#1877f2',
            color: '#1877f2',
            textTransform: 'none',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&:hover': {
              backgroundColor: '#e7f3ff',
              borderColor: '#1877f2'
            }
          }}
        >
          <Facebook sx={{ color: '#1877f2' }} />
          <Typography variant="body1">
            Facebook ile {isLoginMode ? 'giriş yap' : 'kayıt ol'}
          </Typography>
        </Button>

        {/* Apple Butonu */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleAppleAuth}
          disabled={disabled}
          sx={{
            py: 1.5,
            borderColor: '#000',
            color: '#000',
            textTransform: 'none',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '&:hover': {
              backgroundColor: '#f5f5f5',
              borderColor: '#000'
            }
          }}
        >
          <Apple sx={{ color: '#000' }} />
          <Typography variant="body1">
            Apple ile {isLoginMode ? 'giriş yap' : 'kayıt ol'}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default OAuthButtons; 