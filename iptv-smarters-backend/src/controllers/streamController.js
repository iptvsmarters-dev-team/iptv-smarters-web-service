/**
 * Stream Controller
 * Handles proxying of stream URLs to bypass CORS restrictions
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Proxy a stream URL
 * This allows the frontend to access streams that have CORS restrictions
 */
const proxyStream = async (req, res) => {
    const streamUrl = req.query.url;

    if (!streamUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // Validate URL
        const parsedUrl = new URL(streamUrl);

        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ error: 'Invalid URL protocol' });
        }

        // Choose http or https module based on protocol
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;

        // Create request options
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'IPTV-Smarters/1.0',
                'Accept': '*/*',
                'Accept-Encoding': 'identity' // Don't compress for streaming
            },
            timeout: 30000 // 30 second timeout
        };

        // Make request to the stream URL
        const proxyReq = httpModule.request(options, (proxyRes) => {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            // Forward response headers (selectively)
            const forwardHeaders = ['content-type', 'content-length', 'cache-control'];
            forwardHeaders.forEach(header => {
                if (proxyRes.headers[header]) {
                    res.setHeader(header, proxyRes.headers[header]);
                }
            });

            // Set status code
            res.status(proxyRes.statusCode);

            // Pipe the response
            proxyRes.pipe(res);
        });

        // Handle errors
        proxyReq.on('error', (error) => {
            console.error('Stream proxy error:', error.message);
            if (!res.headersSent) {
                res.status(502).json({ error: 'Failed to fetch stream', details: error.message });
            }
        });

        // Handle timeout
        proxyReq.on('timeout', () => {
            console.error('Stream proxy timeout');
            proxyReq.destroy();
            if (!res.headersSent) {
                res.status(504).json({ error: 'Stream timeout' });
            }
        });

        proxyReq.end();

    } catch (error) {
        console.error('Stream proxy error:', error);
        res.status(500).json({ error: 'Stream proxy failed', details: error.message });
    }
};

/**
 * Proxy M3U playlist and rewrite URLs to go through proxy
 */
const proxyPlaylist = async (req, res) => {
    const playlistUrl = req.query.url;

    if (!playlistUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const parsedUrl = new URL(playlistUrl);
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'IPTV-Smarters/1.0',
                'Accept': '*/*'
            },
            timeout: 30000
        };

        const proxyReq = httpModule.request(options, (proxyRes) => {
            let data = '';

            proxyRes.on('data', chunk => {
                data += chunk;
            });

            proxyRes.on('end', () => {
                // Set CORS headers
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');

                // Return the playlist content as-is
                // The frontend will handle the individual stream URLs
                res.send(data);
            });
        });

        proxyReq.on('error', (error) => {
            console.error('Playlist proxy error:', error.message);
            if (!res.headersSent) {
                res.status(502).json({ error: 'Failed to fetch playlist', details: error.message });
            }
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            if (!res.headersSent) {
                res.status(504).json({ error: 'Playlist fetch timeout' });
            }
        });

        proxyReq.end();

    } catch (error) {
        console.error('Playlist proxy error:', error);
        res.status(500).json({ error: 'Playlist proxy failed', details: error.message });
    }
};

/**
 * Handle CORS preflight requests
 */
const handleOptions = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
};

module.exports = {
    proxyStream,
    proxyPlaylist,
    handleOptions
};
