# ÇiçekSepeti API Entegrasyonu Rehberi

## 📋 İçindekiler
- [Genel Bakış](#genel-bakış)
- [ÇiçekSepeti Setup](#çiçeksepeti-setup)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Konfigürasyon](#konfigürasyon)
- [API Özellikleri](#api-özellikleri)
- [Cross-Platform Sync](#cross-platform-sync)
- [Örnekler](#örnekler)
- [Sorun Giderme](#sorun-giderme)

## 🎯 Genel Bakış

Bu sistem ÇiçekSepeti API entegrasyonu ile ÇiçekSepeti pazaryerinde çiçek ve hediye ürünleri yönetimi ve diğer platformlarla sync imkanı sağlar.

### Desteklenen Özellikler
- ✅ Ürün listesi alma ve arama
- ✅ Ürün oluşturma ve güncelleme
- ✅ Stok ve fiyat yönetimi
- ✅ Sipariş yönetimi
- ✅ Cross-platform sync (Marketplace ↔ ÇiçekSepeti)
- ✅ Şehir bazlı teslimat seçenekleri
- ✅ Özel gün kategorilendirmesi
- ✅ Çabuk bozulan ürün yönetimi
- ✅ Aynı gün teslimat desteği
- ✅ Bakım talimatları
- ✅ Raf ömrü takibi
- ✅ Rate limiting (10 req/sec)

## 🔧 ÇiçekSepeti Setup

### 1. ÇiçekSepeti Satıcı Hesabı

1. [ÇiçekSepeti Satıcı Paneli](https://satici.ciceksepeti.com/) üzerinden hesap oluşturun
2. Satıcı başvurunuzu tamamlayın
3. Onay sürecini bekleyin
4. Aktif satıcı hesabınızla giriş yapın

### 2. API Erişimi

1. ÇiçekSepeti entegrasyon departmanı ile iletişime geçin
2. API dokümantasyonu ve credentials talepinde bulunun
3. Sandbox ve production API anahtarlarını alın
4. Webhook endpoint'lerini ayarlayın

### 3. Developer Portal

1. API Key ve Seller ID'nizi not edin
2. API Secret'ınızı güvenli bir yerde saklayın
3. Test ortamı için sandbox credentials alın

## 🔐 Kimlik Doğrulama

ÇiçekSepeti API Key authentication kullanır.

### Authentication Flow:
1. **API Key** ile API istekleri yapma
2. **X-API-Key** header'ı ekleme
3. **HMAC-SHA256** signature (opsiyonel)
4. Rate limiting kontrolü

```javascript
// Örnek authentication
const config = {
  apiKey: 'ciceksepeti_api_key_xyz123',
  sellerId: 'seller_12345',
  apiSecret: 'secret_key_for_signing',
  environment: 'production' // or 'sandbox'
};
```

## ⚙️ Konfigürasyon

### Environment Variables

`.env` dosyanıza şu bilgileri ekleyin:

```env
# ÇiçekSepeti API Configuration
CICEKSEPETI_API_KEY=your-ciceksepeti-api-key
CICEKSEPETI_SELLER_ID=your-seller-id
CICEKSEPETI_API_SECRET=your-api-secret
CICEKSEPETI_ENVIRONMENT=production
```

### Headers

Her API isteğinde şu header gereklidir:

```javascript
headers: {
  'X-API-Key': 'your-api-key',
  'Content-Type': 'application/json',
  'X-Signature': 'hmac-sha256-signature' // opsiyonel
}
```

### Rate Limiting

ÇiçekSepeti'nin rate limit sistemi:
- **Requests**: 10 requests/second
- **Burst**: Kısa süreli burst'lere izin
- **Reset**: Saniye başına sıfırlama

## 🚀 API Özellikleri

### Ürün İşlemleri

```javascript
// Ürün listesi alma
const products = await cicekSepetiAdapter.getProducts({
  limit: 50,
  categoryId: 'flowers',
  status: 'active',
  priceMin: 50,
  priceMax: 500
});

// Çiçek ürünü oluşturma
const result = await cicekSepetiAdapter.createProduct({
  name: 'Kırmızı Gül Buketi',
  description: 'Özel günler için 12 adet kırmızı gül',
  categoryId: 'bouquets',
  price: 150,
  stock: 25,
  sku: 'ROSE-RED-12',
  isPerishable: true,
  shelfLife: 7,
  deliveryType: 'same_day',
  occasionIds: ['valentine', 'anniversary'],
  careInstructions: 'Serin yerde muhafaza edin'
});

// Stok güncelleme
await cicekSepetiAdapter.updateStock('product_123', 15);
```

### Sipariş İşlemleri

```javascript
// Sipariş listesi
const orders = await cicekSepetiAdapter.getOrders({
  status: 'pending',
  cityId: 34, // İstanbul
  dateFrom: '2024-01-01',
  limit: 50
});

// Sipariş durumu güncelleme
await cicekSepetiAdapter.updateOrderStatus('order_123', 'shipped', {
  deliveryDate: '2024-01-15',
  cargoCompany: 'Aras Kargo',
  trackingNumber: 'TR123456789',
  deliveryNote: 'Özel teslimat talimatları'
});
```

### ÇiçekSepeti-Özel İşlemler

```javascript
// Şehirler listesi
const cities = await cicekSepetiAdapter.getCities();

// Teslimat seçenekleri
const deliveryOptions = await cicekSepetiAdapter.getDeliveryOptions(34, 25); // İstanbul/Beşiktaş

// Özel günler listesi
const occasions = await cicekSepetiAdapter.getOccasions();

// Ürün varyantları
const variants = await cicekSepetiAdapter.getProductVariants('product_123');

// Ürün resimlerini güncelle
await cicekSepetiAdapter.updateProductImages('product_123', [
  { url: 'https://example.com/rose1.jpg', isMain: true },
  { url: 'https://example.com/rose2.jpg', isMain: false }
]);
```

## 🔄 Cross-Platform Sync

ÇiçekSepeti artık cross-platform sync sistemine dahil edilmiştir.

### Desteklenen Sync Kombinasyonları

1. **Trendyol ↔ ÇiçekSepeti**
2. **Hepsiburada ↔ ÇiçekSepeti**
3. **Amazon ↔ ÇiçekSepeti**
4. **N11 ↔ ÇiçekSepeti**
5. **Shopify ↔ ÇiçekSepeti**
6. **Marketplace → ÇiçekSepeti** (Çoklu)

### Sync Örnekleri

```javascript
// Trendyol'dan ÇiçekSepeti'ne analiz
const analysis = await crossPlatformSync.analyzeProductsAcrossMarketplaces(
  userId, 
  'trendyol', 
  'ciceksepeti'
);

// ÇiçekSepeti'nden Shopify'a sync
const syncResult = await crossPlatformSync.executeCrossPlatformSync(
  userId,
  'ciceksepeti',
  'shopify',
  {
    syncMissing: true,
    importMissing: false
  }
);
```

### Product Matching

ÇiçekSepeti ürünleri şu kriterlere göre eşleştirilir:
1. **SKU** match
2. **Barcode** match
3. **Brand + Name** combination
4. **Fuzzy name** matching
5. **Category** compatibility check

## 📝 Örnekler

### 1. Temel ÇiçekSepeti Adapter Kullanımı

```javascript
const CicekSepetiAdapter = require('./src/adapters/CicekSepetiAdapter');

const adapter = new CicekSepetiAdapter({
  apiKey: process.env.CICEKSEPETI_API_KEY,
  sellerId: process.env.CICEKSEPETI_SELLER_ID,
  environment: 'production'
});

// Authenticate
await adapter.authenticate();

// Get products
const products = await adapter.getProducts({ limit: 10 });
console.log(`Found ${products.products.length} products`);
```

### 2. Çiçek Ürünü Ekleme

```javascript
const flowerProduct = {
  name: 'Sevgililer Günü Özel Gül Buketi',
  description: 'Kırmızı güller ve yeşilliklerden oluşan özel buket',
  categoryId: 'bouquets',
  price: 250,
  stock: 50,
  sku: 'VD-ROSE-SPECIAL-2024',
  brand: 'Premium Flowers',
  isPerishable: true,
  shelfLife: 5,
  deliveryType: 'same_day',
  minDeliveryHours: 2,
  occasionIds: ['valentine', 'love'],
  careInstructions: 'Vazoda temiz su ile muhafaza edin. Günlük su değiştirin.',
  images: [
    { url: 'https://example.com/valentine-bouquet-1.jpg' },
    { url: 'https://example.com/valentine-bouquet-2.jpg' }
  ],
  weight: 500, // gram
  dimensions: {
    width: 25,
    height: 40,
    length: 25
  }
};

const result = await adapter.createProduct(flowerProduct);
console.log('Flower product created:', result.productId);
```

### 3. Cross-Platform Analysis

```javascript
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');

const syncManager = new CrossPlatformSyncManager();

// Trendyol ve ÇiçekSepeti arasında analiz
const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
  userId,
  'trendyol',
  'ciceksepeti',
  {
    strictMatching: false,
    similarityThreshold: 0.85
  }
);

console.log(`
🌺 Analysis Results:
- Matches: ${analysis.summary.matched}
- Source only: ${analysis.summary.sourceOnly}
- Target only: ${analysis.summary.targetOnly}
- Conflicts: ${analysis.summary.conflicts}
- Match rate: ${analysis.summary.matchRate}%
`);
```

### 4. Şehir Bazlı Teslimat

```javascript
// İstanbul için teslimat seçenekleri
const cities = await adapter.getCities();
const istanbul = cities.find(city => city.name === 'İstanbul');

if (istanbul) {
  const deliveryOptions = await adapter.getDeliveryOptions(istanbul.id, null);
  
  console.log('İstanbul teslimat seçenekleri:');
  deliveryOptions.forEach(option => {
    console.log(`- ${option.name}: ${option.price} TRY (${option.deliveryTime})`);
  });
}
```

## 🔧 API Endpoints

### Cross-Platform Sync ile ÇiçekSepeti

```bash
# Supported marketplaces (ÇiçekSepeti dahil)
GET /api/v1/sync/cross-platform/marketplaces

# Trendyol → ÇiçekSepeti analysis
POST /api/v1/sync/cross-platform/analyze
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "ciceksepeti"
}

# ÇiçekSepeti → Shopify sync
POST /api/v1/sync/cross-platform/execute
{
  "sourceMarketplace": "ciceksepeti",
  "targetMarketplace": "shopify",
  "options": {
    "syncMissing": true
  }
}

# Sync status
GET /api/v1/sync/cross-platform/status?source=ciceksepeti&target=amazon
```

## ❗ Önemli Notlar

### Rate Limiting
- ÇiçekSepeti 10 req/sec limit
- Burst request'lere sınırlı tolerans
- Otomatik retry mekanizması

### Çabuk Bozulan Ürünler
- `isPerishable: true` ayarı önemli
- `shelfLife` günü doğru ayarlayın
- Stok takibini sıkı yapın
- Teslimat zamanlarını optimize edin

### Teslimat Sistemı
- Şehir bazlı teslimat
- Aynı gün teslimat destği
- Minimum teslimat süresi belirleme
- Kargo firması entegrasyonları

## 🐛 Sorun Giderme

### 1. Authentication Hataları

```bash
Error: ÇiçekSepeti authentication failed
```
**Çözüm:**
- API key'in doğru olduğunu kontrol edin
- Seller ID'nin doğru olduğunu kontrol edin
- Environment ayarını kontrol edin (production/sandbox)
- ÇiçekSepeti ile API erişim durumunuzu kontrol edin

### 2. Rate Limit Hataları

```bash
Error: Rate limit exceeded
```
**Çözüm:**
- Sistem otomatik retry yapar
- Request frequency'yi azaltın
- Batch operations kullanın
- Peak saatlerden kaçının

### 3. Perishable Product Hataları

```bash
Error: Invalid shelf life for perishable product
```
**Çözüm:**
- `isPerishable: true` ayarlayın
- `shelfLife` değerini gün cinsinden verin
- Delivery type'ı uygun ayarlayın
- Care instructions ekleyin

### 4. Delivery Hataları

```bash
Error: Delivery option not available for this city
```
**Çözüm:**
- Şehir ID'sini doğru kontrol edin
- Teslimat seçeneklerini sorgulayın
- Same-day delivery için minimum süre ayarlayın

## 🔍 Debug ve Monitoring

### Debug Mode

```env
LOG_LEVEL=debug
```

### Rate Limit Monitoring

```javascript
// Adapter'da otomatik monitoring
const stats = adapter.getStats();
console.log('Rate limit status:', stats.rateLimitStatus);

// Request sayacı
console.log(`Requests made: ${adapter.rateLimits.requests}`);
```

## 📚 Ek Kaynaklar

- [ÇiçekSepeti Satıcı Paneli](https://satici.ciceksepeti.com/)
- [ÇiçekSepeti Destek](https://destek.ciceksepeti.com/)
- [API Durumu](https://api.ciceksepeti.com/status)

## 🎯 Best Practices

### Ürün Yönetimi
- **Çiçek Kategorileri**: Gül, karanfil, lale gibi spesifik kategoriler kullanın
- **Seasonal Products**: Sezona uygun ürünler ekleyin
- **Care Instructions**: Her çiçek için bakım talimatları verin
- **Images**: Yüksek kaliteli çiçek görselleri kullanın

### Teslimat Optimizasyonu
- **Same-Day Delivery**: Kritik günlerde aynı gün teslimat sunun
- **City Coverage**: Teslimat yapılabilen şehirleri güncel tutun
- **Timing**: Teslimat saatlerini optimize edin
- **Tracking**: Takip numarası mutlaka sağlayın

### Stock Management
- **Perishable Tracking**: Çabuk bozulan ürünleri dikkatli takip edin
- **Seasonal Demand**: Sevgililer günü, anneler günü gibi peak dönemlere hazırlık
- **Expiry Management**: Raf ömrü dolmak üzere olan ürünleri yönetin
- **Real-time Updates**: Stok durumlarını gerçek zamanlı güncelleyin

## 🎯 Use Cases

### Çiçek E-ticareti
1. **Seasonal Campaigns**: Özel günler için otomatik kampanyalar
2. **Last-minute Orders**: Son dakika siparişler için express teslimat
3. **Care Guide Integration**: Müşterilere bakım rehberi sunma

### Cross-Platform Management
1. **Inventory Sync**: Tüm platformlarda stok senkronizasyonu
2. **Price Optimization**: Platform bazlı fiyat optimizasyonu
3. **Category Mapping**: Farklı platformlar arası kategori eşleştirme

### Customer Experience
1. **Delivery Tracking**: Gerçek zamanlı teslimat takibi
2. **Quality Assurance**: Ürün kalitesi garantisi
3. **Customer Support**: 7/24 müşteri desteği entegrasyonu

## 🎯 Next Steps

1. **Setup**: Environment variables'ları yapılandırın
2. **API Access**: ÇiçekSepeti'den API erişimi alın
3. **Test**: `node test_ciceksepeti_integration.js` ile test edin
4. **Categories**: Çiçek kategorilerini tanımlayın
5. **Sync**: Cross-platform sync işlemlerini başlatın

---

**🌺 ÇiçekSepeti entegrasyonu artık aktif! Çiçek ve hediye ürünlerinizi tüm platformlarla sync edebilirsiniz.** 