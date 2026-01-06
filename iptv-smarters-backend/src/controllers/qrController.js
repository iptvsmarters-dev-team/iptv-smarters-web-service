const QRCode = require('qrcode');

// Generate QR code
const generateQRCode = async (req, res) => {
    try {
        const { data, size = 300 } = req.query;

        if (!data) {
            return res.status(400).json({ error: 'Data parameter is required' });
        }

        // Generate QR code as PNG buffer
        const qrBuffer = await QRCode.toBuffer(data, {
            type: 'png',
            width: parseInt(size),
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Set response headers
        res.set({
            'Content-Type': 'image/png',
            'Content-Length': qrBuffer.length,
            'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        });

        res.send(qrBuffer);
    } catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

module.exports = {
    generateQRCode
};
