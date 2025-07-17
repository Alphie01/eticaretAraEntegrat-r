# Amazon SP-API Entegrasyonu Rehberi

## 📋 İçindekiler
- [Genel Bakış](#genel-bakış)
- [Amazon SP-API Kurulumu](#amazon-sp-api-kurulumu)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Konfigürasyon](#konfigürasyon)
- [API Özellikleri](#api-özellikleri)
- [Cross-Platform Sync](#cross-platform-sync)
- [Örnekler](#örnekler)
- [Sorun Giderme](#sorun-giderme)

## 🎯 Genel Bakış

Bu sistem Amazon SP-API (Selling Partner API) entegrasyonu ile Amazon marketplace'de ürün yönetimi ve diğer platformlarla sync imkanı sağlar.

### Desteklenen Özellikler
- ✅ Ürün listesi alma ve arama
- ✅ Ürün oluşturma ve güncelleme
- ✅ Stok yönetimi
- ✅ Fiyat güncelleme
- ✅ Sipariş yönetimi
Lo-fi veya hafif akustik temalı bir jingle. Yalnız hissettiğinde içini dökebileceğin bir uygulama için. Anonim destek, yazışma, sesli ve görüntülü konuşma imkanları. Müzik güven verici, umut dolu, duygusal ama pozitif tonda olmalı. Yaklaşık 15-20 saniyelik kısa jingle. Eğer vokalli olacaksa, nazik ve içten bir vokal şu sözleri söyleyebilir: ‘Anlat içindekini, ismini bilmesek de
- ✅ Cross-platform sync (Trendyol ↔ Amazon, Hepsiburada ↔ Amazon)
- ✅ Batch operations
- ✅ Background job processing
- ✅ Rate limiting (10 request/minute)
- ✅ Error handling ve retry mekanizması

## 🔧 Amazon SP-API Kurulumu

### 1. Amazon Developer Console

1. [Amazon Developer Console](https://developer-docs.amazon.com/sp-api/)'a giriş yapın
2. "Register as a developer" butonuna tıklayın
3. Gerekli bilgileri doldurun ve hesabınızı onaylatın

### 2. SP-API Uygulaması Oluşturma

1. Developer Console'da "Add a new app" tıklayın
2. Uygulama bilgilerini doldurun:
   - **App Name**: E-ticaret Ara Entegratör
   - **App Type**: Private app
   - **Data Access**: Product data, Order data, Inventory data

### 3. Credentials Alma

SP-API uygulamanız onaylandıktan sonra şu bilgileri alacaksınız:
- **Client ID** (Access Key ID olarak kullanılır)
- **Client Secret** (Secret Access Key olarak kullanılır)
- **Refresh Token**
- **Seller ID/Merchant ID**

## 🔐 Kimlik Doğrulama

Amazon SP-API OAuth 2.0 + AWS Signature v4 kullanır.

### Authentication Flow:
1. **Refresh Token** ile **Access Token** alma
2. **AWS Signature v4** ile API isteklerini imzalama
3. Her istek için **LWA Access Token** ekleme

```javascript
// Örnek kimlik doğrulama
const credentials = {
  accessKeyId: 'AKIA...',
  secretAccessKey: 'xyz123...',
  sellerId: 'A1234567890123',
  marketplaceId: 'A1PA6795UKMFR9', // Germany
  region: 'eu-west-1',
  refreshToken: 'Atzr|IwEBI...'
};
```

## ⚙️ Konfigürasyon

### Environment Variables

`.env` dosyanıza şu bilgileri ekleyin:

```env
# Amazon SP-API Configuration
AMAZON_ACCESS_KEY_ID=your-amazon-access-key-id
AMAZON_SECRET_ACCESS_KEY=your-amazon-secret-access-key
AMAZON_SELLER_ID=your-amazon-seller-id
AMAZON_MARKETPLACE_ID=A1PA6795UKMFR9
AMAZON_REGION=eu-west-1
AMAZON_REFRESH_TOKEN=your-amazon-refresh-token
```

### Marketplace ID'leri

| Ülke/Region | Marketplace ID |
|-------------|----------------|
| Germany | A1PA6795UKMFR9 |
| UK | A1F83G8C2ARO7P |
| France | A13V1IB3VIYZZH |
| Italy | APJ6JRA9NG5V4 |
| Spain | A1RKKUPIHCS9HS |
| US | ATVPDKIKX0DER |
| Canada | A2EUQ1WTGCTBG2 |

### Region Endpoints

| Region | Endpoint |
|--------|----------|
| eu-west-1 | https://sellingpartnerapi-eu.amazon.com |
| us-east-1 | https://sellingpartnerapi-na.amazon.com |
| us-west-2 | https://sellingpartnerapi-fe.amazon.com |

## 🚀 API Özellikleri

### Ürün İşlemleri

```javascript
// Ürün listesi alma
const products = await amazonAdapter.getProducts({
  nextToken: null,
  maxResults: 50,
  asin: 'B08N5WRWNW', // Opsiyonel
  sku: 'MY-SKU-123'   // Opsiyonel
});

// Ürün oluşturma (Feed API kullanır)
const result = await amazonAdapter.createProduct({
  name: 'Ürün Adı',
  description: 'Ürün Açıklaması',
  price: 29.99,
  brand: 'Marka Adı',
  sku: 'MY-SKU-123',
  images: ['https://example.com/image1.jpg'],
  features: ['Özellik 1', 'Özellik 2']
});

// Stok güncelleme
await amazonAdapter.updateStock('MY-SKU-123', 100);

// Fiyat güncelleme
await amazonAdapter.updatePrice('MY-SKU-123', 39.99);
```

### Sipariş İşlemleri

```javascript
// Sipariş listesi
const orders = await amazonAdapter.getOrders({
  createdAfter: '2024-01-01T00:00:00Z',
  maxResults: 50,
  orderStatuses: ['Unshipped', 'PartiallyShipped']
});

// Sipariş durumu güncelleme (shipping info)
await amazonAdapter.updateOrderStatus('123-1234567-1234567', 'shipped', {
  trackingNumber: 'TR123456789',
  carrierCode: 'UPS'
});
```

### Feed Status Kontrolü

```javascript
// Feed durumunu kontrol et
const feedStatus = await amazonAdapter.getFeedStatus('50014018779');
console.log(feedStatus.processingStatus); // IN_QUEUE, IN_PROGRESS, DONE, etc.
```

## 🔄 Cross-Platform Sync

Amazon artık cross-platform sync sistemine dahil edilmiştir.

### Desteklenen Sync Kombinasyonları

1. **Trendyol ↔ Amazon**
2. **Hepsiburada ↔ Amazon**
3. **Amazon → Trendyol**
4. **Amazon → Hepsiburada**

### Sync Örnekleri

```javascript
// Trendyol'dan Amazon'a analiz
const analysis = await crossPlatformSync.analyzeProductsAcrossMarketplaces(
  userId, 
  'trendyol', 
  'amazon'
);

// Amazon'dan Hepsiburada'ya sync
const syncResult = await crossPlatformSync.executeCrossPlatformSync(
  userId,
  'amazon',
  'hepsiburada',
  {
    syncMissing: true,
    importMissing: false
  }
);
```

### Product Matching

Amazon ürünleri şu kriterlere göre eşleştirilir:
1. **ASIN** (Amazon Standard Identification Number)
2. **UPC/EAN** barcode
3. **Brand + Title** combination
4. **SKU** matching
5. **Fuzzy name** matching

## 📝 Örnekler

### 1. Temel Amazon Adapter Kullanımı

```javascript
const AmazonAdapter = require('./src/adapters/AmazonAdapter');

const adapter = new AmazonAdapter({
  accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
  secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  sellerId: process.env.AMAZON_SELLER_ID,
  marketplaceId: process.env.AMAZON_MARKETPLACE_ID,
  region: process.env.AMAZON_REGION,
  refreshToken: process.env.AMAZON_REFRESH_TOKEN
});

// Authenticate
await adapter.authenticate();

// Get products
const products = await adapter.getProducts({ maxResults: 10 });
console.log(`Found ${products.products.length} products`);
```

### 2. Cross-Platform Analysis

```javascript
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');

const syncManager = new CrossPlatformSyncManager();

// Trendyol ve Amazon arasında analiz
const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
  userId,
  'trendyol',
  'amazon',
  {
    strictMatching: false,
    similarityThreshold: 0.85
  }
);

console.log(`
📊 Analysis Results:
- Matches: ${analysis.summary.matched}
- Source only: ${analysis.summary.sourceOnly}
- Target only: ${analysis.summary.targetOnly}
- Conflicts: ${analysis.summary.conflicts}
- Match rate: ${analysis.summary.matchRate}%
`);
```

### 3. Batch Operations

```javascript
// Multiple marketplace pairs
const batchAnalysis = await axios.post('/api/v1/sync/cross-platform/batch/analyze', {
  marketplacePairs: [
    { source: 'trendyol', target: 'amazon' },
    { source: 'hepsiburada', target: 'amazon' },
    { source: 'amazon', target: 'trendyol' }
  ],
  options: {
    strictMatching: false,
    similarityThreshold: 0.8
  }
});
```

## 🔧 API Endpoints

### Cross-Platform Sync ile Amazon

```bash
# Supported marketplaces (Amazon dahil)
GET /api/v1/sync/cross-platform/marketplaces

# Trendyol → Amazon analysis
POST /api/v1/sync/cross-platform/analyze
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "amazon"
}

# Amazon → Hepsiburada sync
POST /api/v1/sync/cross-platform/execute
{
  "sourceMarketplace": "amazon",
  "targetMarketplace": "hepsiburada",
  "options": {
    "syncMissing": true
  }
}

# Sync status
GET /api/v1/sync/cross-platform/status?source=amazon&target=trendyol
```

## ❗ Önemli Notlar

### Rate Limiting
- Amazon SP-API strict rate limiting uygular
- Sistem 10 request/minute limit uygular (konservatif)
- Aşıldığında otomatik retry mekanizması devreye girer

### Feed API
- Amazon ürün oluşturma/güncelleme işlemleri Feed API kullanır
- İşlemler asenkron çalışır (background jobs)
- Feed durumunu kontrol etmek gerekir

### Data Format
- Amazon TSV (Tab-Separated Values) format kullanır
- Ürün bilgileri Amazon'un template'ine uygun dönüştürülür
- ASIN, UPC, EAN gibi identifier'lar önemlidir

## 🐛 Sorun Giderme

### 1. Authentication Hataları

```bash
Error: Amazon authentication failed
```
**Çözüm:**
- Refresh token'ın doğru olduğunu kontrol edin
- Client ID ve Secret'ın doğru olduğunu kontrol edin
- Token'ın expire olmadığını kontrol edin

### 2. Rate Limit Hataları

```bash
Error: Rate limit exceeded
```
**Çözüm:**
- Sistem otomatik retry yapar
- Request frequency'yi azaltın
- Background jobs kullanın

### 3. Feed Upload Hataları

```bash
Error: Feed processing failed
```
**Çözüm:**
- Ürün data format'ını kontrol edin
- Required field'ların dolu olduğunu kontrol edin
- Feed status'unu kontrol edin: `getFeedStatus(feedId)`

### 4. Marketplace ID Hataları

```bash
Error: Invalid marketplace ID
```
**Çözüm:**
- Doğru marketplace ID kullandığınızı kontrol edin
- Region ile marketplace ID'nin uyumlu olduğunu kontrol edin

## 🔍 Debug ve Monitoring

### Debug Mode

```env
LOG_LEVEL=debug
```

### Monitoring

```javascript
// Adapter stats
const stats = adapter.getStats();
console.log('Requests:', stats.requests);
console.log('Errors:', stats.errors);
console.log('Rate limit:', stats.rateLimitStatus);

// Cross-platform sync overview
const overview = await axios.get('/api/v1/sync/cross-platform/overview');
console.log('System overview:', overview.data);
```

## 📚 Ek Kaynaklar

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Amazon Marketplace Web Service (MWS) Migration](https://developer-docs.amazon.com/sp-api/docs/migration-guide)
- [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [LWA for SP-API](https://developer-docs.amazon.com/sp-api/docs/lwa-overview)

## 🎯 Next Steps

1. **Setup**: Environment variables'ları yapılandırın
2. **Test**: `node test_cross_platform_sync.js` ile test edin
3. **Monitor**: System overview ile durumu kontrol edin
4. **Sync**: Cross-platform sync işlemlerini başlatın

---

**🚀 Amazon entegrasyonu artık aktif! Trendyol, Hepsiburada ve Amazon arasında seamless sync yapabilirsiniz.** 