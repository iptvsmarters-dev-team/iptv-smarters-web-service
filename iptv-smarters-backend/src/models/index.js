const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool
    }
);

// Core Models
const Device = require('./Device')(sequelize);
const Playlist = require('./Playlist')(sequelize);

// Privacy-Compliant Analytics Models
const AnonUser = require('./AnonUser')(sequelize);
const Consent = require('./Consent')(sequelize);
const PlaybackSession = require('./PlaybackSession')(sequelize);
const PlaybackError = require('./PlaybackError')(sequelize);

// Aggregated Models (Licensable Data)
const DailyViewingSummary = require('./DailyViewingSummary')(sequelize);
const MonthlyPlatformInsights = require('./MonthlyPlatformInsights')(sequelize);

// Associations
Device.hasMany(Playlist, { foreignKey: 'deviceId', as: 'playlists' });
Playlist.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

AnonUser.hasMany(PlaybackSession, { foreignKey: 'anonUserId', as: 'sessions' });
PlaybackSession.belongsTo(AnonUser, { foreignKey: 'anonUserId', as: 'user' });

AnonUser.hasMany(Consent, { foreignKey: 'anonUserId', as: 'consents' });
Consent.belongsTo(AnonUser, { foreignKey: 'anonUserId', as: 'user' });

module.exports = {
    sequelize,
    // Core
    Device,
    Playlist,
    // Analytics
    AnonUser,
    Consent,
    PlaybackSession,
    PlaybackError,
    // Aggregated
    DailyViewingSummary,
    MonthlyPlatformInsights
};
