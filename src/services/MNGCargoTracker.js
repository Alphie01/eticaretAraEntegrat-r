const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * MNG Kargo Takip Entegrasyonu
 * Türkiye'nin önde gelen kargo firmalarından MNG Kargo için takip sistemi
 */
class MNGCargoTracker {
    constructor() {
        this.baseURL = process.env.MNG_CARGO_API_URL || 'https://api.mngkargo.com.tr';
        this.apiKey = process.env.MNG_CARGO_API_KEY;
        this.apiSecret = process.env.MNG_CARGO_API_SECRET;
        this.companyCode = process.env.MNG_CARGO_COMPANY_CODE;
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 100, // 100 requests per minute
            resetInterval: 60000 // 1 minute
        };

        // MNG Kargo Durum Kodları
        this.statusCodes = {
            '01': { status: 'COLLECTED', description: 'Kargo Teslim Alındı', category: 'pickup' },
            '02': { status: 'IN_TRANSIT', description: 'Aktarma Merkezinde', category: 'transit' },
            '03': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıkarıldı', category: 'delivery' },
            '04': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            '05': { status: 'DELIVERY_FAILED', description: 'Teslimat Başarısız', category: 'failed' },
            '06': { status: 'RETURNED', description: 'İade Edildi', category: 'returned' },
            '07': { status: 'CANCELLED', description: 'İptal Edildi', category: 'cancelled' },
            '08': { status: 'DELAYED', description: 'Gecikme', category: 'delayed' },
            '09': { status: 'DAMAGED', description: 'Hasarlı Kargo', category: 'damaged' },
            '10': { status: 'LOST', description: 'Kayıp Kargo', category: 'lost' },
            '11': { status: 'WAITING_RECIPIENT', description: 'Alıcı Bekleniyor', category: 'waiting' },
            '12': { status: 'ADDRESS_INCORRECT', description: 'Adres Hatalı', category: 'failed' },
            '13': { status: 'RECIPIENT_NOT_FOUND', description: 'Alıcı Bulunamadı', category: 'failed' },
            '14': { status: 'PAYMENT_REQUIRED', description: 'Ödeme Bekleniyor', category: 'payment' },
            '15': { status: 'CUSTOMS_CLEARANCE', description: 'Gümrük İşlemleri', category: 'customs' }
        };

        // İl kodları (sadece örnekler)
        this.cityCodes = {
            'ISTANBUL': '34',
            'ANKARA': '06',
            'IZMIR': '35',
            'ANTALYA': '07',
            'BURSA': '16'
        };
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
            throw new Error('MNG Kargo API rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }

    /**
     * API imzası oluşturma (HMAC-SHA256)
     */
    generateSignature(data, timestamp) {
        const payload = JSON.stringify(data) + timestamp;
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(payload)
            .digest('hex');
    }

    /**
     * API headers oluşturma
     */
    getHeaders(data = {}) {
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(data, timestamp);

        return {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Company-Code': this.companyCode,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'User-Agent': 'EticaretAraEntegrator/1.0'
        };
    }

    /**
     * API çağrısı yapma
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            this.checkRateLimit();

            const url = `${this.baseURL}${endpoint}`;
            const headers = this.getHeaders(data);

            const config = {
                method,
                url,
                headers,
                timeout: 30000
            };

            if (data) {
                config.data = data;
            }

            logger.info(`MNG Kargo API request: ${method} ${url}`);
            const response = await axios(config);

            return response.data;
        } catch (error) {
            logger.error('MNG Kargo API error:', error.message);
            
            if (error.response?.status === 429) {
                throw new Error('MNG Kargo API rate limit exceeded');
            }
            
            if (error.response?.status === 401) {
                throw new Error('MNG Kargo API authentication failed');
            }

            throw new Error(`MNG Kargo API error: ${error.message}`);
        }
    }

    /**
     * Kargo takip numarası ile sorgulama
     */
    async trackByNumber(trackingNumber) {
        try {
            const endpoint = `/v1/tracking/${trackingNumber}`;
            const result = await this.makeRequest(endpoint);

            return this.normalizeTrackingResponse(result);
        } catch (error) {
            logger.error(`MNG Kargo tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Referans numarası ile sorgulama
     */
    async trackByReference(referenceNumber) {
        try {
            const endpoint = '/v1/tracking/reference';
            const data = { referenceNumber };
            
            const result = await this.makeRequest(endpoint, 'POST', data);
            return this.normalizeTrackingResponse(result);
        } catch (error) {
            logger.error(`MNG Kargo reference tracking error for ${referenceNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Sipariş numarası ile sorgulama
     */
    async trackByOrderNumber(orderNumber) {
        try {
            const endpoint = '/v1/tracking/order';
            const data = { orderNumber };
            
            const result = await this.makeRequest(endpoint, 'POST', data);
            return this.normalizeTrackingResponse(result);
        } catch (error) {
            logger.error(`MNG Kargo order tracking error for ${orderNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Çoklu kargo takibi
     */
    async trackMultiple(trackingNumbers) {
        try {
            const endpoint = '/v1/tracking/bulk';
            const data = { trackingNumbers };
            
            const result = await this.makeRequest(endpoint, 'POST', data);
            
            if (result.trackingResults) {
                return result.trackingResults.map(item => this.normalizeTrackingResponse(item));
            }

            return [];
        } catch (error) {
            logger.error('MNG Kargo bulk tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Bölge/şube sorgulama
     */
    async getBranches(cityCode = null) {
        try {
            const endpoint = cityCode ? `/v1/branches?city=${cityCode}` : '/v1/branches';
            const result = await this.makeRequest(endpoint);

            return result.branches || [];
        } catch (error) {
            logger.error('MNG Kargo branches error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo ücret hesaplama
     */
    async calculateShippingCost(params) {
        try {
            const endpoint = '/v1/pricing/calculate';
            const data = {
                fromCity: params.fromCity,
                toCity: params.toCity,
                weight: params.weight,
                dimensions: params.dimensions,
                serviceType: params.serviceType || 'standard',
                paymentType: params.paymentType || 'sender'
            };

            const result = await this.makeRequest(endpoint, 'POST', data);
            return result;
        } catch (error) {
            logger.error('MNG Kargo pricing error:', error.message);
            throw error;
        }
    }

    /**
     * Gönderi oluşturma
     */
    async createShipment(shipmentData) {
        try {
            const endpoint = '/v1/shipments/create';
            const data = this.normalizeShipmentData(shipmentData);

            const result = await this.makeRequest(endpoint, 'POST', data);
            return result;
        } catch (error) {
            logger.error('MNG Kargo shipment creation error:', error.message);
            throw error;
        }
    }

    /**
     * Gönderi iptali
     */
    async cancelShipment(trackingNumber, reason = 'Müşteri talebi') {
        try {
            const endpoint = `/v1/shipments/${trackingNumber}/cancel`;
            const data = { reason };

            const result = await this.makeRequest(endpoint, 'POST', data);
            return result;
        } catch (error) {
            logger.error(`MNG Kargo cancellation error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Webhook kayıt
     */
    async registerWebhook(webhookUrl, events = ['all']) {
        try {
            const endpoint = '/v1/webhooks/register';
            const data = {
                url: webhookUrl,
                events,
                secret: crypto.randomBytes(32).toString('hex')
            };

            const result = await this.makeRequest(endpoint, 'POST', data);
            return result;
        } catch (error) {
            logger.error('MNG Kargo webhook registration error:', error.message);
            throw error;
        }
    }

    /**
     * Tracking yanıtını normalize et
     */
    normalizeTrackingResponse(rawData) {
        if (!rawData) return null;

        const statusInfo = this.statusCodes[rawData.statusCode] || {
            status: 'UNKNOWN',
            description: rawData.statusDescription || 'Bilinmeyen Durum',
            category: 'unknown'
        };

        return {
            trackingNumber: rawData.trackingNumber,
            referenceNumber: rawData.referenceNumber,
            orderNumber: rawData.orderNumber,
            status: statusInfo.status,
            statusDescription: statusInfo.description,
            statusCategory: statusInfo.category,
            currentLocation: {
                city: rawData.currentCity,
                branch: rawData.currentBranch,
                facility: rawData.currentFacility
            },
            sender: {
                name: rawData.senderName,
                company: rawData.senderCompany,
                city: rawData.senderCity,
                phone: rawData.senderPhone
            },
            recipient: {
                name: rawData.recipientName,
                company: rawData.recipientCompany,
                city: rawData.recipientCity,
                address: rawData.recipientAddress,
                phone: rawData.recipientPhone
            },
            shipmentInfo: {
                weight: rawData.weight,
                pieces: rawData.pieces,
                serviceType: rawData.serviceType,
                paymentType: rawData.paymentType,
                estimatedDelivery: rawData.estimatedDeliveryDate,
                actualDelivery: rawData.actualDeliveryDate
            },
            events: rawData.events?.map(event => ({
                date: event.date,
                time: event.time,
                location: event.location,
                description: event.description,
                statusCode: event.statusCode,
                facility: event.facility
            })) || [],
            pricing: {
                totalCost: rawData.totalCost,
                codAmount: rawData.codAmount,
                currency: rawData.currency || 'TRY'
            },
            tracking: {
                lastUpdated: rawData.lastUpdated || new Date().toISOString(),
                trackingUrl: `https://kargotakip.mngkargo.com.tr/?takipno=${rawData.trackingNumber}`,
                isDelivered: statusInfo.status === 'DELIVERED',
                isInTransit: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(statusInfo.status),
                hasIssue: ['DELIVERY_FAILED', 'DAMAGED', 'LOST'].includes(statusInfo.status)
            }
        };
    }

    /**
     * Gönderi verilerini normalize et
     */
    normalizeShipmentData(data) {
        return {
            sender: {
                name: data.sender.name,
                company: data.sender.company || '',
                address: data.sender.address,
                city: data.sender.city,
                district: data.sender.district,
                postalCode: data.sender.postalCode,
                phone: data.sender.phone,
                email: data.sender.email
            },
            recipient: {
                name: data.recipient.name,
                company: data.recipient.company || '',
                address: data.recipient.address,
                city: data.recipient.city,
                district: data.recipient.district,
                postalCode: data.recipient.postalCode,
                phone: data.recipient.phone,
                email: data.recipient.email
            },
            shipment: {
                pieces: data.pieces || 1,
                weight: data.weight,
                dimensions: data.dimensions || { length: 0, width: 0, height: 0 },
                serviceType: data.serviceType || 'standard',
                paymentType: data.paymentType || 'sender',
                codAmount: data.codAmount || 0,
                description: data.description || '',
                referenceNumber: data.referenceNumber,
                specialInstructions: data.specialInstructions || ''
            }
        };
    }

    /**
     * Durum kategorisine göre filtreleme
     */
    filterByStatusCategory(trackingResults, category) {
        return trackingResults.filter(result => 
            result.statusCategory === category
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
            const result = await this.makeRequest('/v1/health');
            logger.info('MNG Kargo API connection test successful');
            return { success: true, message: 'Connection successful', data: result };
        } catch (error) {
            logger.error('MNG Kargo API connection test failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * API durumu
     */
    getStatus() {
        return {
            service: 'MNG Kargo Tracker',
            version: '1.0.0',
            rateLimiter: {
                requests: this.rateLimiter.requests,
                maxRequests: this.rateLimiter.maxRequests,
                resetTime: new Date(this.rateLimiter.lastReset + this.rateLimiter.resetInterval)
            },
            endpoints: {
                track: `${this.baseURL}/v1/tracking/{trackingNumber}`,
                reference: `${this.baseURL}/v1/tracking/reference`,
                order: `${this.baseURL}/v1/tracking/order`,
                bulk: `${this.baseURL}/v1/tracking/bulk`
            },
            statusCodes: Object.keys(this.statusCodes).length
        };
    }
}

module.exports = MNGCargoTracker; 