require('dotenv').config();
const { Op } = require('sequelize');
const {
    sequelize,
    AnonUser,
    PlaybackSession,
    PlaybackError,
    MonthlyPlatformInsights,
    Consent
} = require('../models');

/**
 * MONTHLY AGGREGATION JOB
 * - Runs monthly to create platform insights
 * - This data is licensable for reports
 */

async function runMonthlyAggregation() {
    console.log('Starting monthly aggregation...');

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

    try {
        // Get consented users
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

        // Get platform insights
        const insights = await PlaybackSession.findAll({
            where: {
                anonUserId: { [Op.in]: consentedUserIds },
                startTime: { [Op.between]: [startDate, endDate] }
            },
            attributes: [
                'platform',
                'regionBucket',
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('anonUserId'))), 'activeUsers'],
                [sequelize.fn('SUM', sequelize.col('durationSeconds')), 'totalWatchTime'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSessions'],
                [sequelize.fn('SUM', sequelize.col('bufferEvents')), 'totalBufferEvents']
            ],
            group: ['platform', 'regionBucket'],
            raw: true
        });

        // Get error rates
        const errors = await PlaybackError.findAll({
            where: {
                createdAt: { [Op.between]: [startDate, endDate] }
            },
            attributes: [
                'platform',
                'osFamily',
                'regionBucket',
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalErrors']
            ],
            group: ['platform', 'osFamily', 'regionBucket'],
            raw: true
        });

        // Get new users for the month
        const newUsers = await AnonUser.findAll({
            where: {
                createdAt: { [Op.between]: [startDate, endDate] }
            },
            attributes: [
                'osFamily',
                'regionBucket',
                [sequelize.fn('COUNT', sequelize.col('id')), 'newUserCount']
            ],
            group: ['osFamily', 'regionBucket'],
            raw: true
        });

        // Map OS family from platform
        const platformToOsFamily = {
            'samsung_tizen': 'tizen',
            'lg_webos': 'webos',
            'android_tv': 'android',
            'roku': 'roku_os',
            'fire_tv': 'fire_os',
            'apple_tv': 'tvos',
            'other': 'other'
        };

        // Process and insert insights
        for (const insight of insights) {
            const activeUsers = parseInt(insight.activeUsers) || 0;
            const totalSessions = parseInt(insight.totalSessions) || 0;
            const totalWatchTime = parseInt(insight.totalWatchTime) || 0;
            const totalBufferEvents = parseInt(insight.totalBufferEvents) || 0;

            const osFamily = platformToOsFamily[insight.platform] || 'other';

            // Find matching errors
            const matchingErrors = errors.find(e =>
                e.platform === insight.platform &&
                e.regionBucket === insight.regionBucket
            );
            const totalErrors = matchingErrors ? parseInt(matchingErrors.totalErrors) : 0;

            // Find new users
            const matchingNewUsers = newUsers.find(n =>
                n.osFamily === osFamily &&
                n.regionBucket === insight.regionBucket
            );
            const newUserCount = matchingNewUsers ? parseInt(matchingNewUsers.newUserCount) : 0;

            await MonthlyPlatformInsights.upsert({
                month: monthStr,
                osFamily,
                platform: insight.platform || 'other',
                regionBucket: insight.regionBucket || 'other',
                activeUsers,
                newUsers: newUserCount,
                avgWatchTimePerUser: activeUsers > 0 ? Math.round(totalWatchTime / activeUsers) : 0,
                avgSessionsPerUser: activeUsers > 0 ? parseFloat((totalSessions / activeUsers).toFixed(2)) : 0,
                errorRate: totalSessions > 0 ? parseFloat(((totalErrors / totalSessions) * 100).toFixed(2)) : 0,
                avgBufferEventsPerSession: totalSessions > 0 ? parseFloat((totalBufferEvents / totalSessions).toFixed(2)) : 0
            });
        }

        console.log(`Monthly aggregation complete for ${monthStr}. Processed ${insights.length} platform groups.`);
    } catch (error) {
        console.error('Monthly aggregation error:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    sequelize.authenticate()
        .then(() => runMonthlyAggregation())
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runMonthlyAggregation;
