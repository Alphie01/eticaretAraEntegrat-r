# PayTR Ödeme Sistemi Entegrasyonu

Bu dokümantasyon, e-ticaret ara entegratör sistemine PayTR ödeme sistemi entegrasyonunu açıklamaktadır.

## İçindekiler

1. [Kurulum ve Konfigürasyon](#kurulum-ve-konfigürasyon)
2. [Veritabanı Kurulumu](#veritabanı-kurulumu)
3. [API Endpoints](#api-endpoints)
4. [Kullanım Örnekleri](#kullanım-örnekleri)
5. [Webhook Yönetimi](#webhook-yönetimi)
6. [Test ve Debug](#test-ve-debug)

## Kurulum ve Konfigürasyon

### 1. Environment Variables

`.env` dosyanıza aşağıdaki PayTR konfigürasyonlarını ekleyin:

```env
# PayTR Payment Gateway Configuration
PAYTR_MERCHANT_ID=your_paytr_merchant_id
PAYTR_MERCHANT_KEY=your_paytr_merchant_key
PAYTR_MERCHANT_SALT=your_paytr_merchant_salt
PAYTR_TEST_MODE=true
```

### 2. PayTR Hesap Bilgileri

PayTR panel'inizden aşağıdaki bilgileri alın:
- **Merchant ID**: PayTR tarafından verilen üye işyeri numarası
- **Merchant Key**: API anahtarı
- **Merchant Salt**: Hash oluşturmak için kullanılan salt değeri

## Veritabanı Kurulumu

PayTR entegrasyonu için gerekli tabloları oluşturmak için:

```sql
-- SQL script'ini çalıştırın
sqlcmd -S your_server -d your_database -i sql/create_payment_tables.sql
```

Bu script şu tabloları oluşturur:
- `payments`: Genel ödeme bilgileri
- `paytr_transactions`: PayTR'ye özel transaction bilgileri

## API Endpoints

### Ödeme Oluşturma

```http
POST /api/v1/payments/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": 123,
  "successUrl": "https://yoursite.com/payment/success",
  "failUrl": "https://yoursite.com/payment/fail",
  "installmentOptions": {
    "noInstallment": "0",
    "maxInstallment": "12"
  }
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "success": true,
    "paymentId": 1,
    "merchantOid": "ORD_1640995200000_123",
    "token": "paytr_token_here",
    "iframe_url": "https://www.paytr.com/odeme/guvenli/token",
    "redirect_url": "https://www.paytr.com/odeme?token=token"
  }
}
```

### Ödeme Durumu Sorgulama

```http
GET /api/v1/payments/{paymentId}/status
Authorization: Bearer {token}
```

### Ödeme Listesi

```http
GET /api/v1/payments?page=1&limit=20&status=completed
Authorization: Bearer {token}
```

### Ödeme İptali

```http
POST /api/v1/payments/{paymentId}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Customer request"
}
```

### İade İşlemi

```http
POST /api/v1/payments/{paymentId}/refund
Authorization: Bearer {token}
Content-Type: application/json

{
  "refundAmount": 100.50,
  "reason": "Product return"
}
```

### Ödeme İstatistikleri

```http
GET /api/v1/payments/statistics/summary
Authorization: Bearer {token}
```

## Kullanım Örnekleri

### Frontend Entegrasyonu

```javascript
// Ödeme oluşturma
async function createPayment(orderId) {
  try {
    const response = await fetch('/api/v1/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId: orderId,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        installmentOptions: {
          noInstallment: "0",
          maxInstallment: "6"
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // PayTR ödeme sayfasına yönlendir
      window.location.href = result.data.redirect_url;
      
      // Veya iframe olarak göster
      // showPaymentIframe(result.data.iframe_url);
    }
  } catch (error) {
    console.error('Payment creation failed:', error);
  }
}

// Iframe ile ödeme gösterimi
function showPaymentIframe(iframeUrl) {
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.width = '100%';
  iframe.height = '600px';
  iframe.frameBorder = '0';
  
  document.getElementById('payment-container').appendChild(iframe);
}
```

### Backend Servis Kullanımı

```javascript
const PayTRService = require('./services/PayTRService');
const paytrService = new PayTRService();

// Ödeme oluşturma
async function processPayment(orderData) {
  try {
    const payment = await paytrService.createPayment({
      orderId: orderData.id,
      amount: orderData.totalAmount,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      userIp: orderData.userIp,
      successUrl: 'https://yoursite.com/payment/success',
      failUrl: 'https://yoursite.com/payment/fail',
      orderItems: orderData.items
    });

    return payment;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
}
```

## Webhook Yönetimi

PayTR webhook'larını alabilmek için PayTR panel'inizde webhook URL'ini ayarlayın:

```
https://yourdomain.com/api/v1/payments/paytr/webhook
```

### Webhook Güvenliği

Webhook endpoint'i public erişime açıktır ancak PayTR hash doğrulaması ile korunmaktadır. Webhook'lar yalnızca doğru hash ile işlenir.

### Webhook Test Etme

```bash
# Test webhook gönderimi
curl -X POST https://yourdomain.com/api/v1/payments/paytr/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_oid=TEST_ORD_123&status=1&total_amount=10000&hash=test_hash"
```

## Test ve Debug

### Test Modu

Test modunda çalışmak için:
```env
PAYTR_TEST_MODE=true
```

### Test Kartları

PayTR test modunda kullanabileceğiniz kart bilgileri:

**Başarılı Test Kartı:**
- Kart No: 5400010000000004
- Son Kullanma: 12/25
- CVV: 123

**Başarısız Test Kartı:**
- Kart No: 4355084355084358
- Son Kullanma: 12/25
- CVV: 123

### Debug Modu

Debug modunu açmak için PayTR request'lerinde `debug_on: '1'` parametresi kullanın. Bu mod test ortamında detaylı hata mesajları sağlar.

### Log Monitoring

Ödeme işlemlerini izlemek için:

```bash
# Payment log'larını takip etme
tail -f logs/payment.log

# PayTR webhook log'larını izleme
grep "PayTR webhook" logs/app.log
```

## Ödeme Durumları

### Payment Status
- `pending`: Ödeme bekleniyor
- `processing`: İşleniyor
- `completed`: Tamamlandı
- `failed`: Başarısız
- `cancelled`: İptal edildi
- `refunded`: İade edildi
- `partial_refund`: Kısmi iade

### PayTR Transaction Status
- `success`: Başarılı
- `failed`: Başarısız
- `pending`: Bekliyor
- `cancelled`: İptal edildi

## Hata Yönetimi

### Yaygın Hatalar

1. **Invalid Credentials**: PayTR bilgileri hatalı
2. **Hash Mismatch**: Hash doğrulama hatası
3. **Amount Too Low**: Minimum 1 TL altında tutar
4. **Order Not Found**: Sipariş bulunamadı
5. **Already Paid**: Sipariş zaten ödenmiş

### Hata Kodları

```javascript
// PayTR hata kodları ve açıklamaları
const PAYTR_ERROR_CODES = {
  'INVALID_CREDENTIALS': 'Geçersiz PayTR bilgileri',
  'HASH_MISMATCH': 'Hash doğrulama hatası',
  'INSUFFICIENT_AMOUNT': 'Yetersiz tutar',
  'ORDER_ALREADY_PAID': 'Sipariş zaten ödenmiş',
  'MERCHANT_NOT_FOUND': 'Üye işyeri bulunamadı'
};
```

## Güvenlik

### Hash Doğrulama

Tüm PayTR istekleri hash ile doğrulanır:

```javascript
// Hash oluşturma örneği
const crypto = require('crypto');

function generatePayTRHash(data) {
  const hashStr = data.merchant_oid + data.email + data.payment_amount + 
                  data.user_basket + data.no_installment + data.max_installment + 
                  (data.test_mode ? '1' : '0') + data.user_ip + 
                  data.success_url + data.fail_url + process.env.PAYTR_MERCHANT_SALT;
  
  return crypto.createHmac('sha256', process.env.PAYTR_MERCHANT_KEY)
               .update(hashStr)
               .digest('base64');
}
```

### IP Kısıtlaması

PayTR panel'inizde webhook için IP kısıtlaması ayarlayabilirsiniz.

## Performans Optimizasyonu

### Database İndeksleri

Payment tabloları için gerekli indeksler otomatik olarak oluşturulur:
- `order_id`, `user_id`, `status` indeksleri
- `merchant_oid`, `payment_id` benzersiz indeksleri

### Önbellekleme

Sıkça kullanılan payment verilerini Redis ile önbellekleyebilirsiniz:

```javascript
// Payment cache örneği
async function getCachedPayment(paymentId) {
  const cacheKey = `payment:${paymentId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const payment = await Payment.findByPk(paymentId);
  if (payment) {
    await redis.setex(cacheKey, 3600, JSON.stringify(payment));
  }
  
  return payment;
}
```

## Destek ve Sorun Giderme

### Log Seviyeleri

```env
LOG_LEVEL=debug  # debug, info, warn, error
```

### PayTR Destek

- PayTR Dokümantasyon: https://www.paytr.com/integration
- PayTR Test Panel: https://test.paytr.com
- PayTR Destek: destek@paytr.com

### Sistem Gereksinimleri

- Node.js 14+
- MSSQL Server 2016+
- SSL sertifikası (webhook için gerekli)

## Versiyon Geçmişi

- **v1.0.0**: İlk PayTR entegrasyonu
  - Temel ödeme oluşturma
  - Webhook yönetimi
  - İade ve iptal işlemleri
  - Ödeme raporları

---

**Not**: Bu dokümantasyon PayTR entegrasyonunun temel kullanımını kapsamaktadır. Detaylı bilgi için PayTR resmi dokümantasyonunu inceleyiniz. 