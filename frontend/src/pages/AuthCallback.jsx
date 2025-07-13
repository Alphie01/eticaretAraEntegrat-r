import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthFromCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const provider = searchParams.get('provider');

      if (error) {
        // OAuth hatası
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              error: `${provider} ile giriş yapılırken hata oluştu. Lütfen tekrar deneyin.` 
            } 
          });
        }, 2000);
        return;
      }

      if (token) {
        try {
          // Token'ı localStorage'a kaydet ve auth context'i güncelle
          localStorage.setItem('token', token);
          
          // API'den kullanıcı bilgilerini al
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:25628';
          const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setAuthFromCallback(token, userData.data);
            
            // Dashboard'a yönlendir
            navigate('/dashboard', { replace: true });
          } else {
            throw new Error('Kullanıcı bilgileri alınamadı');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          navigate('/login', { 
            state: { 
              error: 'Giriş işlemi tamamlanırken hata oluştu. Lütfen tekrar deneyin.' 
            } 
          });
        }
      } else {
        // Token yok, login sayfasına yönlendir
        navigate('/login', { 
          state: { 
            error: 'Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.' 
          } 
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuthFromCallback]);

  const error = searchParams.get('error');
  const provider = searchParams.get('provider');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 3
      }}
    >
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: 4,
          padding: 4,
          textAlign: 'center',
          minWidth: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        {error ? (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              {provider} ile giriş yapılırken hata oluştu
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Login sayfasına yönlendiriliyorsunuz...
            </Typography>
          </>
        ) : (
          <>
            <CircularProgress size={50} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Giriş işlemi tamamlanıyor...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {provider ? `${provider} hesabınız doğrulanıyor` : 'Lütfen bekleyin'}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AuthCallback; 