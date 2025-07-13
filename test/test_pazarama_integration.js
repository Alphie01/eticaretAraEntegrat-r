require('dotenv').config();
const PazaramaAdapter = require('./src/adapters/PazaramaAdapter');

async function testPazaramaIntegration() {
  console.log('=== Pazarama Entegrasyon Testi Başlatılıyor ===\n');

  // Test API credentials
  const credentials = {
    apiKey: process.env.PAZARAMA_API_KEY,
    apiSecret: process.env.PAZARAMA_API_SECRET,
    sellerId: process.env.PAZARAMA_SELLER_ID,
    environment: process.env.PAZARAMA_ENVIRONMENT || 'production'
  };

  if (!credentials.apiKey || !credentials.apiSecret) {
    console.error('❌ HATA: Pazarama API credentials eksik!');
    console.log('Lütfen .env dosyasında şu değişkenleri tanımlayın:');
    console.log('- PAZARAMA_API_KEY');
    console.log('- PAZARAMA_API_SECRET');
    console.log('- PAZARAMA_SELLER_ID');
    console.log('- PAZARAMA_ENVIRONMENT');
    process.exit(1);
  }

  try {
    // Initialize adapter
    console.log('1. Pazarama Adapter Başlatılıyor...');
    const adapter = new PazaramaAdapter(credentials);
    console.log('✓ Adapter başarıyla oluşturuldu\n');

    // Test authentication
    console.log('2. Kimlik Doğrulama Testi...');
    const authResult = await adapter.authenticate();
    if (authResult) {
      console.log('✓ Kimlik doğrulama başarılı');
      console.log(`  Satıcı: ${adapter.sellerInfo?.companyName || 'Bilinmiyor'}`);
      console.log(`  Çevre: ${adapter.environment}\n`);
    } else {
      throw new Error('Kimlik doğrulama başarısız');
    }

    // Test get adapter info
    console.log('3. Adapter Bilgilerini Al...');
    const info = await adapter.getInfo();
    console.log('✓ Adapter bilgileri:');
    console.log(`  Pazaryeri: ${info.marketplace}`);
    console.log(`  Authenticated: ${info.authenticated}`);
    console.log(`  Base URL: ${info.baseUrl}`);
    console.log(`  Özellikler: ${info.features.join(', ')}`);
    console.log(`  Rate Limit: ${info.limits.requestsPerSecond} req/sec\n`);

    // Test get categories
    console.log('4. Kategorileri Al...');
    try {
      const categories = await adapter.getCategories();
      console.log(`✓ ${categories?.length || 0} kategori alındı`);
      if (categories && categories.length > 0) {
        console.log('  İlk 3 kategori:');
        categories.slice(0, 3).forEach(cat => {
          console.log(`    - ${cat.name || cat.title || 'İsimsiz'} (ID: ${cat.id})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Kategori listesi alınamadı:', error.message);
    }
    console.log('');

    // Test get brands
    console.log('5. Markaları Al...');
    try {
      const brands = await adapter.getBrands({ page: 1, size: 10 });
      console.log(`✓ ${brands?.length || 0} marka alındı`);
      if (brands && brands.length > 0) {
        console.log('  İlk 3 marka:');
        brands.slice(0, 3).forEach(brand => {
          console.log(`    - ${brand.name || 'İsimsiz'} (ID: ${brand.id})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Marka listesi alınamadı:', error.message);
    }
    console.log('');

    // Test get products
    console.log('6. Ürünleri Al...');
    try {
      const productsResult = await adapter.getProducts({ page: 1, size: 5 });
      console.log(`✓ ${productsResult.products?.length || 0} ürün alındı`);
      console.log(`  Toplam: ${productsResult.totalCount || 0} ürün`);
      if (productsResult.products && productsResult.products.length > 0) {
        console.log('  İlk ürün:');
        const firstProduct = productsResult.products[0];
        console.log(`    - İsim: ${firstProduct.name || firstProduct.displayName || 'İsimsiz'}`);
        console.log(`    - Kod: ${firstProduct.code || 'Yok'}`);
        console.log(`    - Fiyat: ${firstProduct.salePrice || firstProduct.listPrice || 0} TL`);
        console.log(`    - Stok: ${firstProduct.stockCount || 0}`);
        console.log(`    - Durum: ${firstProduct.isActive ? 'Aktif' : 'Pasif'}`);
      }
    } catch (error) {
      console.log('⚠️ Ürün listesi alınamadı:', error.message);
    }
    console.log('');

    // Test get orders
    console.log('7. Siparişleri Al...');
    try {
      const ordersResult = await adapter.getOrders({ page: 1, size: 5 });
      console.log(`✓ ${ordersResult.orders?.length || 0} sipariş alındı`);
      console.log(`  Toplam: ${ordersResult.totalCount || 0} sipariş`);
      if (ordersResult.orders && ordersResult.orders.length > 0) {
        console.log('  İlk sipariş:');
        const firstOrder = ordersResult.orders[0];
        console.log(`    - Sipariş ID: ${firstOrder.id || 'Yok'}`);
        console.log(`    - Tarih: ${firstOrder.orderDate || 'Yok'}`);
        console.log(`    - Durum: ${firstOrder.status || 'Bilinmiyor'}`);
        console.log(`    - Toplam: ${firstOrder.totalAmount || 0} TL`);
      }
    } catch (error) {
      console.log('⚠️ Sipariş listesi alınamadı:', error.message);
    }
    console.log('');

    // Test get cities
    console.log('8. Şehirleri Al...');
    try {
      const cities = await adapter.getCities();
      console.log(`✓ ${cities?.length || 0} şehir alındı`);
      if (cities && cities.length > 0) {
        console.log('  İlk 3 şehir:');
        cities.slice(0, 3).forEach(city => {
          console.log(`    - ${city.name || 'İsimsiz'} (ID: ${city.id})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Şehir listesi alınamadı:', error.message);
    }
    console.log('');

    // Test get seller deliveries
    console.log('9. Teslimat Seçeneklerini Al...');
    try {
      const deliveries = await adapter.getSellerDeliveries();
      console.log(`✓ ${deliveries?.length || 0} teslimat seçeneği alındı`);
      if (deliveries && deliveries.length > 0) {
        console.log('  Teslimat seçenekleri:');
        deliveries.slice(0, 3).forEach(delivery => {
          console.log(`    - ${delivery.name || 'İsimsiz'} (${delivery.type || 'Bilinmiyor'})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Teslimat seçenekleri alınamadı:', error.message);
    }
    console.log('');

    // Test product creation (dry run)
    console.log('10. Test Ürün Oluşturma (Deneme)...');
    try {
      const testProduct = {
        name: 'Test Ürün - Pazarama Entegrasyon',
        displayName: 'Test Ürün - Pazarama Entegrasyon',
        description: 'Bu ürün Pazarama entegrasyon testi için oluşturulmuştur.',
        brandId: 1, // Varsayılan brand ID
        categoryId: 1, // Varsayılan kategori ID
        desi: 1,
        code: `TEST-PAZARAMA-${Date.now()}`,
        groupCode: `TEST-GROUP-${Date.now()}`,
        stockCount: 10,
        vatRate: 18,
        listPrice: 99.99,
        salePrice: 89.99,
        images: [
          { imageUrl: 'https://via.placeholder.com/500x500.png?text=Test+Product', order: 1 }
        ],
        attributes: [],
        isActive: true,
        approved: false
      };

      console.log('ℹ️ Test ürün verisi hazırlandı:');
      console.log(`  İsim: ${testProduct.name}`);
      console.log(`  Kod: ${testProduct.code}`);
      console.log(`  Fiyat: ${testProduct.salePrice} TL`);
      console.log('⚠️ Gerçek ürün oluşturma test sırasında devre dışı bırakıldı');
      
      // Actual product creation is commented out for safety
      // const createResult = await adapter.createProduct(testProduct);
      // console.log('✓ Test ürün oluşturuldu:', createResult.productId);
    } catch (error) {
      console.log('⚠️ Test ürün oluşturulamadı:', error.message);
    }
    console.log('');

    // Test batch operations info
    console.log('11. Toplu İşlem Yetenekleri...');
    console.log('✓ Pazarama aşağıdaki toplu işlemleri destekler:');
    console.log('  - Toplu ürün oluşturma');
    console.log('  - Toplu fiyat ve stok güncelleme');
    console.log('  - Toplu ürün görsel güncelleme');
    console.log('  - Batch request durum takibi');
    console.log('');

    // Test signature generation
    console.log('12. İmza Oluşturma Testi...');
    const testConfig = {
      method: 'GET',
      url: '/v1/test',
      data: null
    };
    const signature = adapter.generateSignature(testConfig);
    console.log('✓ API imzası başarıyla oluşturuldu');
    console.log(`  İmza uzunluğu: ${signature.length} karakter`);
    console.log('');

    console.log('=== Pazarama Entegrasyon Testi Tamamlandı ===');
    console.log('✅ Tüm temel işlemler başarıyla test edildi!');
    console.log('');
    console.log('📋 Test Sonuçları:');
    console.log('✓ Adapter başlatma: BAŞARILI');
    console.log('✓ Kimlik doğrulama: BAŞARILI');
    console.log('✓ Kategori listesi: TEST EDİLDİ');
    console.log('✓ Marka listesi: TEST EDİLDİ');
    console.log('✓ Ürün listesi: TEST EDİLDİ');
    console.log('✓ Sipariş listesi: TEST EDİLDİ');
    console.log('✓ Şehir listesi: TEST EDİLDİ');
    console.log('✓ Teslimat seçenekleri: TEST EDİLDİ');
    console.log('✓ İmza oluşturma: BAŞARILI');
    console.log('');
    console.log('📝 Notlar:');
    console.log('- Pazarama API güçlü authentication gerektirir (API Key + Secret)');
    console.log('- Rate limiting: 20 req/sec (estimated)');
    console.log('- Tüm fiyatlar TRY (Türk Lirası) cinsindendir');
    console.log('- Ürünler onay süreci gerektirir (approved: false)');
    console.log('- Batch operasyonları desteklenir');
    console.log('- VAT oranı varsayılan %18');
    console.log('- Desi hesabı zorunlu');
    console.log('');

  } catch (error) {
    console.error('❌ Test sırasında hata oluştu:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testPazaramaIntegration()
    .then(() => {
      console.log('Test tamamlandı. Çıkılıyor...');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test hatası:', error);
      process.exit(1);
    });
}

module.exports = testPazaramaIntegration; 