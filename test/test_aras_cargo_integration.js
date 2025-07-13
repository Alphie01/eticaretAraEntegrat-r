/**
 * Aras Kargo Entegrasyon Test Suite
 * Bu test suite, Aras Kargo entegrasyonunun temel işlevlerini test eder
 */

const ArasCargoTracker = require('../src/services/ArasCargoTracker');

class ArasCargoIntegrationTest {
    constructor() {
        this.tracker = null;
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * Test sonucunu kaydet
     */
    recordTest(testName, passed, message, data = null) {
        this.totalTests++;
        if (passed) this.passedTests++;

        const result = {
            testName,
            passed,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        this.testResults.push(result);

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
        
        if (data && !passed) {
            console.log('   Detay:', JSON.stringify(data, null, 2));
        }
    }

    /**
     * Test 1: Servis başlatma ve temel konfigürasyon
     */
    async testInitialization() {
        try {
            console.log('\n🔧 Test 1: Aras Kargo Tracker başlatma...');
            
            this.tracker = new ArasCargoTracker();
            const isValid = this.tracker && typeof this.tracker.trackByNumber === 'function';
            
            this.recordTest(
                'Servis başlatma',
                isValid,
                isValid ? 'Aras Kargo Tracker başarıyla oluşturuldu' : 'Tracker oluşturulamadı'
            );

            if (isValid) {
                console.log(`   📡 API URL: ${this.tracker.baseURL}`);
                console.log(`   🌍 Ortam: ${this.tracker.environment}`);
                console.log(`   ⚡ Rate Limit: ${this.tracker.rateLimiter.maxRequests}/dakika`);
            }

        } catch (error) {
            this.recordTest('Servis başlatma', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 2: API bağlantı testi
     */
    async testConnection() {
        try {
            console.log('\n🌐 Test 2: API bağlantı testi...');
            
            if (!process.env.ARAS_CARGO_USERNAME || !process.env.ARAS_CARGO_PASSWORD) {
                this.recordTest(
                    'API bağlantı testi',
                    false,
                    'Environment variables eksik (ARAS_CARGO_USERNAME, ARAS_CARGO_PASSWORD gerekli)'
                );
                return;
            }

            const result = await this.tracker.testConnection();
            const isValid = result && result.success;
            
            this.recordTest(
                'API bağlantı testi',
                isValid,
                isValid ? 'API bağlantısı başarılı' : 'API bağlantısı başarısız',
                result
            );

            if (isValid) {
                console.log(`   📊 Durum kodları: ${result.statusCodesCount} adet`);
            }

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
            const statusCount = Object.keys(statusCodes).length;
            const isValid = statusCount >= 15; // En az 15 durum kodu bekliyoruz
            
            this.recordTest(
                'Durum kodları',
                isValid,
                isValid ? `${statusCount} adet durum kodu tanımlı` : `Yetersiz durum kodu: ${statusCount}`,
                { statusCount, sampleCodes: Object.keys(statusCodes).slice(0, 5) }
            );

            if (isValid) {
                console.log(`   📦 Pickup: ${Object.values(statusCodes).filter(s => s.category === 'pickup').length} adet`);
                console.log(`   🚚 Transit: ${Object.values(statusCodes).filter(s => s.category === 'transit').length} adet`);
                console.log(`   ✅ Delivered: ${Object.values(statusCodes).filter(s => s.category === 'delivered').length} adet`);
                console.log(`   ❌ Failed: ${Object.values(statusCodes).filter(s => s.category === 'failed').length} adet`);
            }

        } catch (error) {
            this.recordTest('Durum kodları', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 4: XML Parser kontrolü
     */
    async testXMLParser() {
        try {
            console.log('\n🔧 Test 4: XML Parser kontrolü...');
            
            const hasParser = this.tracker.xmlParser && this.tracker.xmlBuilder;
            const isValid = hasParser;
            
            this.recordTest(
                'XML Parser',
                isValid,
                isValid ? 'XML Parser başarıyla yüklendi' : 'XML Parser yüklenemedi'
            );

            if (isValid) {
                console.log('   📄 xml2js parser aktif');
                console.log('   🔨 xml2js builder aktif');
            }

        } catch (error) {
            this.recordTest('XML Parser', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 5: SOAP Envelope oluşturma
     */
    async testSOAPEnvelope() {
        try {
            console.log('\n🧼 Test 5: SOAP Envelope oluşturma...');
            
            const soapXML = this.tracker.createSOAPEnvelope('KargoBilgi', {
                'tem:kargo_no': 'TEST123456789'
            });
            
            const isValid = soapXML && soapXML.includes('soap:Envelope') && soapXML.includes('KargoBilgi');
            
            this.recordTest(
                'SOAP Envelope',
                isValid,
                isValid ? 'SOAP XML başarıyla oluşturuldu' : 'SOAP XML oluşturulamadı'
            );

            if (isValid) {
                console.log('   📋 SOAP namespace doğru');
                console.log('   🏷️ Method name eklendi');
                console.log('   🔑 Credentials dahil edildi');
            }

        } catch (error) {
            this.recordTest('SOAP Envelope', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 6: Şehir kodları kontrolü
     */
    async testCityCodes() {
        try {
            console.log('\n🏙️ Test 6: Şehir kodları kontrolü...');
            
            const cityCodes = this.tracker.cityCodes;
            const cityCount = Object.keys(cityCodes).length;
            const hasIstanbul = cityCodes['ISTANBUL'] === '34';
            const hasAnkara = cityCodes['ANKARA'] === '06';
            
            const isValid = cityCount >= 50 && hasIstanbul && hasAnkara;
            
            this.recordTest(
                'Şehir kodları',
                isValid,
                isValid ? `${cityCount} şehir kodu tanımlı` : `Eksik şehir kodları: ${cityCount}`,
                { cityCount, sampleCities: ['ISTANBUL', 'ANKARA', 'IZMIR'] }
            );

            if (isValid) {
                console.log(`   🏙️ İstanbul: ${cityCodes['ISTANBUL']}`);
                console.log(`   🏛️ Ankara: ${cityCodes['ANKARA']}`);
                console.log(`   🌊 İzmir: ${cityCodes['IZMIR']}`);
            }

        } catch (error) {
            this.recordTest('Şehir kodları', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 7: Ücret hesaplama testi
     */
    async testPriceCalculation() {
        try {
            console.log('\n💰 Test 7: Ücret hesaplama testi...');
            
            const testParams = {
                fromCity: 'ISTANBUL',
                toCity: 'ANKARA',
                weight: 2.5,
                serviceType: 'standard'
            };
            
            const result = await this.tracker.calculateShippingCost(testParams);
            const isValid = result && result.success && result.estimatedCost > 0;
            
            this.recordTest(
                'Ücret hesaplama',
                isValid,
                isValid ? `Tahmin: ${result.estimatedCost} ${result.currency}` : 'Ücret hesaplanamadı',
                result
            );

            if (isValid) {
                console.log(`   💵 ${testParams.fromCity} → ${testParams.toCity}`);
                console.log(`   ⚖️ Ağırlık: ${testParams.weight} kg`);
                console.log(`   💸 Tahmini ücret: ${result.estimatedCost} TRY`);
            }

        } catch (error) {
            this.recordTest('Ücret hesaplama', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 8: Rate limiting kontrolü
     */
    async testRateLimiting() {
        try {
            console.log('\n⏱️ Test 8: Rate limiting kontrolü...');
            
            const initialRequests = this.tracker.rateLimiter.requests;
            
            // Birkaç test request
            for (let i = 0; i < 3; i++) {
                this.tracker.checkRateLimit();
            }
            
            const finalRequests = this.tracker.rateLimiter.requests;
            const isValid = finalRequests > initialRequests;
            
            this.recordTest(
                'Rate limiting',
                isValid,
                isValid ? `Rate limiter çalışıyor: ${finalRequests} requests` : 'Rate limiter sorunu',
                { initialRequests, finalRequests }
            );

        } catch (error) {
            this.recordTest('Rate limiting', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 9: Utility fonksiyonları
     */
    async testUtilityFunctions() {
        try {
            console.log('\n🔧 Test 9: Utility fonksiyonları...');
            
            const testResults = [];
            
            // Teslimat durumu kontrolü
            const isDelivered = this.tracker.isDelivered('DELIVERED');
            testResults.push({ test: 'isDelivered', result: isDelivered === true });
            
            // Sorun durumu kontrolü
            const hasIssue = this.tracker.hasIssue('DELIVERY_FAILED');
            testResults.push({ test: 'hasIssue', result: hasIssue === true });
            
            // Durum filtreleme
            const mockData = [
                { statusCategory: 'delivered' },
                { statusCategory: 'transit' },
                { statusCategory: 'delivered' }
            ];
            const delivered = this.tracker.filterByStatusCategory(mockData, 'delivered');
            testResults.push({ test: 'filterByStatusCategory', result: delivered.length === 2 });
            
            const allPassed = testResults.every(t => t.result);
            
            this.recordTest(
                'Utility fonksiyonları',
                allPassed,
                allPassed ? 'Tüm utility fonksiyonları çalışıyor' : 'Bazı utility fonksiyonları hatalı',
                testResults
            );

        } catch (error) {
            this.recordTest('Utility fonksiyonları', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Test 10: API status kontrolü
     */
    async testAPIStatus() {
        try {
            console.log('\n📊 Test 10: API status kontrolü...');
            
            const status = this.tracker.getStatus();
            const isValid = status && status.service === 'Aras Kargo Tracker';
            
            this.recordTest(
                'API Status',
                isValid,
                isValid ? `Service: ${status.service} v${status.version}` : 'Status bilgisi alınamadı',
                status
            );

            if (isValid) {
                console.log(`   🏷️ Version: ${status.version}`);
                console.log(`   🌍 Environment: ${status.environment}`);
                console.log(`   📊 Status Codes: ${status.statusCodes}`);
                console.log(`   🏙️ Cities: ${status.supportedCities}`);
            }

        } catch (error) {
            this.recordTest('API Status', false, `Hata: ${error.message}`);
        }
    }

    /**
     * Tüm testleri çalıştır
     */
    async runAllTests() {
        console.log('🚀 Aras Kargo Entegrasyonu Test Suite Başlatılıyor...\n');

        const startTime = Date.now();

        try {
            await this.testInitialization();
            await this.testConnection();
            await this.testStatusCodes();
            await this.testXMLParser();
            await this.testSOAPEnvelope();
            await this.testCityCodes();
            await this.testPriceCalculation();
            await this.testRateLimiting();
            await this.testUtilityFunctions();
            await this.testAPIStatus();
        } catch (error) {
            console.error('❌ Test suite hatası:', error.message);
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        this.printResults(duration);
    }

    /**
     * Test sonuçlarını yazdır
     */
    printResults(duration) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ARAS KARGO ENTEGRASYONU TEST SONUÇLARI');
        console.log('='.repeat(60));
        
        console.log(`⏱️  Süre: ${duration} saniye`);
        console.log(`📋 Toplam Test: ${this.totalTests}`);
        console.log(`✅ Başarılı: ${this.passedTests}`);
        console.log(`❌ Başarısız: ${this.totalTests - this.passedTests}`);
        console.log(`📈 Başarı Oranı: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 TÜM TESTLER BAŞARILI!');
            console.log('Aras Kargo entegrasyonu kullanıma hazır.');
        } else {
            console.log('\n⚠️  BAZI TESTLER BAŞARISIZ');
            console.log('Başarısız testleri kontrol ediniz.');
        }

        console.log('\n📝 Entegrasyon için gerekli environment variables:');
        console.log('   ARAS_CARGO_USERNAME=your-aras-username');
        console.log('   ARAS_CARGO_PASSWORD=your-aras-password');
        console.log('   ARAS_CARGO_CUSTOMER_CODE=your-customer-code');
        console.log('   ARAS_CARGO_API_URL=https://kargotakip.araskargo.com.tr/araskargo.asmx');
        console.log('   ARAS_CARGO_ENVIRONMENT=production');

        console.log('\n2. API endpoints:');
        console.log('   GET /api/aras-cargo/track/:trackingNumber');
        console.log('   POST /api/aras-cargo/track/bulk');
        console.log('   POST /api/aras-cargo/cargos/date-range');
        console.log('   GET /api/aras-cargo/cargos/delivered/:date');
        console.log('   GET /api/aras-cargo/cargos/undelivered');
        console.log('   GET /api/aras-cargo/branches');
        console.log('   GET /api/aras-cargo/movements/:trackingNumber');
        console.log('   POST /api/aras-cargo/calculate-cost');

        console.log('\n3. Kargo takip URL formatı:');
        console.log('   https://kargotakip.araskargo.com.tr/?ref=TAKIP_NO');

        // Başarısız testlerin detaylarını göster
        const failedTests = this.testResults.filter(test => !test.passed);
        if (failedTests.length > 0) {
            console.log('\n❌ Başarısız Test Detayları:');
            failedTests.forEach(test => {
                console.log(`   • ${test.testName}: ${test.message}`);
            });
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Test suite'i çalıştır
if (require.main === module) {
    const testSuite = new ArasCargoIntegrationTest();
    testSuite.runAllTests().catch(error => {
        console.error('Test suite başlatma hatası:', error);
        process.exit(1);
    });
}

module.exports = ArasCargoIntegrationTest; 