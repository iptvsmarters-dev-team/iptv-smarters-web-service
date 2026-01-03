const { Device } = require('../models');
const { hashData, getRegionBucket } = require('../utils/privacy');

// Register or get device
const registerDevice = async (req, res) => {
    try {
        const { device_key, mac } = req.deviceInfo;
        const { platform, deviceType, osVersion, appVersion, countryCode, networkType } = req.body;

        // Hash MAC address for privacy
        const macAddressHash = hashData(mac);

        let device = await Device.findOne({ where: { deviceKey: device_key } });

        if (!device) {
            device = await Device.create({
                deviceKey: device_key,
                macAddressHash,
                platform: platform || 'other',
                deviceType: deviceType || 'tv',
                osVersionMajor: osVersion ? parseInt(osVersion.split('.')[0]) : null,
                appVersion,
                countryCode,
                regionBucket: getRegionBucket(countryCode),
                networkType: networkType || 'unknown'
            });
        } else {
            // Update last seen and device info
            device.lastSeen = new Date();
            device.macAddressHash = macAddressHash;
            if (platform) device.platform = platform;
            if (appVersion) device.appVersion = appVersion;
            if (networkType) device.networkType = networkType;
            await device.save();
        }

        res.json({
            success: true,
            device: {
                id: device.id,
                deviceKey: device.deviceKey,
                deviceName: device.deviceName,
                platform: device.platform,
                isActive: device.isActive
            }
        });
    } catch (error) {
        console.error('Register device error:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
};

// Get device info
const getDevice = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;

        const device = await Device.findOne({
            where: { deviceKey: device_key },
            include: ['playlists']
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json({ success: true, device });
    } catch (error) {
        console.error('Get device error:', error);
        res.status(500).json({ error: 'Failed to get device' });
    }
};

// Update device
const updateDevice = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;
        const { deviceName, platform, networkType } = req.body;

        const device = await Device.findOne({ where: { deviceKey: device_key } });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        if (deviceName) device.deviceName = deviceName;
        if (platform) device.platform = platform;
        if (networkType) device.networkType = networkType;
        device.lastSeen = new Date();

        await device.save();

        res.json({ success: true, device });
    } catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({ error: 'Failed to update device' });
    }
};

// Save last played channel
const saveLastPlayed = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;
        const { channel, playlist } = req.body;

        const device = await Device.findOne({ where: { deviceKey: device_key } });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Update last played info
        if (channel) {
            device.lastPlayedChannelName = channel.name;
            device.lastPlayedChannelUrl = channel.url;
            device.lastPlayedChannelGroup = channel.group || null;
        }

        if (playlist) {
            device.lastPlayedPlaylistId = playlist.id || null;
            device.lastPlayedPlaylistName = playlist.name;
            device.lastPlayedPlaylistUrl = playlist.url;
        }

        device.lastSeen = new Date();
        await device.save();

        res.json({ success: true, message: 'Last played saved' });
    } catch (error) {
        console.error('Save last played error:', error);
        res.status(500).json({ error: 'Failed to save last played' });
    }
};

// Get last played channel
const getLastPlayed = async (req, res) => {
    try {
        const { device_key } = req.deviceInfo;

        const device = await Device.findOne({ where: { deviceKey: device_key } });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Return last played info
        const lastPlayed = {
            channel: device.lastPlayedChannelUrl ? {
                name: device.lastPlayedChannelName,
                url: device.lastPlayedChannelUrl,
                group: device.lastPlayedChannelGroup
            } : null,
            playlist: device.lastPlayedPlaylistUrl ? {
                id: device.lastPlayedPlaylistId,
                name: device.lastPlayedPlaylistName,
                url: device.lastPlayedPlaylistUrl
            } : null
        };

        res.json({ success: true, lastPlayed });
    } catch (error) {
        console.error('Get last played error:', error);
        res.status(500).json({ error: 'Failed to get last played' });
    }
};

module.exports = {
    registerDevice,
    getDevice,
    updateDevice,
    saveLastPlayed,
    getLastPlayed
};
