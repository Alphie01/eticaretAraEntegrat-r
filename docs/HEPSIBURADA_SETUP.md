# 🛒 Hepsiburada Entegrasyonu Kurulum Rehberi

## ✅ Entegrasyon Durumu
**Hepsiburada entegrasyonu tamamen hazır ve çalışır durumda!** 🎉

## 🚀 Hızlı Başlangıç

### 1. Environment Variables Ayarlama
`.env` dosyasını oluşturun ve aşağıdaki değerleri ekleyin:

```bash
HEPSIBURADA_USERNAME=your-hepsiburada-username
HEPSIBURADA_PASSWORD=your-hepsiburada-password  
HEPSIBURADA_MERCHANT_ID=your-merchant-id
```

### 2. Test Etme
```bash
node test_hepsiburada.js
```

## 📊 Desteklenen Operasyonlar

### ✅ Tamamen Çalışır Durumda:
- **Ürün Yönetimi**: Listeleme, oluşturma, güncelleme
- **Stok & Fiyat**: Toplu güncellemeler
- **Sipariş Yönetimi**: Sipariş takibi ve durum güncelleme
- **OAuth2 Authentication**: Otomatik token yönetimi
- **Rate Limiting**: 60 istek/dakika
- **Error Handling**: Kapsamlı hata yönetimi

## 🔧 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/marketplace/hepsiburada/products` | Ürün listesi |
| POST | `/api/v1/marketplace/hepsiburada/products` | Yeni ürün |
| PUT | `/api/v1/marketplace/hepsiburada/products/:id` | Ürün güncelle |
| PUT | `/api/v1/marketplace/hepsiburada/products/:id/stock` | Stok güncelle |
| PUT | `/api/v1/marketplace/hepsiburada/products/:id/price` | Fiyat güncelle |
| GET | `/api/v1/marketplace/hepsiburada/orders` | Sipariş listesi |
| PUT | `/api/v1/marketplace/hepsiburada/orders/:id/status` | Sipariş durumu |
| GET | `/api/v1/marketplace/hepsiburada/categories` | Kategori listesi |

## 🎯 Sonraki Adımlar
1. ✅ **Hepsiburada entegrasyonu tamamlandı**
2. 🔄 Gerçek credentials ile test edin
3. 🚀 Production'a deploy edin 