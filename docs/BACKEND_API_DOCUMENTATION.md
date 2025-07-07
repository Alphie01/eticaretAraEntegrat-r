# Backend API Dokümantasyonu

## 📋 İçindekiler
1. [Genel Bilgiler](#genel-bilgiler)
2. [Authentication API](#authentication-api)
3. [Marketplace API](#marketplace-api)
4. [Products API](#products-api)
5. [Orders API](#orders-api)
6. [Reports API](#reports-api)
7. [Sync API](#sync-api)
8. [Cargo Tracking API](#cargo-tracking-api)
9. [Marketplace Keys API](#marketplace-keys-api)
10. [Cross-Platform Sync API](#cross-platform-sync-api)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## 🔧 Genel Bilgiler

### Base URL
```
Development: http://localhost:25628/api/v1
Production: https://api.yourdomain.com/api/v1
```

### Authentication
Tüm private endpoint'ler JWT token gerektirir:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Response Format
Tüm API response'ları aşağıdaki formatta döner:
```javascript
{
  "success": true/false,
  "data": {} | [],        // Başarılı response'da
  "error": "string",      // Hatalı response'da
  "message": "string",    // Opsiyonel bilgi mesajı
  "pagination": {}        // Paginated endpoint'lerde
}
```

---

## 🔐 Authentication API

### 1. Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "company": "Company Name" // Opsiyonel
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_id": 1,
    "is_active": true
  },
  "message": "Authentication successful"
}
```

**Kullanım Notları:**
- Password minimum 6 karakter olmalı
- Email unique olmalı
- Token default 7 gün geçerli
- Token'ı sonraki isteklerde Authorization header'da kullan

### 2. Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_id": 1,
    "is_active": true
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Dikkat Edilecekler:**
- 5 başarısız giriş denemesinden sonra hesap 2 saat kilitlenir
- Login sonrası dönen token'ı güvenli bir şekilde sakla
- OAuth ile giriş yapan kullanıcılar için password kontrolü yapılmaz

### 3. Get Current User
```http
GET /auth/me
```

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_id": 1,
    "company": "Company Name",
    "oauth_provider": "local",
    "email_verified": true,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Password
```http
PUT /auth/updatepassword
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Password updated successfully"
}
```

**Dikkat:**
- OAuth kullanıcıları için password update yapılamaz
- Yeni token döner, eski token geçersiz olur

### 5. OAuth Login
```http
GET /auth/google
GET /auth/facebook
GET /auth/apple
```

**Response:**
Browser'ı OAuth provider'a yönlendirir. Callback URL'e döner:
```
/auth/callback?token=JWT_TOKEN&provider=google
```

**OAuth Callback Handling (Frontend):**
```javascript
// Frontend'de callback'i handle etme
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const provider = urlParams.get('provider');

if (token) {
  localStorage.setItem('authToken', token);
  // Redirect to dashboard
}
```

---

## 🏪 Marketplace API

### 1. Get Available Marketplaces
```http
GET /marketplace
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "available": ["trendyol", "hepsiburada", "amazon"],
    "all": ["trendyol", "hepsiburada", "amazon", "n11", "shopify", "ciceksepeti", "pazarama", "pttavm"],
    "status": {
      "trendyol": { "enabled": true, "configured": true },
      "hepsiburada": { "enabled": true, "configured": false },
      "amazon": { "enabled": false, "configured": false }
    },
    "connections": [
      {
        "marketplace": "trendyol",
        "isConnected": true,
        "lastSync": "2024-01-01T00:00:00.000Z",
        "credentials": {
          "hasApiKey": true,
          "hasApiSecret": true,
          "hasSupplierId": true
        }
      }
    ],
    "message": "3 marketplace integration(s) enabled: trendyol, hepsiburada, amazon"
  }
}
```

### 2. Test Marketplace Connection
```http
POST /marketplace/:marketplace/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trendyol connection successful",
  "data": {
    "supplierId": "123456",
    "apiVersion": "v2",
    "limits": {
      "rateLimit": "1000 requests/hour",
      "productLimit": 50000
    }
  }
}
```

### 3. Get Marketplace Products
```http
GET /marketplace/:marketplace/products?page=1&size=50&approved=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "TR123456",
        "title": "Ürün Adı",
        "barcode": "8690123456789",
        "productMainId": "MAIN123",
        "brand": "Marka",
        "category": {
          "id": 123,
          "name": "Kategori Adı"
        },
        "quantity": 100,
        "salePrice": 99.90,
        "listPrice": 149.90,
        "approved": true,
        "images": [
          {
            "url": "https://cdn.marketplace.com/image1.jpg"
          }
        ],
        "variants": [
          {
            "barcode": "8690123456790",
            "quantity": 50,
            "salePrice": 99.90,
            "attributes": [
              {
                "attributeName": "Renk",
                "attributeValue": "Mavi"
              }
            ]
          }
        ]
      }
    ],
    "totalPages": 10,
    "totalElements": 500,
    "page": 1,
    "size": 50
  }
}
```

**Query Parameters:**
- `page`: Sayfa numarası (default: 0)
- `size`: Sayfa başına ürün (default: 50, max: 200)
- `approved`: Onaylı ürünler (true/false)
- `barcode`: Barkod ile filtreleme
- `startDate`/`endDate`: Tarih aralığı (Unix timestamp)

### 4. Update Product Stock
```http
PUT /marketplace/:marketplace/products/:productId/stock
```

**Request Body:**
```json
{
  "quantity": 150,
  "variants": [
    {
      "barcode": "8690123456790",
      "quantity": 75
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "productId": "TR123456",
    "updatedVariants": 2,
    "syncStatus": "completed"
  }
}
```

### 5. Get Marketplace Orders
```http
GET /marketplace/:marketplace/orders?status=Created&startDate=1234567890&endDate=1234567899
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderNumber": "MP123456789",
        "orderDate": 1234567890,
        "status": "Created",
        "totalPrice": 299.90,
        "customerFirstName": "John",
        "customerLastName": "Doe",
        "customerEmail": "john@example.com",
        "lines": [
          {
            "productName": "Ürün Adı",
            "barcode": "8690123456789",
            "quantity": 2,
            "amount": 199.80,
            "discount": 20.00
          }
        ],
        "shipmentAddress": {
          "firstName": "John",
          "lastName": "Doe",
          "address1": "Adres satırı 1",
          "city": "İstanbul",
          "cityCode": 34,
          "district": "Kadıköy"
        }
      }
    ],
    "totalPages": 5,
    "totalElements": 250
  }
}
```

**Order Status Değerleri:**
- `Created`: Yeni sipariş
- `Picking`: Hazırlanıyor
- `Invoiced`: Faturalandı
- `Shipped`: Kargoya verildi
- `Delivered`: Teslim edildi
- `Cancelled`: İptal edildi
- `Returned`: İade edildi

---

## 📦 Products API

### 1. Get All Products
```http
GET /products?page=1&limit=20&search=ürün&status=active&sortBy=created_at&sortOrder=desc
```

**Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Ürün Adı",
      "description": "Ürün açıklaması",
      "sku": "SKU123",
      "barcode": "8690123456789",
      "brand": "Marka",
      "base_price": 99.90,
      "currency": "TRY",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "variants": [
        {
          "id": 1,
          "name": "Mavi - L",
          "sku": "SKU123-BL-L",
          "price": 99.90,
          "stock": 50
        }
      ],
      "images": [
        {
          "id": 1,
          "image_url": "https://example.com/image.jpg",
          "is_main": true
        }
      ],
      "marketplaceListings": [
        {
          "marketplace": "trendyol",
          "status": "active",
          "price": 99.90,
          "stock_quantity": 50
        }
      ]
    }
  ]
}
```

### 2. Create Product
```http
POST /products
```

**Request Body:**
```json
{
  "name": "Yeni Ürün",
  "description": "Ürün açıklaması",
  "sku": "SKU123",
  "barcode": "8690123456789",
  "brand": "Marka",
  "base_price": 99.90,
  "category_id": 1,
  "variants": [
    {
      "name": "Mavi - L",
      "sku": "SKU123-BL-L",
      "price": 99.90,
      "stock": 50,
      "attributes": [
        {
          "name": "Renk",
          "value": "Mavi"
        },
        {
          "name": "Beden",
          "value": "L"
        }
      ]
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Yeni Ürün",
    "sku": "SKU123",
    // ... tüm ürün detayları
  }
}
```

### 3. Update Product Stock
```http
PUT /products/:id/stock
```

**Request Body:**
```json
{
  "variants": [
    {
      "variantId": 1,
      "stock": 75
    }
  ],
  "syncToMarketplaces": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    // Güncellenmiş ürün bilgileri
  },
  "syncResults": {
    "SKU123-BL-L": {
      "trendyol": { "success": true },
      "hepsiburada": { "success": true }
    }
  }
}
```

### 4. Sync Product to Marketplaces
```http
POST /products/:id/sync
```

**Request Body:**
```json
{
  "marketplaces": ["trendyol", "hepsiburada"] // Opsiyonel, belirtilmezse aktif tüm marketplace'lere
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product sync initiated",
  "results": {
    "trendyol": {
      "success": true,
      "productId": "TR123456",
      "message": "Product synced successfully"
    },
    "hepsiburada": {
      "success": false,
      "error": "Category mapping not found"
    }
  }
}
```

### 5. Bulk Product Operations
```http
POST /products/bulk
```

**Request Body:**
```json
{
  "operation": "updatePrice", // updatePrice, updateStock, activate, deactivate, delete
  "productIds": [1, 2, 3],
  "data": {
    "priceMultiplier": 1.1, // %10 zam için
    "roundTo": 0.90 // Fiyatları 0.90'a yuvarla
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bulk operation completed",
  "results": {
    "processed": 3,
    "successful": 2,
    "failed": 1,
    "errors": [
      {
        "productId": 3,
        "error": "Product not found"
      }
    ]
  }
}
```

---

## 📊 Orders API

### 1. Get All Orders
```http
GET /orders?page=1&limit=20&status=pending&marketplace=trendyol&startDate=2024-01-01&endDate=2024-01-31
```

**Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": [
    {
      "id": 1,
      "order_number": "ORD123456",
      "marketplace": "trendyol",
      "marketplace_order_id": "MP123456789",
      "status": "pending",
      "payment_status": "paid",
      "total_amount": 299.90,
      "currency": "TRY",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "created_at": "2024-01-01T00:00:00.000Z",
      "items": [
        {
          "id": 1,
          "product_name": "Ürün Adı",
          "sku": "SKU123",
          "quantity": 2,
          "unit_price": 99.90,
          "total_price": 199.80
        }
      ]
    }
  ]
}
```

### 2. Update Order Status
```http
PUT /orders/:id/status
```

**Request Body:**
```json
{
  "status": "shipped",
  "note": "Kargoya verildi",
  "trackingInfo": {
    "trackingNumber": "TR123456789",
    "carrierCode": "yurtici",
    "estimatedDelivery": "2024-01-05"
  },
  "syncToMarketplace": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    // Güncellenmiş sipariş bilgileri
  },
  "syncResult": {
    "success": true,
    "message": "Status synced to Trendyol"
  }
}
```

### 3. Import Orders from Marketplaces
```http
POST /orders/import
```

**Request Body:**
```json
{
  "marketplaces": ["trendyol", "hepsiburada"], // Opsiyonel
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order import completed",
  "newOrders": 45,
  "results": {
    "trendyol": {
      "success": true,
      "data": {
        "orders": 30,
        "imported": 25,
        "skipped": 5
      }
    },
    "hepsiburada": {
      "success": true,
      "data": {
        "orders": 20,
        "imported": 20,
        "skipped": 0
      }
    }
  }
}
```

### 4. Add Order Note
```http
POST /orders/:id/notes
```

**Request Body:**
```json
{
  "note": "Müşteri aradı, acele gönderilmesini istedi",
  "isPrivate": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Note added successfully",
  "data": {
    // Güncellenmiş sipariş bilgileri
  }
}
```

---

## 📈 Reports API

### 1. Dashboard Statistics
```http
GET /reports/dashboard-stats
```

**Response (200):**
```json
{
  "success": true,
  "result": {
    "totalOrders": 1247,
    "orderGrowth": 12,
    "totalProducts": 3856,
    "productGrowth": 5,
    "totalMarketplaces": 8,
    "marketplaceGrowth": 0,
    "totalShipments": 456,
    "shipmentGrowth": 18,
    "totalRevenue": 125000,
    "revenueGrowth": 15
  }
}
```

**Kullanım:**
- Dashboard ana sayfasında gösterilir
- Her 5 dakikada bir otomatik güncellenir
- Growth değerleri önceki aya göre yüzde değişimi gösterir

### 2. Sales Report
```http
GET /reports/sales?startDate=2024-01-01&endDate=2024-01-31&marketplace=trendyol&groupBy=day
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "salesData": [
      {
        "period": "2024-01-01",
        "totalOrders": 24,
        "totalRevenue": 2400.00,
        "avgOrderValue": 100.00
      }
    ],
    "summary": {
      "totalOrders": 744,
      "totalRevenue": 74400.00,
      "avgOrderValue": 100.00
    }
  }
}
```

**GroupBy Options:**
- `hour`: Saatlik
- `day`: Günlük
- `month`: Aylık
- `year`: Yıllık

### 3. Product Performance
```http
GET /reports/products?startDate=2024-01-01&endDate=2024-01-31&limit=20&sortBy=revenue
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "productId123",
      "productName": "En Çok Satan Ürün",
      "totalSold": 150,
      "totalRevenue": 14985.00,
      "avgPrice": 99.90,
      "orderCount": 120,
      "currentStock": 50,
      "status": "active"
    }
  ]
}
```

### 4. Recent Orders
```http
GET /reports/recent-orders?limit=10
```

**Response (200):**
```json
{
  "success": true,
  "result": [
    {
      "id": "#12345",
      "platform": "Trendyol",
      "amount": "₺245",
      "status": "delivered",
      "time": "2 saat önce"
    }
  ]
}
```

### 5. Sales Trends
```http
GET /reports/sales-trends?period=7d
```

**Response (200):**
```json
{
  "success": true,
  "result": [
    {
      "name": "Pzt",
      "orders": 24,
      "revenue": 2400
    },
    {
      "name": "Sal",
      "orders": 13,
      "revenue": 1398
    }
    // ... diğer günler
  ]
}
```

**Period Options:**
- `7d`: Son 7 gün
- `30d`: Son 30 gün
- `90d`: Son 90 gün

### 6. Marketplace Performance
```http
GET /reports/marketplace-performance
```

**Response (200):**
```json
{
  "success": true,
  "result": [
    {
      "name": "Trendyol",
      "orders": 456,
      "color": "#f27a1a"
    },
    {
      "name": "Hepsiburada",
      "orders": 234,
      "color": "#ff6000"
    }
  ]
}
```

### 7. Cargo Performance
```http
GET /reports/cargo-performance
```

**Response (200):**
```json
{
  "success": true,
  "result": {
    "mng": {
      "activeShipments": 145,
      "deliveredShipments": 1234,
      "pendingShipments": 23,
      "success": true
    },
    "aras": {
      "activeShipments": 89,
      "deliveredShipments": 876,
      "pendingShipments": 12,
      "success": true
    }
  }
}
```

---

## 🔄 Sync API

### 1. Import Trendyol Products
```http
POST /sync/import-trendyol-products
```

**Request Body:**
```json
{
  "page": 0,
  "size": 100,
  "approved": true,
  "fullImport": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Products imported successfully",
  "data": {
    "imported": 85,
    "skipped": 15,
    "errors": 0,
    "totalPages": 5,
    "currentPage": 0
  }
}
```

**Dikkat:**
- İlk import'ta `fullImport: true` kullan
- Duplicate kontrolü marketplace_product_id üzerinden yapılır
- Her ürün için variants ve images otomatik oluşturulur

### 2. Import Trendyol Orders
```http
POST /sync/import-trendyol-orders
```

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "status": "all" // all, Created, Shipped, Delivered, etc.
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Orders import completed",
  "data": {
    "imported": 45,
    "updated": 10,
    "total": 55,
    "errors": 0
  }
}
```

### 3. Sync Products
```http
POST /sync/products
```

**Request Body:**
```json
{
  "marketplace": "trendyol",
  "operation": "import", // import, export, update
  "productIds": [1, 2, 3] // Opsiyonel, belirtilmezse tüm ürünler
}
```

**Response (200):**
```json
{
  "success": true,
  "jobId": "sync_123456",
  "message": "Sync job started"
}
```

### 4. Get Sync Logs
```http
GET /sync/logs?marketplace=trendyol&operation=product_import&status=success&limit=50
```

**Response (200):**
```json
{
  "success": true,
  "count": 50,
  "total": 150,
  "page": 1,
  "data": [
    {
      "id": 1,
      "marketplace": "trendyol",
      "operation": "product_import",
      "status": "success",
      "details": {
        "imported": 100,
        "errors": 0
      },
      "started_at": "2024-01-01T00:00:00.000Z",
      "completed_at": "2024-01-01T00:05:00.000Z",
      "execution_time": 300
    }
  ]
}
```

---

## 🚚 Cargo Tracking API

### 1. MNG Kargo - Track Shipment
```http
GET /mng-cargo/track/:trackingNumber
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "7340447182689",
    "status": "delivered",
    "statusText": "Teslim Edildi",
    "deliveryDate": "2024-01-05T14:30:00.000Z",
    "recipient": "John Doe",
    "movements": [
      {
        "date": "2024-01-05T14:30:00.000Z",
        "status": "Teslim Edildi",
        "location": "İstanbul - Kadıköy",
        "description": "Alıcıya teslim edildi"
      }
    ]
  }
}
```

### 2. Yurtiçi Kargo - Track Shipment
```http
GET /yurtici-cargo/track/:trackingNumber
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "123456789",
    "currentStatus": {
      "code": "DELIVERED",
      "text": "Teslim Edildi",
      "date": "2024-01-05T14:30:00.000Z"
    },
    "estimatedDelivery": "2024-01-05",
    "shipmentDetails": {
      "sender": "E-Ticaret Firması",
      "recipient": "John Doe",
      "weight": "0.5 kg",
      "cargoType": "Dosya"
    }
  }
}
```

### 3. Bulk Tracking
```http
POST /mng-cargo/track/bulk
```

**Request Body:**
```json
{
  "trackingNumbers": [
    "7340447182689",
    "7340447182690",
    "7340447182691"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "successful": 2,
    "failed": 1,
    "results": [
      {
        "trackingNumber": "7340447182689",
        "success": true,
        "status": "delivered",
        "data": { /* tracking details */ }
      },
      {
        "trackingNumber": "7340447182691",
        "success": false,
        "error": "Tracking number not found"
      }
    ]
  }
}
```

### 4. Calculate Shipping Cost
```http
POST /:cargo/calculate-cost
```

**Request Body:**
```json
{
  "weight": 1.5,
  "desi": 10,
  "fromCity": "İstanbul",
  "toCity": "Ankara",
  "serviceType": "standard" // standard, express, sameDay
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "basePrice": 25.00,
    "desiPrice": 5.00,
    "totalPrice": 30.00,
    "currency": "TRY",
    "estimatedDelivery": "2-3 iş günü"
  }
}
```

---

## 🔑 Marketplace Keys API

### 1. Get User's Marketplace Keys
```http
GET /marketplace-keys
```

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "marketplace": "trendyol",
      "key_name": "Production API",
      "is_active": true,
      "last_used_at": "2024-01-01T00:00:00.000Z",
      "created_at": "2023-12-01T00:00:00.000Z",
      "has_api_key": true,
      "has_api_secret": true,
      "has_supplier_id": true
    }
  ]
}
```

**Önemli:**
- API key değerleri güvenlik nedeniyle döndürülmez
- Sadece metadata ve key varlığı bilgisi döner

### 2. Save/Update Marketplace Keys
```http
POST /marketplace-keys
```

**Request Body:**
```json
{
  "marketplace": "trendyol",
  "api_key": "your-api-key",
  "api_secret": "your-api-secret",
  "supplier_id": "123456",
  "key_name": "Production API"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "API keys saved successfully",
  "data": {
    "id": 1,
    "marketplace": "trendyol",
    "key_name": "Production API"
  }
}
```

### 3. Test Marketplace Keys
```http
POST /marketplace-keys/:marketplace/test
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trendyol API connection successful",
  "data": {
    "supplierId": "123456",
    "companyName": "Test Company",
    "apiVersion": "v2"
  }
}
```

### 4. Delete Marketplace Keys
```http
DELETE /marketplace-keys/:marketplace
```

**Response (200):**
```json
{
  "success": true,
  "message": "API keys deleted successfully"
}
```

---

## 🔄 Cross-Platform Sync API

### 1. Analyze Products Across Marketplaces
```http
POST /sync/cross-platform/analyze
```

**Request Body:**
```json
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "matchingCriteria": ["barcode", "sku"] // barcode, sku, title
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sourceProducts": 150,
    "targetProducts": 120,
    "matchedProducts": 100,
    "unmatchedProducts": 50,
    "priceDifferences": [
      {
        "productId": "123",
        "productName": "Ürün Adı",
        "sourcePrice": 99.90,
        "targetPrice": 109.90,
        "difference": 10.00,
        "differencePercent": 10.01
      }
    ],
    "stockDifferences": [
      {
        "productId": "123",
        "productName": "Ürün Adı",
        "sourceStock": 50,
        "targetStock": 30,
        "difference": -20
      }
    ]
  }
}
```

### 2. Execute Cross-Platform Sync
```http
POST /sync/cross-platform/execute
```

**Request Body:**
```json
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "syncOptions": {
    "syncPrices": true,
    "syncStock": true,
    "syncContent": false,
    "priceStrategy": "match", // match, percentage, fixed
    "priceAdjustment": 0,
    "stockBuffer": 5
  },
  "productIds": [1, 2, 3] // Opsiyonel, belirtilmezse tüm eşleşen ürünler
}
```

**Response (200):**
```json
{
  "success": true,
  "jobId": "cross_sync_123456",
  "message": "Cross-platform sync started",
  "estimatedTime": "5-10 minutes"
}
```

### 3. Get Cross-Platform Sync Status
```http
GET /sync/cross-platform/status?source=trendyol&target=hepsiburada
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lastSync": "2024-01-01T00:00:00.000Z",
    "status": "completed",
    "stats": {
      "pricesUpdated": 45,
      "stockUpdated": 50,
      "errors": 2
    },
    "nextScheduledSync": "2024-01-01T06:00:00.000Z"
  }
}
```

---

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Opsiyonel detaylı hata bilgisi
}
```

### Common Error Codes
- `UNAUTHORIZED`: Authentication gerekli
- `FORBIDDEN`: Yetki yetersiz
- `NOT_FOUND`: Kaynak bulunamadı
- `VALIDATION_ERROR`: Validation hatası
- `RATE_LIMIT_EXCEEDED`: Rate limit aşıldı
- `MARKETPLACE_ERROR`: Marketplace API hatası
- `DATABASE_ERROR`: Veritabanı hatası
- `INTERNAL_ERROR`: Sunucu hatası

### Error Handling Best Practices

**Frontend Error Handling:**
```javascript
try {
  const response = await fetch('/api/v1/products', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    // API error
    switch (data.code) {
      case 'UNAUTHORIZED':
        // Redirect to login
        router.push('/login');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show rate limit message
        toast.error('Too many requests. Please wait.');
        break;
      default:
        toast.error(data.error || 'An error occurred');
    }
    return;
  }
  
  // Success
  setProducts(data.data);
  
} catch (error) {
  // Network or parsing error
  console.error('Request failed:', error);
  toast.error('Network error. Please check your connection.');
}
```

**Retry Logic:**
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited, wait before retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return await response.json();
      
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}
```

---

## 🚦 Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

### Rate Limits by Endpoint

| Endpoint Category | Rate Limit | Window |
|------------------|------------|---------|
| Authentication | 5 requests | 15 minutes |
| Product Operations | 100 requests | 1 minute |
| Order Operations | 100 requests | 1 minute |
| Reports | 30 requests | 1 minute |
| Sync Operations | 20 requests | 1 minute |
| Cargo Tracking | 120 requests | 1 minute |

### Rate Limit Response (429)
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### Rate Limit Best Practices

1. **Implement Request Queue:**
```javascript
class RequestQueue {
  constructor(rateLimit = 60, windowMs = 60000) {
    this.queue = [];
    this.processing = false;
    this.rateLimit = rateLimit;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Clean old requests
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check rate limit
    if (this.requests.length >= this.rateLimit) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.process();
    }
    
    // Process request
    const { request, resolve, reject } = this.queue.shift();
    this.requests.push(now);
    
    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    this.processing = false;
    this.process();
  }
}
```

2. **Cache Responses:**
```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key, fetcher) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}

// Usage
const products = await getCachedData('products', () => 
  fetch('/api/v1/products').then(r => r.json())
);
```

3. **Batch Requests:**
```javascript
// Instead of multiple individual requests
for (const productId of productIds) {
  await updateProductStock(productId, newStock);
}

// Use bulk endpoint
await updateBulkProductStock({
  updates: productIds.map(id => ({ productId: id, stock: newStock }))
});
```

---

## 🔒 Security Best Practices

### 1. Token Storage
```javascript
// ❌ YANLIŞ - LocalStorage'da plain text
localStorage.setItem('token', token);

// ✅ DOĞRU - HttpOnly cookie veya encrypted storage
// Backend'de httpOnly cookie set et
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### 2. API Key Security
```javascript
// ❌ YANLIŞ - Frontend'de API key
const apiKey = 'sk_live_abcd1234';

// ✅ DOĞRU - Backend proxy kullan
// Frontend
await fetch('/api/v1/marketplace/trendyol/products');

// Backend API key'i environment'dan alır
const apiKey = process.env.TRENDYOL_API_KEY;
```

### 3. Input Validation
```javascript
// Backend'de her zaman validate et
const { body, validationResult } = require('express-validator');

router.post('/products',
  body('name').isString().trim().isLength({ min: 3, max: 200 }),
  body('price').isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    // Process request
  }
);
```

### 4. SQL Injection Prevention
```javascript
// ❌ YANLIŞ - SQL Injection riski
const query = `SELECT * FROM products WHERE name = '${productName}'`;

// ✅ DOĞRU - Parameterized queries
const query = `SELECT * FROM products WHERE name = :productName`;
await sequelize.query(query, {
  replacements: { productName },
  type: sequelize.QueryTypes.SELECT
});
```

---

## 📝 Development Tips

### 1. API Testing with cURL

**Login:**
```bash
curl -X POST http://localhost:25628/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@eticaret.com","password":"demo123"}'
```

**Get Products with Token:**
```bash
curl http://localhost:25628/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Postman Collection
```json
{
  "info": {
    "name": "E-Commerce API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{auth_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:25628/api/v1"
    },
    {
      "key": "auth_token",
      "value": ""
    }
  ]
}
```

### 3. Environment Variables
```env
# API Configuration
API_VERSION=v1
API_PORT=25628
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Marketplace APIs
TRENDYOL_API_KEY=your-api-key
TRENDYOL_API_SECRET=your-api-secret
TRENDYOL_SUPPLIER_ID=123456

# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=ecommerce
DB_USER=sa
DB_PASSWORD=yourpassword
```

### 4. Logging Best Practices
```javascript
// Structured logging
logger.info('Order created', {
  orderId: order.id,
  userId: req.user.id,
  marketplace: order.marketplace,
  totalAmount: order.total_amount,
  timestamp: new Date().toISOString()
});

// Error logging with context
logger.error('Order sync failed', {
  error: error.message,
  stack: error.stack,
  orderId: order.id,
  marketplace: order.marketplace,
  attempt: attemptNumber
});
```

---

## 🚀 Production Checklist

### Deployment Öncesi

- [ ] Environment variables production değerleri
- [ ] SSL/TLS sertifikası aktif
- [ ] Rate limiting değerleri ayarlanmış
- [ ] Error tracking (Sentry vb.) entegre
- [ ] Database connection pooling optimize
- [ ] Redis cache konfigüre
- [ ] CDN static assets için aktif
- [ ] Backup stratejisi belirlendi
- [ ] Monitoring ve alerting kuruldu
- [ ] Load testing yapıldı

### Security Checklist

- [ ] Tüm sensitive data encrypted
- [ ] API keys environment variables'da
- [ ] CORS policy düzgün configure edilmiş
- [ ] SQL injection koruması aktif
- [ ] XSS koruması aktif
- [ ] Rate limiting aktif
- [ ] Authentication timeout ayarlı
- [ ] HTTPS zorunlu
- [ ] Security headers eklenmiş
- [ ] Penetration testing yapıldı

### Performance Checklist

- [ ] Database indexleri optimize
- [ ] Query optimization yapıldı
- [ ] Caching stratejisi uygulandı
- [ ] Pagination tüm list endpoint'lerde
- [ ] Async operations için queue sistemi
- [ ] CDN entegrasyonu
- [ ] Image optimization
- [ ] Gzip compression aktif
- [ ] Connection pooling optimize
- [ ] Load balancing configured 