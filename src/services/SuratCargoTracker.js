const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Sürat Kargo Takip Entegrasyonu
 * Türkiye'nin önde gelen kargo firmalarından Sürat Kargo için takip sistemi
 */
class SuratCargoTracker {
    constructor() {
        this.baseURL = process.env.SURAT_CARGO_API_URL || 'https://ws.suratkargo.com.tr';
        this.username = process.env.SURAT_CARGO_USERNAME;
        this.password = process.env.SURAT_CARGO_PASSWORD;
        this.customerCode = process.env.SURAT_CARGO_CUSTOMER_CODE;
        this.language = process.env.SURAT_CARGO_LANGUAGE || 'TR';
        
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 120, // 120 requests per minute
            resetInterval: 60000 // 1 minute
        };

        // Sürat Kargo Durum Kodları
        this.statusCodes = {
            'CRT': { status: 'CREATED', description: 'Gönderi Oluşturuldu', category: 'created' },
            'TES': { status: 'COLLECTED', description: 'Teslim Alındı', category: 'pickup' },
            'ACK': { status: 'ACKNOWLEDGED', description: 'Kayıt Alındı', category: 'processing' },
            'SRT': { status: 'SORTED', description: 'Ayrıma Alındı', category: 'transit' },
            'TRN': { status: 'IN_TRANSIT', description: 'Yolda', category: 'transit' },
            'ARR': { status: 'ARRIVED', description: 'Varış Noktasında', category: 'transit' },
            'OFD': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıkarıldı', category: 'delivery' },
            'DEL': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            'RTN': { status: 'RETURNED', description: 'İade Edildi', category: 'returned' },
            'CNL': { status: 'CANCELLED', description: 'İptal Edildi', category: 'cancelled' },
            'FAI': { status: 'DELIVERY_FAILED', description: 'Teslimat Başarısız', category: 'failed' },
            'DLY': { status: 'DELAYED', description: 'Gecikme', category: 'delayed' },
            'DMG': { status: 'DAMAGED', description: 'Hasarlı', category: 'damaged' },
            'LST': { status: 'LOST', description: 'Kayıp', category: 'lost' },
            'HLD': { status: 'ON_HOLD', description: 'Beklemede', category: 'hold' },
            'WAI': { status: 'WAITING', description: 'Alıcı Bekleniyor', category: 'waiting' }
        };

        // Türkiye şehir kodları
        this.cityCodes = {
            'ADANA': '01', 'ADIYAMAN': '02', 'AFYONKARAHISAR': '03', 'AĞRI': '04', 'AMASYA': '05',
            'ANKARA': '06', 'ANTALYA': '07', 'ARTVIN': '08', 'AYDIN': '09', 'BALIKESIR': '10',
            'BILECIK': '11', 'BINGÖL': '12', 'BITLIS': '13', 'BOLU': '14', 'BURDUR': '15',
            'BURSA': '16', 'ÇANAKKALE': '17', 'ÇANKIRI': '18', 'ÇORUM': '19', 'DENIZLI': '20',
            'DIYARBAKIR': '21', 'EDIRNE': '22', 'ELAZIĞ': '23', 'ERZINCAN': '24', 'ERZURUM': '25',
            'ESKIŞEHIR': '26', 'GAZIANTEP': '27', 'GIRESUN': '28', 'GÜMÜŞHANE': '29', 'HAKKARI': '30',
            'HATAY': '31', 'ISPARTA': '32', 'MERSIN': '33', 'ISTANBUL': '34', 'IZMIR': '35',
            'KARS': '36', 'KASTAMONU': '37', 'KAYSERI': '38', 'KIRKLARELI': '39', 'KIRSEHIR': '40',
            'KOCAELI': '41', 'KONYA': '42', 'KÜTAHYA': '43', 'MALATYA': '44', 'MANISA': '45',
            'KAHRAMANMARAS': '46', 'MARDIN': '47', 'MUĞLA': '48', 'MUŞ': '49', 'NEVŞEHIR': '50',
            'NIĞDE': '51', 'ORDU': '52', 'RIZE': '53', 'SAKARYA': '54', 'SAMSUN': '55',
            'SIIRT': '56', 'SINOP': '57', 'SIVAS': '58', 'TEKIRDAĞ': '59', 'TOKAT': '60',
            'TRABZON': '61', 'TUNCELI': '62', 'ŞANLIURFA': '63', 'UŞAK': '64', 'VAN': '65',
            'YOZGAT': '66', 'ZONGULDAK': '67', 'AKSARAY': '68', 'BAYBURT': '69', 'KARAMAN': '70',
            'KIRIKKALE': '71', 'BATMAN': '72', 'ŞIRNAK': '73', 'BARTIN': '74', 'ARDAHAN': '75',
            'IĞDIR': '76', 'YALOVA': '77', 'KARABÜK': '78', 'KİLİS': '79', 'OSMANIYE': '80',
            'DÜZCE': '81'
        };

        // Sürat Kargo servis tipleri
        this.serviceTypes = {
            'STANDARD': 'Standart Kargo',
            'EXPRESS': 'Sürat Express',
            'NEXT_DAY': 'Ertesi Gün',
            'SAME_DAY': 'Aynı Gün',
            'ECONOMY': 'Ekonomik',
            'CARGO_PLUS': 'Sürat Plus',
            'INTERNATIONAL': 'Uluslararası',
            'COLLECTION': 'Tahsilatlı'
        };

        this.httpClient = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'SuratCargoTracker/1.0'
            }
        });
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
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }

    /**
     * API isteği gönder
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        this.checkRateLimit();

        try {
            const config = {
                method: method.toLowerCase(),
                url: endpoint,
                data: data,
                auth: {
                    username: this.username,
                    password: this.password
                }
            };

            logger.info(`Sürat Kargo API request: ${method} ${endpoint}`);
            const response = await this.httpClient.request(config);
            
            return response.data;
        } catch (error) {
            logger.error(`Sürat Kargo API error: ${error.message}`);
            
            if (error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || error.message;
                
                if (statusCode === 401) {
                    throw new Error('Authentication failed. Please check credentials.');
                } else if (statusCode === 404) {
                    throw new Error('Shipment not found.');
                } else if (statusCode === 429) {
                    throw new Error('Rate limit exceeded.');
                } else {
                    throw new Error(`API Error (${statusCode}): ${errorMessage}`);
                }
            }
            
            throw error;
        }
    }

    /**
     * Takip numarası doğrulaması
     */
    validateTrackingNumber(trackingNumber) {
        if (!trackingNumber) {
            return {
                isValid: false,
                message: 'Takip numarası gerekli',
                cleanedNumber: null,
                format: null
            };
        }

        // Boşlukları ve özel karakterleri temizle
        const cleaned = trackingNumber.toString().trim().replace(/\s+/g, '');
        
        // Sürat Kargo takip numarası formatları
        const formats = [
            { name: 'Standard', pattern: /^[0-9]{10,15}$/ },
            { name: 'Barcode', pattern: /^[0-9]{13}$/ },
            { name: 'Reference', pattern: /^[A-Z]{2,3}[0-9]{8,12}$/ }
        ];

        // Format kontrolü
        for (const format of formats) {
            if (format.pattern.test(cleaned)) {
                return {
                    isValid: true,
                    message: 'Geçerli takip numarası',
                    cleanedNumber: cleaned,
                    format: format.name
                };
            }
        }

        return {
            isValid: false,
            message: 'Geçersiz takip numarası formatı',
            cleanedNumber: cleaned,
            format: 'Unknown'
        };
    }

    /**
     * Kargo takibi
     */
    async trackShipment(trackingNumber) {
        try {
            const validation = this.validateTrackingNumber(trackingNumber);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            const endpoint = `/api/v1/tracking/${validation.cleanedNumber}`;
            const result = await this.makeRequest(endpoint);

            return this.normalizeTrackingResponse(result, validation.cleanedNumber);
        } catch (error) {
            logger.error(`Sürat Kargo tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Detaylı kargo takibi (hareket geçmişi ile)
     */
    async trackShipmentDetail(trackingNumber) {
        try {
            const validation = this.validateTrackingNumber(trackingNumber);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            const endpoint = `/api/v1/tracking/${validation.cleanedNumber}/detail`;
            const result = await this.makeRequest(endpoint);

            return this.normalizeDetailResponse(result, validation.cleanedNumber);
        } catch (error) {
            logger.error(`Sürat Kargo detail tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Çoklu kargo takibi
     */
    async trackMultiple(trackingNumbers) {
        if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
            throw new Error('Tracking numbers array is required');
        }

        if (trackingNumbers.length > 50) {
            throw new Error('Maximum 50 tracking numbers allowed');
        }

        try {
            const validNumbers = [];
            const invalidNumbers = [];

            for (const number of trackingNumbers) {
                const validation = this.validateTrackingNumber(number);
                if (validation.isValid) {
                    validNumbers.push(validation.cleanedNumber);
                } else {
                    invalidNumbers.push({
                        original: number,
                        error: validation.message
                    });
                }
            }

            if (validNumbers.length === 0) {
                throw new Error('No valid tracking numbers found');
            }

            const endpoint = '/api/v1/tracking/bulk';
            const data = {
                trackingNumbers: validNumbers,
                customerCode: this.customerCode
            };

            const result = await this.makeRequest(endpoint, 'POST', data);

            return {
                success: true,
                data: {
                    results: result.trackings || [],
                    processed: validNumbers.length,
                    total: trackingNumbers.length,
                    invalid: invalidNumbers
                }
            };
        } catch (error) {
            logger.error('Sürat Kargo bulk tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo oluşturma
     */
    async createShipment(shipmentData) {
        try {
            this.validateShipmentData(shipmentData);

            const endpoint = '/api/v1/shipments/create';
            const normalizedData = this.normalizeShipmentData(shipmentData);

            const result = await this.makeRequest(endpoint, 'POST', normalizedData);

            return this.processShipmentResult(result);
        } catch (error) {
            logger.error('Sürat Kargo shipment creation error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo iptal etme
     */
    async cancelShipment(trackingNumber, reason = 'Customer request') {
        try {
            const validation = this.validateTrackingNumber(trackingNumber);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            const endpoint = `/api/v1/shipments/${validation.cleanedNumber}/cancel`;
            const data = {
                reason: reason,
                customerCode: this.customerCode
            };

            const result = await this.makeRequest(endpoint, 'POST', data);

            return {
                success: true,
                message: 'Gönderi başarıyla iptal edildi',
                data: {
                    trackingNumber: validation.cleanedNumber,
                    cancelledAt: new Date().toISOString(),
                    reason: reason,
                    status: result.status || 'CANCELLED'
                }
            };
        } catch (error) {
            logger.error(`Sürat Kargo cancellation error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Kargo ücreti hesaplama
     */
    async calculateShippingCost(params) {
        try {
            const endpoint = '/api/v1/pricing/calculate';
            const data = {
                fromCity: params.fromCity,
                toCity: params.toCity,
                weight: params.weight || 1,
                desi: params.desi || 1,
                serviceType: params.serviceType || 'STANDARD',
                paymentType: params.paymentType || 'SENDER',
                collectionAmount: params.collectionAmount || 0
            };

            const result = await this.makeRequest(endpoint, 'POST', data);

            // Mock fiyat hesaplama (gerçek API yanıtı yoksa)
            if (!result.price) {
                return this.calculateMockPrice(data);
            }

            return {
                success: true,
                estimatedCost: result.price,
                currency: result.currency || 'TRY',
                serviceType: data.serviceType,
                breakdown: {
                    baseCost: result.baseCost || result.price * 0.8,
                    weightCost: result.weightCost || result.price * 0.15,
                    distanceCost: result.distanceCost || result.price * 0.05,
                    taxes: result.taxes || result.price * 0.18
                },
                estimatedDeliveryDays: this.getEstimatedDeliveryDays(data.serviceType),
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
        } catch (error) {
            logger.error('Sürat Kargo pricing error:', error.message);
            throw error;
        }
    }

    /**
     * Mock fiyat hesaplama
     */
    calculateMockPrice(data) {
        const baseCost = 12; // TRY
        const weightMultiplier = Math.max(data.weight, data.desi) * 2;
        const serviceMultipliers = {
            'STANDARD': 1.0,
            'EXPRESS': 1.5,
            'NEXT_DAY': 2.0,
            'SAME_DAY': 3.0,
            'ECONOMY': 0.8,
            'INTERNATIONAL': 4.0
        };

        const serviceMultiplier = serviceMultipliers[data.serviceType] || 1.0;
        const estimatedCost = (baseCost + weightMultiplier) * serviceMultiplier;
        const taxes = estimatedCost * 0.18;

        return {
            success: true,
            estimatedCost: Math.round((estimatedCost + taxes) * 100) / 100,
            currency: 'TRY',
            serviceType: data.serviceType,
            breakdown: {
                baseCost: baseCost,
                weightCost: weightMultiplier,
                serviceMultiplier: serviceMultiplier,
                taxes: Math.round(taxes * 100) / 100
            },
            estimatedDeliveryDays: this.getEstimatedDeliveryDays(data.serviceType),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }

    /**
     * Teslimat süresi tahmini
     */
    getEstimatedDeliveryDays(serviceType) {
        const deliveryTimes = {
            'STANDARD': '2-3 gün',
            'EXPRESS': '1-2 gün',
            'NEXT_DAY': '1 gün',
            'SAME_DAY': 'Aynı gün',
            'ECONOMY': '3-5 gün',
            'CARGO_PLUS': '1-2 gün',
            'INTERNATIONAL': '5-10 gün',
            'COLLECTION': '2-3 gün'
        };

        return deliveryTimes[serviceType] || '2-3 gün';
    }

    /**
     * Gönderi verilerini doğrula
     */
    validateShipmentData(data) {
        const required = ['senderName', 'senderAddress', 'receiverName', 'receiverAddress', 'receiverPhone'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (data.receiverPhone && !/^(\+90|0)?[5][0-9]{9}$/.test(data.receiverPhone.replace(/\s/g, ''))) {
            throw new Error('Invalid phone number format');
        }

        return true;
    }

    /**
     * Gönderi verilerini normalize et
     */
    normalizeShipmentData(data) {
        return {
            customerCode: this.customerCode,
            sender: {
                name: data.senderName,
                address: data.senderAddress,
                city: data.senderCity,
                district: data.senderDistrict,
                phone: data.senderPhone,
                email: data.senderEmail
            },
            receiver: {
                name: data.receiverName,
                address: data.receiverAddress,
                city: data.receiverCity,
                district: data.receiverDistrict,
                phone: data.receiverPhone,
                email: data.receiverEmail
            },
            shipment: {
                description: data.description || 'Genel Kargo',
                weight: data.weight || 1,
                desi: data.desi || 1,
                pieces: data.pieces || 1,
                serviceType: data.serviceType || 'STANDARD',
                paymentType: data.paymentType || 'SENDER',
                collectionAmount: data.collectionAmount || 0,
                insurance: data.insurance || false,
                insuranceAmount: data.insuranceAmount || 0
            },
            reference: {
                customerRef: data.customerReference,
                description: data.referenceDescription
            }
        };
    }

    /**
     * Gönderi sonucunu işle
     */
    processShipmentResult(result) {
        if (!result.success) {
            throw new Error(`Shipment creation failed: ${result.message || 'Unknown error'}`);
        }

        return {
            success: true,
            message: 'Gönderi başarıyla oluşturuldu',
            data: {
                trackingNumber: result.trackingNumber,
                referenceNumber: result.referenceNumber,
                barcode: result.barcode,
                estimatedDelivery: result.estimatedDelivery,
                cost: result.cost,
                createdAt: new Date().toISOString(),
                tracking: {
                    url: `https://www.suratkargo.com.tr/kargo-takip?code=${result.trackingNumber}`,
                    trackingNumber: result.trackingNumber
                }
            }
        };
    }

    /**
     * Takip yanıtını normalize et
     */
    normalizeTrackingResponse(data, trackingNumber) {
        if (!data || data.error) {
            throw new Error(data?.message || 'Tracking data not found');
        }

        const statusInfo = this.statusCodes[data.statusCode] || {
            status: 'UNKNOWN',
            description: data.statusDescription || 'Bilinmeyen durum',
            category: 'unknown'
        };

        return {
            success: true,
            data: {
                trackingNumber: trackingNumber,
                status: statusInfo.status,
                statusCode: data.statusCode,
                statusDescription: statusInfo.description,
                category: statusInfo.category,
                lastUpdate: data.lastUpdate || new Date().toISOString(),
                senderInfo: data.sender || {},
                receiverInfo: data.receiver || {},
                shipmentInfo: {
                    weight: data.weight,
                    desi: data.desi,
                    pieces: data.pieces || 1,
                    serviceType: data.serviceType
                },
                estimatedDelivery: data.estimatedDelivery,
                actualDelivery: data.actualDelivery
            }
        };
    }

    /**
     * Detaylı takip yanıtını normalize et
     */
    normalizeDetailResponse(data, trackingNumber) {
        const normalized = this.normalizeTrackingResponse(data, trackingNumber);
        
        if (data.movements && Array.isArray(data.movements)) {
            normalized.data.movements = data.movements.map(movement => ({
                date: movement.date,
                time: movement.time,
                location: movement.location,
                status: movement.status,
                description: movement.description,
                facilityCode: movement.facilityCode,
                facilityName: movement.facilityName
            }));
        }

        return normalized;
    }

    /**
     * Servis bilgileri
     */
    getServiceInfo(serviceType) {
        return {
            code: serviceType,
            name: this.serviceTypes[serviceType] || 'Bilinmeyen Servis',
            description: `Sürat Kargo ${this.serviceTypes[serviceType] || serviceType} servisi`,
            estimatedDays: this.getEstimatedDeliveryDays(serviceType),
            tracking: true,
            insurance: true,
            cod: serviceType === 'COLLECTION'
        };
    }

    /**
     * API durum bilgileri
     */
    async getAPIStatus() {
        try {
            const endpoint = '/api/v1/status';
            const result = await this.makeRequest(endpoint);
            
            return {
                success: true,
                service: 'Sürat Kargo API',
                version: '1.0',
                status: result.status || 'active',
                timestamp: new Date().toISOString(),
                credentials: {
                    configured: !!(this.username && this.password),
                    customer: this.customerCode
                },
                rateLimits: {
                    current: this.rateLimiter.requests,
                    max: this.rateLimiter.maxRequests,
                    resetTime: new Date(this.rateLimiter.lastReset + this.rateLimiter.resetInterval)
                },
                features: {
                    createShipment: true,
                    trackShipment: true,
                    trackShipmentDetail: true,
                    cancelShipment: true,
                    bulkTracking: true,
                    priceCalculation: true
                },
                supportedServices: Object.keys(this.serviceTypes),
                supportedCities: Object.keys(this.cityCodes).length
            };
        } catch (error) {
            return {
                success: false,
                service: 'Sürat Kargo API',
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Bağlantı testi
     */
    async testConnection() {
        try {
            const status = await this.getAPIStatus();
            
            return {
                success: status.success,
                message: status.success ? 'Connection successful' : 'Connection failed',
                details: status
            };
        } catch (error) {
            return {
                success: false,
                message: 'Connection test failed',
                error: error.message
            };
        }
    }
}

module.exports = SuratCargoTracker; 