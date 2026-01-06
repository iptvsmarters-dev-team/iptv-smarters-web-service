// Hangman Game Session Management
const crypto = require('crypto');

// In-memory session storage (for production, use Redis)
const sessions = new Map();

// Session expiry time (30 minutes)
const SESSION_EXPIRY = 30 * 60 * 1000;

class HangmanSessionService {
    // Generate a unique session ID
    static generateSessionId() {
        return crypto.randomBytes(6).toString('hex');
    }

    // Create a new game session
    static createSession() {
        const sessionId = this.generateSessionId();
        const session = {
            sessionId,
            createdAt: Date.now(),
            player1: {
                connected: false,
                socketId: null,
                word: null,
                hint: null,
                score: 0
            },
            player2: {
                connected: false,
                socketId: null,
                word: null,
                hint: null,
                score: 0
            },
            tvSocketId: null,
            currentRound: 1,
            status: 'waiting_for_players' // waiting_for_players | waiting_for_words | ready | playing | ended
        };

        sessions.set(sessionId, session);
        this.scheduleCleanup(sessionId);

        return session;
    }

    // Get session by ID
    static getSession(sessionId) {
        const session = sessions.get(sessionId);
        if (session && this.isExpired(session)) {
            sessions.delete(sessionId);
            return null;
        }
        return session || null;
    }

    // Check if session is expired
    static isExpired(session) {
        return Date.now() - session.createdAt > SESSION_EXPIRY;
    }

    // Schedule session cleanup
    static scheduleCleanup(sessionId) {
        setTimeout(() => {
            const session = sessions.get(sessionId);
            if (session && this.isExpired(session)) {
                sessions.delete(sessionId);
                console.log(`Session ${sessionId} expired and cleaned up`);
            }
        }, SESSION_EXPIRY + 1000);
    }

    // Player joins session (via WebSocket)
    static playerJoin(sessionId, socketId) {
        const session = this.getSession(sessionId);
        if (!session) return { error: 'Session not found' };

        // Assign player number based on connection order
        if (!session.player1.connected) {
            session.player1.connected = true;
            session.player1.socketId = socketId;
            return { playerNumber: 1, session };
        } else if (!session.player2.connected) {
            session.player2.connected = true;
            session.player2.socketId = socketId;
            // Both players connected, waiting for words
            if (session.status === 'waiting_for_players') {
                session.status = 'waiting_for_words';
            }
            return { playerNumber: 2, session };
        } else {
            return { error: 'Session is full' };
        }
    }

    // TV joins session (via WebSocket)
    static tvJoin(sessionId, socketId) {
        const session = this.getSession(sessionId);
        if (!session) return { error: 'Session not found' };

        session.tvSocketId = socketId;
        return { session };
    }

    // Player submits word
    static submitWord(sessionId, playerNumber, word, hint) {
        const session = this.getSession(sessionId);
        if (!session) return { error: 'Session not found' };

        // Validate word
        const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleanWord.length < 2 || cleanWord.length > 12) {
            return { error: 'Word must be 2-12 letters' };
        }

        const player = playerNumber === 1 ? session.player1 : session.player2;
        player.word = cleanWord;
        player.hint = hint ? hint.substring(0, 100) : '';

        // Check if both words are submitted
        const bothWordsSubmitted = session.player1.word && session.player2.word;
        if (bothWordsSubmitted) {
            session.status = 'ready';
        }

        return {
            session,
            bothWordsSubmitted,
            wordLength: cleanWord.length
        };
    }

    // Get word data for game (without revealing actual word to wrong player)
    static getGameData(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return null;

        return {
            player1Word: {
                length: session.player1.word ? session.player1.word.length : 0,
                hint: session.player1.hint || '',
                word: session.player1.word // Server sends full word to TV
            },
            player2Word: {
                length: session.player2.word ? session.player2.word.length : 0,
                hint: session.player2.hint || '',
                word: session.player2.word
            },
            currentRound: session.currentRound
        };
    }

    // Start next round
    static nextRound(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return null;

        session.currentRound = session.currentRound === 1 ? 2 : 1;
        return session;
    }

    // Update score
    static updateScore(sessionId, playerNumber, won) {
        const session = this.getSession(sessionId);
        if (!session) return null;

        const player = playerNumber === 1 ? session.player1 : session.player2;
        if (won) {
            player.score++;
        }

        return session;
    }

    // Reset for new game (keep players connected)
    static resetForNewGame(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return null;

        session.player1.word = null;
        session.player1.hint = null;
        session.player2.word = null;
        session.player2.hint = null;
        session.currentRound = 1;
        session.status = 'waiting_for_words';

        return session;
    }

    // Player disconnects
    static playerDisconnect(socketId) {
        for (const [sessionId, session] of sessions) {
            if (session.player1.socketId === socketId) {
                session.player1.connected = false;
                session.player1.socketId = null;
                return { sessionId, playerNumber: 1, session };
            }
            if (session.player2.socketId === socketId) {
                session.player2.connected = false;
                session.player2.socketId = null;
                return { sessionId, playerNumber: 2, session };
            }
            if (session.tvSocketId === socketId) {
                session.tvSocketId = null;
                return { sessionId, isTV: true, session };
            }
        }
        return null;
    }

    // End session
    static endSession(sessionId) {
        sessions.delete(sessionId);
    }

    // Get all active sessions (for debugging)
    static getAllSessions() {
        return Array.from(sessions.values());
    }
}

module.exports = HangmanSessionService;
