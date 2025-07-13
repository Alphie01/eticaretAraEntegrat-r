# E-Ticaret Ara Entegratör - Kapsamlı Dokümantasyon

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Temel Özellikler](#temel-özellikler)
- [Sistem Mimarisi](#sistem-mimarisi)
- [Teknoloji Stack](#teknoloji-stack)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Dokümantasyon Listesi](#dokümantasyon-listesi)

## 🎯 Genel Bakış

E-Ticaret Ara Entegratör, çoklu marketplace (Trendyol, Hepsiburada, Amazon, N11, GittiGidiyor) entegrasyonu sağlayan modern bir Node.js uygulamasıdır. Sistem, kullanıcıların kendi marketplace hesaplarını yönetmelerine, ürün ve sipariş senkronizasyonu yapmalarına olanak tanır.

## ✨ Temel Özellikler

### 🔐 Güvenli API Key Yönetimi
- **AES-256-CBC Şifreleme**: Kullanıcı API anahtarları güvenli şekilde şifrelenir
- **Kullanıcı İzolasyonu**: Her kullanıcı sadece kendi API anahtarlarına erişebilir
- **Smart Fallback**: Kullanıcı anahtarları yoksa environment variables fallback
- **Connection Testing**: API anahtarları kaydedilmeden önce test edilir

### 📦 Akıllı Ürün Yönetimi
- **ID Bazlı Duplicate Kontrolü**: Ürün ismine değil, marketplace ID'sine göre duplicate kontrolü
- **Variant Desteği**: Her ürün için çoklu varyant yönetimi
- **Resim Yönetimi**: Display order ile organize edilmiş resim sistemi
- **Kategori Mapping**: Marketplace kategorilerinin internal kategorilere map'i

### 📋 Gelişmiş Sipariş Sistemi
- **Tüm Status Desteği**: Bütün sipariş durumlarının (kargoya verilmiş, kargoda, vs.) çekilmesi
- **Real-time Sync**: Sipariş durumu değişikliklerinin otomatik senkronizasyonu
- **Order History**: Sipariş durum değişiklik geçmişi
- **Customer Info**: Detaylı müşteri ve kargo bilgileri

### 🔄 Senkronizasyon Engine
- **Multi-Marketplace**: Aynı anda farklı marketplace'lerden veri çekme
- **Batch Processing**: Büyük veri setlerini verimli işleme
- **Error Recovery**: Hata durumunda otomatik retry mekanizması
- **Progress Tracking**: Sync işlemlerinin detaylı takibi

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Optional)                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    REST API Layer                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │    Auth     │ Marketplace │   Products  │   Orders    │  │
│  │  Endpoints  │    Keys     │  Endpoints  │ Endpoints   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Business Logic Layer                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ User Mgmt   │   Sync      │   Data      │  Security   │  │
│  │             │   Engine    │  Mappers    │  Middleware │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│               Marketplace Adapters                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  Trendyol   │ Hepsiburada │   Amazon    │     N11     │  │
│  │   Adapter   │   Adapter   │   Adapter   │   Adapter   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Persistence                           │
│  ┌─────────────────────────┬─────────────────────────────┐  │
│  │      MSSQL Database     │       Redis Cache          │  │
│  │   (Primary Storage)     │    (Session & Cache)       │  │
│  └─────────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Teknoloji Stack

### Backend
- **Runtime**: Node.js 18+ (ES6+)
- **Framework**: Express.js 4.x
- **Database**: Microsoft SQL Server 2019+
- **ORM**: Sequelize 6.x
- **Cache**: Redis 6.x
- **Authentication**: JWT (JSON Web Tokens)
- **Encryption**: AES-256-CBC (Node.js Crypto)

### Security
- **Input Validation**: express-validator
- **Rate Limiting**: express-rate-limit + Redis
- **Security Headers**: Helmet.js
- **CORS**: express-cors
- **Password Hashing**: bcrypt (Salt rounds: 12)

### DevOps & Monitoring
- **Process Manager**: PM2 (Cluster mode)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Logging**: Winston (File + Console)
- **Environment**: dotenv

### API Integration
- **HTTP Client**: Axios
- **Request/Response**: JSON
- **Error Handling**: Custom error classes
- **Retry Logic**: Built-in retry mechanisms

## 🚀 Hızlı Başlangıç

### 1. Repository Clone
```bash
git clone <repository-url>
cd eticaretAraEntegratör
```

### 2. Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp env.example .env
# .env dosyasını düzenle
```

### 4. Database Setup
```bash
# MSSQL database ve user oluştur
# create_user_marketplace_keys.sql dosyasını çalıştır
```

### 5. Application Start
```bash
# Development
npm run dev

# Production
npm start
```

### 6. Test API
```bash
curl http://localhost:25626/api/v1/health
```

## 📚 Dokümantasyon Listesi

### 🔧 Kurulum ve Konfigürasyon
- **[SETUP.md](./SETUP.md)** - Detaylı kurulum rehberi, gereksinimler ve konfigürasyon
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment rehberi, güvenlik ve monitoring

### 🔒 Güvenlik
- **[SECURITY.md](./SECURITY.md)** - Güvenlik özellikleri, şifreleme, authentication ve best practices

### 🗄️ Veritabanı ve Modeller  
- **[MODELS.md](./MODELS.md)** - Veritabanı şeması, model ilişkileri ve field açıklamaları

### 🔌 API ve Entegrasyonlar
- **[API.md](./API.md)** - Tüm API endpoint'leri, request/response formatları ve örnekler
- **[MARKETPLACE_ADAPTERS.md](./MARKETPLACE_ADAPTERS.md)** - Marketplace entegrasyonları ve yeni adapter ekleme

## 📊 Desteklenen Marketplace'ler

| Marketplace | Status | Özellikler |
|-------------|--------|------------|
| **Trendyol** | ✅ Tam Destek | Ürün/Sipariş sync, Tüm statusler |
| **Hepsiburada** | 🟡 Geliştiriliyor | Temel API entegrasyonu |
| **Amazon** | 🟡 Planlanan | MWS/SP-API entegrasyonu |
| **N11** | 🟡 Planlanan | API entegrasyonu |
| **GittiGidiyor** | 🟡 Planlanan | API entegrasyonu |

## 🔑 API Endpoints Özeti

### Authentication
- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/login` - Giriş
- `GET /api/v1/auth/me` - Kullanıcı bilgileri

### Marketplace Keys
- `GET /api/v1/marketplace-keys` - API anahtarları listesi
- `POST /api/v1/marketplace-keys` - API anahtarı kaydetme
- `POST /api/v1/marketplace-keys/:marketplace/test` - API anahtarı test etme

### Sync Operations
- `POST /api/v1/sync/import-trendyol-products` - Trendyol ürün senkronizasyonu
- `POST /api/v1/sync/import-trendyol-orders` - Trendyol sipariş senkronizasyonu

### Data Management  
- `GET /api/v1/products` - Ürün listesi
- `GET /api/v1/orders` - Sipariş listesi

## 🛡️ Güvenlik Özellikleri

- **🔐 JWT Authentication** - Stateless token-based kimlik doğrulama
- **🔒 AES-256 Encryption** - API anahtarlarının güvenli şifrelenmesi
- **🚧 Rate Limiting** - DDoS ve brute-force saldırı koruması
- **✅ Input Validation** - SQL injection ve XSS koruması
- **👤 User Isolation** - Kullanıcı verilerinin tam izolasyonu
- **📊 Audit Logging** - Tüm kritik işlemlerin loglanması

## 🔄 Sync Engine Özellikleri

### Duplicate Handling
- **ID Bazlı Kontrol**: Marketplace product ID'sine göre duplicate kontrolü
- **Smart Update**: Mevcut ürünlerin akıllı güncellenmesi
- **Variant Management**: Ürün varyantlarının doğru eşleştirilmesi

### Error Handling
- **Graceful Degradation**: Bir ürün başarısız olsa da diğerleri devam eder
- **Retry Mechanisms**: Geçici hatalar için otomatik tekrar deneme
- **Detailed Logging**: Her işlem için detaylı log kaydı

### Performance Optimization
- **Batch Processing**: Büyük veri setlerini verimli işleme
- **Rate Limiting**: API limitlerine uygun istek yapma
- **Connection Pooling**: Veritabanı bağlantı optimizasyonu

## 🎯 Kullanım Senaryoları

### E-ticaret Satıcıları
- Çoklu marketplace hesap yönetimi
- Ürün ve sipariş senkronizasyonu
- Stok ve fiyat güncelleme otomasyonu

### SaaS Providers
- Multi-tenant marketplace entegrasyon servisi
- White-label marketplace çözümü
- API-as-a-Service platformu

### Enterprise Companies
- Internal marketplace veri yönetimi
- Legacy sistem entegrasyonu
- Business intelligence data feeding

## 🤝 Katkıda Bulunma

### Development Workflow
1. Fork repository
2. Feature branch oluştur (`git checkout -b feature/amazing-feature`)
3. Changes commit et (`git commit -m 'Add amazing feature'`)
4. Branch'i push et (`git push origin feature/amazing-feature`)
5. Pull Request oluştur

### Code Standards
- ES6+ JavaScript
- JSDoc documentation
- Unit tests for critical functions
- Security-first approach

## 📞 Destek ve İletişim

- **📧 Email**: support@yourcompany.com
- **📚 Dokümantasyon**: Bu dizindeki `.md` dosyaları
- **🐛 Bug Reports**: GitHub Issues
- **💡 Feature Requests**: GitHub Discussions

---

## 📄 Lisans

Bu proje [MIT License](../LICENSE) altında lisanslanmıştır.

---

**Son Güncelleme**: Aralık 2024  
**Versiyon**: 1.0.0  
**Durum**: Production Ready

Bu dokümantasyon sistemi, E-Ticaret Ara Entegratör projesinin tüm teknik detaylarını kapsamlı şekilde açıklamaktadır. Her modül için ayrı dokümantasyon dosyaları oluşturulmuş olup, geliştirici deneyimini optimize etmek için organize edilmiştir. 