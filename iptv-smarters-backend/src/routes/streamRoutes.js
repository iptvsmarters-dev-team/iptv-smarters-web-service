/**
 * Stream Routes
 * Handles stream proxying to bypass CORS restrictions
 */

const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

// Handle CORS preflight
router.options('/proxy', streamController.handleOptions);
router.options('/playlist', streamController.handleOptions);

// Proxy a stream URL
router.get('/proxy', streamController.proxyStream);

// Proxy a playlist URL
router.get('/playlist', streamController.proxyPlaylist);

module.exports = router;
