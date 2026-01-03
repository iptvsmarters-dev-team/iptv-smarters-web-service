const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const verifyToken = require('../middleware/verifyToken');

// Public route - get global playlists (no auth required)
router.get('/global', playlistController.getGlobalPlaylists);

// All other routes require token verification
router.use(verifyToken);

// GET /api/playlists - Get all playlists for device
router.get('/', playlistController.getPlaylists);

// POST /api/playlists - Add new playlist
router.post('/', playlistController.addPlaylist);

// PUT /api/playlists/:id - Update playlist
router.put('/:id', playlistController.updatePlaylist);

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;
