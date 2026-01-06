const { DataTypes } = require('sequelize');

/**
 * MONTHLY PLATFORM INSIGHTS - Aggregated Data (24-36 month retention)
 * Licensable output for reports
 */
module.exports = (sequelize) => {
    const MonthlyPlatformInsights = sequelize.define('MonthlyPlatformInsights', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        month: {
            type: DataTypes.STRING(7), // Format: 'YYYY-MM'
            allowNull: false
        },
        osFamily: {
            type: DataTypes.ENUM(
                'android', 'ios', 'tizen', 'webos',
                'roku_os', 'fire_os', 'tvos', 'other'
            ),
            allowNull: false
        },
        platform: {
            type: DataTypes.ENUM(
                'samsung_tizen', 'lg_webos', 'android_tv',
                'roku', 'fire_tv', 'apple_tv', 'other'
            ),
            allowNull: false
        },
        appVersion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        regionBucket: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            allowNull: false
        },
        // Engagement metrics
        activeUsers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        newUsers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        avgWatchTimePerUser: {
            type: DataTypes.INTEGER, // seconds
            defaultValue: 0
        },
        avgSessionsPerUser: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        // Quality metrics
        errorRate: {
            type: DataTypes.FLOAT, // percentage
            defaultValue: 0
        },
        avgBufferEventsPerSession: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        // Time distribution (hour buckets)
        peakHourUtc: {
            type: DataTypes.INTEGER, // 0-23
            allowNull: true
        },
        weekdayVsWeekendRatio: {
            type: DataTypes.FLOAT,
            defaultValue: 1.0
        }
    }, {
        tableName: 'monthly_platform_insights',
        timestamps: true,
        indexes: [
            { fields: ['month'] },
            { fields: ['platform'] },
            { fields: ['regionBucket'] },
            { name: 'monthly_insights_unique_composite', unique: true, fields: ['month', 'platform', 'osFamily', 'regionBucket', 'appVersion'] }
        ]
    });

    return MonthlyPlatformInsights;
};
