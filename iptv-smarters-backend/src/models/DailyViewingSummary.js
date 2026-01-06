const { DataTypes } = require('sequelize');

/**
 * DAILY VIEWING SUMMARY - Aggregated Data (24-36 month retention)
 * This is what you can sell/license
 */
module.exports = (sequelize) => {
    const DailyViewingSummary = sequelize.define('DailyViewingSummary', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        regionBucket: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            allowNull: false
        },
        deviceType: {
            type: DataTypes.ENUM('tv', 'mobile', 'tablet', 'stb'),
            allowNull: false
        },
        platform: {
            type: DataTypes.ENUM(
                'samsung_tizen', 'lg_webos', 'android_tv',
                'roku', 'fire_tv', 'apple_tv', 'other'
            ),
            allowNull: false
        },
        contentCategory: {
            type: DataTypes.ENUM(
                'sports', 'news', 'movies', 'series',
                'documentary', 'kids', 'music', 'other'
            ),
            allowNull: false
        },
        // Aggregated metrics
        totalSessions: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalWatchTimeSeconds: {
            type: DataTypes.BIGINT,
            defaultValue: 0
        },
        avgSessionDuration: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        uniqueUsers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalBufferEvents: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalErrors: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'daily_viewing_summary',
        timestamps: true,
        indexes: [
            { fields: ['date'] },
            { fields: ['regionBucket'] },
            { fields: ['platform'] },
            { fields: ['contentCategory'] },
            { name: 'daily_summary_unique_composite', unique: true, fields: ['date', 'regionBucket', 'deviceType', 'platform', 'contentCategory'] }
        ]
    });

    return DailyViewingSummary;
};
