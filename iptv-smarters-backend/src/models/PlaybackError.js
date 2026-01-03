const { DataTypes } = require('sequelize');

/**
 * PLAYBACK ERROR MODEL - Performance & Quality Data
 * Buyers love this for platform intelligence
 */
module.exports = (sequelize) => {
    const PlaybackError = sequelize.define('PlaybackError', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        sessionId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        errorCode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        errorCategory: {
            type: DataTypes.ENUM(
                'network', 'decode', 'drm', 'source',
                'timeout', 'memory', 'unknown'
            ),
            defaultValue: 'unknown'
        },
        errorMessage: {
            type: DataTypes.STRING,
            allowNull: true
        },
        deviceType: {
            type: DataTypes.ENUM('tv', 'mobile', 'tablet', 'stb'),
            defaultValue: 'tv'
        },
        osFamily: {
            type: DataTypes.ENUM(
                'android', 'ios', 'tizen', 'webos',
                'roku_os', 'fire_os', 'tvos', 'other'
            ),
            defaultValue: 'other'
        },
        regionBucket: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            allowNull: true
        },
        appVersion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        platform: {
            type: DataTypes.ENUM(
                'samsung_tizen', 'lg_webos', 'android_tv',
                'roku', 'fire_tv', 'apple_tv', 'other'
            ),
            defaultValue: 'other'
        }
    }, {
        tableName: 'playback_errors',
        timestamps: true,
        indexes: [
            { fields: ['errorCategory'] },
            { fields: ['platform'] },
            { fields: ['createdAt'] }
        ]
    });

    return PlaybackError;
};
