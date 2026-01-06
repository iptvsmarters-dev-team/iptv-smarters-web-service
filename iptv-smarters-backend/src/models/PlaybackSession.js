const { DataTypes } = require('sequelize');

/**
 * PLAYBACK SESSION MODEL - Raw Events (7-30 day retention)
 * Most valuable data category for monetization
 * ❌ Do NOT store: Channel names tied to users, user-level viewing history long-term
 */
module.exports = (sequelize) => {
    const PlaybackSession = sequelize.define('PlaybackSession', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        sessionId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true
        },
        anonUserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        contentType: {
            type: DataTypes.ENUM('live_tv', 'vod', 'series', 'sports', 'news'),
            allowNull: false
        },
        contentCategory: {
            type: DataTypes.ENUM(
                'sports', 'news', 'movies', 'series',
                'documentary', 'kids', 'music', 'other'
            ),
            defaultValue: 'other'
        },
        contentLanguage: {
            type: DataTypes.STRING(5), // e.g., 'en', 'es', 'fr'
            allowNull: true
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true
        },
        durationSeconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Quality of Service metrics
        bufferEvents: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        avgBitrate: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        exitReason: {
            type: DataTypes.ENUM(
                'user_exit', 'error', 'end_of_content',
                'app_background', 'network_loss', 'unknown'
            ),
            defaultValue: 'unknown'
        },
        // Coarse location
        regionBucket: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            allowNull: true
        },
        deviceType: {
            type: DataTypes.ENUM('tv', 'mobile', 'tablet', 'stb'),
            defaultValue: 'tv'
        },
        platform: {
            type: DataTypes.ENUM(
                'samsung_tizen', 'lg_webos', 'android_tv',
                'roku', 'fire_tv', 'apple_tv', 'other'
            ),
            defaultValue: 'other'
        }
    }, {
        tableName: 'playback_sessions',
        timestamps: true,
        indexes: [
            { fields: ['anonUserId'] },
            { fields: ['startTime'] },
            { fields: ['contentCategory'] },
            { fields: ['regionBucket'] }
        ]
    });

    return PlaybackSession;
};
