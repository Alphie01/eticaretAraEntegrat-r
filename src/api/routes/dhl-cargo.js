const express = require('express');
const router = express.Router();
const DHLCargoTracker = require('../../services/DHLCargoTracker');
const logger = require('../../utils/logger');

const dhlTracker = new DHLCargoTracker();

/**
 * @swagger
 * tags:
 *   name: DHL Cargo
 *   description: DHL kargo takip işlemleri
 */

/**
 * @swagger
 * /dhl-cargo/track/{trackingNumber}:
 *   get:
 *     summary: Bir DHL gönderisini takip numarasıyla sorgular
 *     tags: [DHL Cargo]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: Takip edilecek kargo numarası
 *     responses:
 *       200:
 *         description: Kargo takip detayları başarıyla alındı.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Normalize edilmiş kargo bilgisi.
 *       404:
 *         description: Gönderi bulunamadı.
 *       500:
 *         description: Sunucu hatası veya API ile iletişim kurulamadı.
 */
router.get('/track/:trackingNumber', async (req, res, next) => {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
        return res.status(400).json({ success: false, message: 'Tracking number is required.' });
    }

    try {
        const trackingInfo = await dhlTracker.trackByNumber(trackingNumber);
        if (trackingInfo.status === 'NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Shipment not found.' });
        }
        res.json({ success: true, data: trackingInfo });
    } catch (error) {
        logger.error(`Error tracking DHL shipment ${trackingNumber}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Failed to track shipment.' });
    }
});

module.exports = router; 