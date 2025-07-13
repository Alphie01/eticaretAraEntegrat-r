const axios = require('axios');
const logger = require('../utils/logger');

/**
 * DHL Kargo Takip Entegrasyonu
 * Global kargo lideri DHL için birleşik takip sistemi (Unified Shipment Tracking)
 * REST/JSON API entegrasyonu
 */
class DHLCargoTracker {
    constructor() {
        this.baseURL = process.env.DHL_API_URL || 'https://api-eu.dhl.com/track/shipments';
        this.apiKey = process.env.DHL_API_KEY;

        if (!this.apiKey) {
            logger.warn('DHL API Key is not configured. DHL tracking will be disabled.');
        }

        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 120, // Dakikada 120 istek (DHL limitine göre ayarlanabilir)
            resetInterval: 60000 // 1 dakika
        };

        // DHL durum kodlarını standart formata dönüştürme
        // Referans: https://developer.dhl.com/api-reference/shipment-tracking
        this.statusCodes = {
            'pre-transit': { status: 'PENDING', description: 'Gönderi bilgisi alındı', category: 'pickup' },
            'transit': { status: 'IN_TRANSIT', description: 'Yolda', category: 'transit' },
            'delivered': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            'failure': { status: 'DELIVERY_FAILED', description: 'Teslimat Başarısız', category: 'failed' },
            'unknown': { status: 'UNKNOWN', description: 'Durum Bilinmiyor', category: 'unknown' },
            'out-for-delivery': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıkarıldı', category: 'delivery'},
            'available-for-pickup': { status: 'ARRIVED_AT_FACILITY', description: 'Alıcı şubesinde bekliyor', category: 'waiting' },
            'exception': { status: 'EXCEPTION', description: 'İstisnai Durum', category: 'exception' },
            'cancelled': { status: 'CANCELLED', description: 'İptal Edildi', category: 'cancelled' },
            'returned-to-sender': { status: 'RETURNED_TO_SENDER', description: 'Göndericiye iade edildi', category: 'returned' },
        };
    }

    /**
     * Rate limiting kontrolü
     */
    checkRateLimit() {
        if (!this.apiKey) {
            throw new Error('DHL API Key is not configured.');
        }
        const now = Date.now();
        if (now - this.rateLimiter.lastReset > this.rateLimiter.resetInterval) {
            this.rateLimiter.requests = 0;
            this.rateLimiter.lastReset = now;
        }

        if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
            throw new Error('DHL API rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }
    
    /**
     * API headers oluşturma
     */
    getHeaders() {
        return {
            'Accept': 'application/json',
            'DHL-API-Key': this.apiKey,
            'User-Agent': 'EticaretAraEntegrator/1.0'
        };
    }

    /**
     * API çağrısı yapma
     */
    async makeRequest(params = {}) {
        this.checkRateLimit();
        const headers = this.getHeaders();

        try {
            logger.info(`DHL API request with params: ${JSON.stringify(params)}`);
            
            const response = await axios({
                method: 'GET',
                url: this.baseURL,
                headers,
                params,
                timeout: 15000 // 15 saniye timeout
            });

            return response.data;
        } catch (error) {
            logger.error('DHL API error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            if (error.response?.status === 429) {
                throw new Error('DHL API rate limit exceeded.');
            }
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('DHL API authentication failed. Check your API Key.');
            }
            if (error.response?.status === 404) {
                 return { shipments: [] }; // Boş sonuç döndür
            }

            throw new Error(`DHL API error: ${error.message}`);
        }
    }

    /**
     * Kargo takip numarası ile sorgulama
     */
    async trackByNumber(trackingNumber) {
        try {
            const result = await this.makeRequest({ trackingNumber });
            return this.normalizeTrackingResponse(result, trackingNumber);
        } catch (error) {
            logger.error(`DHL tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }
    
    /**
     * DHL API'sinden gelen yanıtı standart bir formata dönüştürür.
     */
    normalizeTrackingResponse(rawData, trackingNumber) {
        if (!rawData || !rawData.shipments || rawData.shipments.length === 0) {
            return {
                trackingNumber,
                status: 'NOT_FOUND',
                statusDescription: 'Gönderi bulunamadı',
                statusCategory: 'unknown',
                history: [],
            };
        }

        const shipment = rawData.shipments[0];
        const statusInfo = this.statusCodes[shipment.status?.statusCode] || this.statusCodes['unknown'];

        const history = (shipment.events || []).map(event => ({
            date: event.timestamp,
            location: event.location?.address?.addressLocality || 'N/A',
            description: event.description || event.status,
            statusCode: event.statusCode
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            trackingNumber: shipment.id,
            referenceNumber: shipment.details?.references?.[0]?.number || null,
            status: statusInfo.status,
            statusDescription: shipment.status?.description || statusInfo.description,
            statusCategory: statusInfo.category,
            currentLocation: {
                city: shipment.status?.location?.address?.addressLocality,
                country: shipment.status?.location?.address?.countryCode,
            },
            sender: {
                city: shipment.origin?.address?.addressLocality,
                country: shipment.origin?.address?.countryCode,
            },
            recipient: {
                city: shipment.destination?.address?.addressLocality,
                country: shipment.destination?.address?.countryCode,
            },
            shipmentInfo: {
                service: shipment.service,
                weight: shipment.details?.weight?.value,
                weightUnit: shipment.details?.weight?.unitText,
                pieces: shipment.details?.totalNumberOfPieces,
                shipmentDate: shipment.details?.shipmentDate,
                estimatedDelivery: shipment.estimatedTimeOfDelivery,
            },
            tracking: {
                lastUpdated: shipment.status?.timestamp,
                trackingUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${shipment.id}`,
                isDelivered: statusInfo.status === 'DELIVERED',
            },
            history: history,
        };
    }
}

module.exports = DHLCargoTracker; 