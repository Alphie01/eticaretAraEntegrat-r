const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const xml2js = require('xml2js');

/**
 * Aras Kargo Takip Entegrasyonu
 * Türkiye'nin önde gelen kargo firmalarından Aras Kargo için takip sistemi
 * XML/SOAP API entegrasyonu
 */
class ArasCargoTracker {
    constructor() {
        this.baseURL = process.env.ARAS_CARGO_API_URL || 'https://kargotakip.araskargo.com.tr/araskargo.asmx';
        this.username = process.env.ARAS_CARGO_USERNAME;
        this.password = process.env.ARAS_CARGO_PASSWORD;
        this.customerCode = process.env.ARAS_CARGO_CUSTOMER_CODE;
        this.environment = process.env.ARAS_CARGO_ENVIRONMENT || 'production';
        
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 120, // 120 requests per minute
            resetInterval: 60000 // 1 minute
        };

        // Aras Kargo Durum Kodları
        this.statusCodes = {
            '01': { status: 'COLLECTED', description: 'Kargo Teslim Alındı', category: 'pickup' },
            '02': { status: 'IN_TRANSIT', description: 'Yolda', category: 'transit' },
            '03': { status: 'ARRIVED_AT_FACILITY', description: 'Merkeze Geldi', category: 'transit' },
            '04': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıkarıldı', category: 'delivery' },
            '05': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            '06': { status: 'DELIVERY_FAILED', description: 'Teslimat Başarısız', category: 'failed' },
            '07': { status: 'RETURNED_TO_SENDER', description: 'Gönderene İade', category: 'returned' },
            '08': { status: 'CANCELLED', description: 'İptal Edildi', category: 'cancelled' },
            '09': { status: 'DELAYED', description: 'Gecikme', category: 'delayed' },
            '10': { status: 'DAMAGED', description: 'Hasarlı', category: 'damaged' },
            '11': { status: 'LOST', description: 'Kayıp', category: 'lost' },
            '12': { status: 'WAITING_RECIPIENT', description: 'Alıcı Bekleniyor', category: 'waiting' },
            '13': { status: 'ADDRESS_INCORRECT', description: 'Adres Hatalı', category: 'failed' },
            '14': { status: 'RECIPIENT_NOT_FOUND', description: 'Alıcı Bulunamadı', category: 'failed' },
            '15': { status: 'PAYMENT_REQUIRED', description: 'Ödeme Bekleniyor', category: 'payment' },
            '16': { status: 'CUSTOMS_CLEARANCE', description: 'Gümrük İşlemleri', category: 'customs' },
            '17': { status: 'REDIRECTED', description: 'Yönlendirildi', category: 'redirected' },
            '18': { status: 'PARTIAL_DELIVERY', description: 'Kısmi Teslimat', category: 'partial' }
        };

        // Türkiye il kodları
        this.cityCodes = {
            'ADANA': '01', 'ADIYAMAN': '02', 'AFYONKARAHISAR': '03', 'AĞRI': '04', 'AMASYA': '05',
            'ANKARA': '06', 'ANTALYA': '07', 'ARTVIN': '08', 'AYDIN': '09', 'BALIKESIR': '10',
            'BILECIK': '11', 'BINGÖL': '12', 'BITLIS': '13', 'BOLU': '14', 'BURDUR': '15',
            'BURSA': '16', 'ÇANAKKALE': '17', 'ÇANKIRI': '18', 'ÇORUM': '19', 'DENIZLI': '20',
            'DIYARBAKIR': '21', 'EDIRNE': '22', 'ELAZIĞ': '23', 'ERZINCAN': '24', 'ERZURUM': '25',
            'ESKIŞEHIR': '26', 'GAZIANTEP': '27', 'GIRESUN': '28', 'GÜMÜŞHANE': '29', 'HAKKARI': '30',
            'HATAY': '31', 'ISPARTA': '32', 'MERSIN': '33', 'ISTANBUL': '34', 'IZMIR': '35',
            'KARS': '36', 'KASTAMONU': '37', 'KAYSERI': '38', 'KIRKLARELI': '39', 'KIRŞEHIR': '40',
            'KOCAELI': '41', 'KONYA': '42', 'KÜTAHYA': '43', 'MALATYA': '44', 'MANISA': '45',
            'KAHRAMANMARAŞ': '46', 'MARDIN': '47', 'MUĞLA': '48', 'MUŞ': '49', 'NEVŞEHIR': '50'
        };

        // XML Parser
        this.xmlParser = new xml2js.Parser({ explicitArray: false });
        this.xmlBuilder = new xml2js.Builder();
    }

    /**
     * Rate limiting kontrolü
     */
    checkRateLimit() {
        const now = Date.now();
        if (now - this.rateLimiter.lastReset > this.rateLimiter.resetInterval) {
            this.rateLimiter.requests = 0;
            this.rateLimiter.lastReset = now;
        }

        if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
            throw new Error('Aras Kargo API rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }

    /**
     * SOAP XML isteği oluşturma
     */
    createSOAPEnvelope(methodName, parameters) {
        const soapEnvelope = {
            'soap:Envelope': {
                $: {
                    'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
                    'xmlns:tem': 'http://tempuri.org/'
                },
                'soap:Header': {},
                'soap:Body': {
                    [`tem:${methodName}`]: {
                        'tem:user': this.username,
                        'tem:pass': this.password,
                        'tem:musteri_kodu': this.customerCode,
                        ...parameters
                    }
                }
            }
        };

        return this.xmlBuilder.buildObject(soapEnvelope);
    }

    /**
     * API headers oluşturma
     */
    getHeaders() {
        return {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'SOAPAction': '',
            'User-Agent': 'EticaretAraEntegrator/1.0'
        };
    }

    /**
     * API çağrısı yapma
     */
    async makeRequest(methodName, parameters = {}) {
        try {
            this.checkRateLimit();

            const soapXML = this.createSOAPEnvelope(methodName, parameters);
            const headers = this.getHeaders();

            logger.info(`Aras Kargo API request: ${methodName}`);
            
            const response = await axios({
                method: 'POST',
                url: this.baseURL,
                headers,
                data: soapXML,
                timeout: 30000
            });

            // XML response'u parse et
            const result = await this.xmlParser.parseStringPromise(response.data);
            return this.extractResponseData(result, methodName);

        } catch (error) {
            logger.error('Aras Kargo API error:', error.message);
            
            if (error.response?.status === 429) {
                throw new Error('Aras Kargo API rate limit exceeded');
            }
            
            if (error.response?.status === 401) {
                throw new Error('Aras Kargo API authentication failed');
            }

            throw new Error(`Aras Kargo API error: ${error.message}`);
        }
    }

    /**
     * SOAP response'undan veriyi çıkarma
     */
    extractResponseData(xmlResponse, methodName) {
        try {
            const responseKey = `${methodName}Response`;
            const resultKey = `${methodName}Result`;
            
            const soapBody = xmlResponse['soap:Envelope']['soap:Body'];
            const methodResponse = soapBody[responseKey] || soapBody[`tem:${responseKey}`];
            
            if (methodResponse && methodResponse[resultKey]) {
                const resultData = methodResponse[resultKey];
                
                // XML string ise parse et
                if (typeof resultData === 'string' && resultData.startsWith('<')) {
                    return this.xmlParser.parseStringPromise(resultData);
                }
                
                return resultData;
            }
            
            return xmlResponse;
        } catch (error) {
            logger.error('Aras Kargo response parsing error:', error.message);
            throw new Error('Invalid response format from Aras Kargo API');
        }
    }

    /**
     * Kargo takip numarası ile sorgulama
     */
    async trackByNumber(trackingNumber) {
        try {
            const result = await this.makeRequest('KargoBilgi', {
                'tem:kargo_no': trackingNumber
            });

            return this.normalizeTrackingResponse(result, trackingNumber);
        } catch (error) {
            logger.error(`Aras Kargo tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Birden fazla kargo takibi
     */
    async trackMultiple(trackingNumbers) {
        try {
            const results = [];
            
            // Aras Kargo API'si bulk tracking desteklemediği için tek tek sorgula
            for (const trackingNumber of trackingNumbers.slice(0, 50)) { // Max 50 adet
                try {
                    const result = await this.trackByNumber(trackingNumber);
                    results.push(result);
                } catch (error) {
                    logger.warn(`Failed to track ${trackingNumber}:`, error.message);
                    results.push(null);
                }
                
                // Rate limiting için küçük bir gecikme
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return results;
        } catch (error) {
            logger.error('Aras Kargo bulk tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Tarih aralığında kargo listesi
     */
    async getCargosByDateRange(startDate, endDate) {
        try {
            const result = await this.makeRequest('KargoHareket', {
                'tem:tarih1': startDate, // Format: DD-MM-YYYY
                'tem:tarih2': endDate
            });

            return this.normalizeCargoListResponse(result);
        } catch (error) {
            logger.error('Aras Kargo date range query error:', error.message);
            throw error;
        }
    }

    /**
     * Teslim edilmiş kargolar
     */
    async getDeliveredCargos(date) {
        try {
            const result = await this.makeRequest('KargoTeslimTarihi', {
                'tem:tarih': date // Format: DD-MM-YYYY
            });

            return this.normalizeCargoListResponse(result);
        } catch (error) {
            logger.error('Aras Kargo delivered cargos error:', error.message);
            throw error;
        }
    }

    /**
     * Henüz teslim edilmemiş kargolar
     */
    async getUndeliveredCargos() {
        try {
            const result = await this.makeRequest('KargoTeslimEdilmemis');
            return this.normalizeCargoListResponse(result);
        } catch (error) {
            logger.error('Aras Kargo undelivered cargos error:', error.message);
            throw error;
        }
    }

    /**
     * Şube listesi
     */
    async getBranches() {
        try {
            const result = await this.makeRequest('TumSubeler');
            return this.normalizeBranchesResponse(result);
        } catch (error) {
            logger.error('Aras Kargo branches error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo hareket detayları
     */
    async getCargoMovements(trackingNumber) {
        try {
            const result = await this.makeRequest('KargoHareketBilgisi', {
                'tem:kargo_no': trackingNumber
            });

            return this.normalizeMovementResponse(result);
        } catch (error) {
            logger.error(`Aras Kargo movement error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Kargo ücret hesaplama (tahmin)
     */
    async calculateShippingCost(params) {
        try {
            // Aras Kargo API'sinde direkt ücret hesaplama yok, 
            // genel fiyat tablosu ile tahmin yapabiliriz
            const baseCost = this.estimateBaseCost(params);
            
            return {
                success: true,
                estimatedCost: baseCost,
                currency: 'TRY',
                serviceType: params.serviceType || 'standard',
                weight: params.weight,
                fromCity: params.fromCity,
                toCity: params.toCity,
                note: 'Bu tahmine dayalı bir fiyattır. Kesin fiyat için Aras Kargo ile iletişime geçiniz.'
            };
        } catch (error) {
            logger.error('Aras Kargo pricing estimation error:', error.message);
            throw error;
        }
    }

    /**
     * Basit ücret tahmini
     */
    estimateBaseCost(params) {
        const { weight = 1, fromCity = '', toCity = '' } = params;
        
        // Basit fiyat hesaplama modeli
        let baseCost = 15; // Minimum ücret
        
        // Ağırlık bazlı ücret
        if (weight > 1) {
            baseCost += (weight - 1) * 5;
        }
        
        // Şehirlerarası mesafe bazlı ek ücret
        const isInterCity = fromCity.toUpperCase() !== toCity.toUpperCase();
        if (isInterCity) {
            baseCost += 10;
        }
        
        // Büyük şehirler arası ek ücret
        const majorCities = ['ISTANBUL', 'ANKARA', 'IZMIR', 'ANTALYA', 'BURSA'];
        const isMajorRoute = majorCities.includes(fromCity.toUpperCase()) && 
                           majorCities.includes(toCity.toUpperCase());
        
        if (isMajorRoute) {
            baseCost += 5;
        }

        return Math.round(baseCost * 100) / 100; // 2 decimal places
    }

    /**
     * Tracking yanıtını normalize et
     */
    normalizeTrackingResponse(rawData, trackingNumber) {
        if (!rawData || !rawData.Table || rawData.Table.length === 0) {
            return null;
        }

        const cargoData = Array.isArray(rawData.Table) ? rawData.Table[0] : rawData.Table;
        
        // Durum kodu belirleme (örnek veri yapısına göre)
        const statusCode = cargoData.DURUM_KODU || '02';
        const statusInfo = this.statusCodes[statusCode] || {
            status: 'IN_TRANSIT',
            description: cargoData.DURUM_ACIKLAMA || 'Yolda',
            category: 'transit'
        };

        return {
            trackingNumber: trackingNumber,
            referenceNumber: cargoData.REFERANS_NO || null,
            status: statusInfo.status,
            statusDescription: statusInfo.description,
            statusCategory: statusInfo.category,
            currentLocation: {
                city: cargoData.BULUNDUGU_YER || cargoData.SON_KONUM,
                branch: cargoData.SUBE_ADI,
                facility: cargoData.TESIS_ADI
            },
            sender: {
                name: cargoData.GONDEREN_ADI,
                company: cargoData.GONDEREN_FIRMA,
                city: cargoData.GONDEREN_IL,
                phone: cargoData.GONDEREN_TEL
            },
            recipient: {
                name: cargoData.ALICI_ADI,
                company: cargoData.ALICI_FIRMA,
                city: cargoData.ALICI_IL,
                address: cargoData.ALICI_ADRES,
                phone: cargoData.ALICI_TEL
            },
            shipmentInfo: {
                weight: parseFloat(cargoData.AGIRLIK) || 0,
                pieces: parseInt(cargoData.ADET) || 1,
                serviceType: cargoData.SERVIS_TIPI || 'standard',
                shipmentDate: cargoData.SEVK_TARIHI,
                estimatedDelivery: cargoData.TAHMINI_TESLIMAT,
                actualDelivery: cargoData.TESLIMAT_TARIHI
            },
            pricing: {
                totalCost: parseFloat(cargoData.UCRET) || 0,
                codAmount: parseFloat(cargoData.KAPIDA_ODEME) || 0,
                currency: 'TRY'
            },
            tracking: {
                lastUpdated: cargoData.SON_GUNCELLEME || new Date().toISOString(),
                trackingUrl: `https://kargotakip.araskargo.com.tr/?ref=${trackingNumber}`,
                isDelivered: statusInfo.status === 'DELIVERED',
                isInTransit: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_FACILITY'].includes(statusInfo.status),
                hasIssue: ['DELIVERY_FAILED', 'DAMAGED', 'LOST', 'CANCELLED'].includes(statusInfo.status)
            }
        };
    }

    /**
     * Kargo listesi yanıtını normalize et
     */
    normalizeCargoListResponse(rawData) {
        if (!rawData || !rawData.Table) {
            return [];
        }

        const cargos = Array.isArray(rawData.Table) ? rawData.Table : [rawData.Table];
        
        return cargos.map(cargo => ({
            trackingNumber: cargo.KARGO_NO,
            referenceNumber: cargo.REFERANS_NO,
            status: cargo.DURUM,
            statusDescription: cargo.DURUM_ACIKLAMA,
            recipientName: cargo.ALICI_ADI,
            recipientCity: cargo.ALICI_IL,
            shipmentDate: cargo.SEVK_TARIHI,
            deliveryDate: cargo.TESLIMAT_TARIHI,
            weight: parseFloat(cargo.AGIRLIK) || 0,
            pieces: parseInt(cargo.ADET) || 1,
            totalCost: parseFloat(cargo.UCRET) || 0
        }));
    }

    /**
     * Şube listesi yanıtını normalize et
     */
    normalizeBranchesResponse(rawData) {
        if (!rawData || !rawData.Table) {
            return [];
        }

        const branches = Array.isArray(rawData.Table) ? rawData.Table : [rawData.Table];
        
        return branches.map(branch => ({
            branchCode: branch.SUBE_KODU,
            branchName: branch.SUBE_ADI,
            city: branch.IL,
            district: branch.ILCE,
            address: branch.ADRES,
            phone: branch.TELEFON,
            workingHours: branch.CALISMA_SAATLERI,
            coordinates: {
                latitude: parseFloat(branch.ENLEM) || null,
                longitude: parseFloat(branch.BOYLAM) || null
            }
        }));
    }

    /**
     * Hareket detayları yanıtını normalize et
     */
    normalizeMovementResponse(rawData) {
        if (!rawData || !rawData.Table) {
            return [];
        }

        const movements = Array.isArray(rawData.Table) ? rawData.Table : [rawData.Table];
        
        return movements.map(movement => ({
            date: movement.TARIH,
            time: movement.SAAT,
            location: movement.KONUM,
            description: movement.ACIKLAMA,
            statusCode: movement.DURUM_KODU,
            facility: movement.TESIS,
            operationCode: movement.ISLEM_KODU
        }));
    }

    /**
     * Durum kategorisine göre filtreleme
     */
    filterByStatusCategory(trackingResults, category) {
        return trackingResults.filter(result => 
            result && result.statusCategory === category
        );
    }

    /**
     * Teslimat durumu kontrolü
     */
    isDelivered(status) {
        return status === 'DELIVERED';
    }

    /**
     * Sorun durumu kontrolü
     */
    hasIssue(status) {
        return ['DELIVERY_FAILED', 'DAMAGED', 'LOST', 'CANCELLED'].includes(status);
    }

    /**
     * Test bağlantısı
     */
    async testConnection() {
        try {
            // Basit bir API çağrısı ile bağlantıyı test et
            const result = await this.makeRequest('KargoTeslimEdilmemis');
            logger.info('Aras Kargo API connection test successful');
            return { success: true, message: 'Connection successful', statusCodesCount: Object.keys(this.statusCodes).length };
        } catch (error) {
            logger.error('Aras Kargo API connection test failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * API durumu
     */
    getStatus() {
        return {
            service: 'Aras Kargo Tracker',
            version: '1.0.0',
            environment: this.environment,
            rateLimiter: {
                requests: this.rateLimiter.requests,
                maxRequests: this.rateLimiter.maxRequests,
                resetTime: new Date(this.rateLimiter.lastReset + this.rateLimiter.resetInterval)
            },
            endpoints: {
                track: `${this.baseURL}/KargoBilgi`,
                dateRange: `${this.baseURL}/KargoHareket`,
                delivered: `${this.baseURL}/KargoTeslimTarihi`,
                undelivered: `${this.baseURL}/KargoTeslimEdilmemis`,
                branches: `${this.baseURL}/TumSubeler`
            },
            statusCodes: Object.keys(this.statusCodes).length,
            supportedCities: Object.keys(this.cityCodes).length
        };
    }
}

module.exports = ArasCargoTracker; 