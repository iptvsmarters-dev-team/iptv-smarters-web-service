const CryptoJS = require('crypto-js');

const verifyToken = (req, res, next) => {
    const { device_key, mac, token } = req.query;

    if (!device_key || !mac || !token) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Generate expected token
    const secret = process.env.SECRET_KEY;
    const data = `${device_key}:${mac}:${secret}`;
    const expectedToken = CryptoJS.SHA256(data).toString();

    if (token !== expectedToken) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach device info to request
    req.deviceInfo = { device_key, mac };
    next();
};

module.exports = verifyToken;
