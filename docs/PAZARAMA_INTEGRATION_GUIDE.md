# Pazarama Entegrasyon Rehberi

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [Pazarama API Konfigürasyonu](#pazarama-api-konfigürasyonu)
4. [Temel Kullanım](#temel-kullanım)
5. [Ürün Yönetimi](#ürün-yönetimi)
6. [Sipariş Yönetimi](#sipariş-yönetimi)
7. [Batch İşlemler](#batch-işlemler)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Rate Limiting](#rate-limiting)
10. [Örnekler](#örnekler)

## Genel Bakış

Pazarama, Türkiye'de faaliyet gösteren büyüyen e-ticaret pazaryerlerinden biridir. Bu entegrasyon, Pazarama API'si kullanarak ürün ve sipariş yönetimi sağlar.

### Özellikler

- ✅ Ürün CRUD operasyonları
- ✅ Kategori ve marka yönetimi
- ✅ Sipariş yönetimi
- ✅ Stok ve fiyat güncelleme
- ✅ Toplu işlemler (Batch operations)
- ✅ Görsel yönetimi
- ✅ Teslimat ayarları
- ✅ Şehir/bölge bilgileri
- ✅ Attribute (özellik) yönetimi
- ✅ Cross-platform sync desteği

### API Özellikleri

- **Authentication:** API Key + Secret (HMAC-SHA256 imzalama)
- **Rate Limiting:** ~20 req/sec (tahmini)
- **Para Birimi:** TRY (Türk Lirası)
- **Dil:** Türkçe
- **Onay Süreci:** Ürünler satışa çıkmadan önce onay gerektirir

## Kurulum

### 1. Sistem Gereksinimleri

- Node.js 14+
- SQL Server (MSSQL)
- Redis (opsiyonel)

### 2. Pazarama API Bilgilerini Alma

1. [Pazarama Satıcı Paneli](https://seller.pazarama.com)'ne kayıt olun
2. API erişimi için başvuru yapın
3. API Key ve Secret bilgilerinizi alın
4. Seller ID'nizi not edin

### 3. Environment Konfigürasyonu

`.env` dosyasında Pazarama ayarlarını tanımlayın:

```env
# Pazarama API Configuration
PAZARAMA_API_KEY=your-pazarama-api-key
PAZARAMA_API_SECRET=your-pazarama-api-secret
PAZARAMA_SELLER_ID=your-pazarama-seller-id
PAZARAMA_ENVIRONMENT=production  # production, sandbox
```

## Pazarama API Konfigürasyonu

### API Endpoints

- **Production:** `https://api.pazarama.com`
- **Sandbox:** `https://api-sandbox.pazarama.com` (varsa)

### Authentication

Pazarama güçlü authentication sistemi kullanır:

1. Her istekte `X-API-Key` header'ı
2. HMAC-SHA256 ile imzalanmış `X-Signature` header'ı
3. Timestamp bilgisi (`X-Timestamp`)

```javascript
// İmza oluşturma örneği
const crypto = require('crypto');

function generateSignature(method, path, timestamp, body, apiSecret) {
  const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(stringToSign)
    .digest('hex');
}
```

## Temel Kullanım

### Adapter Başlatma

```javascript
const PazaramaAdapter = require('./src/adapters/PazaramaAdapter');

const adapter = new PazaramaAdapter({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  sellerId: 'your-seller-id',
  environment: 'production'
});

// Kimlik doğrulama
await adapter.authenticate();

// Adapter bilgilerini al
const info = await adapter.getInfo();
console.log('Pazarama adapter info:', info);
```

### Temel Bilgileri Alma

```javascript
// Kategorileri al
const categories = await adapter.getCategories();

// Markaları al
const brands = await adapter.getBrands({ page: 1, size: 50 });

// Şehirleri al
const cities = await adapter.getCities();

// Teslimat seçeneklerini al
const deliveries = await adapter.getSellerDeliveries();
```

## Ürün Yönetimi

### Ürün Listeleme

```javascript
const result = await adapter.getProducts({
  page: 1,
  size: 50,
  categoryId: 123,
  brandId: 456,
  status: 'active',
  searchTerm: 'örnek ürün',
  approved: true,
  isActive: true
});

console.log(`${result.products.length} ürün bulundu`);
console.log(`Toplam: ${result.totalCount} ürün`);
```

### Ürün Oluşturma

```javascript
const productData = {
  name: 'Örnek Ürün',
  displayName: 'Pazarama için Örnek Ürün',
  description: 'Bu ürün Pazarama için oluşturulmuştur.',
  brandId: 123,
  categoryId: 456,
  desi: 2.5, // Ağırlık/hacim bilgisi (zorunlu)
  code: 'URUN-001', // SKU/Barkod
  groupCode: 'GRUP-001', // Gruplama için
  stockCount: 100,
  vatRate: 18, // KDV oranı (%)
  listPrice: 149.99,
  salePrice: 129.99,
  images: [
    { imageUrl: 'https://example.com/image1.jpg', order: 1 },
    { imageUrl: 'https://example.com/image2.jpg', order: 2 }
  ],
  attributes: [
    { attributeId: 1, attributeValueId: 10 },
    { attributeId: 2, attributeValueId: 20 }
  ],
  isActive: true,
  approved: false, // Onay bekliyor
  dimensions: {
    length: 10,
    width: 5,
    height: 3
  }
};

const result = await adapter.createProduct(productData);
console.log('Ürün oluşturuldu:', result.productId);
```

### Ürün Güncelleme

```javascript
const productId = 'PAZARAMA-PRODUCT-ID';

const updateData = {
  name: 'Güncellenmiş Ürün Adı',
  description: 'Güncellenmiş açıklama',
  listPrice: 199.99,
  salePrice: 179.99
};

await adapter.updateProduct(productId, updateData);
```

### Stok ve Fiyat Güncelleme

```javascript
// Stok güncelleme
await adapter.updateStock('product-id', 50);

// Fiyat güncelleme
await adapter.updatePrice('product-id', 99.99);

// Variant için stok güncelleme
await adapter.updateStock('product-id', 25, 'variant-id');
```

### Ürün Görselleri Güncelleme

```javascript
const images = [
  'https://example.com/new-image1.jpg',
  'https://example.com/new-image2.jpg',
  'https://example.com/new-image3.jpg'
];

await adapter.updateProductImages('product-id', images);
```

## Sipariş Yönetimi

### Sipariş Listeleme

```javascript
const result = await adapter.getOrders({
  page: 1,
  size: 50,
  status: 'pending',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  orderId: 'specific-order-id'
});

console.log(`${result.orders.length} sipariş bulundu`);
```

### Sipariş Durumu Güncelleme

```javascript
// Temel durum güncelleme
await adapter.updateOrderStatus('order-id', 'confirmed');

// Kargo bilgileriyle durum güncelleme
await adapter.updateOrderStatus('order-id', 'shipped', {
  trackingNumber: 'TRACK123456',
  cargoCompany: 'MNG Kargo',
  shippingDate: '2024-01-15'
});
```

### Sipariş Durumları

- `pending` - Beklemede
- `confirmed` - Onaylandı
- `preparing` - Hazırlanıyor
- `shipped` - Kargoya verildi
- `delivered` - Teslim edildi
- `cancelled` - İptal edildi
- `returned` - İade edildi

## Batch İşlemler

### Toplu Ürün Oluşturma

```javascript
const products = [
  { name: 'Ürün 1', price: 99.99, /* ... */ },
  { name: 'Ürün 2', price: 149.99, /* ... */ },
  // ...
];

const batchResult = await adapter.createBatchRequest(products);
console.log('Batch Request ID:', batchResult.batchRequestId);

// Batch durumu takibi
const status = await adapter.getBatchRequestStatus(batchResult.batchRequestId);
console.log('Batch durumu:', status);
```

### Toplu Fiyat ve Stok Güncelleme

```javascript
const updates = [
  { productId: 'prod1', price: 99.99, stock: 50 },
  { productId: 'prod2', price: 149.99, stock: 25 },
  { productId: 'prod3', stock: 100 }, // Sadece stok
  { productId: 'prod4', price: 79.99 } // Sadece fiyat
];

const result = await adapter.batchUpdatePricesAndStock(updates);
console.log(`${result.batchResults.successful} başarılı, ${result.batchResults.failed} başarısız`);
```

## Hata Yönetimi

### Hata Türleri

```javascript
try {
  await adapter.createProduct(productData);
} catch (error) {
  switch (error.code) {
    case 'AUTHENTICATION_FAILED':
      console.log('Kimlik doğrulama hatası');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      console.log('Rate limit aşıldı');
      break;
    case 'VALIDATION_ERROR':
      console.log('Veri doğrulama hatası:', error.details);
      break;
    case 'PRODUCT_NOT_FOUND':
      console.log('Ürün bulunamadı');
      break;
    default:
      console.log('Bilinmeyen hata:', error.message);
  }
}
```

### Yaygın Hatalar

1. **Authentication Error:** API key veya secret yanlış
2. **Rate Limit:** Çok fazla istek gönderildi
3. **Validation Error:** Gerekli alanlar eksik veya yanlış format
4. **Product Not Found:** Belirtilen ürün ID mevcut değil
5. **Category Not Found:** Geçersiz kategori ID
6. **Brand Not Found:** Geçersiz marka ID

## Rate Limiting

Pazarama API rate limiting uyguluyor:

- **Limit:** ~20 request/second (tahmini)
- **Window:** 1 saniye
- **Handling:** Otomatik retry mekanizması

```javascript
// Rate limit bilgileri
const info = await adapter.getInfo();
console.log('Rate limits:', info.rateLimits);

// Adapter otomatik olarak rate limiting yapar
// Manuel kontrol gerekmez
```

## Örnekler

### Tam Entegrasyon Örneği

```javascript
const { AdapterManager } = require('./src/core/AdapterManager');

async function pazaramaIntegration() {
  const manager = new AdapterManager();
  const adapter = await manager.getAdapter('pazarama', 'USER_ID');

  // 1. Kategorileri al ve cache'le
  const categories = await adapter.getCategories();
  console.log(`${categories.length} kategori yüklendi`);

  // 2. Ürünleri listele
  const products = await adapter.getProducts({ page: 1, size: 10 });
  console.log(`${products.products.length} ürün listelendi`);

  // 3. Yeni ürün ekle
  const newProduct = {
    name: 'Yeni Ürün',
    description: 'Açıklama',
    brandId: 1,
    categoryId: 1,
    code: `PROD-${Date.now()}`,
    stockCount: 50,
    listPrice: 99.99,
    salePrice: 89.99,
    // ...
  };

  const createResult = await adapter.createProduct(newProduct);
  console.log('Yeni ürün ID:', createResult.productId);

  // 4. Siparişleri kontrol et
  const orders = await adapter.getOrders({ status: 'pending' });
  console.log(`${orders.orders.length} bekleyen sipariş`);

  // 5. Siparişleri işle
  for (const order of orders.orders) {
    await adapter.updateOrderStatus(order.id, 'confirmed');
    console.log(`Sipariş ${order.id} onaylandı`);
  }
}

pazaramaIntegration().catch(console.error);
```

### Cross-Platform Sync Örneği

```javascript
const { CrossPlatformSyncManager } = require('./src/core/CrossPlatformSyncManager');

async function syncProducts() {
  const syncManager = new CrossPlatformSyncManager();

  // Pazarama'dan diğer platformlara sync
  await syncManager.syncProducts('USER_ID', 'pazarama', ['trendyol', 'hepsiburada']);

  // Tüm platformlardan Pazarama'ya sync
  await syncManager.syncProducts('USER_ID', ['trendyol', 'hepsiburada'], 'pazarama');
}

syncProducts().catch(console.error);
```

### Test Scripti Çalıştırma

```bash
# Pazarama entegrasyonunu test et
node test_pazarama_integration.js

# Çıktı örneği:
# === Pazarama Entegrasyon Testi Başlatılıyor ===
# ✓ Adapter başarıyla oluşturuldu
# ✓ Kimlik doğrulama başarılı
# ✓ 150 kategori alındı
# ✓ 25 marka alındı
# ✓ 10 ürün alındı
# ✓ 5 sipariş alındı
```

## İpuçları ve En İyi Pratikler

### 1. Ürün Yönetimi

- **Desi hesabı:** Pazarama'da desi (ağırlık/hacim) bilgisi zorunludur
- **VAT oranı:** Türkiye için genellikle %18 kullanılır
- **Onay süreci:** Ürünler otomatik olarak `approved: false` ile oluşturulur
- **Grup kodu:** Benzer ürünleri gruplamak için kullanılır

### 2. Kategori ve Markalar

- Pazarama'nın kendi kategori ve marka listelerini kullanın
- `getCategoryWithAttributes()` ile kategori özelliklerini öğrenin
- Ürün oluştururken doğru kategori ve marka ID'lerini kullanın

### 3. Görseller

- Maksimum 10 görsel desteklenir
- Görseller HTTPS URL'leri olmalıdır
- Görsellerin order değeri ile sıralama yapılır

### 4. Batch İşlemler

- Büyük veri setleri için batch operasyonları kullanın
- Batch request ID'lerini takip edin
- Rate limiting için otomatik gecikmeler kullanılır

### 5. Hata Handling

- API yanıtlarını her zaman kontrol edin
- Rate limit hatalarında retry mekanizması kullanın
- Validation hatalarında detaylı hata mesajlarını logla

### 6. Performance

- Gereksiz API çağrılarından kaçının
- Kategori ve marka listelerini cache'leyin
- Pagination kullanarak büyük liste çağrılarını böl

## Sorun Giderme

### Yaygın Sorunlar

1. **Authentication Hatası**
   - API key ve secret'ı kontrol edin
   - Timestamp senkronizasyonunu kontrol edin

2. **Ürün Oluşturulamıyor**
   - Zorunlu alanları kontrol edin (desi, kategori, marka)
   - Attribute ID'lerinin doğruluğunu kontrol edin

3. **Sipariş Durumu Güncellenemiyor**
   - Sipariş ID'sinin doğruluğunu kontrol edin
   - Durum geçişlerinin geçerliliğini kontrol edin

4. **Rate Limit Sorunları**
   - Request sıklığını azaltın
   - Batch operasyonları kullanın

### Debug İpuçları

```javascript
// Debug mode'u aktif et
const adapter = new PazaramaAdapter({
  // ...
  debug: true
});

// Logger seviyesini debug yap
// LOG_LEVEL=debug in .env
```

## API Referansı

### PazaramaAdapter Metotları

#### Ürün İşlemleri
- `getProducts(params)` - Ürün listesi
- `createProduct(productData)` - Ürün oluştur
- `updateProduct(productId, productData)` - Ürün güncelle
- `deleteProduct(productId)` - Ürün sil
- `updateStock(productId, stock, variantId)` - Stok güncelle
- `updatePrice(productId, price, variantId)` - Fiyat güncelle
- `updateProductImages(productId, images)` - Görsel güncelle

#### Sipariş İşlemleri
- `getOrders(params)` - Sipariş listesi
- `updateOrderStatus(orderId, status, trackingInfo)` - Sipariş durumu güncelle

#### Katalog İşlemleri
- `getCategories()` - Kategori listesi
- `getBrands(params)` - Marka listesi
- `getCategoryWithAttributes(categoryId)` - Kategori özellikleri
- `getCities()` - Şehir listesi
- `getSellerDeliveries()` - Teslimat seçenekleri

#### Batch İşlemler
- `createBatchRequest(products)` - Toplu ürün oluştur
- `getBatchRequestStatus(batchRequestId)` - Batch durum sorgula
- `batchUpdatePricesAndStock(items)` - Toplu fiyat/stok güncelle

#### Utility
- `authenticate(credentials)` - Kimlik doğrulama
- `getInfo()` - Adapter bilgileri
- `generateSignature(config)` - API imzası oluştur

---

Bu rehber Pazarama entegrasyonu için kapsamlı bir başlangıç sağlar. Daha detaylı bilgi için [Pazarama API dokümantasyonu](https://api.pazarama.com/docs) 'nu inceleyin. 