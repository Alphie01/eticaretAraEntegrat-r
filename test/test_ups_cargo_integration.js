/**
 * UPS Kargo Entegrasyon Test Suite
 * Bu test suite, UPS Kargo entegrasyonunun temel işlevlerini test eder
 */

const UPSCargoTracker = require('../src/services/UPSCargoTracker');

class UPSCargoIntegrationTest {
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
        
        if (data && passed) {
            console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
        }
    }

    /**
     * Test 1: UPS Kargo Tracker servisini başlatma
     */
    async testServiceInitialization() {
        try {
            this.tracker = new UPSCargoTracker();
            
            const hasRequiredMethods = [
                'trackByNumber',
                'trackMultiple', 
                'calculateShippingCost',
                'testConnection',
                'getStatus'
            ].every(method => typeof this.tracker[method] === 'function');

            this.recordTest(
                'Service Initialization',
                hasRequiredMethods,
                hasRequiredMethods ? 'UPS Kargo Tracker başarıyla başlatıldı' : 'Gerekli methodlar eksik',
                {
                    className: this.tracker.constructor.name,
                    baseURL: this.tracker.baseURL,
                    trackingURL: this.tracker.trackingURL,
                    environment: this.tracker.environment
                }
            );

        } catch (error) {
            this.recordTest(
                'Service Initialization',
                false,
                `Servis başlatılamadı: ${error.message}`
            );
        }
    }

    /**
     * Test 2: Durum kodları ve servis tipleri kontrolü
     */
    async testStatusCodesAndServices() {
        try {
            const statusCodesCount = Object.keys(this.tracker.statusCodes).length;
            const serviceTypesCount = Object.keys(this.tracker.serviceTypes).length;
            const cityCodesCount = Object.keys(this.tracker.cityCodes).length;

            const hasStatusCodes = statusCodesCount > 0;
            const hasServiceTypes = serviceTypesCount > 0;
            const hasCityCodes = cityCodesCount > 0;

            const allDataPresent = hasStatusCodes && hasServiceTypes && hasCityCodes;

            this.recordTest(
                'Status Codes and Services',
                allDataPresent,
                allDataPresent ? 
                    `${statusCodesCount} durum kodu, ${serviceTypesCount} servis tipi, ${cityCodesCount} şehir kodu tanımlı` :
                    'Durum kodları veya servis tipleri eksik',
                {
                    statusCodes: statusCodesCount,
                    serviceTypes: serviceTypesCount,
                    cityCodes: cityCodesCount,
                    sampleStatusCodes: Object.keys(this.tracker.statusCodes).slice(0, 5),
                    sampleServiceTypes: Object.keys(this.tracker.serviceTypes).slice(0, 3),
                    sampleCities: Object.keys(this.tracker.cityCodes).slice(0, 5)
                }
            );

        } catch (error) {
            this.recordTest(
                'Status Codes and Services',
                false,
                `Veri kontrolü başarısız: ${error.message}`
            );
        }
    }

    /**
     * Test 3: API bağlantı testi
     */
    async testAPIConnection() {
        try {
            const testResult = await this.tracker.testConnection();
            
            this.recordTest(
                'API Connection Test',
                testResult.success,
                testResult.success ? 
                    'UPS Kargo web sitesine bağlantı başarılı' : 
                    `Bağlantı başarısız: ${testResult.message}`,
                testResult
            );

        } catch (error) {
            this.recordTest(
                'API Connection Test',
                false,
                `Bağlantı testi hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 4: Kargo ücret hesaplama
     */
    async testShippingCostCalculation() {
        try {
            const testParams = {
                fromCity: 'ISTANBUL',
                toCity: 'ANKARA',
                weight: 2.5,
                serviceType: 'STANDARD',
                isInternational: false
            };

            const costResult = await this.tracker.calculateShippingCost(testParams);
            
            const isValidResult = costResult && 
                                typeof costResult.estimatedCost === 'number' && 
                                costResult.estimatedCost > 0 &&
                                costResult.currency === 'TRY';

            this.recordTest(
                'Shipping Cost Calculation',
                isValidResult,
                isValidResult ? 
                    `Ücret hesaplama başarılı: ${costResult.estimatedCost} ${costResult.currency}` :
                    'Ücret hesaplama başarısız',
                {
                    input: testParams,
                    result: costResult
                }
            );

        } catch (error) {
            this.recordTest(
                'Shipping Cost Calculation',
                false,
                `Ücret hesaplama hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 5: Uluslararası kargo ücret hesaplama
     */
    async testInternationalShippingCost() {
        try {
            const testParams = {
                fromCity: 'ISTANBUL',
                toCity: 'NEW YORK',
                weight: 1.0,
                serviceType: 'INTERNATIONAL',
                isInternational: true
            };

            const costResult = await this.tracker.calculateShippingCost(testParams);
            
            const isValidResult = costResult && 
                                typeof costResult.estimatedCost === 'number' && 
                                costResult.estimatedCost > 50; // Uluslararası kargo daha pahalı

            this.recordTest(
                'International Shipping Cost',
                isValidResult,
                isValidResult ? 
                    `Uluslararası ücret hesaplama başarılı: ${costResult.estimatedCost} ${costResult.currency}` :
                    'Uluslararası ücret hesaplama başarısız',
                {
                    input: testParams,
                    result: costResult
                }
            );

        } catch (error) {
            this.recordTest(
                'International Shipping Cost',
                false,
                `Uluslararası ücret hesaplama hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 6: Servis bilgileri
     */
    async testServiceInfo() {
        try {
            const serviceTypes = ['STANDARD', 'EXPRESS', 'INTERNATIONAL'];
            let allServicesValid = true;
            const serviceInfos = {};

            for (const serviceType of serviceTypes) {
                const serviceInfo = this.tracker.getServiceInfo(serviceType);
                serviceInfos[serviceType] = serviceInfo;
                
                if (!serviceInfo || !serviceInfo.code || !serviceInfo.name) {
                    allServicesValid = false;
                    break;
                }
            }

            this.recordTest(
                'Service Information',
                allServicesValid,
                allServicesValid ? 
                    'Tüm servis bilgileri başarıyla alındı' :
                    'Bazı servis bilgileri eksik',
                serviceInfos
            );

        } catch (error) {
            this.recordTest(
                'Service Information',
                false,
                `Servis bilgisi hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 7: Takip numarası formatı doğrulama
     */
    async testTrackingNumberValidation() {
        try {
            const testNumbers = [
                '123456789', // Yurtiçi
                '1Z999AA1234567890', // UPS Uluslararası
                'UPS123456789', // UPS Türkiye
                '12345', // Çok kısa
                'A' // Geçersiz
            ];

            let validationResults = [];
            
            for (const trackingNumber of testNumbers) {
                const isValid = trackingNumber.length >= 6 && trackingNumber.length <= 35;
                const isInternational = this.tracker.isInternational(trackingNumber);
                
                validationResults.push({
                    trackingNumber,
                    isValid,
                    isInternational,
                    length: trackingNumber.length
                });
            }

            const hasValidNumbers = validationResults.some(r => r.isValid);

            this.recordTest(
                'Tracking Number Validation',
                hasValidNumbers,
                hasValidNumbers ? 
                    'Takip numarası doğrulama çalışıyor' :
                    'Takip numarası doğrulama başarısız',
                validationResults
            );

        } catch (error) {
            this.recordTest(
                'Tracking Number Validation',
                false,
                `Doğrulama hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 8: Rate limiting kontrolü
     */
    async testRateLimiting() {
        try {
            const initialRequests = this.tracker.rateLimiter.requests;
            
            // Rate limit kontrolünü test et
            this.tracker.checkRateLimit();
            
            const afterRequests = this.tracker.rateLimiter.requests;
            const requestIncremented = afterRequests > initialRequests;

            this.recordTest(
                'Rate Limiting',
                requestIncremented,
                requestIncremented ? 
                    'Rate limiting çalışıyor' :
                    'Rate limiting çalışmıyor',
                {
                    initialRequests,
                    afterRequests,
                    maxRequests: this.tracker.rateLimiter.maxRequests,
                    resetInterval: this.tracker.rateLimiter.resetInterval
                }
            );

        } catch (error) {
            this.recordTest(
                'Rate Limiting',
                false,
                `Rate limiting test hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 9: Tarih parsing kontrolü
     */
    async testDateTimeParsing() {
        try {
            const testDates = [
                { date: '25.12.2024', time: '14:30', expected: true },
                { date: '25/12/2024', time: '14:30', expected: true },
                { date: '25-12-2024', time: null, expected: true },
                { date: 'invalid', time: null, expected: false }
            ];

            let parsedDates = [];
            
            for (const testDate of testDates) {
                try {
                    const parsed = this.tracker.parseDateTime(testDate.date, testDate.time);
                    parsedDates.push({
                        input: testDate,
                        parsed: parsed,
                        isValid: parsed !== null
                    });
                } catch (e) {
                    parsedDates.push({
                        input: testDate,
                        parsed: null,
                        isValid: false,
                        error: e.message
                    });
                }
            }

            const validParsedCount = parsedDates.filter(p => p.isValid).length;
            const testPassed = validParsedCount >= 3; // En az 3 tanesi başarılı olmalı

            this.recordTest(
                'Date Time Parsing',
                testPassed,
                testPassed ? 
                    `${validParsedCount}/${testDates.length} tarih formatı başarıyla parse edildi` :
                    'Tarih parsing başarısız',
                parsedDates
            );

        } catch (error) {
            this.recordTest(
                'Date Time Parsing',
                false,
                `Tarih parsing test hatası: ${error.message}`
            );
        }
    }

    /**
     * Test 10: API status kontrolü
     */
    async testAPIStatus() {
        try {
            const status = this.tracker.getStatus();
            
            const isValidStatus = status && 
                                status.service && 
                                status.version &&
                                status.statusCodes > 0 &&
                                status.serviceTypes > 0;

            this.recordTest(
                'API Status',
                isValidStatus,
                isValidStatus ? 
                    'API status bilgileri alındı' :
                    'API status eksik',
                status
            );

        } catch (error) {
            this.recordTest(
                'API Status',
                false,
                `Status test hatası: ${error.message}`
            );
        }
    }

    /**
     * Tüm testleri çalıştır
     */
    async runAllTests() {
        console.log('🚀 UPS Kargo Entegrasyon Testleri Başlatılıyor...\n');

        await this.testServiceInitialization();
        
        if (this.tracker) {
            await this.testStatusCodesAndServices();
            await this.testAPIConnection();
            await this.testShippingCostCalculation();
            await this.testInternationalShippingCost();
            await this.testServiceInfo();
            await this.testTrackingNumberValidation();
            await this.testRateLimiting();
            await this.testDateTimeParsing();
            await this.testAPIStatus();
        }

        this.printSummary();
    }

    /**
     * Test sonuçlarını özetini yazdır
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 UPS KARGO ENTEGRASYONu TEST SONUÇLARI');
        console.log('='.repeat(60));
        
        console.log(`✅ Başarılı Testler: ${this.passedTests}`);
        console.log(`❌ Başarısız Testler: ${this.totalTests - this.passedTests}`);
        console.log(`📈 Başarı Oranı: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);
        
        console.log('\n📋 DETAYLAR:');
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.testName}`);
            if (!result.passed) {
                console.log(`   ⚠️  ${result.message}`);
            }
        });

        if (this.tracker) {
            console.log('\n🔧 SERVİS BİLGİLERİ:');
            console.log(`   📍 Base URL: ${this.tracker.baseURL}`);
            console.log(`   🌐 Tracking URL: ${this.tracker.trackingURL}`);
            console.log(`   🏷️  Environment: ${this.tracker.environment}`);
            console.log(`   📊 Status Codes: ${Object.keys(this.tracker.statusCodes).length}`);
            console.log(`   🚚 Service Types: ${Object.keys(this.tracker.serviceTypes).length}`);
            console.log(`   🏙️  City Codes: ${Object.keys(this.tracker.cityCodes).length}`);
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.passedTests === this.totalTests) {
            console.log('🎉 Tüm testler başarıyla tamamlandı!');
        } else if (this.passedTests / this.totalTests >= 0.8) {
            console.log('✅ Testler büyük oranda başarılı - UPS Kargo entegrasyonu kullanıma hazır');
        } else {
            console.log('⚠️  Bazı testler başarısız - Lütfen hataları kontrol edin');
        }
    }
}

// Test suite'i çalıştır
if (require.main === module) {
    const testSuite = new UPSCargoIntegrationTest();
    testSuite.runAllTests().catch(error => {
        console.error('❌ Test suite hatası:', error.message);
        process.exit(1);
    });
}

module.exports = UPSCargoIntegrationTest; 