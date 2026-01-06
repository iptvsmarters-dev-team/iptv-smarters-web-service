// Hangman Game WebSocket Handler
const HangmanSessionService = require('../services/hangmanSession');

function setupHangmanWebSocket(wss) {
    wss.on('connection', (ws, req) => {
        // Parse session ID and client type from URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionId = url.searchParams.get('session');
        const clientType = url.searchParams.get('type'); // 'tv' or 'mobile'

        if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session ID required' }));
            ws.close();
            return;
        }

        console.log(`WebSocket connection: session=${sessionId}, type=${clientType}`);

        if (clientType === 'tv') {
            handleTVConnection(ws, sessionId);
        } else {
            handleMobileConnection(ws, sessionId);
        }

        // Handle disconnect
        ws.on('close', () => {
            const result = HangmanSessionService.playerDisconnect(ws.socketId);
            if (result) {
                console.log(`Disconnected from session ${result.sessionId}`);
                // Notify other clients about disconnect
                broadcastToSession(wss, result.sessionId, {
                    type: 'player-disconnected',
                    playerNumber: result.playerNumber,
                    isTV: result.isTV
                }, ws.socketId);
            }
        });

        // Handle messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleMessage(wss, ws, sessionId, data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
    });
}

function handleTVConnection(ws, sessionId) {
    const result = HangmanSessionService.tvJoin(sessionId, generateSocketId());
    if (result.error) {
        ws.send(JSON.stringify({ type: 'error', message: result.error }));
        ws.close();
        return;
    }

    ws.socketId = result.session.tvSocketId;
    ws.sessionId = sessionId;
    ws.clientType = 'tv';

    // Send current session state to TV
    ws.send(JSON.stringify({
        type: 'session-state',
        session: {
            status: result.session.status,
            player1Connected: result.session.player1.connected,
            player2Connected: result.session.player2.connected,
            player1WordSubmitted: !!result.session.player1.word,
            player2WordSubmitted: !!result.session.player2.word
        }
    }));
}

function handleMobileConnection(ws, sessionId) {
    const result = HangmanSessionService.playerJoin(sessionId, generateSocketId());
    if (result.error) {
        ws.send(JSON.stringify({ type: 'error', message: result.error }));
        ws.close();
        return;
    }

    const playerNumber = result.playerNumber;
    ws.socketId = result.session[`player${playerNumber}`].socketId;
    ws.sessionId = sessionId;
    ws.clientType = 'mobile';
    ws.playerNumber = playerNumber;

    // Send player assignment to mobile
    ws.send(JSON.stringify({
        type: 'assigned',
        playerNumber,
        canEnterWord: playerNumber === 1, // P1 can enter immediately, P2 waits
        waitingFor: playerNumber === 2 ? 1 : null
    }));

    // Notify TV that player joined
    broadcastToTV(ws.wss || global.wss, sessionId, {
        type: 'player-joined',
        playerNumber
    });

    // If P2 just joined and P1 hasn't submitted word yet, notify P2 to wait
    if (playerNumber === 2 && !result.session.player1.word) {
        ws.send(JSON.stringify({
            type: 'wait-for-word',
            waitingFor: 1
        }));
    }
}

function handleMessage(wss, ws, sessionId, data) {
    switch (data.type) {
        case 'submit-word':
            handleWordSubmit(wss, ws, sessionId, data);
            break;
        case 'round-complete':
            handleRoundComplete(wss, ws, sessionId, data);
            break;
        case 'play-again':
            handlePlayAgain(wss, ws, sessionId);
            break;
        case 'quit':
            handleQuit(wss, ws, sessionId);
            break;
    }
}

function handleWordSubmit(wss, ws, sessionId, data) {
    const { word, hint } = data;
    const playerNumber = ws.playerNumber;

    const result = HangmanSessionService.submitWord(sessionId, playerNumber, word, hint);
    if (result.error) {
        ws.send(JSON.stringify({ type: 'error', message: result.error }));
        return;
    }

    // Confirm to player that word was submitted
    ws.send(JSON.stringify({
        type: 'word-accepted',
        wordLength: result.wordLength
    }));

    // Notify TV
    broadcastToTV(wss, sessionId, {
        type: 'word-submitted',
        playerNumber,
        wordLength: result.wordLength
    });

    // If P1 submitted, notify P2 they can now enter
    if (playerNumber === 1) {
        broadcastToPlayer(wss, sessionId, 2, {
            type: 'your-turn',
            message: 'Player 1 submitted. Enter your word!'
        });
    }

    // If both words submitted, send game-ready
    if (result.bothWordsSubmitted) {
        const gameData = HangmanSessionService.getGameData(sessionId);

        // Send to TV (includes actual words)
        broadcastToTV(wss, sessionId, {
            type: 'game-ready',
            player1Word: gameData.player1Word,
            player2Word: gameData.player2Word,
            currentRound: gameData.currentRound
        });

        // Notify both players
        broadcastToSession(wss, sessionId, {
            type: 'game-started',
            message: 'Look at the TV!'
        });
    }
}

function handleRoundComplete(wss, ws, sessionId, data) {
    const { winner, guesser } = data;

    // Update score
    if (winner) {
        HangmanSessionService.updateScore(sessionId, guesser, true);
    }

    const session = HangmanSessionService.getSession(sessionId);
    if (!session) return;

    // Check if both rounds completed
    if (session.currentRound === 1) {
        // Move to round 2
        HangmanSessionService.nextRound(sessionId);

        broadcastToTV(wss, sessionId, {
            type: 'new-round',
            round: 2,
            scores: {
                player1: session.player1.score,
                player2: session.player2.score
            }
        });
    } else {
        // Game complete - show final scores
        broadcastToSession(wss, sessionId, {
            type: 'game-complete',
            scores: {
                player1: session.player1.score,
                player2: session.player2.score
            }
        });
    }
}

function handlePlayAgain(wss, ws, sessionId) {
    const session = HangmanSessionService.resetForNewGame(sessionId);
    if (!session) return;

    // Notify all clients to enter new words
    broadcastToSession(wss, sessionId, {
        type: 'enter-words',
        message: 'Enter your new words!'
    });

    // P1 can enter immediately
    broadcastToPlayer(wss, sessionId, 1, {
        type: 'your-turn',
        canEnterWord: true
    });

    // P2 waits for P1
    broadcastToPlayer(wss, sessionId, 2, {
        type: 'wait-for-word',
        waitingFor: 1
    });
}

function handleQuit(wss, ws, sessionId) {
    HangmanSessionService.endSession(sessionId);
    broadcastToSession(wss, sessionId, {
        type: 'session-ended',
        message: 'Game ended'
    });
}

// Utility functions
function generateSocketId() {
    return Math.random().toString(36).substring(2, 15);
}

function broadcastToSession(wss, sessionId, message, excludeSocketId = null) {
    wss.clients.forEach(client => {
        if (client.sessionId === sessionId && client.socketId !== excludeSocketId) {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToTV(wss, sessionId, message) {
    wss.clients.forEach(client => {
        if (client.sessionId === sessionId && client.clientType === 'tv') {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToPlayer(wss, sessionId, playerNumber, message) {
    wss.clients.forEach(client => {
        if (client.sessionId === sessionId && client.playerNumber === playerNumber) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = { setupHangmanWebSocket };
