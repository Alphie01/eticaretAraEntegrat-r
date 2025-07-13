const express = require('express');
const YurticiCargoTracker = require('../../services/YurticiCargoTracker');
const { protect: auth } = require('../../middleware/auth');
const rateLimiter = require('../../middleware/rateLimiter');
const logger = require('../../utils/logger');

const router = express.Router();
const yurticiTracker = new YurticiCargoTracker();

/**
 * @swagger
 * components:
 *   schemas:
 *     YurticiShipmentData:
 *       type: object
 *       required:
 *         - receiverCustName
 *         - receiverAddress
 *         - receiverPhone1
 *       properties:
 *         receiverCustName:
 *           type: string
 *           description: Alıcı adı (min 5 karakter, en az 4 harf)
 *         receiverAddress:
 *           type: string
 *           description: Alıcı adresi (min 5 max 200 karakter)
 *         receiverPhone1:
 *           type: string
 *           description: Alıcı telefon-1 (alan kodu ile 10 rakam)
 *         cityName:
 *           type: string
 *           description: Şehir adı
 *         townName:
 *           type: string
 *           description: İlçe adı
 *         receiverPhone2:
 *           type: string
 *           description: Alıcı telefon-2 (opsiyonel)
 *         emailAddress:
 *           type: string
 *           description: E-posta adresi
 *         desi:
 *           type: string
 *           description: Desi bilgisi
 *         kg:
 *           type: string
 *           description: Ağırlık (kg)
 *         cargoCount:
 *           type: string
 *           description: Kargo adedi
 *         description:
 *           type: string
 *           description: Kargo açıklaması
 */

// GET /api/yurtici-cargo/track/{trackingNumber}
router.get('/track/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const { keyType = 0 } = req.query;

        // Takip numarası doğrulama
        const validation = yurticiTracker.validateTrackingNumber(trackingNumber);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.message,
                code: 'INVALID_TRACKING_NUMBER'
            });
        }

        const result = await yurticiTracker.queryShipment(
            validation.cleanedNumber, 
            parseInt(keyType), 
            true, 
            false
        );

        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.message,
                code: 'SHIPMENT_NOT_FOUND'
            });
        }

        logger.info(`Yurtiçi Kargo tracking successful for: ${trackingNumber}`);
        res.json({
            success: true,
            data: result.data,
            message: result.message,
            provider: 'Yurtiçi Kargo'
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo track error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'TRACKING_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/track/detail/{trackingNumber}
router.get('/track/detail/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const { keyType = 0 } = req.query;

        const validation = yurticiTracker.validateTrackingNumber(trackingNumber);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: validation.message,
                code: 'INVALID_TRACKING_NUMBER'
            });
        }

        const result = await yurticiTracker.queryShipmentDetail(
            validation.cleanedNumber, 
            parseInt(keyType), 
            true, 
            false
        );

        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: result.message,
                code: 'SHIPMENT_NOT_FOUND'
            });
        }

        logger.info(`Yurtiçi Kargo detail tracking successful for: ${trackingNumber}`);
        res.json({
            success: true,
            data: result.data,
            message: result.message,
            provider: 'Yurtiçi Kargo'
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo detail track error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'DETAIL_TRACKING_ERROR'
        });
    }
});

// POST /api/yurtici-cargo/track/bulk
router.post('/track/bulk', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumbers, keyType = 0 } = req.body;

        if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
            return res.status(400).json({
                success: false,
                error: 'trackingNumbers array is required',
                code: 'INVALID_REQUEST'
            });
        }

        if (trackingNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one tracking number is required',
                code: 'EMPTY_TRACKING_NUMBERS'
            });
        }

        if (trackingNumbers.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 tracking numbers allowed',
                code: 'TOO_MANY_TRACKING_NUMBERS'
            });
        }

        // Takip numaralarını doğrula
        const validTrackingNumbers = [];
        const invalidNumbers = [];

        for (const number of trackingNumbers) {
            const validation = yurticiTracker.validateTrackingNumber(number);
            if (validation.isValid) {
                validTrackingNumbers.push(validation.cleanedNumber);
            } else {
                invalidNumbers.push({ number, error: validation.message });
            }
        }

        const result = await yurticiTracker.trackMultiple(validTrackingNumbers, parseInt(keyType));

        logger.info(`Yurtiçi Kargo bulk tracking: ${validTrackingNumbers.length} numbers processed`);
        res.json({
            success: true,
            data: result,
            invalidNumbers: invalidNumbers,
            provider: 'Yurtiçi Kargo',
            summary: {
                total: trackingNumbers.length,
                valid: validTrackingNumbers.length,
                invalid: invalidNumbers.length,
                processed: result.processed
            }
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo bulk track error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'BULK_TRACKING_ERROR'
        });
    }
});

// POST /api/yurtici-cargo/shipment/create
router.post('/shipment/create', auth, rateLimiter, async (req, res) => {
    try {
        const shipmentData = req.body;

        // Zorunlu alanları kontrol et
        const requiredFields = ['receiverCustName', 'receiverAddress', 'receiverPhone1'];
        const missingFields = requiredFields.filter(field => !shipmentData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`,
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        const result = await yurticiTracker.createShipment(shipmentData);

        logger.info(`Yurtiçi Kargo shipment created: ${result.data.cargoKey}`);
        res.status(201).json({
            success: true,
            data: result.data,
            message: result.message,
            provider: 'Yurtiçi Kargo'
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo create shipment error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SHIPMENT_CREATION_ERROR'
        });
    }
});

// POST /api/yurtici-cargo/shipment/cancel
router.post('/shipment/cancel', auth, rateLimiter, async (req, res) => {
    try {
        const { cargoKeys } = req.body;

        if (!cargoKeys) {
            return res.status(400).json({
                success: false,
                error: 'cargoKeys is required',
                code: 'MISSING_CARGO_KEYS'
            });
        }

        const result = await yurticiTracker.cancelShipment(cargoKeys);

        logger.info(`Yurtiçi Kargo shipment cancelled: ${cargoKeys}`);
        res.json({
            success: true,
            data: result.data,
            message: result.message,
            provider: 'Yurtiçi Kargo'
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo cancel shipment error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SHIPMENT_CANCELLATION_ERROR'
        });
    }
});

// POST /api/yurtici-cargo/pricing/calculate
router.post('/pricing/calculate', auth, rateLimiter, async (req, res) => {
    try {
        const params = req.body;

        const result = await yurticiTracker.calculateShippingCost(params);

        logger.info(`Yurtiçi Kargo pricing calculated: ${result.estimatedCost} ${result.currency}`);
        res.json({
            success: true,
            data: result,
            provider: 'Yurtiçi Kargo'
        });

    } catch (error) {
        logger.error('Yurtiçi Kargo pricing calculation error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'PRICING_CALCULATION_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/services
router.get('/services', auth, rateLimiter, async (req, res) => {
    try {
        const { serviceType } = req.query;

        if (serviceType) {
            const serviceInfo = yurticiTracker.getServiceInfo(serviceType);
            res.json({
                success: true,
                data: serviceInfo,
                provider: 'Yurtiçi Kargo'
            });
        } else {
            const allServices = Object.keys(yurticiTracker.serviceTypes).map(type => 
                yurticiTracker.getServiceInfo(type)
            );
            
            res.json({
                success: true,
                data: {
                    services: allServices,
                    total: allServices.length
                },
                provider: 'Yurtiçi Kargo'
            });
        }

        logger.info('Yurtiçi Kargo services info retrieved');

    } catch (error) {
        logger.error('Yurtiçi Kargo services error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SERVICES_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/cities
router.get('/cities', auth, rateLimiter, async (req, res) => {
    try {
        const cities = Object.entries(yurticiTracker.cityCodes).map(([name, code]) => ({
            name,
            code,
            formatted: `${name} (${code})`
        }));

        res.json({
            success: true,
            data: {
                cities: cities,
                total: cities.length
            },
            provider: 'Yurtiçi Kargo'
        });

        logger.info('Yurtiçi Kargo cities list retrieved');

    } catch (error) {
        logger.error('Yurtiçi Kargo cities error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'CITIES_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/status
router.get('/status', auth, rateLimiter, async (req, res) => {
    try {
        const status = yurticiTracker.getStatus();

        res.json({
            success: true,
            data: status
        });

        logger.info('Yurtiçi Kargo status retrieved');

    } catch (error) {
        logger.error('Yurtiçi Kargo status error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STATUS_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/test
router.get('/test', auth, rateLimiter, async (req, res) => {
    try {
        const testResult = await yurticiTracker.testConnection();

        res.json({
            success: testResult.success,
            data: testResult,
            provider: 'Yurtiçi Kargo'
        });

        logger.info(`Yurtiçi Kargo connection test: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
        logger.error('Yurtiçi Kargo test error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'CONNECTION_TEST_ERROR'
        });
    }
});

// GET /api/yurtici-cargo/validate/{trackingNumber}
router.get('/validate/:trackingNumber', auth, rateLimiter, async (req, res) => {
    try {
        const { trackingNumber } = req.params;

        const validation = yurticiTracker.validateTrackingNumber(trackingNumber);

        res.json({
            success: true,
            data: {
                trackingNumber: trackingNumber,
                isValid: validation.isValid,
                message: validation.message || 'Valid tracking number',
                cleanedNumber: validation.cleanedNumber,
                format: validation.format
            },
            provider: 'Yurtiçi Kargo'
        });

        logger.info(`Yurtiçi Kargo validation for ${trackingNumber}: ${validation.isValid}`);

    } catch (error) {
        logger.error('Yurtiçi Kargo validation error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR'
        });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    logger.error('Yurtiçi Kargo route error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error in Yurtiçi Kargo service',
        code: 'INTERNAL_ERROR'
    });
});

module.exports = router;
