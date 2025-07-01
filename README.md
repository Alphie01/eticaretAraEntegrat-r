# E-ticaret Ara Entegratör

Node.js tabanlı modüler e-ticaret pazaryeri entegrasyon sistemi. Trendyol, Hepsiburada, Amazon, N11 gibi platformları tek bir merkezi panel üzerinden yönetmenizi sağlar.

## 🚀 Özellikler

- **Çoklu Pazaryeri Desteği**: Trendyol, Hepsiburada, Amazon (SP-API), N11, Shopify, ÇiçekSepeti, Pazarama, PTT AVM
- **Merkezi Yönetim**: Tek panelden tüm platformları yönetin
- **Modüler Mimari**: Yeni pazaryerleri kolayca ekleyin
- **Gerçek Zamanlı Senkronizasyon**: Otomatik stok ve fiyat güncellemeleri
- **Sipariş Yönetimi**: Tüm platformlardan gelen siparişleri tek yerden takip edin
- **Raporlama**: Detaylı satış ve performans raporları
- **API First**: RESTful API ile üçüncü parti entegrasyonlar

## 🏗️ Mimari

```
├── src/
│   ├── core/           # Temel sistem bileşenleri
│   ├── adapters/       # Pazaryeri adaptörleri
│   ├── services/       # İş mantığı servisleri
│   ├── api/           # REST API endpoints
│   ├── models/        # Veritabanı modelleri
│   ├── middleware/    # Express middleware'leri
│   ├── utils/         # Yardımcı fonksiyonlar
│   └── jobs/          # Background job'lar
├── frontend/          # React admin paneli
├── tests/            # Test dosyaları
└── docs/             # Dokümantasyon
```

## 🛠️ Kurulum

### Gereksinimler
- Node.js 16+
- MongoDB 4.4+
- Redis 6+

### Hızlı Başlangıç

1. **Repository'yi klonlayın**
   ```bash
   git clone <repository-url>
   cd eticaret-ara-entegrator
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Çevre değişkenlerini ayarlayın**
   ```bash
   cp .env.example .env
   # .env dosyasını düzenleyin
   ```

4. **Veritabanını başlatın**
   ```bash
   npm run db:seed
   ```

5. **Uygulamayı çalıştırın**
   ```bash
   npm run dev
   ```

### Docker ile Kurulum

```bash
docker-compose up -d
```

## 📚 API Dokümantasyonu

API endpoint'leri `/api/v1` prefix'i ile başlar:

- `GET /api/v1/products` - Ürünleri listele
- `POST /api/v1/products` - Yeni ürün ekle
- `GET /api/v1/orders` - Siparişleri listele
- `POST /api/v1/sync/products` - Ürün senkronizasyonu başlat

Detaylı API dokümantasyonu için `/docs` endpoint'ini ziyaret edin.

## 🔧 Konfigürasyon

### Pazaryeri Ayarları

Her pazaryeri için API bilgilerini `.env` dosyasında yapılandırın:

```env
# Trendyol
TRENDYOL_API_KEY=your_api_key
TRENDYOL_API_SECRET=your_api_secret
TRENDYOL_SUPPLIER_ID=your_supplier_id

# Amazon SP-API
AMAZON_ACCESS_KEY_ID=your_access_key_id
AMAZON_SECRET_ACCESS_KEY=your_secret_access_key
AMAZON_SELLER_ID=your_seller_id
AMAZON_MARKETPLACE_ID=A1PA6795UKMFR9
AMAZON_REGION=eu-west-1
AMAZON_REFRESH_TOKEN=your_refresh_token

# N11 API
N11_API_KEY=your_n11_api_key
N11_API_SECRET=your_n11_api_secret
N11_COMPANY_ID=your_n11_company_id

# Shopify Admin API
SHOPIFY_SHOP_DOMAIN=your_shop_name
SHOPIFY_ACCESS_TOKEN=your_access_token
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# ÇiçekSepeti API
CICEKSEPETI_API_KEY=your_ciceksepeti_api_key
CICEKSEPETI_SELLER_ID=your_seller_id
CICEKSEPETI_API_SECRET=your_api_secret
CICEKSEPETI_ENVIRONMENT=production

# Pazarama API
PAZARAMA_API_KEY=your_pazarama_api_key
PAZARAMA_API_SECRET=your_pazarama_api_secret
PAZARAMA_SELLER_ID=your_pazarama_seller_id
PAZARAMA_ENVIRONMENT=production

# PTT AVM API
PTTAVM_API_KEY=your_pttavm_api_key
PTTAVM_API_SECRET=your_pttavm_api_secret
PTTAVM_SELLER_ID=your_pttavm_seller_id
PTTAVM_ENVIRONMENT=production
```

### Rate Limiting

API isteklerini sınırlamak için:
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 dakika
RATE_LIMIT_MAX_REQUESTS=100  # Maksimum istek sayısı
```

## 🧪 Test

```bash
# Tüm testleri çalıştır
npm test

# Test watch modu
npm run test:watch

# Test Amazon integration
node test_amazon_integration.js

# Test N11 integration
node test_n11_integration.js

# Test Shopify integration
node test_shopify_integration.js

# Test ÇiçekSepeti integration
node test_ciceksepeti_integration.js

# Test Pazarama integration
node test_pazarama_integration.js

# Test PTT AVM integration
node test_pttavm_integration.js

# Test cross-platform sync
node test_cross_platform_sync.js
```

## 📦 Deployment

### Production Build
```bash
npm run build
NODE_ENV=production npm start
```

### Docker Deployment
```bash
docker build -t eticaret-entegrator .
docker run -p 3000:3000 eticaret-entegrator
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit yapın (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'i push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorularınız için issue açabilir veya email gönderebilirsiniz. 