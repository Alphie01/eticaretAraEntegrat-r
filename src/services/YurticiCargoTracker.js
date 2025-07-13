const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const soap = require('soap');

/**
 * Yurtiçi Kargo Takip Entegrasyonu
 * Türkiye'nin önde gelen kargo firmalarından Yurtiçi Kargo için SOAP API entegrasyonu
 * SOAP/XML API entegrasyonu
 */
class YurticiCargoTracker {
    constructor() {
        this.baseURL = process.env.YURTICI_CARGO_API_URL || 'http://webservices.yurticikargo.com:8080';
        this.wsdlURL = `${this.baseURL}/KOPSWebServices/ShippingOrderDispatcherServices?wsdl`;
        this.wsUserName = process.env.YURTICI_CARGO_USERNAME;
        this.wsPassword = process.env.YURTICI_CARGO_PASSWORD;
        this.userLanguage = process.env.YURTICI_CARGO_LANGUAGE || 'TR';
        this.environment = process.env.YURTICI_CARGO_ENVIRONMENT || 'production';
        
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 100, // 100 requests per minute
            resetInterval: 60000 // 1 minute
        };

        // Yurtiçi Kargo Durum Kodları
        this.statusCodes = {
            'NOP': { status: 'NOT_PROCESSED', description: 'Kargo İşlem Görmemiş', category: 'processing' },
            'CLT': { status: 'COLLECTED', description: 'Kargo Alındı', category: 'pickup' },
            'TRN': { status: 'IN_TRANSIT', description: 'Transfer Merkezi', category: 'transit' },
            'BRN': { status: 'AT_BRANCH', description: 'Şubede', category: 'transit' },
            'OFD': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıktı', category: 'delivery' },
            'DLV': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            'ATP': { status: 'DELIVERY_ATTEMPTED', description: 'Teslimat Denendi', category: 'attempted' },
            'RTN': { status: 'RETURNED_TO_SENDER', description: 'İade', category: 'returned' },
            'CNL': { status: 'CANCELLED', description: 'İptal Edildi', category: 'cancelled' },
            'EXC': { status: 'EXCEPTION', description: 'İstisna Durumu', category: 'exception' },
            'HLD': { status: 'ON_HOLD', description: 'Beklemede', category: 'hold' },
            'DMG': { status: 'DAMAGED', description: 'Hasarlı', category: 'damaged' },
            'LST': { status: 'LOST', description: 'Kayıp', category: 'lost' },
            'WRH': { status: 'AT_WAREHOUSE', description: 'Depoda', category: 'warehouse' },
            'CUS': { status: 'CUSTOMS_CLEARANCE', description: 'Gümrük İşlemleri', category: 'customs' },
            'AWC': { status: 'AWAITING_COLLECTION', description: 'Alım Bekliyor', category: 'awaiting' }
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
            'KAHRAMANMARAS': '46', 'MARDIN': '47', 'MUĞLA': '48', 'MUŞ': '49', 'NEVŞEHIR': '50'
        };

        // Yurtiçi Kargo servis tipleri
        this.serviceTypes = {
            'STANDARD': 'Yurtiçi Standart',
            'EXPRESS': 'Yurtiçi Express',
            'NEXT_DAY': 'Ertesi Gün',
            'SAME_DAY': 'Aynı Gün',
            'CARGO_PLUS': 'Yurtiçi Plus',
            'INTERNATIONAL': 'Uluslararası',
            'COLLECTION': 'Tahsilatlı'
        };

        this.soapClient = null;
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
            throw new Error('Yurtiçi Kargo API rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }

    /**
     * SOAP Client başlatma
     */
    async initSoapClient() {
        if (this.soapClient) {
            return this.soapClient;
        }

        try {
            this.soapClient = await soap.createClientAsync(this.wsdlURL, {
                timeout: 30000,
                connection_timeout: 30000
            });
            
            logger.info('Yurtiçi Kargo SOAP client initialized');
            return this.soapClient;
        } catch (error) {
            logger.error('Failed to initialize Yurtiçi Kargo SOAP client:', error.message);
            throw new Error(`SOAP client initialization failed: ${error.message}`);
        }
    }

    /**
     * Benzersiz key oluşturma
     */
    generateKey(length = 15) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Kargo oluşturma
     */
    async createShipment(shipmentData) {
        try {
            this.checkRateLimit();
            
            if (!this.wsUserName || !this.wsPassword) {
                throw new Error('Yurtiçi Kargo credentials not configured');
            }

            const client = await this.initSoapClient();

            // Zorunlu parametreleri kontrol et
            const requiredFields = ['receiverCustName', 'receiverAddress', 'receiverPhone1'];
            for (const field of requiredFields) {
                if (!shipmentData[field]) {
                    throw new Error(`Required field missing: ${field}`);
                }
            }

            // Benzersiz key'ler oluştur
            const cargoKey = shipmentData.cargoKey || this.generateKey(15);
            const invoiceKey = shipmentData.invoiceKey || this.generateKey(15);

            const soapArgs = {
                wsUserName: this.wsUserName,
                wsPassword: this.wsPassword,
                userLanguage: this.userLanguage,
                // Kargo bilgileri
                cargoKey: cargoKey,
                invoiceKey: invoiceKey,
                receiverCustName: shipmentData.receiverCustName,
                receiverAddress: shipmentData.receiverAddress,
                cityName: shipmentData.cityName || '',
                townName: shipmentData.townName || '',
                receiverPhone1: shipmentData.receiverPhone1,
                receiverPhone2: shipmentData.receiverPhone2 || '',
                receiverPhone3: shipmentData.receiverPhone3 || '',
                emailAddress: shipmentData.emailAddress || '',
                taxOfficeId: shipmentData.taxOfficeId || '',
                taxNumber: shipmentData.taxNumber || '',
                taxOfficeName: shipmentData.taxOfficeName || '',
                desi: shipmentData.desi || '1',
                kg: shipmentData.kg || '1',
                cargoCount: shipmentData.cargoCount || '1',
                waybillNo: shipmentData.waybillNo || '',
                specialField1: shipmentData.specialField1 || '',
                specialField2: shipmentData.specialField2 || '',
                specialField3: shipmentData.specialField3 || '',
                description: shipmentData.description || '',
                orgGeoCode: shipmentData.orgGeoCode || '',
                privilegeOrder: shipmentData.privilegeOrder || '',
                custProdId: shipmentData.custProdId || '',
                orgReceiverCustId: shipmentData.orgReceiverCustId || ''
            };

            logger.info(`Yurtiçi Kargo createShipment request for: ${cargoKey}`);

            const [result] = await client.createShipmentAsync(soapArgs);
            
            return this.processShipmentResult(result, cargoKey, invoiceKey);

        } catch (error) {
            logger.error('Yurtiçi Kargo createShipment error:', error.message);
            throw new Error(`Shipment creation failed: ${error.message}`);
        }
    }

    /**
     * Kargo sorgulama
     */
    async queryShipment(keys, keyType = 0, addHistoricalData = true, onlyTracking = false) {
        try {
            this.checkRateLimit();
            
            if (!this.wsUserName || !this.wsPassword) {
                throw new Error('Yurtiçi Kargo credentials not configured');
            }

            if (!keys) {
                throw new Error('Tracking keys required');
            }

            const client = await this.initSoapClient();

            const soapArgs = {
                wsUserName: this.wsUserName,
                wsPassword: this.wsPassword,
                userLanguage: this.userLanguage,
                keys: keys,
                keyType: keyType, // 0: cargoKey, 1: invoiceKey
                addHistoricalData: addHistoricalData,
                onlyTracking: onlyTracking
            };

            logger.info(`Yurtiçi Kargo queryShipment request for: ${keys}`);

            const [result] = await client.queryShipmentAsync(soapArgs);
            
            return this.processQueryResult(result, keys);

        } catch (error) {
            logger.error('Yurtiçi Kargo queryShipment error:', error.message);
            throw new Error(`Shipment query failed: ${error.message}`);
        }
    }

    /**
     * Detaylı kargo sorgulama
     */
    async queryShipmentDetail(keys, keyType = 0, addHistoricalData = true, onlyTracking = false) {
        try {
            this.checkRateLimit();
            
            if (!this.wsUserName || !this.wsPassword) {
                throw new Error('Yurtiçi Kargo credentials not configured');
            }

            const client = await this.initSoapClient();

            const soapArgs = {
                wsUserName: this.wsUserName,
                wsPassword: this.wsPassword,
                userLanguage: this.userLanguage,
                keys: keys,
                keyType: keyType,
                addHistoricalData: addHistoricalData,
                onlyTracking: onlyTracking
            };

            logger.info(`Yurtiçi Kargo queryShipmentDetail request for: ${keys}`);

            const [result] = await client.queryShipmentDetailAsync(soapArgs);
            
            return this.processDetailResult(result, keys);

        } catch (error) {
            logger.error('Yurtiçi Kargo queryShipmentDetail error:', error.message);
            throw new Error(`Shipment detail query failed: ${error.message}`);
        }
    }

    /**
     * Kargo iptal etme
     */
    async cancelShipment(cargoKeys) {
        try {
            this.checkRateLimit();
            
            if (!this.wsUserName || !this.wsPassword) {
                throw new Error('Yurtiçi Kargo credentials not configured');
            }

            if (!cargoKeys) {
                throw new Error('Cargo keys required for cancellation');
            }

            const client = await this.initSoapClient();

            const soapArgs = {
                wsUserName: this.wsUserName,
                wsPassword: this.wsPassword,
                userLanguage: this.userLanguage,
                cargoKeys: cargoKeys
            };

            logger.info(`Yurtiçi Kargo cancelShipment request for: ${cargoKeys}`);

            const [result] = await client.cancelShipmentAsync(soapArgs);
            
            return this.processCancelResult(result, cargoKeys);

        } catch (error) {
            logger.error('Yurtiçi Kargo cancelShipment error:', error.message);
            throw new Error(`Shipment cancellation failed: ${error.message}`);
        }
    }

    /**
     * Kargo oluşturma sonucunu işle
     */
    processShipmentResult(result, cargoKey, invoiceKey) {
        try {
            const isSuccess = result.outFlag === 0 || result.outFlag === '0';
            
            if (!isSuccess) {
                throw new Error(`API Error: ${result.outResult || 'Unknown error'}`);
            }

            return {
                success: true,
                message: result.outResult || 'Shipment created successfully',
                data: {
                    cargoKey: cargoKey,
                    invoiceKey: invoiceKey,
                    jobId: result.jobId,
                    count: result.count,
                    senderCustId: result.senderCustId,
                    createdAt: new Date().toISOString(),
                    tracking: {
                        trackingUrl: `https://www.yurticikargo.com/tr/online/cargo-tracking?code=${cargoKey}`,
                        cargoKey: cargoKey,
                        invoiceKey: invoiceKey
                    }
                }
            };
        } catch (error) {
            logger.error('Error processing shipment result:', error.message);
            throw error;
        }
    }

    /**
     * Kargo sorgulama sonucunu işle
     */
    processQueryResult(result, keys) {
        try {
            const isSuccess = result.outFlag === 0 || result.outFlag === '0';
            
            if (!isSuccess) {
                return {
                    success: false,
                    message: result.outResult || 'Shipment not found',
                    data: null
                };
            }

            const deliveryDetail = result.shippingDeliveryDetailVO;
            if (!deliveryDetail) {
                return {
                    success: false,
                    message: 'No shipment details found',
                    data: null
                };
            }

            const statusInfo = this.getStatusInfo(deliveryDetail.operationStatus);

            return {
                success: true,
                message: result.outResult || 'Query successful',
                data: {
                    trackingNumber: keys,
                    cargoKey: deliveryDetail.cargoKey,
                    invoiceKey: deliveryDetail.invoiceKey,
                    jobId: deliveryDetail.jobId,
                    status: statusInfo.status,
                    statusDescription: statusInfo.description,
                    statusCategory: statusInfo.category,
                    operationCode: deliveryDetail.operationCode,
                    operationMessage: deliveryDetail.operationMessage,
                    operationStatus: deliveryDetail.operationStatus,
                    lastUpdate: {
                        timestamp: new Date().toISOString(),
                        source: 'Yurtiçi Kargo API'
                    },
                    tracking: {
                        trackingUrl: `https://www.yurticikargo.com/tr/online/cargo-tracking?code=${keys}`,
                        isDelivered: statusInfo.status === 'DELIVERED',
                        isInTransit: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'AT_BRANCH'].includes(statusInfo.status),
                        hasIssue: ['EXCEPTION', 'DAMAGED', 'LOST', 'CANCELLED'].includes(statusInfo.status)
                    }
                }
            };
        } catch (error) {
            logger.error('Error processing query result:', error.message);
            throw error;
        }
    }

    /**
     * Detaylı sorgulama sonucunu işle
     */
    processDetailResult(result, keys) {
        try {
            const isSuccess = result.outFlag === 0 || result.outFlag === '0';
            
            if (!isSuccess) {
                return {
                    success: false,
                    message: result.outResult || 'Shipment details not found',
                    data: null
                };
            }

            // Ana bilgileri al
            const baseResult = this.processQueryResult(result, keys);
            
            // Detay bilgilerini ekle
            if (result.shippingMovementsVO && Array.isArray(result.shippingMovementsVO)) {
                baseResult.data.movements = result.shippingMovementsVO.map(movement => ({
                    description: movement.movementDescription,
                    dateTime: movement.movementDateTime,
                    unitName: movement.unitName,
                    eventCode: movement.eventCode
                }));
            }

            return baseResult;
        } catch (error) {
            logger.error('Error processing detail result:', error.message);
            throw error;
        }
    }

    /**
     * İptal sonucunu işle
     */
    processCancelResult(result, cargoKeys) {
        try {
            const isSuccess = result.outFlag === 0 || result.outFlag === '0';
            
            if (!isSuccess) {
                throw new Error(`Cancellation failed: ${result.outResult || 'Unknown error'}`);
            }

            const cancelDetail = result.shippingCancelDetailVO;

            return {
                success: true,
                message: result.outResult || 'Shipment cancelled successfully',
                data: {
                    cargoKey: cargoKeys,
                    jobId: cancelDetail?.jobId,
                    operationCode: cancelDetail?.operationCode,
                    operationMessage: cancelDetail?.operationMessage,
                    operationStatus: cancelDetail?.operationStatus,
                    cancelledAt: new Date().toISOString()
                }
            };
        } catch (error) {
            logger.error('Error processing cancel result:', error.message);
            throw error;
        }
    }

    /**
     * Durum kodunu çözümle
     */
    getStatusInfo(operationStatus) {
        const statusInfo = this.statusCodes[operationStatus];
        if (statusInfo) {
            return statusInfo;
        }
        
        return {
            status: 'UNKNOWN',
            description: operationStatus || 'Bilinmeyen Durum',
            category: 'unknown'
        };
    }

    /**
     * Çoklu kargo takibi
     */
    async trackMultiple(trackingNumbers, keyType = 0) {
        try {
            const results = [];
            
            // Yurtiçi Kargo API sequential processing gerektiriyor
            for (const trackingNumber of trackingNumbers.slice(0, 50)) { // Max 50 adet
                try {
                    const result = await this.queryShipment(trackingNumber, keyType, true, false);
                    results.push(result);
                } catch (error) {
                    logger.warn(`Failed to track ${trackingNumber}:`, error.message);
                    results.push({
                        success: false,
                        message: error.message,
                        data: { trackingNumber }
                    });
                }
                
                // Rate limiting için gecikme
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye
            }

            return {
                success: true,
                total: trackingNumbers.length,
                processed: results.length,
                results: results
            };
        } catch (error) {
            logger.error('Yurtiçi Kargo bulk tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo ücret tahmini
     */
    async calculateShippingCost(params) {
        try {
            const { weight = 1, desi = 1, fromCity = '', toCity = '', serviceType = 'STANDARD' } = params;
            
            // Yurtiçi Kargo ücret tahmini algoritması
            let baseCost = 15; // Temel ücret (TRY)
            
            // Ağırlık ve desi bazlı ücret (hangisi büyükse)
            const weightCost = weight * 3;
            const desiCost = desi * 2.5;
            baseCost += Math.max(weightCost, desiCost);
            
            // Servis tipine göre ek ücret
            const serviceMultiplier = {
                'STANDARD': 1.0,
                'EXPRESS': 1.4,
                'NEXT_DAY': 1.8,
                'SAME_DAY': 2.5,
                'CARGO_PLUS': 1.2,
                'INTERNATIONAL': 3.0,
                'COLLECTION': 1.3
            };
            
            baseCost *= serviceMultiplier[serviceType] || 1.0;
            
            // Şehirlerarası ek ücret
            if (fromCity.toUpperCase() !== toCity.toUpperCase()) {
                baseCost += 5;
            }
            
            // Büyük şehirler arası indirim
            const majorCities = ['ISTANBUL', 'ANKARA', 'IZMIR', 'ANTALYA', 'BURSA', 'ADANA'];
            const isMajorRoute = majorCities.includes(fromCity.toUpperCase()) && 
                               majorCities.includes(toCity.toUpperCase());
            
            if (isMajorRoute) {
                baseCost *= 0.95; // %5 indirim
            }

            return {
                success: true,
                estimatedCost: Math.round(baseCost * 100) / 100,
                currency: 'TRY',
                serviceType: serviceType,
                weight: weight,
                desi: desi,
                fromCity: fromCity,
                toCity: toCity,
                breakdown: {
                    baseCost: 15,
                    weightCost: weightCost,
                    desiCost: desiCost,
                    serviceMultiplier: serviceMultiplier[serviceType] || 1.0,
                    cityExtra: fromCity.toUpperCase() !== toCity.toUpperCase() ? 5 : 0,
                    majorCityDiscount: isMajorRoute ? '5%' : '0%'
                },
                note: 'Bu tahmine dayalı bir fiyattır. Kesin fiyat için Yurtiçi Kargo ile iletişime geçiniz.',
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
            };
        } catch (error) {
            logger.error('Yurtiçi Kargo pricing estimation error:', error.message);
            throw error;
        }
    }

    /**
     * Servis bilgileri
     */
    getServiceInfo(serviceType) {
        return {
            code: serviceType,
            name: this.serviceTypes[serviceType] || 'Bilinmeyen Servis',
            description: `Yurtiçi Kargo ${this.serviceTypes[serviceType] || serviceType} servisi`,
            estimatedDays: this.getEstimatedDeliveryDays(serviceType),
            tracking: true,
            insurance: true,
            cod: serviceType === 'COLLECTION' // Cash on Delivery
        };
    }

    /**
     * Tahmini teslimat süresi
     */
    getEstimatedDeliveryDays(serviceType) {
        const deliveryDays = {
            'SAME_DAY': '0 (Aynı Gün)',
            'NEXT_DAY': '1',
            'EXPRESS': '1-2',
            'CARGO_PLUS': '1-3',
            'STANDARD': '2-5',
            'COLLECTION': '2-5',
            'INTERNATIONAL': '5-15'
        };
        
        return deliveryDays[serviceType] || '2-5';
    }

    /**
     * Test bağlantısı
     */
    async testConnection() {
        try {
            const client = await this.initSoapClient();
            
            const isConnected = client && typeof client.queryShipmentAsync === 'function';
            
            logger.info('Yurtiçi Kargo connection test completed');
            return { 
                success: isConnected, 
                message: isConnected ? 'SOAP connection successful' : 'SOAP connection failed',
                wsdlURL: this.wsdlURL,
                statusCodesCount: Object.keys(this.statusCodes).length,
                serviceTypesCount: Object.keys(this.serviceTypes).length,
                hasCredentials: !!(this.wsUserName && this.wsPassword)
            };
        } catch (error) {
            logger.error('Yurtiçi Kargo connection test failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * API durumu
     */
    getStatus() {
        return {
            service: 'Yurtiçi Kargo Tracker',
            version: '1.0.0',
            environment: this.environment,
            apiType: 'SOAP/XML',
            wsdlURL: this.wsdlURL,
            rateLimiter: {
                requests: this.rateLimiter.requests,
                maxRequests: this.rateLimiter.maxRequests,
                resetTime: new Date(this.rateLimiter.lastReset + this.rateLimiter.resetInterval)
            },
            features: {
                createShipment: true,
                queryShipment: true,
                queryShipmentDetail: true,
                cancelShipment: true,
                bulkTracking: true,
                priceCalculation: true
            },
            statusCodes: Object.keys(this.statusCodes).length,
            serviceTypes: Object.keys(this.serviceTypes).length,
            supportedCities: Object.keys(this.cityCodes).length,
            credentials: {
                configured: !!(this.wsUserName && this.wsPassword),
                username: this.wsUserName ? `${this.wsUserName.substring(0, 3)}***` : 'Not set'
            }
        };
    }

    /**
     * Durum kategorisine göre filtreleme
     */
    filterByStatusCategory(trackingResults, category) {
        return trackingResults.filter(result => 
            result.success && result.data && result.data.statusCategory === category
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
        return ['EXCEPTION', 'DAMAGED', 'LOST', 'CANCELLED'].includes(status);
    }

    /**
     * Takip numarası format doğrulama
     */
    validateTrackingNumber(trackingNumber) {
        if (!trackingNumber || typeof trackingNumber !== 'string') {
            return { isValid: false, message: 'Invalid tracking number format' };
        }

        const cleaned = trackingNumber.replace(/\s/g, '');
        
        if (cleaned.length < 8 || cleaned.length > 25) {
            return { isValid: false, message: 'Tracking number length should be between 8-25 characters' };
        }

        if (!/^[A-Z0-9]+$/i.test(cleaned)) {
            return { isValid: false, message: 'Tracking number should contain only letters and numbers' };
        }

        return { 
            isValid: true, 
            cleanedNumber: cleaned,
            format: cleaned.match(/^\d+$/) ? 'numeric' : 'alphanumeric'
        };
    }
}

module.exports = YurticiCargoTracker; 