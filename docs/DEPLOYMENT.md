# Production Deployment

## Sunucu Gereksinimleri

- **CPU**: 4 vCPU minimum
- **RAM**: 8GB minimum  
- **Storage**: 100GB SSD
- **OS**: Ubuntu 20.04 LTS önerilen

## Güvenlik Konfigürasyonu

### Firewall (UFW)
```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 25626/tcp  # App port (nginx ile proxy)
```

### SSH Güvenliği
```bash
# /etc/ssh/sshd_config
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

## Database Setup

### MSSQL Production Config
```sql
CREATE DATABASE EticaretAraEntegrator;
CREATE LOGIN eticaret_app WITH PASSWORD = 'StrongPassword123!';
CREATE USER eticaret_app FOR LOGIN eticaret_app;
-- Grant necessary permissions
```

### Redis Config
```bash
# /etc/redis/redis.conf  
requirepass StrongRedisPassword123
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## Environment Konfigürasyonu

```bash
# Production .env
NODE_ENV=production
PORT=25626

DB_HOST=localhost
DB_USERNAME=eticaret_app
DB_PASSWORD=StrongPassword123!
DB_DATABASE=EticaretAraEntegrator

REDIS_PASSWORD=StrongRedisPassword123

JWT_SECRET=64-character-super-secure-secret
ENCRYPTION_KEY=64-character-hex-encryption-key

ALLOWED_ORIGINS=https://yourdomain.com
```

## Nginx Konfigürasyonu

```nginx
# /etc/nginx/sites-available/eticaret
upstream app_servers {
    server 127.0.0.1:25626;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location /api/v1 {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL Setup

```bash
# Let's Encrypt
sudo certbot --nginx -d yourdomain.com
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## PM2 Process Management

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'eticaret-ara-entegrator',
    script: 'src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## Monitoring

### Health Check Endpoint
```javascript
// /health endpoint returns system status
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

### Log Management
```bash
# Log rotation
sudo logrotate /etc/logrotate.d/eticaret
```

## Backup

### Database Backup Script
```bash
#!/bin/bash
# Daily database backup
DATE=$(date +%Y%m%d)
sqlcmd -S localhost -Q "BACKUP DATABASE EticaretAraEntegrator TO DISK = '/backup/eticaret_${DATE}.bak'"
```

### Cron Jobs
```bash
# Daily backup at 2 AM
0 2 * * * /scripts/backup_database.sh
```

## Docker Deployment (Alternative)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 25626
CMD ["node", "src/app.js"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "25626:25626"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## Production Checklist

- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Database secured
- [ ] Environment variables set
- [ ] Monitoring active
- [ ] Backup system working
- [ ] Health checks responding
- [ ] Load testing completed

---

Bu rehber production ortamında güvenli deployment sağlar. 