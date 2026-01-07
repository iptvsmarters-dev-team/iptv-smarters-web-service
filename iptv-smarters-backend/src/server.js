require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const deviceRoutes = require('./routes/deviceRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const streamRoutes = require('./routes/streamRoutes');
const hangmanRoutes = require('./routes/hangmanRoutes');
const { setupHangmanWebSocket } = require('./websocket/hangmanWs');
const { sequelize } = require('./models');

// Jobs
const runDailyAggregation = require('./jobs/dailyAggregation');
const runMonthlyAggregation = require('./jobs/monthlyAggregation');
const runRawDataCleanup = require('./jobs/rawDataCleanup');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - configured for TV streaming app
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "blob:", "*"],
            connectSrc: ["'self'", "*"],
            fontSrc: ["'self'", "data:"],
            workerSrc: ["'self'", "blob:"]
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, file://, or Tizen apps)
        if (!origin) return callback(null, true);

        // Allowed origins for development and production
        const allowedOrigins = [
            'http://localhost:8080',
            'http://localhost:3001',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3001',
            'file://',
        ];

        // Add GAME_BASE_URL from .env if configured (for games server)
        if (process.env.GAME_BASE_URL) {
            allowedOrigins.push(process.env.GAME_BASE_URL);
        }

        // Allow Tizen app origins (they use file:// or widget://)
        if (origin.startsWith('file://') || origin.startsWith('widget://')) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // In development, allow all origins
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..', 'public', 'frontend')
    : '/Users/Apple/Documents/IPTV APPS/Samsung/iptv-smarters-samsung-ui';

app.use(express.static(frontendPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            // Don't cache HTML files
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Serve games static files
// In production: serve from public/games directory (deployed games)
// In development: serve from both public/games (for mobile.html) and local games repo
const gamesPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..', 'public', 'games')
    : '/Users/Apple/Documents/IPTV APPS/IPTV-smarters-tv-games/samsung';

app.use('/games', express.static(gamesPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Also serve public/games in development (for mobile.html)
if (process.env.NODE_ENV !== 'production') {
    app.use('/games', express.static(path.join(__dirname, '..', 'public', 'games'), {
        maxAge: 0,
        etag: true
    }));
}

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/games/hangman', hangmanRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Privacy policy endpoint (required for compliance)
app.get('/privacy', (req, res) => {
    res.json({
        dataCollected: [
            'Anonymous user ID (random, non-reversible)',
            'Device type and OS family',
            'App version',
            'Coarse region (from locale, not GPS)',
            'Viewing duration and content category',
            'Playback quality metrics'
        ],
        dataNotCollected: [
            'Name, email, phone',
            'IP address (not stored)',
            'Precise location (GPS)',
            'Advertising IDs',
            'Channel names tied to users'
        ],
        retention: {
            rawData: '30 days max',
            aggregatedData: '24-36 months'
        },
        rights: [
            'Opt-out at any time',
            'Request data deletion',
            'Withdraw consent'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Schedule jobs (production only)
if (process.env.NODE_ENV === 'production') {
    // Daily aggregation at 2 AM UTC
    cron.schedule('0 2 * * *', () => {
        console.log('Running scheduled daily aggregation...');
        runDailyAggregation().catch(console.error);
    });

    // Monthly aggregation on 1st of each month at 3 AM UTC
    cron.schedule('0 3 1 * *', () => {
        console.log('Running scheduled monthly aggregation...');
        runMonthlyAggregation().catch(console.error);
    });

    // Raw data cleanup at 4 AM UTC
    cron.schedule('0 4 * * *', () => {
        console.log('Running scheduled raw data cleanup...');
        runRawDataCleanup().catch(console.error);
    });
}

// Create HTTP server for both Express and WebSocket
const server = createServer(app);

// Setup WebSocket server for Hangman game
const wss = new WebSocketServer({
    server,
    path: '/ws/hangman'
});

// Make wss globally available for broadcasting
global.wss = wss;

// Initialize Hangman WebSocket handlers
setupHangmanWebSocket(wss);

console.log('WebSocket server initialized at /ws/hangman');

// Start server
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');

        await sequelize.sync({ alter: true });
        console.log('Database synced (schema updated)');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Privacy policy: http://localhost:${PORT}/privacy`);
            console.log(`WebSocket: ws://localhost:${PORT}/ws/hangman`);
            console.log('Deployment test from local');
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();
