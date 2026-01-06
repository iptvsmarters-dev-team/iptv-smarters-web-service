const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const checkConsent = require('../middleware/checkConsent');

/**
 * ANALYTICS ROUTES
 * Privacy-compliant data collection
 */

// POST /api/analytics/user - Register anonymous user
router.post('/user', analyticsController.registerAnonUser);

// POST /api/analytics/consent - Record user consent
router.post('/consent', analyticsController.recordConsent);

// POST /api/analytics/consent/withdraw - Withdraw consent (GDPR)
router.post('/consent/withdraw', analyticsController.withdrawConsent);

// POST /api/analytics/session - Record playback session (requires consent)
router.post('/session', checkConsent, analyticsController.recordPlaybackSession);

// PUT /api/analytics/session/:sessionId - Update playback session
router.put('/session/:sessionId', analyticsController.updatePlaybackSession);

// POST /api/analytics/error - Record playback error
router.post('/error', analyticsController.recordPlaybackError);

module.exports = router;
