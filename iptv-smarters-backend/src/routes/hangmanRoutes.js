// Hangman Game API Routes
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const HangmanSessionService = require('../services/hangmanSession');

// Create a new game session
router.post('/session', async (req, res) => {
    try {
        const session = HangmanSessionService.createSession();

        // Generate QR code URL (mobile page URL)
        const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
        const mobileUrl = `${baseUrl}/games/hangman/mobile.html?session=${session.sessionId}`;

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
            width: 280,
            margin: 2,
            color: {
                dark: '#0F1115',
                light: '#FFFFFF'
            }
        });

        res.json({
            success: true,
            sessionId: session.sessionId,
            mobileUrl,
            qrCodeDataUrl,
            status: session.status
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});

// Get session status
router.get('/session/:id', (req, res) => {
    try {
        const session = HangmanSessionService.getSession(req.params.id);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({
            success: true,
            sessionId: session.sessionId,
            status: session.status,
            player1Connected: session.player1.connected,
            player2Connected: session.player2.connected,
            player1WordSubmitted: !!session.player1.word,
            player2WordSubmitted: !!session.player2.word,
            currentRound: session.currentRound,
            scores: {
                player1: session.player1.score,
                player2: session.player2.score
            }
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ success: false, error: 'Failed to get session' });
    }
});

// Submit word (called from mobile page)
router.post('/session/:id/word', (req, res) => {
    try {
        const { playerNumber, word, hint } = req.body;

        if (!playerNumber || !word) {
            return res.status(400).json({ success: false, error: 'Player number and word are required' });
        }

        const result = HangmanSessionService.submitWord(
            req.params.id,
            parseInt(playerNumber),
            word,
            hint
        );

        if (result.error) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            wordLength: result.wordLength,
            bothWordsSubmitted: result.bothWordsSubmitted,
            status: result.session.status
        });
    } catch (error) {
        console.error('Error submitting word:', error);
        res.status(500).json({ success: false, error: 'Failed to submit word' });
    }
});

// Reset session for new game
router.post('/session/:id/reset', (req, res) => {
    try {
        const session = HangmanSessionService.resetForNewGame(req.params.id);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({
            success: true,
            status: session.status
        });
    } catch (error) {
        console.error('Error resetting session:', error);
        res.status(500).json({ success: false, error: 'Failed to reset session' });
    }
});

// End session
router.delete('/session/:id', (req, res) => {
    try {
        HangmanSessionService.endSession(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ success: false, error: 'Failed to end session' });
    }
});

module.exports = router;
