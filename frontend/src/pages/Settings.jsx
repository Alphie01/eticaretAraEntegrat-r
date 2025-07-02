import React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'

function Settings() {
  return (
    <Box className="fade-in">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Ayarlar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sistem ayarlarınızı ve entegrasyon konfigürasyonlarınızı yönetin
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" align="center" color="text.secondary">
            🚧 Bu sayfa henüz geliştirilme aşamasında
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Settings 