const express = require('express');
const router = express.Router();
const ArasCargoTracker = require('../../services/ArasCargoTracker');
const { protect: auth } = require('../../middleware/auth');
const rateLimiter = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

// Aras Kargo Tracker instance
const arasTracker = new ArasCargoTracker();

/**
 * @swagger
 * components:
 *   schemas:
 *     ArasCargoTracking:
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
 *             branch:
 *               type: string
 *         recipient:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             city:
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
 * /api/v1/aras-cargo/track/{trackingNumber}:
 *   get:
 *     summary: Takip numarası ile kargo sorgulama
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Aras Kargo takip numarası
 *     responses:
 *       200:
 *         description: Kargo bilgisi bulundu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArasCargoTracking'
 *       404:
 *         description: Kargo bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/track/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        if (!trackingNumber || trackingNumber.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir takip numarası giriniz'
            });
        }

        logger.info(`Aras Kargo tracking request: ${trackingNumber}`);

        const result = await arasTracker.trackByNumber(trackingNumber);

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
        logger.error('Aras Kargo tracking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Kargo takip hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/track/bulk:
 *   post:
 *     summary: Çoklu kargo takibi
 *     tags: [Aras Kargo]
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
 *                 maxItems: 50
 *                 description: Takip numaraları listesi (maksimum 50 adet)
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
        const { trackingNumbers } = req.body;

        if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Takip numaraları listesi gereklidir'
            });
        }

        if (trackingNumbers.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Maksimum 50 takip numarası sorgulanabilir'
            });
        }

        logger.info(`Aras Kargo bulk tracking request: ${trackingNumbers.length} items`);

        const results = await arasTracker.trackMultiple(trackingNumbers);

        res.json({
            success: true,
            data: {
                total: trackingNumbers.length,
                found: results.filter(r => r !== null).length,
                results: results
            }
        });

    } catch (error) {
        logger.error('Aras Kargo bulk tracking error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Çoklu takip hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/cargos/date-range:
 *   post:
 *     summary: Tarih aralığında kargo listesi
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Başlangıç tarihi (DD-MM-YYYY)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Bitiş tarihi (DD-MM-YYYY)
 *     responses:
 *       200:
 *         description: Kargo listesi
 *       400:
 *         description: Geçersiz tarih aralığı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/cargos/date-range', auth, rateLimiter, async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Başlangıç ve bitiş tarihleri gereklidir'
            });
        }

        // Tarih formatını kontrol et (DD-MM-YYYY)
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Tarih formatı DD-MM-YYYY olmalıdır'
            });
        }

        logger.info(`Aras Kargo date range request: ${startDate} to ${endDate}`);

        const results = await arasTracker.getCargosByDateRange(startDate, endDate);

        res.json({
            success: true,
            data: {
                dateRange: { startDate, endDate },
                count: results.length,
                cargos: results
            }
        });

    } catch (error) {
        logger.error('Aras Kargo date range error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tarih aralığı sorgu hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/cargos/delivered/{date}:
 *   get:
 *     summary: Belirtilen tarihte teslim edilen kargolar
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Tarih (DD-MM-YYYY formatında)
 *     responses:
 *       200:
 *         description: Teslim edilen kargo listesi
 *       400:
 *         description: Geçersiz tarih formatı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/cargos/delivered/:date', auth, rateLimiter, async (req, res) => {
    try {
        const { date } = req.params;

        // Tarih formatını kontrol et (DD-MM-YYYY)
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Tarih formatı DD-MM-YYYY olmalıdır'
            });
        }

        logger.info(`Aras Kargo delivered cargos request: ${date}`);

        const results = await arasTracker.getDeliveredCargos(date);

        res.json({
            success: true,
            data: {
                date: date,
                deliveredCount: results.length,
                cargos: results
            }
        });

    } catch (error) {
        logger.error('Aras Kargo delivered cargos error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Teslim edilen kargolar sorgu hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/cargos/undelivered:
 *   get:
 *     summary: Henüz teslim edilmemiş kargolar
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teslim edilmemiş kargo listesi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/cargos/undelivered', auth, rateLimiter, async (req, res) => {
    try {
        logger.info('Aras Kargo undelivered cargos request');

        const results = await arasTracker.getUndeliveredCargos();

        res.json({
            success: true,
            data: {
                undeliveredCount: results.length,
                cargos: results
            }
        });

    } catch (error) {
        logger.error('Aras Kargo undelivered cargos error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Teslim edilmemiş kargolar sorgu hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/branches:
 *   get:
 *     summary: Aras Kargo şube listesi
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Şube listesi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/branches', auth, rateLimiter, async (req, res) => {
    try {
        logger.info('Aras Kargo branches request');

        const branches = await arasTracker.getBranches();

        res.json({
            success: true,
            data: {
                branchCount: branches.length,
                branches: branches
            }
        });

    } catch (error) {
        logger.error('Aras Kargo branches error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Şube listesi sorgu hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/movements/{trackingNumber}:
 *   get:
 *     summary: Kargo hareket detayları
 *     tags: [Aras Kargo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Takip numarası
 *     responses:
 *       200:
 *         description: Hareket detayları
 *       400:
 *         description: Geçersiz takip numarası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/movements/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        if (!trackingNumber || trackingNumber.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir takip numarası giriniz'
            });
        }

        logger.info(`Aras Kargo movements request: ${trackingNumber}`);

        const movements = await arasTracker.getCargoMovements(trackingNumber);

        res.json({
            success: true,
            data: {
                trackingNumber: trackingNumber,
                movementCount: movements.length,
                movements: movements
            }
        });

    } catch (error) {
        logger.error('Aras Kargo movements error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Hareket detayları sorgu hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/calculate-cost:
 *   post:
 *     summary: Kargo ücret tahmini
 *     tags: [Aras Kargo]
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
 *                 description: Servis tipi
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
        const { fromCity, toCity, weight, serviceType } = req.body;

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

        logger.info(`Aras Kargo cost calculation: ${fromCity} to ${toCity}, ${weight}kg`);

        const result = await arasTracker.calculateShippingCost({
            fromCity,
            toCity,
            weight,
            serviceType
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Aras Kargo cost calculation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Ücret hesaplama hatası',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/status:
 *   get:
 *     summary: Aras Kargo API durumu
 *     tags: [Aras Kargo]
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
        const status = arasTracker.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Aras Kargo status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Durum bilgisi alınamadı',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/v1/aras-cargo/test:
 *   get:
 *     summary: Aras Kargo API bağlantı testi
 *     tags: [Aras Kargo]
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
        const testResult = await arasTracker.testConnection();
        
        if (testResult.success) {
            res.json({
                success: true,
                message: 'Aras Kargo API bağlantısı başarılı',
                data: testResult
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Aras Kargo API bağlantısı başarısız',
                error: testResult.message
            });
        }
    } catch (error) {
        logger.error('Aras Kargo test connection error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Bağlantı testi hatası',
            error: error.message
        });
    }
});

module.exports = router; 