# Shopify Admin API Entegrasyonu Rehberi

## 📋 İçindekiler
- [Genel Bakış](#genel-bakış)
- [Shopify Setup](#shopify-setup)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Konfigürasyon](#konfigürasyon)
- [API Özellikleri](#api-özellikleri)
- [Cross-Platform Sync](#cross-platform-sync)
- [Örnekler](#örnekler)
- [Sorun Giderme](#sorun-giderme)

## 🎯 Genel Bakış

Bu sistem Shopify Admin API entegrasyonu ile Shopify mağazanızda ürün yönetimi ve diğer platformlarla sync imkanı sağlar.

### Desteklenen Özellikler
- ✅ Ürün listesi alma ve arama
- ✅ Ürün oluşturma ve güncelleme
- ✅ Variant yönetimi
- ✅ Stok yönetimi
- ✅ Fiyat güncelleme
- ✅ Sipariş yönetimi
- ✅ Cross-platform sync (Marketplace ↔ Shopify)
- ✅ Collection (kategori) yönetimi
- ✅ Inventory management
- ✅ Webhooks desteği
- ✅ Fulfillment işlemleri
- ✅ Rate limiting (2 req/sec sustained, 40 burst)
- ✅ SEO optimization

## 🔧 Shopify Setup

### 1. Shopify Store

1. [Shopify](https://www.shopify.com/) hesabınızla giriş yapın
2. Mağazanızı oluşturun (herhangi bir plan)
3. Admin panel'e erişim sağlayın

### 2. Private App Oluşturma (Önerilen)

1. Shopify Admin → Settings → Apps and sales channels
2. "Develop apps" butonuna tıklayın
3. "Create an app" seçin
4. App adını girin (örn: "E-ticaret Entegratör")
5. "Admin API access scopes" bölümünde gerekli izinleri verin:
   - `read_products`, `write_products`
   - `read_orders`, `write_orders`
   - `read_inventory`, `write_inventory`
   - `read_collections`, `write_collections`
   - `read_fulfillments`, `write_fulfillments`

### 3. Access Token Alma

App oluşturduktan sonra:
1. "Install app" butonuna tıklayın
2. Admin API access token'ını kopyalayın
3. Bu token'ı güvenli bir yerde saklayın

## 🔐 Kimlik Doğrulama

Shopify Admin API access token kullanır.

### Authentication Flow:
1. **Access Token** ile API istekleri yapma
2. **X-Shopify-Access-Token** header'ı ekleme
3. Rate limiting kontrolü

```javascript
// Örnek authentication
const config = {
  shopDomain: 'mystore', // mystore.myshopify.com'daki mystore kısmı
  accessToken: 'shpat_xyz123...',
  apiVersion: '2023-10'
};
```

## ⚙️ Konfigürasyon

### Environment Variables

`.env` dosyanıza şu bilgileri ekleyin:

```env
# Shopify Admin API Configuration
SHOPIFY_SHOP_DOMAIN=your-shop-name
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
```

### Headers

Her API isteğinde şu header gereklidir:

```javascript
headers: {
  'X-Shopify-Access-Token': 'your-access-token',
  'Content-Type': 'application/json'
}
```

### Rate Limiting

Shopify'ın rate limit sistemi:
- **Sustained**: 2 requests/second
- **Burst**: 40 requests/second
- **Bucket Size**: 40
- **Refill Rate**: 2 per second

## 🚀 API Özellikleri

### Ürün İşlemleri

```javascript
// Ürün listesi alma
const products = await shopifyAdapter.getProducts({
  limit: 50,
  vendor: 'Apple',
  product_type: 'Electronics',
  published_status: 'published'
});

// Ürün oluşturma
const result = await shopifyAdapter.createProduct({
  title: 'iPhone 15 Pro',
  body_html: '<p>Latest iPhone model</p>',
  vendor: 'Apple',
  product_type: 'Smartphone',
  variants: [{
    price: '999.99',
    sku: 'IPHONE15PRO-128',
    inventory_quantity: 100
  }]
});

// Variant güncelleme
await shopifyAdapter.updateVariant('12345', {
  price: '1099.99',
  inventory_quantity: 50
});
```

### Sipariş İşlemleri

```javascript
// Sipariş listesi
const orders = await shopifyAdapter.getOrders({
  status: 'any',
  financial_status: 'paid',
  limit: 50
});

// Fulfillment oluşturma
await shopifyAdapter.updateOrderStatus('12345', 'fulfilled', {
  trackingNumber: 'TR123456789',
  company: 'UPS',
  notifyCustomer: true
});
```

### Inventory Management

```javascript
// Inventory levels
const levels = await shopifyAdapter.getInventoryLevels('inventory_item_id');

// Stock güncelleme
await shopifyAdapter.updateInventoryLevel(
  'inventory_item_id',
  'location_id', 
  100
);
```

### Shopify-Özel İşlemler

```javascript
// Collections (kategoriler)
const collections = await shopifyAdapter.getCategories();

// Webhooks
const webhooks = await shopifyAdapter.getWebhooks();

await shopifyAdapter.createWebhook({
  topic: 'products/update',
  address: 'https://yourapp.com/webhooks/products/update',
  format: 'json'
});

// Product variants
const variants = await shopifyAdapter.getVariants('product_id');
```

## 🔄 Cross-Platform Sync

Shopify artık cross-platform sync sistemine dahil edilmiştir.

### Desteklenen Sync Kombinasyonları

1. **Trendyol ↔ Shopify**
2. **Hepsiburada ↔ Shopify**
3. **Amazon ↔ Shopify**
4. **N11 ↔ Shopify**
5. **Marketplace → Shopify** (Çoklu)

### Sync Örnekleri

```javascript
// Trendyol'dan Shopify'a analiz
const analysis = await crossPlatformSync.analyzeProductsAcrossMarketplaces(
  userId, 
  'trendyol', 
  'shopify'
);

// Shopify'dan Amazon'a sync
const syncResult = await crossPlatformSync.executeCrossPlatformSync(
  userId,
  'shopify',
  'amazon',
  {
    syncMissing: true,
    importMissing: false
  }
);
```

### Product Matching

Shopify ürünleri şu kriterlere göre eşleştirilir:
1. **SKU** (Variant SKU)
2. **Barcode** (Variant barcode)
3. **Vendor + Title** combination
4. **Fuzzy name** matching

## 📝 Örnekler

### 1. Temel Shopify Adapter Kullanımı

```javascript
const ShopifyAdapter = require('./src/adapters/ShopifyAdapter');

const adapter = new ShopifyAdapter({
  shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN
});

// Authenticate
await adapter.authenticate();

// Get products
const products = await adapter.getProducts({ limit: 10 });
console.log(`Found ${products.products.length} products`);
```

### 2. Cross-Platform Analysis

```javascript
const CrossPlatformSyncManager = require('./src/core/CrossPlatformSyncManager');

const syncManager = new CrossPlatformSyncManager();

// Trendyol ve Shopify arasında analiz
const analysis = await syncManager.analyzeProductsAcrossMarketplaces(
  userId,
  'trendyol',
  'shopify',
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

### 3. Variant Yönetimi

```javascript
const productData = {
  title: 'Premium T-Shirt',
  body_html: '<p>High quality cotton t-shirt</p>',
  vendor: 'Fashion Brand',
  product_type: 'Apparel',
  options: [
    { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
    { name: 'Color', values: ['Red', 'Blue', 'Green'] }
  ],
  variants: [
    { option1: 'S', option2: 'Red', price: '29.99', sku: 'TSHIRT-S-RED' },
    { option1: 'M', option2: 'Blue', price: '29.99', sku: 'TSHIRT-M-BLUE' },
    { option1: 'L', option2: 'Green', price: '29.99', sku: 'TSHIRT-L-GREEN' }
  ]
};

const result = await adapter.createProduct(productData);
console.log('Product created with variants:', result.data.variants.length);
```

### 4. Webhook Management

```javascript
// Create webhook for product updates
const webhook = await adapter.createWebhook({
  topic: 'products/update',
  address: 'https://your-app.com/webhook/products/update',
  format: 'json'
});

// Get all webhooks
const webhooks = await adapter.getWebhooks();
console.log(`Active webhooks: ${webhooks.length}`);
```

## 🔧 API Endpoints

### Cross-Platform Sync ile Shopify

```bash
# Supported marketplaces (Shopify dahil)
GET /api/v1/sync/cross-platform/marketplaces

# Trendyol → Shopify analysis
POST /api/v1/sync/cross-platform/analyze
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "shopify"
}

# Shopify → Amazon sync
POST /api/v1/sync/cross-platform/execute
{
  "sourceMarketplace": "shopify",
  "targetMarketplace": "amazon",
  "options": {
    "syncMissing": true
  }
}

# Sync status
GET /api/v1/sync/cross-platform/status?source=shopify&target=n11
```

## ❗ Önemli Notlar

### Rate Limiting
- Shopify leaky bucket algoritması kullanır
- 2 req/sec sustained, 40 req/sec burst
- Rate limit header'ları takip edilir
- Otomatik retry mekanizması

### Variant Sistemi
- Shopify güçlü variant sistemi kullanır
- Max 100 variant per product
- 3 option level (Size, Color, Material)
- Her variant'ın kendi SKU, price, inventory

### Collections vs Categories
- Shopify "collections" kullanır
- Categories yerine product_type field'ı var
- Collections filtreleme ve gruplama için

## 🐛 Sorun Giderme

### 1. Authentication Hataları

```bash
Error: Shopify authentication failed
```
**Çözüm:**
- Access token'ın doğru olduğunu kontrol edin
- Shop domain'in doğru olduğunu kontrol edin (sadece isim kısmı)
- Token'ın expire olmadığını kontrol edin
- API permissions'ları kontrol edin

### 2. Rate Limit Hataları

```bash
Error: Rate limit exceeded
```
**Çözüm:**
- Sistem otomatik retry yapar
- Request frequency'yi azaltın
- Batch operations kullanın
- Webhook'lar ile real-time updates

### 3. Variant Hataları

```bash
Error: Variant creation failed
```
**Çözüm:**
- Option values'ların doğru olduğunu kontrol edin
- Variant combinations'ın unique olduğunu kontrol edin
- Required fields'ların dolu olduğunu kontrol edin

### 4. Inventory Hataları

```bash
Error: Inventory update failed
```
**Çözüm:**
- inventory_management ayarını kontrol edin
- Location ID'nin doğru olduğunu kontrol edin
- Inventory tracking'in aktif olduğunu kontrol edin

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

// Response header'larından
if (response.headers['x-shopify-shop-api-call-limit']) {
  const [used, total] = response.headers['x-shopify-shop-api-call-limit'].split('/');
  console.log(`API calls: ${used}/${total}`);
}
```

## 📚 Ek Kaynaklar

- [Shopify Admin API Documentation](https://shopify.dev/api/admin)
- [Shopify Partners](https://partners.shopify.com/)
- [Shopify API Rate Limits](https://shopify.dev/api/usage/rate-limits)
- [Shopify Webhooks](https://shopify.dev/api/admin-rest/2023-10/resources/webhook)

## 🎯 Best Practices

### Ürün Yönetimi
- **Variants**: Renk, beden gibi seçenekler için variants kullanın
- **SEO**: Title ve description'ları SEO uyumlu yazın
- **Images**: Yüksek kaliteli görseller kullanın (max 250)
- **Collections**: Ürünleri organize etmek için collections kullanın

### Sync İşlemleri
- **Webhooks**: Real-time updates için webhooks kullanın
- **Batch Processing**: Büyük operations için batch kullanın
- **Rate Limiting**: Rate limit'lere saygı gösterin
- **Error Handling**: Comprehensive error handling uygulayın

### Performance
- **Caching**: Sık kullanılan data'yı cache'leyin
- **Pagination**: Büyük result set'ler için pagination kullanın
- **Field Selection**: Sadece gerekli field'ları request edin
- **Background Jobs**: Büyük sync operations için background jobs

## 🎯 Use Cases

### E-ticaret Sync
1. **Marketplace → Shopify**: Marketplace ürünlerini Shopify'a sync edin
2. **Shopify → Marketplace**: Shopify ürünlerini marketplace'lere gönder
3. **Bidirectional Sync**: İki yönlü senkronizasyon

### Inventory Management
1. **Centralized Stock**: Shopify'ı merkezi stok olarak kullanın
2. **Real-time Updates**: Webhook'larla real-time stok güncellemesi
3. **Multi-location**: Birden fazla location'da stok yönetimi

### Order Processing
1. **Order Import**: Marketplace siparişlerini Shopify'a import edin
2. **Fulfillment Sync**: Fulfillment bilgilerini sync edin
3. **Status Updates**: Sipariş durumlarını otomatik güncelleyin

## 🎯 Next Steps

1. **Setup**: Environment variables'ları yapılandırın
2. **Private App**: Shopify private app oluşturun
3. **Test**: `node test_shopify_integration.js` ile test edin
4. **Webhooks**: Real-time updates için webhooks ayarlayın
5. **Sync**: Cross-platform sync işlemlerini başlatın

---

**🚀 Shopify entegrasyonu artık aktif! Trendyol, Hepsiburada, Amazon, N11 ve Shopify arasında seamless sync yapabilirsiniz.** 