const express = require('express');
const router = express.Router();
const GameRoom = require('../models/gameRoom');

// Route to create a new room
router.post('/create', async (req, res) => {
  const { roomCode, creator } = req.body;
  const wordSet = Array(25).fill('Word'); // Example word set
  const patterns = Array(25).fill('grey'); // Example patterns
  try {
    const room = await GameRoom.create({ roomCode, wordSet, patterns, players: [creator] });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room.', details: error.message });
  }
});

module.exports = router;