const { AnonUser, Consent, PlaybackSession, PlaybackError } = require('../models');
const { generateAnonUserId, getRegionBucket, sanitizeData } = require('../utils/privacy');

/**
 * ANALYTICS CONTROLLER
 * All data collection requires consent
 * No PII stored - only anonymized data
 */

// Register anonymous user and get consent
const registerAnonUser = async (req, res) => {
    try {
        const data = sanitizeData(req.body);
        const {
            deviceType, osFamily, osVersion, appVersion,
            deviceBrand, networkType, countryCode
        } = data;

        const anonUserId = generateAnonUserId();
        const regionBucket = getRegionBucket(countryCode);

        // Map device brand to bucket
        const brandMap = {
            'samsung': 'samsung', 'lg': 'lg', 'sony': 'sony',
            'tcl': 'tcl', 'roku': 'roku', 'amazon': 'amazon',
            'apple': 'apple', 'google': 'google'
        };
        const deviceBrandBucket = brandMap[deviceBrand?.toLowerCase()] || 'other';

        const user = await AnonUser.create({
            anonUserId,
            deviceType: deviceType || 'tv',
            osFamily: osFamily || 'other',
            osVersionMajor: osVersion ? parseInt(osVersion.split('.')[0]) : null,
            appVersion,
            deviceBrandBucket,
            networkType: networkType || 'unknown',
            countryCode,
            regionBucket
        });

        res.status(201).json({
            success: true,
            anonUserId: user.anonUserId,
            requiresConsent: true
        });
    } catch (error) {
        console.error('Register anon user error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

// Record user consent
const recordConsent = async (req, res) => {
    try {
        const {
            anonUserId, consentVersion, region,
            dataSharingOptIn, analyticsOptIn, personalizedAdsOptIn
        } = req.body;

        if (!anonUserId) {
            return res.status(400).json({ error: 'Anonymous user ID required' });
        }

        const consent = await Consent.create({
            anonUserId,
            consentVersion: consentVersion || '1.0',
            region: region || 'other',
            dataSharingOptIn: dataSharingOptIn || false,
            analyticsOptIn: analyticsOptIn || false,
            personalizedAdsOptIn: personalizedAdsOptIn || false
        });

        res.status(201).json({ success: true, consent });
    } catch (error) {
        console.error('Record consent error:', error);
        res.status(500).json({ error: 'Failed to record consent' });
    }
};

// Withdraw consent (GDPR right to be forgotten)
const withdrawConsent = async (req, res) => {
    try {
        const { anonUserId } = req.body;

        if (!anonUserId) {
            return res.status(400).json({ error: 'Anonymous user ID required' });
        }

        // Mark all consents as withdrawn
        await Consent.update(
            { isActive: false, withdrawnAt: new Date() },
            { where: { anonUserId } }
        );

        // Note: Raw data will be excluded from future aggregations
        // and deleted by cleanup job

        res.json({ success: true, message: 'Consent withdrawn successfully' });
    } catch (error) {
        console.error('Withdraw consent error:', error);
        res.status(500).json({ error: 'Failed to withdraw consent' });
    }
};

// Record playback session (requires consent)
const recordPlaybackSession = async (req, res) => {
    try {
        const data = sanitizeData(req.body);
        const {
            anonUserId, contentType, contentCategory, contentLanguage,
            startTime, endTime, durationSeconds, bufferEvents,
            avgBitrate, exitReason, regionBucket, deviceType, platform
        } = data;

        // Consent is checked by middleware
        const session = await PlaybackSession.create({
            anonUserId,
            contentType,
            contentCategory: contentCategory || 'other',
            contentLanguage,
            startTime: startTime || new Date(),
            endTime,
            durationSeconds: durationSeconds || 0,
            bufferEvents: bufferEvents || 0,
            avgBitrate,
            exitReason: exitReason || 'unknown',
            regionBucket: regionBucket || 'other',
            deviceType: deviceType || 'tv',
            platform: platform || 'other'
        });

        res.status(201).json({ success: true, sessionId: session.sessionId });
    } catch (error) {
        console.error('Record playback session error:', error);
        res.status(500).json({ error: 'Failed to record session' });
    }
};

// Update playback session (end time, duration)
const updatePlaybackSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { endTime, durationSeconds, bufferEvents, exitReason } = req.body;

        const session = await PlaybackSession.findOne({ where: { sessionId } });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await session.update({
            endTime: endTime || new Date(),
            durationSeconds: durationSeconds || session.durationSeconds,
            bufferEvents: bufferEvents || session.bufferEvents,
            exitReason: exitReason || session.exitReason
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update playback session error:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
};

// Record playback error
const recordPlaybackError = async (req, res) => {
    try {
        const data = sanitizeData(req.body);
        const {
            sessionId, errorCode, errorCategory, errorMessage,
            deviceType, osFamily, regionBucket, appVersion, platform
        } = data;

        const error = await PlaybackError.create({
            sessionId,
            errorCode,
            errorCategory: errorCategory || 'unknown',
            errorMessage,
            deviceType: deviceType || 'tv',
            osFamily: osFamily || 'other',
            regionBucket,
            appVersion,
            platform: platform || 'other'
        });

        res.status(201).json({ success: true, errorId: error.id });
    } catch (error) {
        console.error('Record playback error:', error);
        res.status(500).json({ error: 'Failed to record error' });
    }
};

module.exports = {
    registerAnonUser,
    recordConsent,
    withdrawConsent,
    recordPlaybackSession,
    updatePlaybackSession,
    recordPlaybackError
};
