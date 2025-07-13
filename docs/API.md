# API Dokümantasyonu

## 📋 İçindekiler

- [Genel Bilgiler](#genel-bilgiler)
- [Authentication](#authentication)
- [Marketplace Keys Management](#marketplace-keys-management)
- [Product Management](#product-management)
- [Order Management](#order-management)
- [Sync Operations](#sync-operations)
- [Error Handling](#error-handling)

## 🔗 Genel Bilgiler

**Base URL**: `http://localhost:25626/api/v1`

**Content-Type**: `application/json`

**Authentication**: Bearer Token (JWT)

### Rate Limiting
- **Limit**: 100 requests/15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 🔐 Authentication

### Kullanıcı Kaydı
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "Kullanıcı Adı",
  "email": "user@example.com",
  "password": "SecurePassword123",
  "company_name": "Şirket Adı (Optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Kullanıcı Adı",
      "email": "user@example.com",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Kullanıcı Girişi
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Kullanıcı Adı",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Kullanıcı Profili
```http
GET /auth/profile
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Kullanıcı Adı",
    "email": "user@example.com",
    "company_name": "Şirket Adı",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

## 🔑 Marketplace Keys Management

### Desteklenen Marketplace'leri Listele
```http
GET /marketplace-keys/supported
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "marketplaces": [
      {
        "id": "trendyol",
        "name": "Trendyol",
        "description": "Türkiye'nin lider e-ticaret platformu",
        "fields": [
          {
            "key": "api_key",
            "label": "API Key",
            "type": "text",
            "required": true
          },
          {
            "key": "api_secret",
            "label": "API Secret",
            "type": "password",
            "required": true
          },
          {
            "key": "supplier_id",
            "label": "Supplier ID",
            "type": "text",
            "required": true
          }
        ]
      },
      {
        "id": "hepsiburada",
        "name": "Hepsiburada",
        "description": "Teknoloji odaklı e-ticaret platformu",
        "fields": [
          {
            "key": "api_key",
            "label": "API Key",
            "type": "text",
            "required": true
          },
          {
            "key": "api_secret",
            "label": "API Secret",
            "type": "password",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### Kullanıcının API Anahtarlarını Listele
```http
GET /marketplace-keys
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "marketplace": "trendyol",
      "is_active": true,
      "last_used_at": "2025-01-01T12:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### API Anahtarları Kaydet/Güncelle
```http
POST /marketplace-keys
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "marketplace": "trendyol",
  "credentials": {
    "api_key": "your-api-key",
    "api_secret": "your-api-secret",
    "supplier_id": "12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "API anahtarları başarıyla kaydedildi",
  "data": {
    "marketplace": "trendyol",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### API Bağlantısını Test Et
```http
POST /marketplace-keys/{marketplace}/test
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "API bağlantısı başarılı",
  "data": {
    "marketplace": "trendyol",
    "connection_status": "success",
    "response_time": 245
  }
}
```

### API Anahtarlarını Sil
```http
DELETE /marketplace-keys/{marketplace}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "API anahtarları başarıyla silindi"
}
```

## 📦 Product Management

### Ürünleri Listele
```http
GET /products?page=1&limit=10&search=ürün
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına ürün sayısı (default: 10, max: 100)
- `search`: Ürün adında arama
- `category_id`: Kategori ID'si ile filtreleme
- `marketplace`: Marketplace ile filtreleme

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Ürün Adı",
        "description": "Ürün açıklaması",
        "price": 99.99,
        "stock": 150,
        "sku": "SKU123",
        "category": {
          "id": 1,
          "name": "Kategori Adı"
        },
        "images": [
          {
            "id": 1,
            "image_url": "https://example.com/image1.jpg",
            "display_order": 1
          }
        ],
        "variants": [
          {
            "id": 1,
            "name": "Variant Adı",
            "price": 99.99,
            "stock": 50,
            "sku": "SKU123-V1"
          }
        ],
        "marketplaces": [
          {
            "marketplace": "trendyol",
            "marketplace_product_id": "12345",
            "status": "active",
            "last_sync_at": "2025-01-01T12:00:00.000Z"
          }
        ],
        "created_at": "2025-01-01T00:00:00.000Z",
        "updated_at": "2025-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 100,
      "per_page": 10
    }
  }
}
```

### Tek Ürün Getir
```http
GET /products/{id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ürün Adı",
    "description": "Detaylı ürün açıklaması",
    "price": 99.99,
    "stock": 150,
    "sku": "SKU123",
    "category": {
      "id": 1,
      "name": "Kategori Adı",
      "path": "Ana Kategori > Alt Kategori"
    },
    "images": [...],
    "variants": [...],
    "marketplaces": [...],
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T12:00:00.000Z"
  }
}
```

## 📋 Order Management

### Siparişleri Listele
```http
GET /orders?page=1&limit=10&status=confirmed
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Sayfa numarası
- `limit`: Sayfa başına sipariş sayısı
- `status`: Sipariş durumu (pending, confirmed, processing, shipped, delivered, cancelled, returned)
- `marketplace`: Marketplace ile filtreleme
- `start_date`: Başlangıç tarihi (YYYY-MM-DD)
- `end_date`: Bitiş tarihi (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "order_number": "ORD-2025-001",
        "marketplace_order_id": "TY123456789",
        "marketplace": "trendyol",
        "status": "confirmed",
        "total_amount": 299.99,
        "currency": "TRY",
        "customer": {
          "name": "Müşteri Adı",
          "email": "customer@example.com",
          "phone": "+90 555 123 4567"
        },
        "shipping_address": {
          "name": "Teslimat Adı",
          "address": "Tam adres",
          "city": "İstanbul",
          "district": "Kadıköy",
          "postal_code": "34710"
        },
        "items": [
          {
            "id": 1,
            "product_name": "Ürün Adı",
            "variant_name": "Variant",
            "quantity": 2,
            "unit_price": 149.99,
            "total_price": 299.98
          }
        ],
        "status_history": [
          {
            "status": "pending",
            "changed_at": "2025-01-01T10:00:00.000Z"
          },
          {
            "status": "confirmed",
            "changed_at": "2025-01-01T11:00:00.000Z"
          }
        ],
        "created_at": "2025-01-01T10:00:00.000Z",
        "updated_at": "2025-01-01T11:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "per_page": 10
    }
  }
}
```

## 🔄 Sync Operations

### Trendyol Ürünlerini İçe Aktar
```http
POST /sync/import-trendyol-products
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "page": 0,
  "size": 50,
  "fullImport": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trendyol ürün senkronizasyonu tamamlandı",
  "data": {
    "imported": 25,
    "skipped": 5,
    "errors": 0,
    "total_processed": 30,
    "execution_time": "00:02:15"
  }
}
```

### Trendyol Siparişlerini İçe Aktar
```http
POST /sync/import-trendyol-orders
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "days": 30,
  "page": 0,
  "size": 200
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trendyol sipariş senkronizasyonu tamamlandı",
  "data": {
    "imported": 15,
    "updated": 3,
    "errors": 0,
    "total_processed": 18,
    "status_breakdown": {
      "confirmed": 8,
      "shipped": 5,
      "delivered": 2,
      "pending": 3
    }
  }
}
```

## ❌ Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Başarılı |
| `201` | Created - Oluşturuldu |
| `400` | Bad Request - Geçersiz istek |
| `401` | Unauthorized - Kimlik doğrulama gerekli |
| `403` | Forbidden - Erişim izni yok |
| `404` | Not Found - Kaynak bulunamadı |
| `422` | Unprocessable Entity - Doğrulama hatası |
| `429` | Too Many Requests - Rate limit aşıldı |
| `500` | Internal Server Error - Sunucu hatası |

### Error Response Format

```json
{
  "success": false,
  "error": "Hata mesajı",
  "details": {
    "field": "validation error"
  },
  "code": "ERROR_CODE",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | API anahtarları geçersiz |
| `MARKETPLACE_CONNECTION_FAILED` | Marketplace bağlantısı başarısız |
| `DUPLICATE_PRODUCT` | Ürün zaten mevcut |
| `SYNC_IN_PROGRESS` | Senkronizasyon devam ediyor |
| `RATE_LIMIT_EXCEEDED` | Rate limit aşıldı |
| `INSUFFICIENT_PERMISSIONS` | Yetersiz izin |

### Örnek Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Token geçersiz veya süresi dolmuş",
  "code": "INVALID_TOKEN",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**422 Validation Error:**
```json
{
  "success": false,
  "error": "Doğrulama hatası",
  "details": {
    "email": "Geçerli bir email adresi giriniz",
    "password": "Şifre en az 8 karakter olmalıdır"
  },
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**429 Rate Limit:**
```json
{
  "success": false,
  "error": "Rate limit aşıldı. 15 dakika sonra tekrar deneyin.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 900,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 📝 Notlar

- Tüm tarih/saat değerleri ISO 8601 formatında UTC olarak döner
- API anahtarları AES-256-CBC ile şifrelenir
- Rate limiting IP bazlı olarak uygulanır
- Pagination varsayılan olarak 10 kayıt, maksimum 100 kayıt getirir
- Senkronizasyon işlemleri arka planda çalışır ve progress takip edilebilir 