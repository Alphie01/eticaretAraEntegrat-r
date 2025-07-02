const express = require('express');
const router = express.Router();
const UPSCargoTracker = require('../../services/UPSCargoTracker');
const auth = require('../../middleware/auth');
const rateLimiter = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

// UPS Kargo Tracker instance
const upsTracker = new UPSCargoTracker();

/**
 * @swagger
 * components:
 *   schemas:
 *     UPSCargoTracking:
 *       type: object
 *       properties:
 *         trackingNumber:
 *           type: string
 *           description: Takip numarası
 *         status:
 *           type: string
 *           description: Kargo durumu
 *         statusDescription:
 *           type: string
 *           description: Durum açıklaması
 *         currentLocation:
 *           type: object
 *           properties:
 *             city:
 *               type: string
 *             country:
 *               type: string
 *         recipient:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             address:
 *               type: string
 *         tracking:
 *           type: object
 *           properties:
 *             isDelivered:
 *               type: boolean
 *             trackingUrl:
 *               type: string
 */

/**
 * @swagger
 * /api/v1/ups-cargo/track/{trackingNumber}:
 *   get:
 *     summary: Takip numarası ile kargo sorgulama
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: UPS Kargo takip numarası
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [domestic, international]
 *           default: domestic
 *         description: Kargo tipi (yurtiçi/yurtdışı)
 *     responses:
 *       200:
 *         description: Kargo bilgisi bulundu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UPSCargoTracking'
 *       404:
 *         description: Kargo bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/track/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const { type = 'domestic' } = req.query;

        if (!trackingNumber || trackingNumber.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir takip numarası giriniz (minimum 6 karakter)'
            });
        }

        const isDomestic = type === 'domestic';
        logger.info(`UPS Kargo tracking request: ${trackingNumber} (${type})`);

        const result = await upsTracker.trackByNumber(trackingNumber, isDomestic);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Kargo bilgisi bulunamadı'
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('UPS Kargo tracking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Kargo takip hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/track/bulk:
 *   post:
 *     summary: Çoklu kargo takibi
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 20
 *                 description: Takip numaraları listesi (maksimum 20 adet)
 *               type:
 *                 type: string
 *                 enum: [domestic, international]
 *                 default: domestic
 *                 description: Kargo tipi
 *     responses:
 *       200:
 *         description: Çoklu takip sonuçları
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */
router.post('/track/bulk', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumbers, type = 'domestic' } = req.body;

        if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Takip numaraları listesi gereklidir'
            });
        }

        if (trackingNumbers.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Maksimum 20 takip numarası sorgulanabilir'
            });
        }

        // Geçersiz takip numaralarını filtrele
        const validTrackingNumbers = trackingNumbers.filter(num => num && num.length >= 6);
        
        if (validTrackingNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli takip numarası bulunamadı'
            });
        }

        logger.info(`UPS Kargo bulk tracking request: ${validTrackingNumbers.length} items (${type})`);

        const results = await upsTracker.trackMultiple(validTrackingNumbers);

        res.json({
            success: true,
            data: {
                total: validTrackingNumbers.length,
                found: results.filter(r => r !== null).length,
                type: type,
                results: results
            }
        });

    } catch (error) {
        logger.error('UPS Kargo bulk tracking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Çoklu takip hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/calculate-cost:
 *   post:
 *     summary: Kargo ücret tahmini
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromCity:
 *                 type: string
 *                 description: Gönderen şehir
 *               toCity:
 *                 type: string
 *                 description: Alıcı şehir
 *               weight:
 *                 type: number
 *                 description: Ağırlık (kg)
 *               serviceType:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, EXPRESS_PLUS, EXPEDITED, GROUND, AIR, INTERNATIONAL]
 *                 default: STANDARD
 *                 description: Servis tipi
 *               isInternational:
 *                 type: boolean
 *                 default: false
 *                 description: Uluslararası kargo mu
 *             required:
 *               - fromCity
 *               - toCity
 *               - weight
 *     responses:
 *       200:
 *         description: Ücret tahmini
 *       400:
 *         description: Eksik parametreler
 *       500:
 *         description: Sunucu hatası
 */
router.post('/calculate-cost', auth, rateLimiter, async (req, res) => {
    try {
        const { fromCity, toCity, weight, serviceType = 'STANDARD', isInternational = false } = req.body;

        if (!fromCity || !toCity || !weight) {
            return res.status(400).json({
                success: false,
                message: 'Gönderen şehir, alıcı şehir ve ağırlık bilgisi gereklidir'
            });
        }

        if (weight <= 0 || weight > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Ağırlık 0-1000 kg arasında olmalıdır'
            });
        }

        const validServiceTypes = ['STANDARD', 'EXPRESS', 'EXPRESS_PLUS', 'EXPEDITED', 'GROUND', 'AIR', 'INTERNATIONAL'];
        if (!validServiceTypes.includes(serviceType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz servis tipi'
            });
        }

        logger.info(`UPS Kargo cost calculation: ${fromCity} to ${toCity}, ${weight}kg, ${serviceType}`);

        const result = await upsTracker.calculateShippingCost({
            fromCity,
            toCity,
            weight,
            serviceType,
            isInternational
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('UPS Kargo cost calculation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Ücret hesaplama hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/services:
 *   get:
 *     summary: UPS Kargo servis tipleri
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Servis tipleri listesi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/services', auth, rateLimiter, async (req, res) => {
    try {
        const services = Object.keys(upsTracker.serviceTypes).map(key => ({
            code: key,
            name: upsTracker.serviceTypes[key],
            info: upsTracker.getServiceInfo(key)
        }));

        res.json({
            success: true,
            data: {
                totalServices: services.length,
                services: services
            }
        });

    } catch (error) {
        logger.error('UPS Kargo services error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Servis listesi alınamadı',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/cities:
 *   get:
 *     summary: Desteklenen şehirler
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Şehir listesi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/cities', auth, rateLimiter, async (req, res) => {
    try {
        const cities = Object.keys(upsTracker.cityCodes).map(cityName => ({
            name: cityName,
            code: upsTracker.cityCodes[cityName]
        }));

        res.json({
            success: true,
            data: {
                totalCities: cities.length,
                cities: cities
            }
        });

    } catch (error) {
        logger.error('UPS Kargo cities error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Şehir listesi alınamadı',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/status:
 *   get:
 *     summary: UPS Kargo API durumu
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API durum bilgileri
 *       500:
 *         description: Sunucu hatası
 */
router.get('/status', auth, rateLimiter, async (req, res) => {
    try {
        const status = upsTracker.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('UPS Kargo status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Durum bilgisi alınamadı',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/test:
 *   get:
 *     summary: UPS Kargo API bağlantı testi
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bağlantı testi sonucu
 *       500:
 *         description: Bağlantı hatası
 */
router.get('/test', auth, rateLimiter, async (req, res) => {
    try {
        const testResult = await upsTracker.testConnection();
        
        if (testResult.success) {
            res.json({
                success: true,
                message: 'UPS Kargo API bağlantısı başarılı',
                data: testResult
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'UPS Kargo API bağlantısı başarısız',
                error: testResult.message
            });
        }
    } catch (error) {
        logger.error('UPS Kargo test connection error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Bağlantı testi hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/ups-cargo/validate/{trackingNumber}:
 *   get:
 *     summary: Takip numarası format doğrulaması
 *     tags: [UPS Kargo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Doğrulanacak takip numarası
 *     responses:
 *       200:
 *         description: Doğrulama sonucu
 *       400:
 *         description: Geçersiz takip numarası
 */
router.get('/validate/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Takip numarası gereklidir'
            });
        }

        const isValid = trackingNumber.length >= 6 && trackingNumber.length <= 35;
        const isInternational = upsTracker.isInternational(trackingNumber);
        const recommendedType = isInternational ? 'international' : 'domestic';

        res.json({
            success: true,
            data: {
                trackingNumber: trackingNumber,
                isValid: isValid,
                isInternational: isInternational,
                recommendedType: recommendedType,
                length: trackingNumber.length,
                format: trackingNumber.match(/^[A-Z0-9]+$/i) ? 'alphanumeric' : 'mixed'
            }
        });

    } catch (error) {
        logger.error('UPS Kargo validation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Doğrulama hatası',
            error: error.message
        });
    }
});

module.exports = router; 