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

module.exports = {
    registerDevice,
    getDevice,
    updateDevice
};
