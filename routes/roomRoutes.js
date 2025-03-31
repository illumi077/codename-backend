const express = require('express');
const router = express.Router();
const GameRoom = require('../models/gameRoom'); // Import the schema
const { getRandomWords } = require('../data/words'); // Function to get random words
const { getRandomPattern } = require('../data/pattern'); // Function to get random color patterns

// @route   POST /api/rooms/create
// @desc    Create a new game room
// @access  Public
router.post('/create', async (req, res) => {
  const { roomCode, creator } = req.body;

  try {
    // Validate request payload
    if (!roomCode || !creator?.username || !creator?.role || !creator?.team) {
      return res.status(400).json({ error: 'Missing required fields: roomCode or creator details.' });
    }

    // Check if the room already exists
    const existingRoom = await GameRoom.findOne({ roomCode });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room code already exists.' });
    }

    // Generate random words and patterns for the grid
    const words = getRandomWords(); // Returns an array of 25 words
    const patterns = getRandomPattern(); // Returns an array of 25 colors

    // Build the grid state
    const gridState = words.map((word, index) => ({
      word,
      color: patterns[index],
      revealed: false,
    }));

    // Create new room with creator as the first player
    const newRoom = new GameRoom({
      roomCode,
      gridState,
      players: [creator], // Creator joins as the first player
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room.', details: error.message });
  }
});

// @route   POST /api/rooms/join
// @desc    Join an existing game room
// @access  Public
router.post('/join', async (req, res) => {
  const { roomCode, username, role, team } = req.body;

  try {
    // Validate request payload
    if (!roomCode || !username || !role || !team) {
      return res.status(400).json({ error: 'Missing required fields: roomCode, username, role, or team.' });
    }

    // Find the room
    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Check for duplicate players
    if (room.players.find((player) => player.username === username)) {
      return res.status(400).json({ error: 'Username already exists in this room.' });
    }

    // Add the player to the room
    room.players.push({ username, role, team });
    await room.save();

    res.status(200).json(room);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room.', details: error.message });
  }
});

// @route   DELETE /api/rooms/leave
// @desc    Leave a game room
// @access  Public
router.delete('/leave', async (req, res) => {
  const { roomCode, username } = req.body;

  try {
    // Validate request payload
    if (!roomCode || !username) {
      return res.status(400).json({ error: 'Missing required fields: roomCode or username.' });
    }

    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Remove the player from the room
    room.players = room.players.filter((player) => player.username !== username);

    // If the room is empty, delete it
    if (room.players.length === 0) {
      await room.deleteOne();
      return res.status(200).json({ message: 'Room deleted as it is now empty.' });
    }

    await room.save();
    res.status(200).json({ message: `${username} left the room.`, players: room.players });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room.', details: error.message });
  }
});

// @route   GET /api/rooms/:roomCode
// @desc    Fetch a room's data
// @access  Public
router.get('/:roomCode', async (req, res) => {
  const { roomCode } = req.params;

  try {
    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room data:', error);
    res.status(500).json({ error: 'Failed to fetch room data.', details: error.message });
  }
});

module.exports = router;
