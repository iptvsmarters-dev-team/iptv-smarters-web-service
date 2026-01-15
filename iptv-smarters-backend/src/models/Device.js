const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Device = sequelize.define('Device', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        deviceKey: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        // MAC address hashed for privacy - NOT stored raw
        macAddressHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deviceName: {
            type: DataTypes.STRING,
            defaultValue: 'Smart TV'
        },
        // Platform tracking for multi-brand support
        platform: {
            type: DataTypes.ENUM(
                'samsung_tizen',
                'lg_webos',
                'android_tv',
                'roku',
                'fire_tv',
                'apple_tv',
                'vizio',
                'other'
            ),
            allowNull: false,
            defaultValue: 'other'
        },
        deviceType: {
            type: DataTypes.ENUM('tv', 'mobile', 'tablet', 'stb'),
            defaultValue: 'tv'
        },
        // Only major version for privacy
        osVersionMajor: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        appVersion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Coarse location only - from app locale, NOT GPS
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
            allowNull: true
        },
        networkType: {
            type: DataTypes.ENUM('wifi', 'ethernet', 'mobile', 'unknown'),
            defaultValue: 'unknown'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        lastSeen: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Last played channel for resume functionality
        lastPlayedChannelName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lastPlayedChannelUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        lastPlayedChannelGroup: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lastPlayedPlaylistId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        lastPlayedPlaylistName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lastPlayedPlaylistUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Samsung ProductInfo API fields
        // DUID (Device Unique ID) hashed for privacy
        duidHash: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // TV model name (e.g., "UN65JS9500")
        modelName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Firmware version
        firmwareVersion: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Screen resolution (e.g., "1920x1080", "3840x2160")
        screenResolution: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Panel capabilities
        is4KSupported: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is8KSupported: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isOledSupported: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Panel type (OLED, QLED, LED, etc.)
        panelType: {
            type: DataTypes.STRING,
            allowNull: true
        },
        // Real panel resolution from ProductInfo API
        panelResolution: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'devices',
        timestamps: true
    });

    return Device;
};
