const { Consent } = require('../models');

/**
 * Middleware to check user consent before processing analytics data
 * Required for GDPR/CCPA compliance
 */
const checkConsent = async (req, res, next) => {
    try {
        const { anonUserId } = req.body;

        if (!anonUserId) {
            return res.status(400).json({ error: 'Anonymous user ID required' });
        }

        const consent = await Consent.findOne({
            where: {
                anonUserId,
                isActive: true,
                dataSharingOptIn: true
            },
            order: [['consentTimestamp', 'DESC']]
        });

        if (!consent) {
            return res.status(403).json({
                error: 'User has not consented to data sharing',
                requiresConsent: true
            });
        }

        // Attach consent info to request
        req.consent = consent;
        next();
    } catch (error) {
        console.error('Consent check error:', error);
        res.status(500).json({ error: 'Failed to verify consent' });
    }
};

module.exports = checkConsent;
