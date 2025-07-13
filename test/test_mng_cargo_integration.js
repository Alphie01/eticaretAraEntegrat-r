const MNGCargoTracker = require('../src/services/MNGCargoTracker');
const logger = require('../src/utils/logger');

/**
 * MNG Kargo Entegrasyonu Test Scripti
 * Bu script MNG Kargo takip sisteminin tüm özelliklerini test eder
 */

// Test verileri
const testData = {
    trackingNumber: 'MNG123456789012',
    referenceNumber: 'REF-2025-001',
    orderNumber: 'ORDER-2025-001',
    trackingNumbers: [
        'MNG123456789012',
        'MNG123456789013',
        'MNG123456789014'
    ]
};

class MNGCargoTester {
    constructor() {
        this.tracker = new MNGCargoTracker();
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Test sonucunu kaydet
     */
    recordTest(testName, success, message = '', data = null) {
        this.testResults.total++;
        
        if (success) {
            this.testResults.passed++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.testResults.failed++;
            console.log(`❌ ${testName}: ${message}`);
            this.testResults.errors.push({ testName, message, data });
        }
    }

    /**
     * Test 1: MNG Kargo servis başlatma
     */
    async testInitialization() {
        try {
            console.log('\n🔧 Test 1: MNG Kargo servis başlatma...');
            
            const status = this.tracker.getStatus();
            const isValid = status && status.service === 'MNG Kargo Tracker';
            
            this.recordTest(
                'Servis başlatma',
                isValid,
                isValid ? 'Servis başarıyla başlatıldı' : 'Servis başlatılamadı',
                status
            );

            if (isValid) {
                console.log(`   📊 Rate limiter: ${status.rateLimiter.requests}/${status.rateLimiter.maxRequests} requests`);
                console.log(`   🔗 Base URL: ${status.endpoints.track.split('/v1')[0]}`);
                console.log(`   📋 Status codes: ${status.statusCodes}`);
            }

        } catch (error) {
            this.recordTest('Servis başlatma', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 2: Bağlantı testi
     */
    async testConnection() {
        try {
            console.log('\n🌐 Test 2: MNG Kargo API bağlantı testi...');
            
            const result = await this.tracker.testConnection();
            
            this.recordTest(
                'API bağlantı testi',
                result.success,
                result.message,
                result.data
            );

        } catch (error) {
            this.recordTest('API bağlantı testi', false, `Bağlantı hatası: ${error.message}`);
        }
    }

    /**
     * Test 3: Durum kodları kontrolü
     */
    async testStatusCodes() {
        try {
            console.log('\n📋 Test 3: Durum kodları kontrolü...');
            
            const statusCodes = this.tracker.statusCodes;
            const codeCount = Object.keys(statusCodes).length;
            const isValid = codeCount > 0;
            
            this.recordTest(
                'Durum kodları',
                isValid,
                isValid ? `${codeCount} adet durum kodu tanımlı` : 'Durum kodları bulunamadı',
                statusCodes
            );

            if (isValid) {
                console.log('   📊 Örnek durum kodları:');
                Object.entries(statusCodes).slice(0, 5).forEach(([code, info]) => {
                    console.log(`     ${code}: ${info.description} (${info.category})`);
                });
            }

        } catch (error) {
            this.recordTest('Durum kodları', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Tüm testleri çalıştır
     */
    async runAllTests() {
        console.log('🚀 MNG Kargo Entegrasyonu Test Suite Başlatılıyor...\n');

        const startTime = Date.now();

        try {
            await this.testInitialization();
            await this.testConnection();
            await this.testStatusCodes();
        } catch (error) {
            console.error('❌ Test suite hatası:', error.message);
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        this.printResults(duration);
    }

    /**
     * Test sonuçlarını yazdır
     */
    printResults(duration) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 MNG KARGO ENTEGRASYONU TEST SONUÇLARI');
        console.log('='.repeat(60));
        
        console.log(`⏱️  Süre: ${duration} saniye`);
        console.log(`📋 Toplam Test: ${this.testResults.total}`);
        console.log(`✅ Başarılı: ${this.testResults.passed}`);
        console.log(`❌ Başarısız: ${this.testResults.failed}`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`📈 Başarı Oranı: ${successRate}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ BAŞARISIZ TESTLER:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.testName}: ${error.message}`);
            });
        }

        console.log('\n🔧 KURULUM NOTLARI:');
        console.log('1. Environment variables (.env dosyası):');
        console.log('   MNG_CARGO_API_KEY=your-api-key');
        console.log('   MNG_CARGO_API_SECRET=your-api-secret');
        console.log('   MNG_CARGO_COMPANY_CODE=your-company-code');
        console.log('   MNG_CARGO_API_URL=https://api.mngkargo.com.tr');

        console.log('\n2. API endpoints:');
        console.log('   GET /api/mng-cargo/track/:trackingNumber');
        console.log('   POST /api/mng-cargo/track/reference');
        console.log('   POST /api/mng-cargo/track/bulk');
        console.log('   GET /api/mng-cargo/branches');

        console.log('\n3. Kargo takip URL formatı:');
        console.log('   https://kargotakip.mngkargo.com.tr/?takipno={TRACKING_NUMBER}');

        if (successRate >= 80) {
            console.log('\n🎉 MNG Kargo entegrasyonu başarıyla test edildi!');
        } else {
            console.log('\n⚠️  Bazı testler başarısız oldu. Lütfen konfigürasyonu kontrol ediniz.');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Test runner
if (require.main === module) {
    const tester = new MNGCargoTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test suite hatası:', error);
        process.exit(1);
    });
}

module.exports = MNGCargoTester;
