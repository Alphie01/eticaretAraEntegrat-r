# Marketplace Adapters

## Adapter Mimarisi

Sistem, farklı marketplace'ler için adaptör pattern kullanır.

### Base MarketplaceAdapter

```javascript
class MarketplaceAdapter {
  constructor(credentials) {
    this.credentials = credentials;
  }

  // Abstract methods
  async getProducts(params = {}) {
    throw new Error('getProducts() must be implemented');
  }

  async getOrders(params = {}) {
    throw new Error('getOrders() must be implemented');
  }

  mapOrderStatus(marketplaceStatus) {
    return 'pending';
  }
}
```

## Trendyol Adapter

Trendyol API entegrasyonu için tam özellikli adapter.

### Özellikler

- Ürün senkronizasyonu
- Sipariş yönetimi (tüm statusler)
- ID bazlı duplicate kontrolü
- Rate limiting
- Error handling

### Status Mapping

```javascript
const statusMap = {
  'Created': 'pending',
  'Confirmed': 'confirmed',
  'Picking': 'processing',
  'Shipped': 'shipped',
  'Delivered': 'delivered',
  'Cancelled': 'cancelled',
  'Returned': 'returned'
};
```

## Hepsiburada Adapter

Temel implementasyon mevcut, geliştirilmekte.

## Amazon Adapter

MWS API entegrasyonu için hazır.

## Yeni Marketplace Ekleme

1. Yeni adapter sınıfı oluştur
2. AdapterManager'a ekle
3. Database enum'ları güncelle
4. API endpoint'lerini güncelle

---

Detaylı implementasyon için kaynak dosyaları inceleyin. 