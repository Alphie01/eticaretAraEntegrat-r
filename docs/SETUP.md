# Kurulum ve Konfigürasyon Rehberi

## 📋 İçindekiler

- [Sistem Gereksinimleri](#sistem-gereksinimleri)
- [Veritabanı Kurulumu](#veritabanı-kurulumu)
- [Uygulama Kurulumu](#uygulama-kurulumu)
- [Environment Konfigürasyonu](#environment-konfigürasyonu)
- [Redis Kurulumu](#redis-kurulumu)
- [Marketplace API Anahtarları](#marketplace-api-anahtarları)
- [Production Deployment](#production-deployment)
- [Docker ile Kurulum](#docker-ile-kurulum)

## 💻 Sistem Gereksinimleri

### Minimum Gereksinimler
- **Node.js**: 18.x veya üzeri
- **npm**: 9.x veya üzeri
- **MSSQL Server**: 2019 veya üzeri
- **Redis**: 6.x veya üzeri (opsiyonel, caching için)
- **RAM**: 2GB minimum, 4GB önerilen
- **Disk**: 10GB boş alan

### Geliştirme Ortamı
- **VS Code**: Önerilen IDE
- **Git**: Versiyon kontrolü
- **Postman**: API testing
- **MSSQL Management Studio**: Veritabanı yönetimi

## 🗄️ Veritabanı Kurulumu

### 1. MSSQL Server Kurulumu

**Windows için:**
```bash
# SQL Server Express Edition indirin ve kurun
# https://www.microsoft.com/en-us/sql-server/sql-server-downloads
```

**Linux için:**
```bash
# Ubuntu/Debian
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo add-apt-repository "$(curl -fsSL https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"
sudo apt-get update
sudo apt-get install -y mssql-server

# Konfigürasyon
sudo /opt/mssql/bin/mssql-conf setup
```

**macOS için:**
```bash
# Docker kullanarak
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sql1 \
   -d mcr.microsoft.com/mssql/server:2019-latest
```

### 2. Veritabanı Oluşturma

```sql
-- 1. MSSQL Management Studio'yu açın
-- 2. Aşağıdaki komutları çalıştırın

CREATE DATABASE EticaretAraEntegrator;
GO

USE EticaretAraEntegrator;
GO

-- Kullanıcı oluşturma (isteğe bağlı)
CREATE LOGIN eticaret_user WITH PASSWORD = 'SecurePassword123!';
CREATE USER eticaret_user FOR LOGIN eticaret_user;
ALTER ROLE db_owner ADD MEMBER eticaret_user;
GO
```

### 3. Tabloları Oluşturma

Proje root dizinindeki SQL dosyalarını çalıştırın:

```bash
# Ana tablolar
# Aşağıdaki dosyaları sırayla çalıştırın:
# 1. mssql_database_schema_fixed.sql
# 2. create_user_marketplace_keys.sql
# 3. create_product_marketplaces.sql
```

## 🚀 Uygulama Kurulumu

### 1. Repository'yi Klonlayın

```bash
git clone <your-repository-url>
cd eticaretAraEntegratör
```

### 2. Dependencies Yükleme

```bash
# Node.js dependencies
npm install

# Global tools (opsiyonel)
npm install -g nodemon pm2
```

### 3. Environment Dosyası Oluşturma

```bash
# .env dosyasını oluşturun
cp env.example .env
```

## ⚙️ Environment Konfigürasyonu

### .env Dosyası Düzenleme

```bash
# .env dosyasını açın ve aşağıdaki değerleri düzenleyin
nano .env
```

```env
# Server Configuration
NODE_ENV=development
PORT=25626
HOST=localhost

# Database Configuration
DB_HOST=45.141.151.4
DB_PORT=1433
DB_NAME=EticaretAraEntegrator
DB_USER=your_username
DB_PASSWORD=your_password
DB_DIALECT=mssql

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-chars
JWT_EXPIRE=7d

# Encryption Configuration
ENCRYPTION_KEY=497f96d4afac6977bff05f07eb60bd59abe5e75a42a4aa021152a5e54e2c1409

# Redis Configuration (Opsiyonel)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Trendyol API (Fallback)
TRENDYOL_API_KEY=your-trendyol-api-key
TRENDYOL_API_SECRET=your-trendyol-api-secret
TRENDYOL_SUPPLIER_ID=your-supplier-id

# Hepsiburada API (Fallback)
HEPSIBURADA_API_KEY=your-hepsiburada-api-key
HEPSIBURADA_API_SECRET=your-hepsiburada-api-secret

# Amazon API (Fallback)
AMAZON_ACCESS_KEY_ID=your-amazon-access-key
AMAZON_SECRET_ACCESS_KEY=your-amazon-secret-key
AMAZON_MARKETPLACE_ID=your-marketplace-id

# Logging
LOG_LEVEL=info
LOG_FILE=logs/combined.log
ERROR_LOG_FILE=logs/error.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Environment Değişkenleri Açıklaması

| Değişken | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `NODE_ENV` | Çalışma ortamı | `development`, `production` |
| `PORT` | Sunucu portu | `25626` |
| `DB_HOST` | Veritabanı sunucu adresi | `localhost` |
| `JWT_SECRET` | JWT imzalama anahtarı | Min. 32 karakter |
| `ENCRYPTION_KEY` | AES şifreleme anahtarı | 64 karakter hex |

## 🔧 Redis Kurulumu (Opsiyonel)

### Local Redis Kurulumu

**Windows:**
```bash
# Redis için Windows Subsystem for Linux (WSL) kullanın
# veya Redis for Windows indirin
```

**macOS:**
```bash
# Homebrew ile
brew install redis
brew services start redis
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Redis Docker Container

```bash
# Redis Docker container'ı çalıştırın
docker run -d --name redis-cache \
  -p 6379:6379 \
  redis:alpine
```

### Redis Test

```bash
# Redis bağlantısını test edin
redis-cli ping
# Yanıt: PONG
```

## 🔑 Marketplace API Anahtarları

### Trendyol API Anahtarı Alma

1. **Trendyol Partner Panel**'e giriş yapın
2. **Entegrasyonlar > API Yönetimi** bölümüne gidin
3. **Yeni API Anahtarı Oluştur**'a tıklayın
4. Gerekli izinleri verin:
   - Ürün Okuma
   - Sipariş Okuma
   - Stok Güncelleme (opsiyonel)
5. API Key, API Secret ve Supplier ID'yi kopyalayın

### Hepsiburada API Anahtarı Alma

1. **Hepsiburada Merchant Panel**'e giriş yapın
2. **Entegrasyonlar** bölümüne gidin
3. **API Ayarları**'ndan anahtarları alın

### Amazon API Anahtarı Alma

1. **Amazon Seller Central**'a giriş yapın
2. **Developer Central**'a gidin
3. **MWS API** için anahtarları oluşturun

## 🏃‍♂️ Uygulamayı Çalıştırma

### Development Modu

```bash
# Nodemon ile hot-reload
npm run dev

# Veya manuel
node src/app.js
```

### Production Modu

```bash
# PM2 ile
npm install -g pm2
pm2 start ecosystem.config.js

# Veya direkt
npm start
```

### Sistem Durumu Kontrolü

```bash
# Uygulama durumu
curl http://localhost:25626/api/v1/health

# Veritabanı bağlantısı
curl http://localhost:25626/api/v1/status
```

## 🐳 Docker ile Kurulum

### 1. Docker Compose Kullanma

```bash
# Docker Compose ile tüm servisleri başlatın
docker-compose up -d

# Logları görüntüleyin
docker-compose logs -f app
```

### 2. Manuel Docker Build

```bash
# Image oluşturma
docker build -t eticaret-ara-entegrator .

# Container çalıştırma
docker run -d \
  --name eticaret-app \
  -p 25626:25626 \
  --env-file .env \
  eticaret-ara-entegrator
```

### docker-compose.yml Örneği

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "25626:25626"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - redis
      - mssql
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  mssql:
    image: mcr.microsoft.com/mssql/server:2019-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
    ports:
      - "1433:1433"
    volumes:
      - mssql_data:/var/opt/mssql
    restart: unless-stopped

volumes:
  mssql_data:
```

## 🚀 Production Deployment

### 1. Sunucu Hazırlığı

```bash
# Ubuntu 20.04 LTS önerilen
sudo apt update && sudo apt upgrade -y

# Node.js kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
sudo npm install -g pm2

# Nginx kurulumu (reverse proxy için)
sudo apt install nginx
```

### 2. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası alma
sudo certbot --nginx -d yourdomain.com
```

### 3. Nginx Konfigürasyonu

```nginx
# /etc/nginx/sites-available/eticaret-app
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:25626;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. PM2 Ecosystem Dosyası

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'eticaret-ara-entegrator',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 25626
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5. Production Başlatma

```bash
# Uygulama dizinine gidin
cd /var/www/eticaret-ara-entegrator

# Dependencies yükleyin
npm ci --only=production

# PM2 ile başlatın
pm2 start ecosystem.config.js --env production

# PM2'yi sistem başlangıcına ekleyin
pm2 startup
pm2 save
```

## 🔍 Sorun Giderme

### Common Issues

1. **Veritabanı Bağlantı Hatası**
   ```bash
   # Bağlantıyı test edin
   telnet your-db-host 1433
   ```

2. **Port Kullanımda**
   ```bash
   # Port kullanan işlemi bulun
   lsof -i :25626
   kill -9 <PID>
   ```

3. **Redis Bağlantı Hatası**
   ```bash
   # Redis servisini kontrol edin
   systemctl status redis
   ```

### Log Kontrolü

```bash
# Uygulama logları
tail -f logs/combined.log

# PM2 logları
pm2 logs eticaret-ara-entegrator

# Nginx logları
tail -f /var/log/nginx/access.log
```

## 📊 Monitoring

### Health Check Endpoint

```bash
# Sistem durumu
curl https://yourdomain.com/api/v1/health

# Detaylı durum
curl https://yourdomain.com/api/v1/status
```

### PM2 Monitoring

```bash
# PM2 dashboard
pm2 monit

# Memory ve CPU kullanımı
pm2 show eticaret-ara-entegrator
```

## 🔄 Backup ve Güncelleme

### Database Backup

```sql
-- MSSQL backup
BACKUP DATABASE EticaretAraEntegrator 
TO DISK = 'C:\Backup\EticaretAraEntegrator.bak'
```

### Uygulama Güncelleme

```bash
# Git pull
git pull origin main

# Dependencies güncelleme
npm ci --only=production

# Uygulamayı yeniden başlatma
pm2 restart eticaret-ara-entegrator
```

---

## 📞 Destek

Kurulum sırasında sorun yaşarsanız:
- 📧 Email: [support-email]
- 📱 GitHub Issues: [repository-issues-url]
- 📖 Docs: [documentation-url] 