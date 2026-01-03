require('dotenv').config();
const { Op } = require('sequelize');
const {
    sequelize,
    PlaybackSession,
    PlaybackError,
    DailyViewingSummary,
    Consent
} = require('../models');

/**
 * DAILY AGGREGATION JOB
 * - Runs daily to aggregate raw data
 * - Only processes data from consented users
 * - Raw data kept 7-30 days, aggregated data kept 24-36 months
 */

async function runDailyAggregation() {
    console.log('Starting daily aggregation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    try {
        // Get all consented user IDs
        const consentedUsers = await Consent.findAll({
            where: {
                dataSharingOptIn: true,
                isActive: true
            },
            attributes: ['anonUserId']
        });

        const consentedUserIds = consentedUsers.map(c => c.anonUserId);

        if (consentedUserIds.length === 0) {
            console.log('No consented users found. Skipping aggregation.');
            return;
        }

        // Aggregate playback sessions by dimensions
        const sessions = await PlaybackSession.findAll({
            where: {
                anonUserId: { [Op.in]: consentedUserIds },
                startTime: {
                    [Op.gte]: new Date(dateStr),
                    [Op.lt]: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            attributes: [
                'regionBucket',
                'deviceType',
                'platform',
                'contentCategory',
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSessions'],
                [sequelize.fn('SUM', sequelize.col('durationSeconds')), 'totalWatchTime'],
                [sequelize.fn('AVG', sequelize.col('durationSeconds')), 'avgDuration'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('anonUserId'))), 'uniqueUsers'],
                [sequelize.fn('SUM', sequelize.col('bufferEvents')), 'totalBufferEvents']
            ],
            group: ['regionBucket', 'deviceType', 'platform', 'contentCategory'],
            raw: true
        });

        // Get error counts
        const errors = await PlaybackError.findAll({
            where: {
                createdAt: {
                    [Op.gte]: new Date(dateStr),
                    [Op.lt]: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            attributes: [
                'regionBucket',
                'deviceType',
                'platform',
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalErrors']
            ],
            group: ['regionBucket', 'deviceType', 'platform'],
            raw: true
        });

        // Create error lookup map
        const errorMap = {};
        errors.forEach(e => {
            const key = `${e.regionBucket}-${e.deviceType}-${e.platform}`;
            errorMap[key] = parseInt(e.totalErrors) || 0;
        });

        // Insert aggregated data
        for (const session of sessions) {
            const errorKey = `${session.regionBucket}-${session.deviceType}-${session.platform}`;

            await DailyViewingSummary.upsert({
                date: dateStr,
                regionBucket: session.regionBucket || 'other',
                deviceType: session.deviceType || 'tv',
                platform: session.platform || 'other',
                contentCategory: session.contentCategory || 'other',
                totalSessions: parseInt(session.totalSessions) || 0,
                totalWatchTimeSeconds: parseInt(session.totalWatchTime) || 0,
                avgSessionDuration: Math.round(parseFloat(session.avgDuration)) || 0,
                uniqueUsers: parseInt(session.uniqueUsers) || 0,
                totalBufferEvents: parseInt(session.totalBufferEvents) || 0,
                totalErrors: errorMap[errorKey] || 0
            });
        }

        console.log(`Daily aggregation complete. Processed ${sessions.length} dimension groups.`);
    } catch (error) {
        console.error('Daily aggregation error:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    sequelize.authenticate()
        .then(() => runDailyAggregation())
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runDailyAggregation;
