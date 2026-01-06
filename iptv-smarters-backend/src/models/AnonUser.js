const { DataTypes } = require('sequelize');

/**
 * ANONYMIZED USER MODEL
 * ❌ NEVER STORE: Name, Email, Phone, IP, GPS, Advertising IDs
 * ✅ ONLY: Anonymous UUID, device type, coarse location
 */
module.exports = (sequelize) => {
    const AnonUser = sequelize.define('AnonUser', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        // Random, non-reversible anonymous ID
        anonUserId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true,
            allowNull: false
        },
        deviceType: {
            type: DataTypes.ENUM('mobile', 'tv', 'tablet', 'stb'),
            defaultValue: 'tv'
        },
        osFamily: {
            type: DataTypes.ENUM(
                'android', 'ios', 'tizen', 'webos',
                'roku_os', 'fire_os', 'tvos', 'other'
            ),
            defaultValue: 'other'
        },
        // Major version only for privacy
        osVersionMajor: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        appVersion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        deviceBrandBucket: {
            type: DataTypes.ENUM(
                'samsung', 'lg', 'sony', 'tcl',
                'roku', 'amazon', 'apple', 'google', 'other'
            ),
            defaultValue: 'other'
        },
        networkType: {
            type: DataTypes.ENUM('wifi', 'mobile', 'ethernet', 'unknown'),
            defaultValue: 'unknown'
        },
        // From app locale only, NOT GPS
        countryCode: {
            type: DataTypes.STRING(2),
            allowNull: true
        },
        regionBucket: {
            type: DataTypes.ENUM(
                'us_east', 'us_west',
                'eu_west', 'eu_east',
                'apac', 'latam', 'mena', 'other'
            ),
            defaultValue: 'other'
        },
        firstSeen: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        lastActive: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'anon_users',
        timestamps: true
    });

    return AnonUser;
};
