# E-ticaret Ara Entegratör - API Endpoint Dokümantasyonu

Bu dokümanda sistemdeki tüm API endpoint'leri, parametreleri ve kullanım detayları bulunmaktadır.

## Base URL
```
http://localhost:9010/api/v1
```

## Kimlik Doğrulama
Çoğu endpoint JWT token gerektirmektedir. Token'ı Authorization header'ında Bearer token olarak gönderiniz:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
**Açıklama:** Yeni kullanıcı kaydı  
**Erişim:** Public  
**Parametreler:**
```json
{
  "name": "string (required)",
  "email": "string (required, email format)",
  "password": "string (required)",
  "company": "string (optional)"
}
```

### POST /auth/login
**Açıklama:** Kullanıcı girişi  
**Erişim:** Public  
**Parametreler:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

### GET /auth/me
**Açıklama:** Mevcut kullanıcı bilgilerini getir  
**Erişim:** Private  
**Parametreler:** Yok

### PUT /auth/me
**Açıklama:** Kullanıcı profilini güncelle  
**Erişim:** Private  
**Parametreler:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "company": "string (optional)",
  "preferences": "object (optional)"
}
```

### PUT /auth/updatepassword
**Açıklama:** Şifre güncelle  
**Erişim:** Private  
**Parametreler:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required)"
}
```

### POST /auth/forgotpassword
**Açıklama:** Şifre sıfırlama talebi  
**Erişim:** Public  
**Parametreler:**
```json
{
  "email": "string (required)"
}
```

### PUT /auth/resetpassword/:resettoken
**Açıklama:** Şifre sıfırlama  
**Erişim:** Public  
**URL Parametreleri:** `resettoken` (string)  
**Parametreler:**
```json
{
  "password": "string (required)"
}
```

### GET /auth/logout
**Açıklama:** Çıkış yap  
**Erişim:** Private  
**Parametreler:** Yok

### POST /auth/marketplace
**Açıklama:** Marketplace hesabı ekle/güncelle  
**Erişim:** Private  
**Parametreler:**
```json
{
  "marketplace": "string (required, one of: trendyol, hepsiburada, amazon, n11)",
  "credentials": "object (required)",
  "settings": "object (optional)"
}
```

### GET /auth/marketplace
**Açıklama:** Marketplace hesaplarını listele  
**Erişim:** Private  
**Parametreler:** Yok

### PUT /auth/marketplace/:marketplace
**Açıklama:** Marketplace hesabını güncelle  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)  
**Parametreler:**
```json
{
  "credentials": "object (optional)",
  "settings": "object (optional)",
  "isActive": "boolean (optional)"
}
```

---

## 📦 Product Endpoints

### GET /products
**Açıklama:** Ürünleri listele  
**Erişim:** Private  
**Query Parametreleri:**
- `page` (integer, default: 1) - Sayfa numarası
- `limit` (integer, default: 20) - Sayfa başına ürün sayısı
- `search` (string) - Ürün adı, açıklama veya SKU'da arama
- `category` (string) - Kategori filtresi
- `brand` (string) - Marka filtresi
- `status` (string) - Durum filtresi
- `marketplace` (string) - Marketplace filtresi
- `sortBy` (string, default: createdAt) - Sıralama alanı
- `sortOrder` (string, default: desc) - Sıralama yönü (asc/desc)

### GET /products/:id
**Açıklama:** Tek ürün detayını getir  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)

### POST /products
**Açıklama:** Yeni ürün oluştur  
**Erişim:** Private  
**Parametreler:**
```json
{
  "name": "string (required)",
  "description": "string",
  "category": "object",
  "brand": "string",
  "basePrice": "number",
  "variants": "array",
  "images": "array",
  "marketplaceSettings": "array",
  "status": "string"
}
```

### PUT /products/:id
**Açıklama:** Ürünü güncelle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:** Ürün güncelleme verileri

### DELETE /products/:id
**Açıklama:** Ürünü sil  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)

### POST /products/:id/sync
**Açıklama:** Ürünü marketplace'lere senkronize et  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "marketplaces": "array (optional) - Hedef marketplace'ler"
}
```

### PUT /products/:id/stock
**Açıklama:** Ürün stoku güncelle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "variants": "array (required) - Varyant stok bilgileri",
  "syncToMarketplaces": "boolean (default: true)"
}
```

### PUT /products/:id/price
**Açıklama:** Ürün fiyatı güncelle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "basePrice": "number (optional)",
  "variants": "array (optional) - Varyant fiyat bilgileri",
  "syncToMarketplaces": "boolean (default: true)"
}
```

### GET /products/dashboard/stats
**Açıklama:** Ürün istatistiklerini getir  
**Erişim:** Private  
**Parametreler:** Yok

### POST /products/bulk
**Açıklama:** Toplu ürün işlemleri  
**Erişim:** Private  
**Parametreler:**
```json
{
  "operation": "string (required) - updateStatus, updateCategory, syncToMarketplace",
  "productIds": "array (required)",
  "data": "object (required) - İşlem verisi"
}
```

---

## 📋 Order Endpoints

### GET /orders
**Açıklama:** Siparişleri listele  
**Erişim:** Private  
**Query Parametreleri:**
- `page` (integer, default: 1) - Sayfa numarası
- `limit` (integer, default: 20) - Sayfa başına sipariş sayısı
- `search` (string) - Sipariş numarası, müşteri bilgilerinde arama
- `status` (string) - Sipariş durumu filtresi
- `paymentStatus` (string) - Ödeme durumu filtresi
- `fulfillmentStatus` (string) - Kargo durumu filtresi
- `marketplace` (string) - Marketplace filtresi
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi
- `sortBy` (string, default: createdAt) - Sıralama alanı
- `sortOrder` (string, default: desc) - Sıralama yönü

### GET /orders/:id
**Açıklama:** Tek sipariş detayını getir  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)

### POST /orders
**Açıklama:** Yeni sipariş oluştur (manuel)  
**Erişim:** Private  
**Parametreler:**
```json
{
  "orderNumber": "string",
  "customer": "object",
  "items": "array",
  "pricing": "object",
  "shipping": "object",
  "marketplace": "object"
}
```

### PUT /orders/:id
**Açıklama:** Siparişi güncelle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:** Sipariş güncelleme verileri

### PUT /orders/:id/status
**Açıklama:** Sipariş durumunu güncelle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "status": "string (required)",
  "note": "string (optional)",
  "trackingInfo": "object (optional)",
  "syncToMarketplace": "boolean (default: true)"
}
```

### POST /orders/:id/notes
**Açıklama:** Siparişe not ekle  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "note": "string (required)",
  "isPrivate": "boolean (default: false)"
}
```

### POST /orders/:id/cancel
**Açıklama:** Siparişi iptal et  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "reason": "string (required)",
  "refundAmount": "number (optional)"
}
```

### POST /orders/:id/refund
**Açıklama:** İade talebi oluştur  
**Erişim:** Private  
**URL Parametreleri:** `id` (string)  
**Parametreler:**
```json
{
  "amount": "number (required)",
  "reason": "string (required)"
}
```

### POST /orders/import
**Açıklama:** Marketplace'lerden sipariş import et  
**Erişim:** Private  
**Parametreler:**
```json
{
  "marketplaces": "array (optional)",
  "startDate": "date (optional)",
  "endDate": "date (optional)"
}
```

### GET /orders/dashboard/stats
**Açıklama:** Sipariş istatistiklerini getir  
**Erişim:** Private  
**Parametreler:** Yok

---

## 🏪 Marketplace Endpoints

### GET /marketplace
**Açıklama:** Mevcut marketplace'leri listele  
**Erişim:** Private  
**Parametreler:** Yok

### POST /marketplace/:marketplace/test
**Açıklama:** Marketplace bağlantısını test et  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)

### GET /marketplace/:marketplace/products
**Açıklama:** Marketplace ürünlerini getir  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)  
**Query Parametreleri:**
- `page` (integer, default: 0)
- `limit` (integer, default: 50)
- Diğer marketplace-specific parametreler

### GET /marketplace/:marketplace/orders
**Açıklama:** Marketplace siparişlerini getir  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)  
**Query Parametreleri:**
- `page` (integer, default: 0)
- `limit` (integer, default: 50)
- Diğer marketplace-specific parametreler

### GET /marketplace/:marketplace/categories
**Açıklama:** Marketplace kategorilerini getir  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)

### POST /marketplace/:marketplace/products
**Açıklama:** Marketplace'te ürün oluştur  
**Erişim:** Private  
**URL Parametreleri:** `marketplace` (string)  
**Parametreler:** Marketplace-specific ürün verileri

### PUT /marketplace/:marketplace/products/:productId
**Açıklama:** Marketplace'te ürün güncelle  
**Erişim:** Private  
**URL Parametreleri:** `marketplace`, `productId`  
**Parametreler:** Güncelleme verileri

### PUT /marketplace/:marketplace/products/:productId/stock
**Açıklama:** Marketplace'te stok güncelle  
**Erişim:** Private  
**URL Parametreleri:** `marketplace`, `productId`  
**Parametreler:**
```json
{
  "stock": "number (required)",
  "variantId": "string (optional)"
}
```

### PUT /marketplace/:marketplace/products/:productId/price
**Açıklama:** Marketplace'te fiyat güncelle  
**Erişim:** Private  
**URL Parametreleri:** `marketplace`, `productId`  
**Parametreler:**
```json
{
  "price": "number (required)",
  "variantId": "string (optional)"
}
```

### PUT /marketplace/:marketplace/orders/:orderId/status
**Açıklama:** Marketplace'te sipariş durumu güncelle  
**Erişim:** Private  
**URL Parametreleri:** `marketplace`, `orderId`  
**Parametreler:**
```json
{
  "status": "string (required)",
  "trackingInfo": "object (optional)"
}
```

### GET /marketplace/stats
**Açıklama:** Adapter istatistiklerini getir  
**Erişim:** Private  
**Parametreler:** Yok

### POST /marketplace/bulk
**Açıklama:** Toplu marketplace işlemleri  
**Erişim:** Private  
**Parametreler:**
```json
{
  "operation": "string (required)",
  "marketplaces": "array (required)",
  "data": "object (required)"
}
```

### GET /marketplace/system-status
**Açıklama:** Sistem durumunu getir  
**Erişim:** Private  
**Parametreler:** Yok

---

## 🔄 Sync Endpoints

### POST /sync/products
**Açıklama:** Ürünleri marketplace'lere senkronize et  
**Erişim:** Private  
**Parametreler:**
```json
{
  "marketplaces": "array (optional)",
  "productIds": "array (optional)"
}
```

### POST /sync/orders
**Açıklama:** Marketplace'lerden sipariş import et  
**Erişim:** Private  
**Parametreler:**
```json
{
  "marketplaces": "array (optional)",
  "startDate": "date (optional)",
  "endDate": "date (optional)"
}
```

### GET /sync/logs
**Açıklama:** Senkronizasyon loglarını getir  
**Erişim:** Private  
**Query Parametreleri:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `marketplace` (string) - Marketplace filtresi
- `operation` (string) - İşlem türü filtresi
- `status` (string) - Durum filtresi
- `entity` (string) - Entity filtresi
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi

### GET /sync/stats
**Açıklama:** Senkronizasyon istatistiklerini getir  
**Erişim:** Private  
**Parametreler:** Yok

---

## 📊 Reports Endpoints

### GET /reports/sales
**Açıklama:** Satış raporu  
**Erişim:** Private  
**Query Parametreleri:**
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi
- `marketplace` (string) - Marketplace filtresi
- `groupBy` (string, default: day) - Gruplama türü (hour, day, month, year)

### GET /reports/products
**Açıklama:** Ürün performans raporu  
**Erişim:** Private  
**Query Parametreleri:**
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi
- `limit` (integer, default: 20) - Sonuç sayısı
- `sortBy` (string, default: revenue) - Sıralama türü (revenue, quantity)

### GET /reports/marketplace-comparison
**Açıklama:** Marketplace karşılaştırma raporu  
**Erişim:** Private  
**Query Parametreleri:**
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi

### GET /reports/inventory
**Açıklama:** Envanter raporu  
**Erişim:** Private  
**Parametreler:** Yok

### GET /reports/financial
**Açıklama:** Mali özet raporu  
**Erişim:** Private  
**Query Parametreleri:**
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi

### GET /reports/sync-performance
**Açıklama:** Senkronizasyon performans raporu  
**Erişim:** Private  
**Query Parametreleri:**
- `startDate` (date) - Başlangıç tarihi
- `endDate` (date) - Bitiş tarihi
- `marketplace` (string) - Marketplace filtresi

---

## 🔧 Health Check

### GET /health
**Açıklama:** Sistem sağlık kontrolü  
**Erişim:** Public  
**Parametreler:** Yok

---

## 📝 Response Format

Tüm API endpoint'leri aşağıdaki standart formatta response döner:

### Başarılı Response:
```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "count": "number (for list endpoints)",
  "total": "number (for paginated endpoints)",
  "page": "number (for paginated endpoints)",
  "pages": "number (for paginated endpoints)"
}
```

### Hata Response:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🔑 HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 🚀 Kullanım Örnekleri

### Kullanıcı Girişi:
```bash
curl -X POST http://localhost:9010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Ürün Listesi:
```bash
curl -X GET "http://localhost:9010/api/v1/products?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Sistem Durumu:
```bash
curl -X GET http://localhost:9010/health
```

---

**Not:** Bu API dokümantasyonu v1.0.0 sürümü içindir. Güncellemeler için sistem yöneticisi ile iletişime geçiniz. 