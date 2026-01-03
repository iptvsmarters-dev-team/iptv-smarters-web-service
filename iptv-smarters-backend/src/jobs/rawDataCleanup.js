require('dotenv').config();
const { Op } = require('sequelize');
const {
    sequelize,
    PlaybackSession,
    PlaybackError,
    Consent
} = require('../models');

/**
 * RAW DATA CLEANUP JOB
 * - Deletes raw data older than retention period (7-30 days)
 * - Also deletes data from users who withdrew consent
 * - Required for GDPR/CCPA compliance
 */

async function runRawDataCleanup() {
    console.log('Starting raw data cleanup...');

    const retentionDays = parseInt(process.env.RAW_DATA_RETENTION_DAYS) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
        // 1. Delete old playback sessions
        const deletedSessions = await PlaybackSession.destroy({
            where: {
                createdAt: { [Op.lt]: cutoffDate }
            }
        });
        console.log(`Deleted ${deletedSessions} old playback sessions`);

        // 2. Delete old playback errors
        const deletedErrors = await PlaybackError.destroy({
            where: {
                createdAt: { [Op.lt]: cutoffDate }
            }
        });
        console.log(`Deleted ${deletedErrors} old playback errors`);

        // 3. Delete data from users who withdrew consent
        const withdrawnConsents = await Consent.findAll({
            where: {
                isActive: false,
                withdrawnAt: { [Op.not]: null }
            },
            attributes: ['anonUserId']
        });

        const withdrawnUserIds = withdrawnConsents.map(c => c.anonUserId);

        if (withdrawnUserIds.length > 0) {
            const deletedUserSessions = await PlaybackSession.destroy({
                where: {
                    anonUserId: { [Op.in]: withdrawnUserIds }
                }
            });
            console.log(`Deleted ${deletedUserSessions} sessions from users who withdrew consent`);
        }

        console.log('Raw data cleanup complete');
    } catch (error) {
        console.error('Raw data cleanup error:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    sequelize.authenticate()
        .then(() => runRawDataCleanup())
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = runRawDataCleanup;
