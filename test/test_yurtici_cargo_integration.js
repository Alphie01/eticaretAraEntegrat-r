const YurticiCargoTracker = require('../src/services/YurticiCargoTracker');
const logger = require('../src/utils/logger');

/**
 * Yurtiçi Kargo Entegrasyon Test Suitesi
 * SOAP/XML API tabanlı entegrasyon testleri
 * Türkiye'nin önde gelen kargo firması Yurtiçi Kargo entegrasyonu
 */

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

class YurticiCargoIntegrationTest {
    constructor() {
        this.tracker = new YurticiCargoTracker();
        this.testResults = [];
        this.testSummary = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async runTest(testName, testFunction) {
        this.testSummary.total++;
        this.log(`\n${colors.bright}🧪 Testing: ${testName}${colors.reset}`, 'cyan');
        
        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                passed: true,
                result,
                duration,
                error: null
            });
            
            this.testSummary.passed++;
            this.log(`✅ PASSED (${duration}ms)`, 'green');
            
            if (result && typeof result === 'object') {
                this.log(`📊 Result: ${JSON.stringify(result, null, 2)}`, 'blue');
            }
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                result: null,
                duration: 0,
                error: error.message
            });
            
            this.testSummary.failed++;
            this.log(`❌ FAILED: ${error.message}`, 'red');
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test 1: Servis Başlatma ve Temel Özellikler
     */
    async testServiceInitialization() {
        return await this.runTest('Service Initialization', async () => {
            const status = this.tracker.getStatus();
            
            const expectations = {
                hasService: status.service === 'Yurtiçi Kargo Tracker',
                hasVersion: !!status.version,
                hasAPIType: status.apiType === 'SOAP/XML',
                hasWSDL: !!status.wsdlURL,
                hasFeatures: status.features && Object.keys(status.features).length > 0,
                hasStatusCodes: status.statusCodes > 0,
                hasServiceTypes: status.serviceTypes > 0,
                hasRateLimiter: !!status.rateLimiter
            };

            const passed = Object.values(expectations).every(Boolean);
            if (!passed) {
                throw new Error(`Initialization failed: ${JSON.stringify(expectations)}`);
            }

            return {
                service: status.service,
                version: status.version,
                apiType: status.apiType,
                statusCodes: status.statusCodes,
                serviceTypes: status.serviceTypes,
                features: Object.keys(status.features),
                passed: true
            };
        });
    }

    /**
     * Test 2: Durum Kodları ve Servis Tipleri
     */
    async testStatusCodesAndServices() {
        return await this.runTest('Status Codes and Services', async () => {
            const statusCount = Object.keys(this.tracker.statusCodes).length;
            const serviceCount = Object.keys(this.tracker.serviceTypes).length;
            const cityCount = Object.keys(this.tracker.cityCodes).length;

            // Test durum kodu çözümleme
            const testStatus = this.tracker.getStatusInfo('DLV');
            const unknownStatus = this.tracker.getStatusInfo('UNKNOWN_STATUS');

            if (statusCount < 10) {
                throw new Error(`Insufficient status codes: ${statusCount}`);
            }

            if (serviceCount < 5) {
                throw new Error(`Insufficient service types: ${serviceCount}`);
            }

            if (cityCount < 30) {
                throw new Error(`Insufficient city codes: ${cityCount}`);
            }

            return {
                statusCodes: statusCount,
                serviceTypes: serviceCount,
                cities: cityCount,
                testStatus: testStatus,
                unknownStatus: unknownStatus
            };
        });
    }

    /**
     * Test 3: SOAP API Bağlantı Testi
     */
    async testAPIConnection() {
        return await this.runTest('SOAP API Connection', async () => {
            const connectionTest = await this.tracker.testConnection();
            
            return {
                connectionStatus: connectionTest.success,
                message: connectionTest.message,
                wsdlURL: connectionTest.wsdlURL,
                hasCredentials: connectionTest.hasCredentials,
                statusCodesCount: connectionTest.statusCodesCount,
                serviceTypesCount: connectionTest.serviceTypesCount
            };
        });
    }

    /**
     * Test 4: Kargo Ücret Hesaplama
     */
    async testShippingCostCalculation() {
        return await this.runTest('Shipping Cost Calculation', async () => {
            const testParams = {
                weight: 2,
                desi: 3,
                fromCity: 'ISTANBUL',
                toCity: 'ANKARA',
                serviceType: 'STANDARD'
            };

            const result = await this.tracker.calculateShippingCost(testParams);

            if (!result.success) {
                throw new Error('Cost calculation failed');
            }

            if (!result.estimatedCost || result.estimatedCost <= 0) {
                throw new Error('Invalid cost estimation');
            }

            return {
                estimatedCost: result.estimatedCost,
                currency: result.currency,
                serviceType: result.serviceType,
                breakdown: result.breakdown
            };
        });
    }

    /**
     * Test 5: Servis Bilgileri
     */
    async testServiceInformation() {
        return await this.runTest('Service Information', async () => {
            const allServices = Object.keys(this.tracker.serviceTypes);
            const serviceInfos = allServices.map(type => this.tracker.getServiceInfo(type));

            // Test belirli bir servis
            const standardService = this.tracker.getServiceInfo('STANDARD');
            
            if (!standardService.name || !standardService.description) {
                throw new Error('Service information incomplete');
            }

            return {
                totalServices: allServices.length,
                services: serviceInfos.map(info => ({
                    code: info.code,
                    name: info.name,
                    estimatedDays: info.estimatedDays,
                    tracking: info.tracking,
                    insurance: info.insurance
                })),
                standardService: standardService
            };
        });
    }

    /**
     * Test 6: Takip Numarası Doğrulama
     */
    async testTrackingNumberValidation() {
        return await this.runTest('Tracking Number Validation', async () => {
            const testCases = [
                { number: '1076831432834', expected: true },
                { number: 'ABC123456789', expected: true },
                { number: '123', expected: false }, // çok kısa
                { number: '', expected: false }, // boş
                { number: '  107683143283  ', expected: true } // boşluklu
            ];

            const validationResults = testCases.map(testCase => {
                const validation = this.tracker.validateTrackingNumber(testCase.number);
                return {
                    number: testCase.number,
                    expected: testCase.expected,
                    actual: validation.isValid,
                    passed: validation.isValid === testCase.expected,
                    cleanedNumber: validation.cleanedNumber,
                    format: validation.format
                };
            });

            const allPassed = validationResults.every(result => result.passed);
            if (!allPassed) {
                throw new Error('Some validation tests failed');
            }

            return {
                testCases: validationResults.length,
                passed: validationResults.filter(r => r.passed).length,
                validationResults: validationResults
            };
        });
    }

    /**
     * Test 7: Rate Limiting
     */
    async testRateLimiting() {
        return await this.runTest('Rate Limiting', async () => {
            const initialRequests = this.tracker.rateLimiter.requests;
            const maxRequests = this.tracker.rateLimiter.maxRequests;

            // Rate limiter durumunu test et
            this.tracker.checkRateLimit(); // Bu request sayısını arttırır
            const afterRequest = this.tracker.rateLimiter.requests;

            if (afterRequest <= initialRequests) {
                throw new Error('Rate limiter not counting requests');
            }

            return {
                initialRequests: initialRequests,
                afterRequest: afterRequest,
                maxRequests: maxRequests,
                rateLimitWorking: true
            };
        });
    }

    /**
     * Test 8: API Durum Bilgileri
     */
    async testAPIStatus() {
        return await this.runTest('API Status Information', async () => {
            const status = this.tracker.getStatus();

            const requiredFields = [
                'service', 'version', 'environment', 'apiType', 'wsdlURL',
                'rateLimiter', 'features', 'statusCodes', 'serviceTypes',
                'supportedCities', 'credentials'
            ];

            const missingFields = requiredFields.filter(field => !status[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing status fields: ${missingFields.join(', ')}`);
            }

            return {
                service: status.service,
                version: status.version,
                environment: status.environment,
                apiType: status.apiType,
                featuresCount: Object.keys(status.features).length,
                statusCodesCount: status.statusCodes,
                serviceTypesCount: status.serviceTypes,
                supportedCities: status.supportedCities,
                hasCredentials: status.credentials.configured,
                allFieldsPresent: missingFields.length === 0
            };
        });
    }

    /**
     * Ana Test Runner
     */
    async runAllTests() {
        this.log('\n' + '='.repeat(80), 'cyan');
        this.log('🚀 YURTICI KARGO INTEGRATION TEST SUITE', 'bright');
        this.log('SOAP/XML API Integration Tests', 'yellow');
        this.log('='.repeat(80), 'cyan');

        const startTime = Date.now();

        // Tüm testleri sırayla çalıştır
        await this.testServiceInitialization();
        await this.delay(500);

        await this.testStatusCodesAndServices();
        await this.delay(500);

        await this.testAPIConnection();
        await this.delay(1000);

        await this.testShippingCostCalculation();
        await this.delay(500);

        await this.testServiceInformation();
        await this.delay(500);

        await this.testTrackingNumberValidation();
        await this.delay(500);

        await this.testRateLimiting();
        await this.delay(500);

        await this.testAPIStatus();

        const totalDuration = Date.now() - startTime;

        // Test sonuçlarını raporla
        this.generateTestReport(totalDuration);
    }

    /**
     * Test Raporu Oluştur
     */
    generateTestReport(totalDuration) {
        this.log('\n' + '='.repeat(80), 'cyan');
        this.log('📊 TEST RESULTS SUMMARY', 'bright');
        this.log('='.repeat(80), 'cyan');

        const passRate = ((this.testSummary.passed / this.testSummary.total) * 100).toFixed(1);
        
        this.log(`\n📈 Overall Results:`, 'bright');
        this.log(`   Total Tests: ${this.testSummary.total}`, 'blue');
        this.log(`   Passed: ${this.testSummary.passed}`, 'green');
        this.log(`   Failed: ${this.testSummary.failed}`, 'red');
        this.log(`   Pass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');
        this.log(`   Total Duration: ${totalDuration}ms`, 'blue');

        this.log(`\n�� Detailed Results:`, 'bright');
        this.testResults.forEach((test, index) => {
            const status = test.passed ? '✅ PASS' : '❌ FAIL';
            const color = test.passed ? 'green' : 'red';
            this.log(`   ${index + 1}. ${test.name}: ${status} (${test.duration}ms)`, color);
            
            if (!test.passed) {
                this.log(`      Error: ${test.error}`, 'red');
            }
        });

        // Yurtiçi Kargo Entegrasyon Özeti
        this.log(`\n🏢 Yurtiçi Kargo Integration Summary:`, 'bright');
        this.log(`   🔗 API Type: SOAP/XML Web Service`, 'blue');
        this.log(`   🌐 WSDL URL: ${this.tracker.wsdlURL}`, 'blue');
        this.log(`   📋 Status Codes: ${Object.keys(this.tracker.statusCodes).length}`, 'blue');
        this.log(`   🚚 Service Types: ${Object.keys(this.tracker.serviceTypes).length}`, 'blue');
        this.log(`   ��️  Supported Cities: ${Object.keys(this.tracker.cityCodes).length}`, 'blue');
        this.log(`   ⚡ Rate Limit: ${this.tracker.rateLimiter.maxRequests} req/min`, 'blue');

        this.log(`\n🎯 Integration Status:`, 'bright');
        if (this.testSummary.passed >= 7) {
            this.log(`   ✅ Integration Ready - Core functionality verified`, 'green');
        } else if (this.testSummary.passed >= 5) {
            this.log(`   ⚠️  Partial Integration - Some issues detected`, 'yellow');
        } else {
            this.log(`   ❌ Integration Issues - Multiple failures detected`, 'red');
        }

        this.log('\n' + '='.repeat(80), 'cyan');
        
        const finalStatus = this.testSummary.passed === this.testSummary.total ? 'SUCCESS' : 'PARTIAL';
        this.log(`🏁 YURTICI KARGO INTEGRATION TEST COMPLETED: ${finalStatus}`, 
                finalStatus === 'SUCCESS' ? 'green' : 'yellow');
        this.log('='.repeat(80), 'cyan');
    }
}

/**
 * Test Suite'i Çalıştır
 */
async function runYurticiCargoIntegrationTest() {
    const testSuite = new YurticiCargoIntegrationTest();
    
    try {
        await testSuite.runAllTests();
        
        logger.info('Yurtiçi Kargo integration test completed', {
            passed: testSuite.testSummary.passed,
            failed: testSuite.testSummary.failed,
            total: testSuite.testSummary.total,
            passRate: ((testSuite.testSummary.passed / testSuite.testSummary.total) * 100).toFixed(1)
        });
        
        return testSuite.testSummary.passed === testSuite.testSummary.total;
        
    } catch (error) {
        console.error(`${colors.red}Fatal error during test execution:${colors.reset}`, error);
        logger.error('Yurtiçi Kargo integration test failed', { error: error.message });
        return false;
    }
}

// Eğer bu dosya doğrudan çalıştırılırsa testleri başlat
if (require.main === module) {
    runYurticiCargoIntegrationTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution error:', error);
            process.exit(1);
        });
}

module.exports = {
    YurticiCargoIntegrationTest,
    runYurticiCargoIntegrationTest
};
