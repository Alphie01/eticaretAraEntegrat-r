# Multi-Platform Ürün Eşleştirme API Belgeleri

Bu API tüm e-ticaret platformlarından gelen ürün verilerini eşleştirip veritabanına kaydetmenizi sağlar.

## Ana Özellikler

- **Çoklu Platform Desteği**: Trendyol, Hepsiburada, Amazon, N11, Shopify, ÇiçekSepeti, Pazarama, PTT AVM
- **Akıllı Eşleştirme**: SKU, barcode, marka+isim, benzerlik algoritmaları
- **Otomatik Kaydetme**: Eşleştirilen ürünleri otomatik veritabanına kaydetme
- **Conflict Yönetimi**: Fiyat, stok gibi farklılıkları tespit etme

## API Endpoint'leri

### 1. Ürün Eşleştirme Çalıştırma

```http
POST /api/v1/products/match-platforms
```

**Request Body:**
```json
{
  "marketplaces": ["trendyol", "hepsiburada", "amazon"], // Opsiyonel, boş bırakırsanız tüm platformlar
  "strictMatching": false,          // Katı eşleştirme modu
  "similarityThreshold": 0.85,      // İsim benzerlik eşiği (0-1)
  "ignoreBrand": false              // Marka kontrolünü atla
}
```

**Response:**
```json
{
  "success": true,
  "message": "Multi-platform product matching completed",
  "data": {
    "userId": 123,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "platforms": ["trendyol", "hepsiburada", "amazon"],
    "platformCounts": {
      "trendyol": 150,
      "hepsiburada": 120,
      "amazon": 80
    },
    "matching": {
      "productGroups": [
        {
          "products": [
            {
              "marketplace": "trendyol",
              "marketplace_product_id": "12345",
              "sku": "PROD-001",
              "name": "iPhone 14 Pro 128GB",
              "brand": "Apple",
              "price": 45000,
              "stock": 10
            },
            {
              "marketplace": "hepsiburada", 
              "marketplace_product_id": "HB-67890",
              "sku": "PROD-001",
              "name": "iPhone 14 Pro 128GB",
              "brand": "Apple",
              "price": 44500,
              "stock": 5
            }
          ],
          "matchCriteria": ["exact_sku"],
          "confidence": 1.0
        }
      ],
      "unmatchedProducts": {
        "amazon": [
          {
            "marketplace": "amazon",
            "marketplace_product_id": "AMZ-999",
            "name": "Unique Amazon Product",
            "brand": "SomeBrand"
          }
        ]
      },
      "totalProcessed": 350,
      "totalMatched": 280
    },
    "summary": {
      "totalProducts": 350,
      "matchedProducts": 280,
      "unmatchedProducts": 70,
      "productGroups": 140,
      "averageGroupSize": "2.0",
      "matchRate": "80.0",
      "recommendations": [
        {
          "type": "save_matched_products",
          "priority": "high", 
          "message": "140 ürün grubu bulundu - veritabanına kaydedin",
          "action": "POST /api/v1/products/match-platforms/save"
        }
      ]
    }
  }
}
```

### 2. Eşleştirilen Ürünleri Veritabanına Kaydetme

```http
POST /api/v1/products/match-platforms/save
```

**Request Body:**
```json
{
  "matchingResults": {
    // Yukarıdaki response'daki matching objesi
  },
  "overwriteExisting": false,       // Mevcut ürünleri güncelle
  "createMissingCategories": true,  // Eksik kategorileri oluştur
  "saveUnmatched": true             // Eşleşmeyen ürünleri de kaydet
}
```

**Response:**
```json
{
  "success": true,
  "message": "Matched products saved to database successfully",
  "data": {
    "savedProducts": 140,
    "skippedProducts": 5,
    "errors": [],
    "productDetails": [
      {
        "productId": 1001,
        "name": "iPhone 14 Pro 128GB",
        "platforms": ["trendyol", "hepsiburada"],
        "confidence": 1.0,
        "matchCriteria": ["exact_sku"]
      }
    ]
  }
}
```

### 3. Otomatik Eşleştirme ve Kaydetme (Tek İşlem)

```http
POST /api/v1/products/match-platforms/auto
```

**Request Body:**
```json
{
  "marketplaces": ["trendyol", "hepsiburada"],
  "strictMatching": false,
  "similarityThreshold": 0.85,
  "ignoreBrand": false,
  "overwriteExisting": false,
  "saveUnmatched": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto match and save completed successfully",
  "data": {
    "matching": {
      // Eşleştirme sonuçları
    },
    "saving": {
      // Kaydetme sonuçları
    },
    "summary": {
      "totalProcessed": 270,
      "productsSaved": 135,
      "productsSkipped": 0,
      "errors": 0,
      "matchRate": "83.5"
    }
  }
}
```

### 4. Platform Durumu Kontrolü

```http
GET /api/v1/products/match-platforms/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportedMarketplaces": ["trendyol", "hepsiburada", "amazon", "n11", "shopify", "ciceksepeti", "pazarama", "pttavm"],
    "platformCounts": {
      "trendyol": 150,
      "hepsiburada": 120,
      "amazon": 0
    },
    "databaseStats": {
      "totalProducts": 85,
      "productsByPlatform": {
        "trendyol": 85,
        "hepsiburada": 70
      },
      "unmatchedProducts": 0
    },
    "lastChecked": "2024-01-15T10:30:00.000Z",
    "recommendations": [
      {
        "type": "connect_platforms",
        "priority": "high",
        "message": "amazon platformuna bağlanın",
        "action": "Configure marketplace credentials"
      }
    ]
  }
}
```

### 5. Desteklenen Marketplace'leri Görüntüleme

```http
GET /api/v1/products/match-platforms/marketplaces
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportedMarketplaces": ["trendyol", "hepsiburada", "amazon", "n11", "shopify", "ciceksepeti", "pazarama", "pttavm"],
    "marketplaceStatus": {
      "trendyol": {
        "connected": true,
        "hasCredentials": true
      },
      "hepsiburada": {
        "connected": true,
        "hasCredentials": true
      },
      "amazon": {
        "connected": false,
        "hasCredentials": false,
        "error": "No credentials found"
      }
    },
    "connectedCount": 2,
    "totalCount": 8
  }
}
```

## Kullanım Senaryoları

### Senaryo 1: İlk Kurulum

```javascript
// 1. Platform durumunu kontrol et
const statusResponse = await fetch('/api/v1/products/match-platforms/status');
const status = await statusResponse.json();

// 2. Otomatik eşleştirme ve kaydetme çalıştır
const autoResponse = await fetch('/api/v1/products/match-platforms/auto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strictMatching: false,
    similarityThreshold: 0.85,
    overwriteExisting: false,
    saveUnmatched: true
  })
});

const result = await autoResponse.json();
console.log(`${result.data.summary.productsSaved} ürün kaydedildi`);
```

### Senaryo 2: Manuel Kontrol ile Eşleştirme

```javascript
// 1. Önce eşleştirme yap
const matchResponse = await fetch('/api/v1/products/match-platforms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    marketplaces: ['trendyol', 'hepsiburada'],
    strictMatching: true,
    similarityThreshold: 0.90
  })
});

const matchResult = await matchResponse.json();

// 2. Sonuçları incele
console.log('Eşleşme oranı:', matchResult.data.summary.matchRate + '%');
console.log('Toplam grup:', matchResult.data.summary.productGroups);

// 3. Conflict'ları kontrol et ve kaydet
if (matchResult.data.summary.recommendations.some(r => r.type === 'save_matched_products')) {
  const saveResponse = await fetch('/api/v1/products/match-platforms/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      matchingResults: matchResult.data.matching,
      overwriteExisting: false,
      saveUnmatched: true
    })
  });
  
  const saveResult = await saveResponse.json();
  console.log(`${saveResult.data.savedProducts} ürün veritabanına kaydedildi`);
}
```

### Senaryo 3: Belirli Platformlar için Eşleştirme

```javascript
// Sadece Trendyol ve Amazon arasında eşleştirme
const response = await fetch('/api/v1/products/match-platforms/auto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    marketplaces: ['trendyol', 'amazon'],
    strictMatching: false,
    similarityThreshold: 0.80,
    ignoreBrand: false,
    overwriteExisting: true
  })
});

const result = await response.json();
```

## Eşleştirme Kriterleri

### 1. Exact SKU Match (Confidence: 1.0)
- Tam SKU eşleşmesi
- En güvenilir yöntem
- SKU en az 4 karakter olmalı

### 2. Barcode Match (Confidence: 0.95)
- Barcode tam eşleşmesi
- Barcode en az 8 karakter olmalı

### 3. Brand + Name Exact Match (Confidence: 0.90)
- Marka ve ürün ismi tam eşleşmesi
- Case-insensitive

### 4. Name Similarity (Confidence: 0.8-1.0)
- Fuzzy string matching
- Levenshtein distance algoritması
- Ayarlanabilir eşik değeri

## Hata Yönetimi

### Yaygın Hatalar

```json
// Platform bağlantı hatası
{
  "success": false,
  "error": "Multi-platform product matching failed",
  "details": "Failed to connect to marketplace: trendyol"
}

// Geçersiz parametre
{
  "success": false,
  "error": "Matching results are required"
}

// Veritabanı hatası
{
  "success": false,
  "error": "Failed to save matched products to database",
  "details": "Foreign key constraint violation"
}
```

### Hata Çözümleri

1. **Platform Bağlantı Hatası**: Marketplace credentials'ları kontrol edin
2. **Yetkilendirme Hatası**: API anahtarlarını yenileyin
3. **Veritabanı Hatası**: Tablo yapılarını kontrol edin
4. **Timeout Hatası**: İşlem boyutunu küçültün

## Frontend Entegrasyon Örnekleri

### React Component

```jsx
import React, { useState } from 'react';

function ProductMatcher() {
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState(null);

  const runAutoMatch = async () => {
    setMatching(true);
    try {
      const response = await fetch('/api/v1/products/match-platforms/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          strictMatching: false,
          similarityThreshold: 0.85,
          overwriteExisting: false,
          saveUnmatched: true
        })
      });

      const result = await response.json();
      setResults(result.data);
    } catch (error) {
      console.error('Matching failed:', error);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div>
      <button onClick={runAutoMatch} disabled={matching}>
        {matching ? 'Eşleştirme Yapılıyor...' : 'Ürün Eşleştirme Başlat'}
      </button>
      
      {results && (
        <div>
          <h3>Sonuçlar</h3>
          <p>Toplam İşlenen: {results.summary.totalProcessed}</p>
          <p>Kaydedilen: {results.summary.productsSaved}</p>
          <p>Eşleşme Oranı: {results.summary.matchRate}%</p>
        </div>
      )}
    </div>
  );
}
```

### Vue.js Component

```vue
<template>
  <div>
    <button @click="runMatching" :disabled="loading">
      {{ loading ? 'Eşleştirme Yapılıyor...' : 'Ürün Eşleştirme Başlat' }}
    </button>
    
    <div v-if="results" class="results">
      <h3>Eşleştirme Sonuçları</h3>
      <div class="stats">
        <div>Toplam Ürün: {{ results.summary.totalProcessed }}</div>
        <div>Eşleşen: {{ results.summary.productsSaved }}</div>
        <div>Oran: {{ results.summary.matchRate }}%</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      results: null
    }
  },
  methods: {
    async runMatching() {
      this.loading = true;
      try {
        const response = await this.$http.post('/api/v1/products/match-platforms/auto', {
          strictMatching: false,
          similarityThreshold: 0.85,
          overwriteExisting: false,
          saveUnmatched: true
        });
        
        this.results = response.data.data;
      } catch (error) {
        console.error('Matching failed:', error);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>
```

## Performans Optimizasyonu

### Büyük Veri Setleri için

1. **Batch İşleme**: Büyük ürün setlerini küçük batch'lere bölün
2. **Async İşlemler**: Background job'lar kullanın
3. **Caching**: Sık kullanılan eşleştirmeleri cache'leyin
4. **Incremental Sync**: Sadece değişen ürünleri işleyin

### Örnek Batch İşleme

```javascript
async function batchProcessing() {
  const marketplaces = ['trendyol', 'hepsiburada', 'amazon'];
  
  for (let i = 0; i < marketplaces.length; i += 2) {
    const batch = marketplaces.slice(i, i + 2);
    
    await fetch('/api/v1/products/match-platforms/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketplaces: batch,
        strictMatching: false,
        similarityThreshold: 0.85
      })
    });
    
    // Batch'ler arası bekleme
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

## Güvenlik

### Authentication
- Tüm endpoint'ler authentication gerektirir
- JWT token kullanın
- API rate limiting aktif

### Data Privacy
- Ürün verileri şifrelenir
- Marketplace credentials güvenli saklanır
- Audit log tutuluyor

## Rate Limiting

```
- /match-platforms: 5 request/dakika
- /match-platforms/auto: 2 request/dakika  
- /match-platforms/status: 20 request/dakika
```

Bu API belgelerini kullanarak multi-platform ürün eşleştirme sisteminizi entegre edebilirsiniz. 