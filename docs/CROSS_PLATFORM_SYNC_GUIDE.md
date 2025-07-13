# 🔄 Cross-Platform Sync Rehberi

**Hepsiburada ve Trendyol arasında otomatik ürün eşleştirmesi ve senkronizasyonu**

## 🎯 Özellik Özeti

Cross-Platform Sync sistemi, farklı marketplace'lerde bulunan ürünleri otomatik olarak eşleştiren ve eksik ürünleri sync eden gelişmiş bir senkronizasyon sistemidir.

### ✅ Desteklenen İşlemler

- **Akıllı Ürün Eşleştirmesi**: SKU, barcode, marka+isim, benzerlik analizine dayalı eşleştirme
- **Eksik Ürün Tespiti**: Bir marketplace'de olan ama diğerinde olmayan ürünleri bulma
- **Otomatik Sync**: Eksik ürünleri otomatik olarak diğer platforma aktarma
- **Conflict Detection**: Aynı ürünün farklı platformlardaki data farklılıklarını tespit etme
- **Batch Operations**: Toplu işlemler için optimize edilmiş operasyonlar
- **Background Jobs**: Büyük işlemler için arkaplanda çalışan job sistemi

## 🚀 Hızlı Başlangıç

### 1. Marketplace Durumunu Kontrol Edin

```bash
GET /api/v1/sync/cross-platform/marketplaces
```

Bu endpoint size hangi marketplace'lerin aktif olduğunu ve cross-platform sync için uygun kombinasyonları gösterir.

### 2. İlk Analizi Yapın

```bash
POST /api/v1/sync/cross-platform/analyze
Content-Type: application/json

{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "options": {
    "strictMatching": false,
    "similarityThreshold": 0.85
  }
}
```

### 3. Sync İşlemini Başlatın

```bash
POST /api/v1/sync/cross-platform/execute
Content-Type: application/json

{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "options": {
    "syncMissing": true,
    "importMissing": false,
    "runInBackground": true
  }
}
```

## 🔧 Detaylı API Kullanımı

### Analiz Endpoints

#### GET /sync/cross-platform/marketplaces
Desteklenen marketplace'leri ve kombinasyonları listeler.

```json
{
  "success": true,
  "data": {
    "supported": ["trendyol", "hepsiburada", "amazon", "n11"],
    "available": ["trendyol", "hepsiburada"],
    "enabled": ["trendyol", "hepsiburada"],
    "combinations": [
      {"source": "trendyol", "target": "hepsiburada"}
    ]
  }
}
```

#### POST /sync/cross-platform/analyze
İki marketplace arasında ürün analizi yapar.

**Request Body:**
```json
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "runInBackground": false,
  "options": {
    "strictMatching": false,
    "similarityThreshold": 0.85,
    "ignoreBrand": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "sourceMarketplace": "trendyol",
      "targetMarketplace": "hepsiburada",
      "sourceProductCount": 150,
      "targetProductCount": 120
    },
    "summary": {
      "matched": 85,
      "sourceOnly": 65,
      "targetOnly": 35,
      "conflicts": 5,
      "matchRate": "56.7"
    },
    "syncRecommendations": [...],
    "nextSteps": [...]
  }
}
```

### Sync Endpoints

#### POST /sync/cross-platform/execute
Cross-platform sync işlemini gerçekleştirir.

**Request Body:**
```json
{
  "sourceMarketplace": "trendyol",
  "targetMarketplace": "hepsiburada",
  "runInBackground": true,
  "options": {
    "syncMissing": true,
    "importMissing": false,
    "strictMatching": false,
    "similarityThreshold": 0.85
  }
}
```

**Response (Background Job):**
```json
{
  "success": true,
  "message": "Cross-platform sync job started",
  "jobId": "job-12345",
  "status": "pending",
  "estimatedDuration": "5-15 minutes"
}
```

### Monitoring Endpoints

#### GET /sync/cross-platform/status
İki marketplace arasındaki sync durumunu kontrol eder.

```bash
GET /sync/cross-platform/status?source=trendyol&target=hepsiburada
```

#### GET /sync/cross-platform/overview
Tüm marketplace kombinasyonlarının genel durumunu gösterir.

```json
{
  "success": true,
  "data": {
    "enabledMarketplaces": ["trendyol", "hepsiburada"],
    "pairs": [...],
    "overview": {
      "totalPairs": 1,
      "needsSync": 0,
      "hasConflicts": 1,
      "healthy": 0
    }
  }
}
```

### Job Management

#### GET /sync/cross-platform/job/:jobId
Background job'un durumunu kontrol eder.

```json
{
  "success": true,
  "data": {
    "id": "job-12345",
    "status": "completed",
    "progress": 100,
    "result": {...},
    "createdAt": "2023-12-01T10:00:00Z",
    "finishedAt": "2023-12-01T10:05:30Z"
  }
}
```

### Batch Operations

#### POST /sync/cross-platform/batch/analyze
Birden fazla marketplace kombinasyonu için toplu analiz.

```json
{
  "marketplacePairs": [
    {"source": "trendyol", "target": "hepsiburada"},
    {"source": "hepsiburada", "target": "amazon"}
  ],
  "options": {
    "strictMatching": false,
    "similarityThreshold": 0.8
  }
}
```

#### POST /sync/cross-platform/batch/execute
Toplu sync işlemi.

```json
{
  "marketplacePairs": [
    {"source": "trendyol", "target": "hepsiburada"}
  ],
  "options": {
    "syncMissing": true,
    "importMissing": false
  }
}
```

## 🧠 Akıllı Eşleştirme Algoritması

### Eşleştirme Kriterleri (Öncelik Sırasına Göre)

1. **Exact SKU Match (100% güvenilir)**
   - SKU değerleri tamamen eşleşen ürünler
   - En yüksek güvenilirlik

2. **Barcode Match (95% güvenilir)**
   - Aynı barcode'a sahip ürünler
   - Çok yüksek güvenilirlik

3. **Brand + Name Match (90% güvenilir)**
   - Aynı marka ve ürün ismine sahip ürünler
   - Yüksek güvenilirlik

4. **Fuzzy Name Matching (85%+ benzerlik)**
   - Levenshtein distance algoritması ile isim benzerliği
   - Ayarlanabilir threshold

### Conflict Detection

System otomatik olarak şu conflict'ları tespit eder:

- **Fiyat Farklılıkları**: %10'dan fazla fiyat farkı
- **Stok Farklılıkları**: 5'ten fazla stok farkı
- **Açıklama Farklılıkları**: %70'ten az benzerlik

### Data Normalization

Tüm marketplace'lerden gelen veriler standart formata dönüştürülür:

```javascript
{
  marketplace: "trendyol",
  id: "12345",
  sku: "PROD-001",
  barcode: "1234567890123",
  name: "Test Ürün",
  brand: "Test Marka",
  price: 99.99,
  stock: 50,
  description: "Ürün açıklaması",
  images: ["url1", "url2"],
  category: "Elektronik",
  status: "active"
}
```

## 🎛️ Konfigürasyon Seçenekleri

### Analysis Options

```javascript
{
  "strictMatching": false,        // Sadece exact match'leri kabul et
  "similarityThreshold": 0.85,    // Fuzzy matching için minimum benzerlik
  "ignoreBrand": false            // Marka eşleşmesini görmezden gel
}
```

### Sync Options

```javascript
{
  "syncMissing": true,           // Eksik ürünleri sync et
  "importMissing": false,        // Ters yönde de import yap
  "runInBackground": true,       // Background job olarak çalıştır
  "batchSize": 10               // Batch işlem boyutu
}
```

## 📊 Monitoring ve Reporting

### Real-time Progress

Background job'lar için real-time progress tracking:

```javascript
{
  "progress": 75,
  "status": "processing",
  "currentOperation": "syncing_products",
  "processedItems": 75,
  "totalItems": 100,
  "estimatedTimeLeft": "2 minutes"
}
```

### Detailed Reports

Sync işlemi tamamlandıktan sonra detaylı rapor:

```javascript
{
  "summary": {
    "totalProcessed": 100,
    "successful": 85,
    "failed": 15,
    "duration": 300000
  },
  "details": [
    {
      "sourceProduct": "Test Ürün",
      "sourceSku": "PROD-001",
      "targetProductId": "HB-12345",
      "status": "success",
      "message": "Ürün başarıyla oluşturuldu"
    }
  ]
}
```

## 🔄 Automated Monitoring

### Scheduled Monitoring

Düzenli olarak marketplace'leri kontrol eden sistem:

```bash
POST /sync/cross-platform/monitor/start
{
  "schedule": "0 */6 * * *"  // Her 6 saatte bir
}
```

### Alert System

System şu durumlarda alert üretir:

- **Sync Gerekli**: Yeni eksik ürünler tespit edildiğinde
- **Conflict Tespit**: Data conflict'ları bulunduğunda
- **Sync Hatası**: Sync işlemi başarısız olduğunda

## 🛠️ Test Etme

Test script'ini çalıştırarak sistemi test edin:

```bash
node test_cross_platform_sync.js
```

Bu script şu testleri yapar:

1. Marketplace durumu kontrolü
2. Analysis endpoint testi
3. Sync status kontrolü
4. Background job testi
5. Batch operations testi

## 💡 Best Practices

### 1. Gradual Rollout

- İlk olarak küçük ürün grupları ile test edin
- Başarılı olduktan sonra batch size'ı artırın
- Büyük sync işlemleri için background job kullanın

### 2. Conflict Management

- Conflict'ları düzenli olarak gözden geçirin
- Otomatik çözüm kuralları belirleyin
- Manuel müdahale gerektirebilecek durumları önceden tanımlayın

### 3. Performance Optimization

- Rate limit'leri göz önünde bulundurun
- Peak saatlerde sync yapmaktan kaçının
- Batch operations kullanın

### 4. Monitoring

- Düzenli monitoring ayarlayın
- Alert'leri yakından takip edin
- Performance metriklerini izleyin

## 🔧 Troubleshooting

### Yaygın Sorunlar

1. **Authentication Hatası**
   ```
   Error: Credentials not found for marketplace
   ```
   **Çözüm**: User marketplace keys tablosuna credentials ekleyin

2. **Rate Limit Aşımı**
   ```
   Error: Rate limit exceeded
   ```
   **Çözüm**: Otomatik retry mekanizması devreye girer

3. **Eşleştirme Başarısız**
   ```
   Match rate: 0%
   ```
   **Çözüm**: Similarity threshold'u düşürün veya fuzzy matching kullanın

### Debug Logs

```bash
# Detailed logs
tail -f logs/combined.log | grep "CrossPlatform"

# Error logs
tail -f logs/error.log | grep "sync"
```

## 📈 Gelişmiş Özellikler

### Custom Matching Rules

Gelecek versiyonlarda özel eşleştirme kuralları:

```javascript
{
  "customRules": [
    {
      "field": "category",
      "weight": 0.3
    },
    {
      "field": "brand",
      "weight": 0.5
    }
  ]
}
```

### AI-Powered Matching

Machine learning tabanlı ürün eşleştirmesi (roadmap).

### Multi-Language Support

Farklı dillerdeki ürün isimlerinin eşleştirilmesi.

## 🤝 API Integration Examples

### JavaScript Example

```javascript
const axios = require('axios');

class CrossPlatformSyncClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async analyzeMarketplaces(source, target) {
    const response = await this.client.post('/sync/cross-platform/analyze', {
      sourceMarketplace: source,
      targetMarketplace: target
    });
    return response.data;
  }

  async syncMarketplaces(source, target) {
    const response = await this.client.post('/sync/cross-platform/execute', {
      sourceMarketplace: source,
      targetMarketplace: target,
      runInBackground: true
    });
    return response.data;
  }

  async getJobStatus(jobId) {
    const response = await this.client.get(`/sync/cross-platform/job/${jobId}`);
    return response.data;
  }
}
```

### Python Example

```python
import requests

class CrossPlatformSyncClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def analyze_marketplaces(self, source, target):
        response = requests.post(
            f'{self.base_url}/sync/cross-platform/analyze',
            json={
                'sourceMarketplace': source,
                'targetMarketplace': target
            },
            headers=self.headers
        )
        return response.json()
```

## 📋 Checklist

Sync işlemi öncesi kontrol listesi:

- [ ] En az 2 marketplace entegrasyonu aktif
- [ ] API credentials doğru konfigüre edilmiş
- [ ] User authentication çalışıyor
- [ ] Rate limit'ler uygun
- [ ] Test edilmiş küçük bir dataset ile
- [ ] Monitoring açık
- [ ] Backup alınmış

## 🎯 Sonuç

Cross-Platform Sync sistemi sayesinde:

- ✅ Otomatik ürün eşleştirmesi
- ✅ Eksik ürün tespiti ve sync'i
- ✅ Conflict detection
- ✅ Background job processing
- ✅ Comprehensive monitoring
- ✅ Batch operations
- ✅ Detailed reporting

Bu sistem sayesinde marketplace'ler arasında manuel ürün yönetimi ihtiyacı büyük ölçüde azalır ve otomatik senkronizasyon sağlanır.

---

**🚀 Artık Hepsiburada ve Trendyol arasında otomatik ürün senkronizasyonu yapabilirsiniz!** 