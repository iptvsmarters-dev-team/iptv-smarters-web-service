const { Playlist, Device } = require('../models');
const { Op } = require('sequelize');

// Get global playlists only (public, no auth required)
const getGlobalPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.findAll({
            where: { isGlobal: true, isActive: true },
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, playlists });
    } catch (error) {
        console.error('Get global playlists error:', error);
        res.status(500).json({ error: 'Failed to get playlists' });
    }
};

// Get all playlists for a device (includes global playlists)
const getPlaylists = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;

        const device = await Device.findOne({ where: { deviceKey: device_key } });

        // Build query: get global playlists + device-specific playlists
        const whereClause = {
            isActive: true,
            [Op.or]: [
                { isGlobal: true }, // Global playlists for all devices
            ]
        };

        // Add device-specific playlists if device exists
        if (device) {
            whereClause[Op.or].push({ deviceId: device.id });
        }

        const playlists = await Playlist.findAll({
            where: whereClause,
            order: [['isGlobal', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json({ success: true, playlists });
    } catch (error) {
        console.error('Get playlists error:', error);
        res.status(500).json({ error: 'Failed to get playlists' });
    }
};

// Add new playlist
const addPlaylist = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;
        const { name, type, m3uUrl, xtreamHost, xtreamUsername, xtreamPassword, category } = req.body;

        const device = await Device.findOne({ where: { deviceKey: device_key } });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const playlist = await Playlist.create({
            deviceId: device.id,
            name,
            type: type || 'm3u',
            m3uUrl,
            xtreamHost,
            xtreamUsername,
            xtreamPassword,
            category: category || 'General'
        });

        res.status(201).json({ success: true, playlist });
    } catch (error) {
        console.error('Add playlist error:', error);
        res.status(500).json({ error: 'Failed to add playlist' });
    }
};

// Update playlist
const updatePlaylist = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;
        const { id } = req.params;
        const { name, type, m3uUrl, xtreamHost, xtreamUsername, xtreamPassword, category } = req.body;

        const device = await Device.findOne({ where: { deviceKey: device_key } });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const playlist = await Playlist.findOne({
            where: { id, deviceId: device.id }
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        await playlist.update({
            name: name || playlist.name,
            type: type || playlist.type,
            m3uUrl: m3uUrl || playlist.m3uUrl,
            xtreamHost: xtreamHost || playlist.xtreamHost,
            xtreamUsername: xtreamUsername || playlist.xtreamUsername,
            xtreamPassword: xtreamPassword || playlist.xtreamPassword,
            category: category || playlist.category,
            lastUpdated: new Date()
        });

        res.json({ success: true, playlist });
    } catch (error) {
        console.error('Update playlist error:', error);
        res.status(500).json({ error: 'Failed to update playlist' });
    }
};

// Delete playlist
const deletePlaylist = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;
        const { id } = req.params;

        const device = await Device.findOne({ where: { deviceKey: device_key } });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const playlist = await Playlist.findOne({
            where: { id, deviceId: device.id }
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Soft delete
        playlist.isActive = false;
        await playlist.save();

        res.json({ success: true, message: 'Playlist deleted' });
    } catch (error) {
        console.error('Delete playlist error:', error);
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
};

module.exports = {
    getGlobalPlaylists,
    getPlaylists,
    addPlaylist,
    updatePlaylist,
    deletePlaylist
};
