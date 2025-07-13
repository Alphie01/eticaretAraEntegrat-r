const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * UPS Kargo Takip Entegrasyonu
 * UPS Türkiye operasyonları için kargo takip sistemi
 * Web scraping tabanlı entegrasyon
 */
class UPSCargoTracker {
    constructor() {
        this.baseURL = process.env.UPS_CARGO_API_URL || 'https://www.ups.com.tr';
        this.trackingURL = 'https://www.ups.com.tr/gonderi_takip.aspx';
        this.apiKey = process.env.UPS_CARGO_API_KEY;
        this.customerCode = process.env.UPS_CARGO_CUSTOMER_CODE;
        this.environment = process.env.UPS_CARGO_ENVIRONMENT || 'production';
        
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequests: 60, // 60 requests per minute
            resetInterval: 60000 // 1 minute
        };

        // UPS Kargo Durum Kodları
        this.statusCodes = {
            '01': { status: 'COLLECTED', description: 'Kargo Alındı', category: 'pickup' },
            '02': { status: 'IN_TRANSIT', description: 'Yolda', category: 'transit' },
            '03': { status: 'ARRIVED_AT_HUB', description: 'Merkeze Ulaştı', category: 'transit' },
            '04': { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıktı', category: 'delivery' },
            '05': { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' },
            '06': { status: 'DELIVERY_ATTEMPTED', description: 'Teslimat Denendi', category: 'attempted' },
            '07': { status: 'EXCEPTION', description: 'İstisna Durumu', category: 'exception' },
            '08': { status: 'RETURNED_TO_SENDER', description: 'Gönderene İade', category: 'returned' },
            '09': { status: 'DELAYED', description: 'Gecikme', category: 'delayed' },
            '10': { status: 'DAMAGED', description: 'Hasarlı', category: 'damaged' },
            '11': { status: 'LOST', description: 'Kayıp', category: 'lost' },
            '12': { status: 'HELD_AT_LOCATION', description: 'Lokasyonda Bekletiliyor', category: 'hold' },
            '13': { status: 'AWAITING_CLEARANCE', description: 'Gümrük Bekliyor', category: 'customs' },
            '14': { status: 'INTERNATIONAL_DEPARTURE', description: 'Uluslararası Çıkış', category: 'international' },
            '15': { status: 'INTERNATIONAL_ARRIVAL', description: 'Uluslararası Varış', category: 'international' },
            '16': { status: 'PROCESSING', description: 'İşlem Görüyor', category: 'processing' }
        };

        // Türkiye şehir kodları
        this.cityCodes = {
            'ADANA': '01', 'ADIYAMAN': '02', 'AFYONKARAHISAR': '03', 'AĞRI': '04', 'AMASYA': '05',
            'ANKARA': '06', 'ANTALYA': '07', 'ARTVIN': '08', 'AYDIN': '09', 'BALIKESIR': '10',
            'BILECIK': '11', 'BINGÖL': '12', 'BITLIS': '13', 'BOLU': '14', 'BURDUR': '15',
            'BURSA': '16', 'ÇANAKKALE': '17', 'ÇANKIRI': '18', 'ÇORUM': '19', 'DENIZLI': '20',
            'DIYARBAKIR': '21', 'EDIRNE': '22', 'ELAZIĞ': '23', 'ERZINCAN': '24', 'ERZURUM': '25',
            'ESKIŞEHIR': '26', 'GAZIANTEP': '27', 'GIRESUN': '28', 'GÜMÜŞHANE': '29', 'HAKKARI': '30',
            'HATAY': '31', 'ISPARTA': '32', 'MERSIN': '33', 'ISTANBUL': '34', 'IZMIR': '35'
        };

        // UPS servis tipleri
        this.serviceTypes = {
            'STANDARD': 'Standart Kargo',
            'EXPRESS': 'UPS Express',
            'EXPRESS_PLUS': 'UPS Express Plus',
            'EXPEDITED': 'Hızlandırılmış',
            'GROUND': 'Kara Yolu',
            'AIR': 'Hava Yolu',
            'INTERNATIONAL': 'Uluslararası'
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
            throw new Error('UPS Kargo API rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.requests++;
    }

    /**
     * HTTP headers oluşturma
     */
    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    /**
     * Web tracking sayfasından veri çekme
     */
    async scrapeTrackingPage(trackingNumber, isDomestic = true) {
        try {
            this.checkRateLimit();

            const headers = this.getHeaders();
            
            // Önce ana sayfayı çek
            const mainPageResponse = await axios.get(this.trackingURL, { headers });
            
            // ViewState ve EventValidation değerlerini parse et
            const viewStateMatch = mainPageResponse.data.match(/__VIEWSTATE[^>]*value="([^"]*)">/);
            const eventValidationMatch = mainPageResponse.data.match(/__EVENTVALIDATION[^>]*value="([^"]*)">/);
            
            const viewState = viewStateMatch ? viewStateMatch[1] : '';
            const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';

            // Form data hazırla
            const formData = new URLSearchParams();
            formData.append('__VIEWSTATE', viewState);
            formData.append('__EVENTVALIDATION', eventValidation);
            formData.append('__DOPOSTBACK', '');
            formData.append('__DOTNETVERSION', '4.0.30319');
            
            if (isDomestic) {
                formData.append('ctl00$ContentPlaceHolder1$txtDomesticTracking', trackingNumber);
                formData.append('ctl00$ContentPlaceHolder1$btnDomesticTrack', 'Ara');
            } else {
                formData.append('ctl00$ContentPlaceHolder1$txtInternationalTracking', trackingNumber);
                formData.append('ctl00$ContentPlaceHolder1$btnInternationalTrack', 'Ara');
            }

            // Tracking isteği gönder
            const trackingResponse = await axios.post(this.trackingURL, formData, {
                headers: {
                    ...headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': this.trackingURL
                }
            });

            return this.parseTrackingResponse(trackingResponse.data, trackingNumber);

        } catch (error) {
            logger.error(`UPS Kargo web scraping error for ${trackingNumber}:`, error.message);
            throw new Error(`UPS tracking failed: ${error.message}`);
        }
    }

    /**
     * Tracking sayfası HTML'ini parse et
     */
    parseTrackingResponse(html, trackingNumber) {
        try {
            // HTML parsing için basit regex kullanıyoruz
            // Gerçek uygulamada cheerio/jsdom kullanılabilir
            
            // Kargo durumu bul
            const statusMatch = html.match(/Durum[:\s]*([^<\n]*)/i);
            const locationMatch = html.match(/Konum[:\s]*([^<\n]*)/i);
            const dateMatch = html.match(/Tarih[:\s]*([^<\n]*)/i);
            const timeMatch = html.match(/Saat[:\s]*([^<\n]*)/i);
            
            // Alıcı bilgileri
            const recipientMatch = html.match(/Alıcı[:\s]*([^<\n]*)/i);
            const addressMatch = html.match(/Adres[:\s]*([^<\n]*)/i);
            
            // Gönderen bilgileri
            const senderMatch = html.match(/Gönderen[:\s]*([^<\n]*)/i);
            
            // Ağırlık ve boyut
            const weightMatch = html.match(/Ağırlık[:\s]*([^<\n]*)/i);
            const dimensionsMatch = html.match(/Boyut[:\s]*([^<\n]*)/i);

            if (!statusMatch) {
                return null; // Kargo bulunamadı
            }

            const statusText = statusMatch[1]?.trim() || 'Bilinmiyor';
            const statusInfo = this.determineStatusFromText(statusText);

            const result = {
                trackingNumber: trackingNumber,
                status: statusInfo.status,
                statusDescription: statusInfo.description,
                statusCategory: statusInfo.category,
                currentLocation: {
                    city: locationMatch ? locationMatch[1]?.trim() : null,
                    facility: null,
                    country: 'Türkiye'
                },
                lastUpdate: {
                    date: dateMatch ? dateMatch[1]?.trim() : null,
                    time: timeMatch ? timeMatch[1]?.trim() : null,
                    timestamp: this.parseDateTime(dateMatch?.[1], timeMatch?.[1])
                },
                recipient: {
                    name: recipientMatch ? recipientMatch[1]?.trim() : null,
                    address: addressMatch ? addressMatch[1]?.trim() : null
                },
                sender: {
                    name: senderMatch ? senderMatch[1]?.trim() : null
                },
                shipmentInfo: {
                    weight: this.parseWeight(weightMatch?.[1]),
                    dimensions: dimensionsMatch ? dimensionsMatch[1]?.trim() : null,
                    serviceType: this.detectServiceType(html)
                },
                tracking: {
                    lastUpdated: new Date().toISOString(),
                    trackingUrl: `${this.trackingURL}?trackingNumber=${trackingNumber}`,
                    isDelivered: statusInfo.status === 'DELIVERED',
                    isInTransit: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_HUB'].includes(statusInfo.status),
                    hasIssue: ['EXCEPTION', 'DAMAGED', 'LOST', 'DELAYED'].includes(statusInfo.status)
                }
            };

            return result;

        } catch (error) {
            logger.error('UPS tracking response parsing error:', error.message);
            throw new Error('Failed to parse UPS tracking response');
        }
    }

    /**
     * Metin tabanlı durum belirleme
     */
    determineStatusFromText(statusText) {
        const text = statusText.toLowerCase();
        
        if (text.includes('teslim edildi') || text.includes('delivered')) {
            return { status: 'DELIVERED', description: 'Teslim Edildi', category: 'delivered' };
        }
        if (text.includes('dağıtım') || text.includes('delivery')) {
            return { status: 'OUT_FOR_DELIVERY', description: 'Dağıtıma Çıktı', category: 'delivery' };
        }
        if (text.includes('yolda') || text.includes('transit')) {
            return { status: 'IN_TRANSIT', description: 'Yolda', category: 'transit' };
        }
        if (text.includes('alındı') || text.includes('picked')) {
            return { status: 'COLLECTED', description: 'Kargo Alındı', category: 'pickup' };
        }
        if (text.includes('merkez') || text.includes('hub')) {
            return { status: 'ARRIVED_AT_HUB', description: 'Merkeze Ulaştı', category: 'transit' };
        }
        if (text.includes('gecikme') || text.includes('delay')) {
            return { status: 'DELAYED', description: 'Gecikme', category: 'delayed' };
        }
        if (text.includes('iade') || text.includes('return')) {
            return { status: 'RETURNED_TO_SENDER', description: 'Gönderene İade', category: 'returned' };
        }
        if (text.includes('gümrük') || text.includes('customs')) {
            return { status: 'AWAITING_CLEARANCE', description: 'Gümrük Bekliyor', category: 'customs' };
        }
        
        return { status: 'PROCESSING', description: statusText, category: 'processing' };
    }

    /**
     * Ağırlık bilgisini parse et
     */
    parseWeight(weightText) {
        if (!weightText) return null;
        
        const match = weightText.match(/([0-9,.]+)\s*(kg|g|pound|lb)?/i);
        if (match) {
            const value = parseFloat(match[1].replace(',', '.'));
            const unit = match[2]?.toLowerCase() || 'kg';
            
            // Kg'a çevir
            if (unit === 'g') return value / 1000;
            if (unit === 'pound' || unit === 'lb') return value * 0.453592;
            
            return value;
        }
        
        return null;
    }

    /**
     * Tarih ve saat parse etme
     */
    parseDateTime(dateStr, timeStr) {
        if (!dateStr) return null;
        
        try {
            // Türkçe tarih formatlarını parse et
            let dateTimeStr = dateStr.trim();
            if (timeStr) {
                dateTimeStr += ' ' + timeStr.trim();
            }
            
            // Farklı tarih formatlarını dene
            const formats = [
                /(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/, // DD.MM.YYYY HH:MM
                /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/, // DD/MM/YYYY HH:MM
                /(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/   // DD-MM-YYYY HH:MM
            ];
            
            for (const format of formats) {
                const match = dateTimeStr.match(format);
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]) - 1; // JS months are 0-based
                    const year = parseInt(match[3]);
                    const hour = parseInt(match[4] || '0');
                    const minute = parseInt(match[5] || '0');
                    
                    return new Date(year, month, day, hour, minute).toISOString();
                }
            }
            
            return new Date().toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Servis tipini tespit et
     */
    detectServiceType(html) {
        const text = html.toLowerCase();
        
        if (text.includes('express plus')) return 'EXPRESS_PLUS';
        if (text.includes('express')) return 'EXPRESS';
        if (text.includes('expedited')) return 'EXPEDITED';
        if (text.includes('international')) return 'INTERNATIONAL';
        if (text.includes('air') || text.includes('hava')) return 'AIR';
        if (text.includes('ground') || text.includes('kara')) return 'GROUND';
        
        return 'STANDARD';
    }

    /**
     * Kargo takip numarası ile sorgulama
     */
    async trackByNumber(trackingNumber, isDomestic = true) {
        try {
            if (!trackingNumber || trackingNumber.length < 6) {
                throw new Error('Invalid tracking number');
            }

            logger.info(`UPS Kargo tracking request: ${trackingNumber}`);
            
            const result = await this.scrapeTrackingPage(trackingNumber, isDomestic);
            
            if (!result) {
                // International'ı da dene
                if (isDomestic) {
                    return await this.trackByNumber(trackingNumber, false);
                }
                return null;
            }

            return result;

        } catch (error) {
            logger.error(`UPS Kargo tracking error for ${trackingNumber}:`, error.message);
            throw error;
        }
    }

    /**
     * Çoklu kargo takibi
     */
    async trackMultiple(trackingNumbers) {
        try {
            const results = [];
            
            // UPS web scraping sequential olarak yapılmalı
            for (const trackingNumber of trackingNumbers.slice(0, 20)) { // Max 20 adet
                try {
                    const result = await this.trackByNumber(trackingNumber);
                    results.push(result);
                } catch (error) {
                    logger.warn(`Failed to track ${trackingNumber}:`, error.message);
                    results.push(null);
                }
                
                // Rate limiting için gecikme
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye
            }

            return results;
        } catch (error) {
            logger.error('UPS Kargo bulk tracking error:', error.message);
            throw error;
        }
    }

    /**
     * Kargo ücret tahmini
     */
    async calculateShippingCost(params) {
        try {
            const { weight = 1, fromCity = '', toCity = '', serviceType = 'STANDARD', isInternational = false } = params;
            
            // UPS ücret tahmini algoritması
            let baseCost = isInternational ? 100 : 25; // Temel ücret
            
            // Ağırlık bazlı ücret
            if (weight > 1) {
                baseCost += (weight - 1) * (isInternational ? 15 : 8);
            }
            
            // Servis tipine göre ek ücret
            const serviceMultiplier = {
                'STANDARD': 1.0,
                'EXPRESS': 1.5,
                'EXPRESS_PLUS': 2.0,
                'EXPEDITED': 1.3,
                'AIR': 1.8,
                'INTERNATIONAL': 2.5
            };
            
            baseCost *= serviceMultiplier[serviceType] || 1.0;
            
            // Şehirlerarası ek ücret
            if (fromCity.toUpperCase() !== toCity.toUpperCase() && !isInternational) {
                baseCost += 10;
            }
            
            // Büyük şehirler arası indirim
            const majorCities = ['ISTANBUL', 'ANKARA', 'IZMIR', 'ANTALYA', 'BURSA'];
            const isMajorRoute = majorCities.includes(fromCity.toUpperCase()) && 
                               majorCities.includes(toCity.toUpperCase());
            
            if (isMajorRoute && !isInternational) {
                baseCost *= 0.9; // %10 indirim
            }

            return {
                success: true,
                estimatedCost: Math.round(baseCost * 100) / 100,
                currency: 'TRY',
                serviceType: serviceType,
                weight: weight,
                fromCity: fromCity,
                toCity: toCity,
                isInternational: isInternational,
                note: 'Bu tahmine dayalı bir fiyattır. Kesin fiyat için UPS ile iletişime geçiniz.',
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
            };
        } catch (error) {
            logger.error('UPS Kargo pricing estimation error:', error.message);
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
            description: `UPS ${this.serviceTypes[serviceType] || serviceType} servisi`,
            estimatedDays: this.getEstimatedDeliveryDays(serviceType),
            tracking: true,
            insurance: true
        };
    }

    /**
     * Tahmini teslimat süresi
     */
    getEstimatedDeliveryDays(serviceType) {
        const deliveryDays = {
            'EXPRESS_PLUS': '1',
            'EXPRESS': '1-2',
            'EXPEDITED': '2-3',
            'STANDARD': '2-5',
            'GROUND': '3-7',
            'AIR': '1-3',
            'INTERNATIONAL': '3-10'
        };
        
        return deliveryDays[serviceType] || '2-5';
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
        return ['EXCEPTION', 'DAMAGED', 'LOST', 'DELAYED'].includes(status);
    }

    /**
     * Uluslararası kargo kontrolü
     */
    isInternational(trackingNumber) {
        // UPS uluslararası kargo numaraları genellikle 1Z ile başlar
        return trackingNumber.toUpperCase().startsWith('1Z') || 
               trackingNumber.length > 12;
    }

    /**
     * Test bağlantısı
     */
    async testConnection() {
        try {
            const response = await axios.get(this.baseURL, {
                headers: this.getHeaders(),
                timeout: 10000
            });
            
            const isConnected = response.status === 200 && 
                              response.data.includes('UPS') &&
                              response.data.includes('takip');
            
            logger.info('UPS Kargo connection test completed');
            return { 
                success: isConnected, 
                message: isConnected ? 'Connection successful' : 'Connection failed',
                statusCodesCount: Object.keys(this.statusCodes).length,
                serviceTypesCount: Object.keys(this.serviceTypes).length
            };
        } catch (error) {
            logger.error('UPS Kargo connection test failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * API durumu
     */
    getStatus() {
        return {
            service: 'UPS Kargo Tracker',
            version: '1.0.0',
            environment: this.environment,
            trackingMethod: 'Web Scraping',
            rateLimiter: {
                requests: this.rateLimiter.requests,
                maxRequests: this.rateLimiter.maxRequests,
                resetTime: new Date(this.rateLimiter.lastReset + this.rateLimiter.resetInterval)
            },
            endpoints: {
                domestic: `${this.trackingURL} (Yurtiçi)`,
                international: `${this.trackingURL} (Yurtdışı)`
            },
            statusCodes: Object.keys(this.statusCodes).length,
            serviceTypes: Object.keys(this.serviceTypes).length,
            supportedCities: Object.keys(this.cityCodes).length
        };
    }
}

module.exports = UPSCargoTracker; 