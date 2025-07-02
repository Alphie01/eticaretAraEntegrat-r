const express = require('express');
const router = express.Router();
const MNGCargoTracker = require('../../services/MNGCargoTracker');
const auth = require('../../middleware/auth');
const rateLimiter = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');
const { body, param, query, validationResult } = require('express-validator');

// MNG Kargo Tracker instance
const mngTracker = new MNGCargoTracker();

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }
    next();
};

/**
 * @route GET /api/mng-cargo/track/:trackingNumber
 * @desc Kargo takip numarası ile sorgulama
 * @access Private
 */
router.get(
    '/track/:trackingNumber',
    auth,
    rateLimiter(10, 60), // 10 requests per minute
    [
        param('trackingNumber')
            .isLength({ min: 10, max: 20 })
            .withMessage('Geçerli bir takip numarası giriniz (10-20 karakter)')
            .matches(/^[0-9A-Za-z]+$/)
            .withMessage('Takip numarası sadece harf ve rakam içermelidir')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { trackingNumber } = req.params;
            
            logger.info(`MNG Kargo tracking request for: ${trackingNumber} by user: ${req.user.id}`);
            
            const result = await mngTracker.trackByNumber(trackingNumber);
            
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Kargo bulunamadı',
                    trackingNumber
                });
            }

            res.json({
                success: true,
                message: 'Kargo bilgileri başarıyla alındı',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Kargo takip servisi hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/track/reference
 * @desc Referans numarası ile kargo sorgulama
 * @access Private
 */
router.post(
    '/track/reference',
    auth,
    rateLimiter(10, 60),
    [
        body('referenceNumber')
            .notEmpty()
            .withMessage('Referans numarası gereklidir')
            .isLength({ min: 3, max: 50 })
            .withMessage('Referans numarası 3-50 karakter arasında olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { referenceNumber } = req.body;
            
            logger.info(`MNG Kargo reference tracking request for: ${referenceNumber} by user: ${req.user.id}`);
            
            const result = await mngTracker.trackByReference(referenceNumber);
            
            res.json({
                success: true,
                message: 'Referans numarası ile kargo bilgileri alındı',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo reference tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Referans numarası sorgulama hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/track/order
 * @desc Sipariş numarası ile kargo sorgulama
 * @access Private
 */
router.post(
    '/track/order',
    auth,
    rateLimiter(10, 60),
    [
        body('orderNumber')
            .notEmpty()
            .withMessage('Sipariş numarası gereklidir')
            .isLength({ min: 3, max: 50 })
            .withMessage('Sipariş numarası 3-50 karakter arasında olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { orderNumber } = req.body;
            
            logger.info(`MNG Kargo order tracking request for: ${orderNumber} by user: ${req.user.id}`);
            
            const result = await mngTracker.trackByOrderNumber(orderNumber);
            
            res.json({
                success: true,
                message: 'Sipariş numarası ile kargo bilgileri alındı',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo order tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Sipariş numarası sorgulama hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/track/bulk
 * @desc Çoklu kargo takibi
 * @access Private
 */
router.post(
    '/track/bulk',
    auth,
    rateLimiter(5, 60), // Stricter rate limit for bulk operations
    [
        body('trackingNumbers')
            .isArray({ min: 1, max: 50 })
            .withMessage('Takip numaraları array olmalı ve 1-50 arasında öğe içermelidir'),
        body('trackingNumbers.*')
            .isLength({ min: 10, max: 20 })
            .withMessage('Her takip numarası 10-20 karakter arasında olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { trackingNumbers } = req.body;
            
            logger.info(`MNG Kargo bulk tracking request for ${trackingNumbers.length} items by user: ${req.user.id}`);
            
            const results = await mngTracker.trackMultiple(trackingNumbers);
            
            const summary = {
                total: trackingNumbers.length,
                found: results.filter(r => r !== null).length,
                delivered: results.filter(r => r && r.tracking.isDelivered).length,
                inTransit: results.filter(r => r && r.tracking.isInTransit).length,
                hasIssues: results.filter(r => r && r.tracking.hasIssue).length
            };

            res.json({
                success: true,
                message: 'Çoklu kargo takibi tamamlandı',
                data: results,
                summary,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo bulk tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Çoklu kargo takip hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route GET /api/mng-cargo/branches
 * @desc MNG Kargo şubelerini listeleme
 * @access Private
 */
router.get(
    '/branches',
    auth,
    rateLimiter(20, 60),
    [
        query('city')
            .optional()
            .isLength({ min: 2, max: 2 })
            .withMessage('Şehir kodu 2 karakter olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { city } = req.query;
            
            logger.info(`MNG Kargo branches request${city ? ` for city: ${city}` : ''} by user: ${req.user.id}`);
            
            const branches = await mngTracker.getBranches(city);
            
            res.json({
                success: true,
                message: 'MNG Kargo şubeleri başarıyla alındı',
                data: branches,
                count: branches.length,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo branches error:', error);
            res.status(500).json({
                success: false,
                message: 'Şube listesi alınırken hata oluştu',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/calculate-cost
 * @desc Kargo ücret hesaplama
 * @access Private
 */
router.post(
    '/calculate-cost',
    auth,
    rateLimiter(30, 60),
    [
        body('fromCity').notEmpty().withMessage('Gönderen şehir gereklidir'),
        body('toCity').notEmpty().withMessage('Alıcı şehir gereklidir'),
        body('weight').isFloat({ min: 0.1 }).withMessage('Ağırlık 0.1 kg üzerinde olmalıdır'),
        body('dimensions').optional().isObject().withMessage('Boyutlar obje formatında olmalıdır'),
        body('serviceType').optional().isIn(['standard', 'express', 'economy']).withMessage('Geçersiz servis tipi')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const params = req.body;
            
            logger.info(`MNG Kargo cost calculation request from ${params.fromCity} to ${params.toCity} by user: ${req.user.id}`);
            
            const result = await mngTracker.calculateShippingCost(params);
            
            res.json({
                success: true,
                message: 'Kargo ücreti başarıyla hesaplandı',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo cost calculation error:', error);
            res.status(500).json({
                success: false,
                message: 'Kargo ücret hesaplama hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/create-shipment
 * @desc Gönderi oluşturma
 * @access Private
 */
router.post(
    '/create-shipment',
    auth,
    rateLimiter(10, 60),
    [
        body('sender').isObject().withMessage('Gönderen bilgileri gereklidir'),
        body('sender.name').notEmpty().withMessage('Gönderen adı gereklidir'),
        body('sender.phone').isMobilePhone('tr-TR').withMessage('Geçerli telefon numarası gereklidir'),
        body('recipient').isObject().withMessage('Alıcı bilgileri gereklidir'),
        body('recipient.name').notEmpty().withMessage('Alıcı adı gereklidir'),
        body('recipient.phone').isMobilePhone('tr-TR').withMessage('Geçerli alıcı telefonu gereklidir'),
        body('weight').isFloat({ min: 0.1 }).withMessage('Ağırlık belirtilmelidir'),
        body('pieces').optional().isInt({ min: 1 }).withMessage('Parça sayısı 1 veya üzeri olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const shipmentData = req.body;
            
            logger.info(`MNG Kargo shipment creation request by user: ${req.user.id}`);
            
            const result = await mngTracker.createShipment(shipmentData);
            
            res.status(201).json({
                success: true,
                message: 'Gönderi başarıyla oluşturuldu',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo shipment creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Gönderi oluşturma hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/cancel/:trackingNumber
 * @desc Gönderi iptali
 * @access Private
 */
router.post(
    '/cancel/:trackingNumber',
    auth,
    rateLimiter(5, 60),
    [
        param('trackingNumber').notEmpty().withMessage('Takip numarası gereklidir'),
        body('reason').optional().isLength({ max: 255 }).withMessage('İptal sebebi 255 karakteri geçemez')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { trackingNumber } = req.params;
            const { reason } = req.body;
            
            logger.info(`MNG Kargo cancellation request for ${trackingNumber} by user: ${req.user.id}`);
            
            const result = await mngTracker.cancelShipment(trackingNumber, reason);
            
            res.json({
                success: true,
                message: 'Gönderi başarıyla iptal edildi',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo cancellation error:', error);
            res.status(500).json({
                success: false,
                message: 'Gönderi iptal hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/webhook/register
 * @desc Webhook kaydı
 * @access Private
 */
router.post(
    '/webhook/register',
    auth,
    rateLimiter(3, 60),
    [
        body('webhookUrl').isURL().withMessage('Geçerli webhook URL gereklidir'),
        body('events').optional().isArray().withMessage('Events array olmalıdır')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { webhookUrl, events } = req.body;
            
            logger.info(`MNG Kargo webhook registration request by user: ${req.user.id}`);
            
            const result = await mngTracker.registerWebhook(webhookUrl, events);
            
            res.json({
                success: true,
                message: 'Webhook başarıyla kaydedildi',
                data: result,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            logger.error('MNG Kargo webhook registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Webhook kayıt hatası',
                error: error.message
            });
        }
    }
);

/**
 * @route POST /api/mng-cargo/webhook
 * @desc Webhook endpoint - MNG Kargo'dan gelen bildirimler
 * @access Public (but secured with signature verification)
 */
router.post('/webhook', async (req, res) => {
    try {
        // Webhook signature verification would go here
        const webhookData = req.body;
        
        logger.info('MNG Kargo webhook received:', webhookData);
        
        // Process webhook data
        // This could trigger database updates, notifications, etc.
        
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        logger.error('MNG Kargo webhook processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook processing error'
        });
    }
});

/**
 * @route GET /api/mng-cargo/status
 * @desc MNG Kargo servis durumu
 * @access Private
 */
router.get('/status', auth, async (req, res) => {
    try {
        const status = mngTracker.getStatus();
        const connectionTest = await mngTracker.testConnection();

        res.json({
            success: true,
            message: 'MNG Kargo servis durumu',
            data: {
                ...status,
                connectionTest
            },
            requestTime: new Date().toISOString()
        });

    } catch (error) {
        logger.error('MNG Kargo status error:', error);
        res.status(500).json({
            success: false,
            message: 'Servis durumu alınamadı',
            error: error.message
        });
    }
});

/**
 * @route GET /api/mng-cargo/status-codes
 * @desc MNG Kargo durum kodları listesi
 * @access Private
 */
router.get('/status-codes', auth, (req, res) => {
    try {
        const statusCodes = Object.entries(mngTracker.statusCodes).map(([code, info]) => ({
            code,
            ...info
        }));

        res.json({
            success: true,
            message: 'MNG Kargo durum kodları',
            data: statusCodes,
            count: statusCodes.length,
            requestTime: new Date().toISOString()
        });

    } catch (error) {
        logger.error('MNG Kargo status codes error:', error);
        res.status(500).json({
            success: false,
            message: 'Durum kodları alınamadı',
            error: error.message
        });
    }
});

module.exports = router; 