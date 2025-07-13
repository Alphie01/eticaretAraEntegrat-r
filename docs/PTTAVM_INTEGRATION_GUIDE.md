# PTT AVM Entegrasyon Rehberi

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [PTT AVM API Konfigürasyonu](#ptt-avm-api-konfigürasyonu)
4. [Temel Kullanım](#temel-kullanım)
5. [Ürün Yönetimi](#ürün-yönetimi)
6. [Sipariş Yönetimi](#sipariş-yönetimi)
7. [Batch İşlemler](#batch-işlemler)
8. [Hata Yönetimi](#hata-yönetimi)
9. [Rate Limiting](#rate-limiting)
10. [Örnekler](#örnekler)

## Genel Bakış

PTT AVM, Türkiye Posta ve Telgraf Teşkilatı'nın resmi e-ticaret pazaryeridir. Bu entegrasyon, PTT AVM API'si kullanarak ürün ve sipariş yönetimi sağlar.

### Özellikler

- ✅ Ürün CRUD operasyonları
- ✅ Kategori ve marka yönetimi
- ✅ Sipariş yönetimi
- ✅ Stok ve fiyat güncelleme
- ✅ Toplu işlemler (Batch operations)
- ✅ Görsel yönetimi
- ✅ Teslimat şablon yönetimi
- ✅ Kargo firma entegrasyonu
- ✅ Şehir/bölge bilgileri
- ✅ Variant (çeşit) desteği
- ✅ Cross-platform sync desteği

### API Özellikleri

- **Authentication:** API Key + Secret (HMAC-SHA256 imzalama)
- **Rate Limiting:** ~10 req/sec (conservative estimate)
- **Para Birimi:** TRY (Türk Lirası)
- **Dil:** Türkçe
- **Kurumsal:** PTT kurumsal güvenlik standartları

## Kurulum

### 1. Sistem Gereksinimleri

- Node.js 14+
- SQL Server (MSSQL)
- Redis (opsiyonel)

### 2. PTT AVM API Bilgilerini Alma

1. [PTT AVM Satıcı Paneli](https://seller.pttavm.com)'ne kayıt olun
2. API erişimi için başvuru yapın
3. API Key ve Secret bilgilerinizi alın
4. Seller ID'nizi not edin

### 3. Environment Konfigürasyonu

`.env` dosyasında PTT AVM ayarlarını tanımlayın:

```env
# PTT AVM API Configuration
PTTAVM_API_KEY=your-pttavm-api-key
PTTAVM_API_SECRET=your-pttavm-api-secret
PTTAVM_SELLER_ID=your-pttavm-seller-id
PTTAVM_ENVIRONMENT=production  # production, test
```

## PTT AVM API Konfigürasyonu

### API Endpoints

- **Production:** `https://api.pttavm.com`
- **Test:** `https://test-api.pttavm.com`

### Authentication

PTT AVM kurumsal güvenlik sistemi kullanır:

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
const PTTAVMAdapter = require('./src/adapters/PTTAVMAdapter');

const adapter = new PTTAVMAdapter({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  sellerId: 'your-seller-id',
  environment: 'production'
});

// Kimlik doğrulama
await adapter.authenticate();

// Adapter bilgilerini al
const info = await adapter.getInfo();
console.log('PTT AVM adapter info:', info);
```

### Temel Bilgileri Alma

```javascript
// Kategorileri al
const categories = await adapter.getCategories();

// Markaları al
const brands = await adapter.getBrands({ page: 1, limit: 50 });

// Şehirleri al
const cities = await adapter.getCities();

// Teslimat şablonlarını al
const templates = await adapter.getShippingTemplates();

// Kargo firmalarını al
const cargoCompanies = await adapter.getCargoCompanies();
```

## Ürün Yönetimi

### Ürün Listeleme

```javascript
const result = await adapter.getProducts({
  page: 1,
  limit: 50,
  categoryId: 123,
  status: 'active',
  searchTerm: 'örnek ürün',
  isActive: true
});

console.log(`${result.products.length} ürün bulundu`);
console.log(`Toplam: ${result.totalCount} ürün`);
```

### Ürün Oluşturma

```javascript
const productData = {
  name: 'Örnek Ürün',
  description: 'Bu ürün PTT AVM için oluşturulmuştur.',
  categoryId: 123,
  brandId: 456,
  barcode: 'URUN-001',
  modelCode: 'MODEL-001',
  price: 149.99,
  listPrice: 179.99,
  stock: 100,
  currency: 'TRY',
  images: [
    { url: 'https://example.com/image1.jpg', order: 1, isMain: true },
    { url: 'https://example.com/image2.jpg', order: 2, isMain: false }
  ],
  attributes: [
    { name: 'Renk', value: 'Kırmızı', type: 'text' },
    { name: 'Beden', value: 'M', type: 'text' }
  ],
  isActive: true,
  status: 'active',
  weight: 0.5,
  dimensions: {
    length: 10,
    width: 5,
    height: 3
  },
  variants: [
    {
      name: 'Kırmızı - M',
      sku: 'URUN-001-KIR-M',
      barcode: 'URUN-001-KIR-M',
      price: 149.99,
      stock: 50,
      attributes: [
        { name: 'Renk', value: 'Kırmızı' },
        { name: 'Beden', value: 'M' }
      ]
    }
  ]
};

const result = await adapter.createProduct(productData);
console.log('Ürün oluşturuldu:', result.productId);
```

### Ürün Güncelleme

```javascript
const productId = 'PTT-PRODUCT-ID';

const updateData = {
  name: 'Güncellenmiş Ürün Adı',
  description: 'Güncellenmiş açıklama',
  price: 199.99,
  listPrice: 229.99
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
  limit: 50,
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
  trackingNumber: 'PTT123456',
  cargoCompany: 'PTT Kargo',
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

PTT AVM API rate limiting uyguluyor:

- **Limit:** ~10 request/second (conservative estimate)
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

async function pttavmIntegration() {
  const manager = new AdapterManager();
  const adapter = await manager.getAdapter('pttavm', 'USER_ID');

  // 1. Kategorileri al ve cache'le
  const categories = await adapter.getCategories();
  console.log(`${categories.length} kategori yüklendi`);

  // 2. Ürünleri listele
  const products = await adapter.getProducts({ page: 1, limit: 10 });
  console.log(`${products.products.length} ürün listelendi`);

  // 3. Yeni ürün ekle
  const newProduct = {
    name: 'Yeni Ürün',
    description: 'Açıklama',
    categoryId: 1,
    brandId: 1,
    barcode: `PROD-${Date.now()}`,
    stock: 50,
    price: 99.99,
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

pttavmIntegration().catch(console.error);
```

### Cross-Platform Sync Örneği

```javascript
const { CrossPlatformSyncManager } = require('./src/core/CrossPlatformSyncManager');

async function syncProducts() {
  const syncManager = new CrossPlatformSyncManager();

  // PTT AVM'den diğer platformlara sync
  await syncManager.syncProducts('USER_ID', 'pttavm', ['trendyol', 'hepsiburada']);

  // Tüm platformlardan PTT AVM'ye sync
  await syncManager.syncProducts('USER_ID', ['trendyol', 'hepsiburada'], 'pttavm');
}

syncProducts().catch(console.error);
```

### Test Scripti Çalıştırma

```bash
# PTT AVM entegrasyonunu test et
node test_pttavm_integration.js

# Çıktı örneği:
# === PTT AVM Entegrasyon Testi Başlatılıyor ===
# ✓ Adapter başarıyla oluşturuldu
# ✓ Kimlik doğrulama başarılı
# ✓ 150 kategori alındı
# ✓ 25 marka alındı
# ✓ 10 ürün alındı
# ✓ 5 sipariş alındı
```

## İpuçları ve En İyi Pratikler

### 1. Ürün Yönetimi

- **Model Code:** PTT AVM'da model kodu (modelCode) zorunludur
- **Barkod:** Benzersiz barkod kullanın
- **Variant desteği:** Çoklu varyant ürünleri desteklenir
- **Ağırlık ve boyut:** Kargo hesaplaması için gereklidir

### 2. Kategori ve Markalar

- PTT AVM'nin kendi kategori ve marka listelerini kullanın
- Ürün oluştururken doğru kategori ve marka ID'lerini kullanın

### 3. Görseller

- Maksimum 10 görsel desteklenir
- Görseller HTTPS URL'leri olmalıdır
- Ana görsel (isMain: true) belirtilmelidir

### 4. Batch İşlemler

- Enterprise seviye rate limiting nedeniyle küçük batch'ler kullanın
- Rate limiting için otomatik gecikmeler kullanılır

### 5. Hata Handling

- API yanıtlarını her zaman kontrol edin
- Rate limit hatalarında retry mekanizması kullanın
- Validation hatalarında detaylı hata mesajlarını logla

### 6. Performance

- Gereksiz API çağrılarından kaçının
- Kategori ve marka listelerini cache'leyin
- Pagination kullanarak büyük liste çağrılarını böl

### 7. Teslimat ve Kargo

- Teslimat şablonlarını (shipping templates) kullanın
- PTT Kargo entegrasyonundan yararlanın
- Şehir bilgilerini güncel tutun

## Sorun Giderme

### Yaygın Sorunlar

1. **Authentication Hatası**
   - API key ve secret'ı kontrol edin
   - Timestamp senkronizasyonunu kontrol edin

2. **Ürün Oluşturulamıyor**
   - Zorunlu alanları kontrol edin (model code, kategori, marka)
   - Barkod benzersizliğini kontrol edin

3. **Sipariş Durumu Güncellenemiyor**
   - Sipariş ID'sinin doğruluğunu kontrol edin
   - Durum geçişlerinin geçerliliğini kontrol edin

4. **Rate Limit Sorunları**
   - Request sıklığını azaltın
   - Batch operasyonları kullanın

### Debug İpuçları

```javascript
// Debug mode'u aktif et
const adapter = new PTTAVMAdapter({
  // ...
  debug: true
});

// Logger seviyesini debug yap
// LOG_LEVEL=debug in .env
```

## API Referansı

### PTTAVMAdapter Metotları

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
- `getCities()` - Şehir listesi
- `getShippingTemplates()` - Teslimat şablonları
- `getCargoCompanies()` - Kargo firmaları

#### Batch İşlemler
- `batchUpdatePricesAndStock(items)` - Toplu fiyat/stok güncelle

#### Utility
- `authenticate(credentials)` - Kimlik doğrulama
- `getInfo()` - Adapter bilgileri
- `generateSignature(config, timestamp)` - API imzası oluştur

## Kurumsal Özellikler

### PTT Entegrasyonu

- **PTT Kargo:** Otomatik kargo entegrasyonu
- **Güvenlik:** Kurumsal seviye güvenlik standartları
- **Güvenilirlik:** Devlet kurumu güvencesi
- **Destek:** Kurumsal teknik destek

### Compliance

- **Veri Güvenliği:** KVKK uyumlu
- **Faturalandırma:** E-fatura entegrasyonu
- **Vergi:** Otomatik vergi hesaplaması
- **Raporlama:** Detaylı satış raporları

---

Bu rehber PTT AVM entegrasyonu için kapsamlı bir başlangıç sağlar. Daha detaylı bilgi için [PTT AVM API dokümantasyonu](https://api.pttavm.com/docs) 'nu inceleyin. 