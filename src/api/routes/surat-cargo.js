const express = require('express');
const router = express.Router();
const SuratCargoTracker = require('../../services/SuratCargoTracker');
const auth = require('../../middleware/auth');
const rateLimit = require('../../middleware/rateLimit');
const logger = require('../../utils/logger');

const suratCargo = new SuratCargoTracker();

/**
 * @swagger
 * components:
 *   schemas:
 *     SuratCargoTracking:
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
 *         lastUpdate:
 *           type: string
 *           format: date-time
 *           description: Son güncelleme tarihi
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 *           description: Tahmini teslimat tarihi
 */

/**
 * @swagger
 * /api/surat-cargo/track/{trackingNumber}:
 *   get:
 *     summary: Sürat Kargo takip
 *     tags: [Sürat Kargo]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Takip numarası
 *     responses:
 *       200:
 *         description: Başarılı takip sonucu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuratCargoTracking'
 */
router.get('/track/:trackingNumber', rateLimit, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        
        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Takip numarası gerekli'
            });
        }

        const result = await suratCargo.trackShipment(trackingNumber);
        
        logger.info(`Sürat Kargo tracking successful for: ${trackingNumber}`);
        res.json(result);
    } catch (error) {
        logger.error(`Sürat Kargo tracking error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/track/detail/{trackingNumber}:
 *   get:
 *     summary: Sürat Kargo detaylı takip
 *     tags: [Sürat Kargo]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Takip numarası
 *     responses:
 *       200:
 *         description: Detaylı takip sonucu
 */
router.get('/track/detail/:trackingNumber', rateLimit, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        
        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Takip numarası gerekli'
            });
        }

        const result = await suratCargo.trackShipmentDetail(trackingNumber);
        
        logger.info(`Sürat Kargo detail tracking successful for: ${trackingNumber}`);
        res.json(result);
    } catch (error) {
        logger.error(`Sürat Kargo detail tracking error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/track/bulk:
 *   post:
 *     summary: Çoklu Sürat Kargo takip
 *     tags: [Sürat Kargo]
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
 *                 description: Takip numaraları listesi (max 50)
 *     responses:
 *       200:
 *         description: Çoklu takip sonucu
 */
router.post('/track/bulk', auth, rateLimit, async (req, res) => {
    try {
        const { trackingNumbers } = req.body;
        
        if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
            return res.status(400).json({
                success: false,
                message: 'Takip numaraları array formatında olmalı'
            });
        }

        if (trackingNumbers.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Maksimum 50 takip numarası gönderilebilir'
            });
        }

        const result = await suratCargo.trackMultiple(trackingNumbers);
        
        logger.info(`Sürat Kargo bulk tracking successful for ${trackingNumbers.length} items`);
        res.json(result);
    } catch (error) {
        logger.error(`Sürat Kargo bulk tracking error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/shipment/create:
 *   post:
 *     summary: Sürat Kargo gönderi oluştur
 *     tags: [Sürat Kargo]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderName
 *               - senderAddress
 *               - receiverName
 *               - receiverAddress
 *               - receiverPhone
 *             properties:
 *               senderName:
 *                 type: string
 *               senderAddress:
 *                 type: string
 *               senderCity:
 *                 type: string
 *               receiverName:
 *                 type: string
 *               receiverAddress:
 *                 type: string
 *               receiverCity:
 *                 type: string
 *               receiverPhone:
 *                 type: string
 *               weight:
 *                 type: number
 *               serviceType:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, NEXT_DAY, SAME_DAY, ECONOMY, CARGO_PLUS, INTERNATIONAL, COLLECTION]
 */
router.post('/shipment/create', auth, rateLimit, async (req, res) => {
    try {
        const shipmentData = req.body;

        const result = await suratCargo.createShipment(shipmentData);
        
        logger.info(`Sürat Kargo shipment created: ${result.data?.trackingNumber}`);
        res.status(201).json(result);
    } catch (error) {
        logger.error(`Sürat Kargo shipment creation error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/shipment/cancel:
 *   post:
 *     summary: Sürat Kargo gönderi iptal
 *     tags: [Sürat Kargo]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumber
 *             properties:
 *               trackingNumber:
 *                 type: string
 *               reason:
 *                 type: string
 */
router.post('/shipment/cancel', auth, rateLimit, async (req, res) => {
    try {
        const { trackingNumber, reason } = req.body;
        
        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: 'Takip numarası gerekli'
            });
        }

        const result = await suratCargo.cancelShipment(trackingNumber, reason);
        
        logger.info(`Sürat Kargo shipment cancelled: ${trackingNumber}`);
        res.json(result);
    } catch (error) {
        logger.error(`Sürat Kargo cancellation error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/pricing/calculate:
 *   post:
 *     summary: Sürat Kargo fiyat hesapla
 *     tags: [Sürat Kargo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromCity:
 *                 type: string
 *               toCity:
 *                 type: string
 *               weight:
 *                 type: number
 *               desi:
 *                 type: number
 *               serviceType:
 *                 type: string
 */
router.post('/pricing/calculate', rateLimit, async (req, res) => {
    try {
        const pricingParams = req.body;

        const result = await suratCargo.calculateShippingCost(pricingParams);
        
        logger.info(`Sürat Kargo pricing calculated for ${pricingParams.fromCity} to ${pricingParams.toCity}`);
        res.json(result);
    } catch (error) {
        logger.error(`Sürat Kargo pricing error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/services:
 *   get:
 *     summary: Sürat Kargo servis tipleri
 *     tags: [Sürat Kargo]
 *     responses:
 *       200:
 *         description: Mevcut servis tipleri
 */
router.get('/services', async (req, res) => {
    try {
        const services = Object.keys(suratCargo.serviceTypes).map(serviceType => {
            return suratCargo.getServiceInfo(serviceType);
        });

        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        logger.error(`Sürat Kargo services error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/cities:
 *   get:
 *     summary: Desteklenen şehirler
 *     tags: [Sürat Kargo]
 *     responses:
 *       200:
 *         description: Desteklenen şehir listesi
 */
router.get('/cities', async (req, res) => {
    try {
        const cities = Object.entries(suratCargo.cityCodes).map(([name, code]) => ({
            name,
            code
        }));

        res.json({
            success: true,
            data: cities
        });
    } catch (error) {
        logger.error(`Sürat Kargo cities error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/status:
 *   get:
 *     summary: API durum bilgisi
 *     tags: [Sürat Kargo]
 *     responses:
 *       200:
 *         description: API durum bilgisi
 */
router.get('/status', async (req, res) => {
    try {
        const status = await suratCargo.getAPIStatus();
        res.json(status);
    } catch (error) {
        logger.error(`Sürat Kargo status error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/test:
 *   get:
 *     summary: Bağlantı testi
 *     tags: [Sürat Kargo]
 *     responses:
 *       200:
 *         description: Bağlantı test sonucu
 */
router.get('/test', async (req, res) => {
    try {
        const testResult = await suratCargo.testConnection();
        res.json(testResult);
    } catch (error) {
        logger.error(`Sürat Kargo test error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/surat-cargo/validate/{trackingNumber}:
 *   get:
 *     summary: Takip numarası doğrulaması
 *     tags: [Sürat Kargo]
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
 */
router.get('/validate/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        
        const validation = suratCargo.validateTrackingNumber(trackingNumber);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        logger.error(`Sürat Kargo validation error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 