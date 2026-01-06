const { sequelize, Playlist } = require('../models');

const testPlaylists = [
    {
        name: "Test Playlist",
        m3uUrl: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
        type: "m3u",
        isGlobal: true,
        category: "General",
        isActive: true
    },
    {
        name: "Test Playlist 2",
        m3uUrl: "https://www.apsattv.com/vizio.m3u",
        type: "m3u",
        isGlobal: true,
        category: "General",
        isActive: true
    }
];

async function seedPlaylists() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Sync database with alter to add new columns
        await sequelize.sync({ alter: true });
        console.log('Database synced');

        // Check if playlists already exist
        const existingCount = await Playlist.count({ where: { isGlobal: true } });

        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing global playlists. Skipping seed.`);
            console.log('To re-seed, delete existing global playlists first.');
            process.exit(0);
        }

        // Create playlists
        for (const playlist of testPlaylists) {
            await Playlist.create(playlist);
            console.log(`Created playlist: ${playlist.name}`);
        }

        console.log(`\nSuccessfully seeded ${testPlaylists.length} global playlists!`);
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seedPlaylists();
