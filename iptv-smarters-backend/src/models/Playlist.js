const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Playlist = sequelize.define('Playlist', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        deviceId: {
            type: DataTypes.UUID,
            allowNull: true, // NULL = global playlist (available to all devices)
            references: {
                model: 'devices',
                key: 'id'
            }
        },
        isGlobal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('m3u', 'xtream'),
            defaultValue: 'm3u'
        },
        // For M3U playlists
        m3uUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // For Xtream Codes
        xtreamHost: {
            type: DataTypes.STRING,
            allowNull: true
        },
        xtreamUsername: {
            type: DataTypes.STRING,
            allowNull: true
        },
        xtreamPassword: {
            type: DataTypes.STRING,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'General'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        lastUpdated: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'playlists',
        timestamps: true
    });

    return Playlist;
};
