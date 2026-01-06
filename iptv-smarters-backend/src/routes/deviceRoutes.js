const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const verifyToken = require('../middleware/verifyToken');

// All routes require token verification
router.use(verifyToken);

// POST /api/devices/register - Register or update device
router.post('/register', deviceController.registerDevice);

// GET /api/devices - Get device info with playlists
router.get('/', deviceController.getDevice);

// PUT /api/devices - Update device
router.put('/', deviceController.updateDevice);

// PUT /api/devices/last-played - Save last played channel
router.put('/last-played', deviceController.saveLastPlayed);

// GET /api/devices/last-played - Get last played channel
router.get('/last-played', deviceController.getLastPlayed);

module.exports = router;
