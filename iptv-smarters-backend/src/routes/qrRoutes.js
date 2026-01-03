const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

// GET /api/qr/generate - Generate QR code image
router.get('/generate', qrController.generateQRCode);

module.exports = router;
