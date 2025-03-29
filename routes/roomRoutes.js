const express = require('express');
const router = express.Router();
const GameRoom = require('../models/gameRoom');
const { getRandomWords } = require('../data/words');
const predefinedPatterns = require('../data/pattern').default;

// Constants
const GAME_STATES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  ENDED: 'ended',
};
const TEAMS = {
  RED: 'Red',
  BLUE: 'Blue',
};

// Route to create a new room
router.post('/create', async (req, res) => {
  try {
    const { roomCode, creator } = req.body;

    if (!creator || !creator.username || !creator.role || !creator.team) {
      return res.status(400).json({ error: 'Missing creator details (username, role, team).' });
    }

    const existingRoom = await GameRoom.findOne({ roomCode });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room code already exists.' });
    }

    const wordSet = getRandomWords(); // Get random words for the game
    const patterns = predefinedPatterns[Math.floor(Math.random() * predefinedPatterns.length)];
    if (!patterns || patterns.length !== 25) {
      return res.status(500).json({ error: 'Invalid pattern data.' });
    }

    const newRoom = await GameRoom.create({
      roomCode,
      wordSet,
      patterns,
      revealedTiles: Array(25).fill(false),
      players: [creator],
      currentTurnTeam: null,
      gameState: GAME_STATES.WAITING,
      timerStartTime: null,
    });

    console.log(`Room ${roomCode} created successfully.`);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room.', details: error.message });
  }
});

// Route to join an existing room
router.post('/join', async (req, res) => {
  const { roomCode, username, role, team } = req.body;

  if (!roomCode || !username || !role || !team) {
    return res.status(400).json({ error: 'Missing player details.' });
  }

  const room = await GameRoom.findOne({ roomCode });
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  if (role === 'Spymaster' && room.players.find(p => p.role === 'Spymaster' && p.team === team)) {
    return res.status(400).json({ error: `A Spymaster already exists for the ${team} team.` });
  }

  if (room.players.find(p => p.username === username)) {
    return res.status(400).json({ error: 'Player with this username already exists in the room.' });
  }

  await GameRoom.updateOne(
    { roomCode },
    { $push: { players: { username, role, team } } }
  );

  const io = req.app.get('io');
  io.to(roomCode).emit('updatePlayers', room.players);
  res.status(200).json({ message: 'Player added successfully.', players: room.players });
});

// Route to start the game
router.post('/startGame', async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Verify that the player starting the game is the Red Agent
    const username = req.query.username; // Extract username from query (frontend must pass this)
    const currentPlayer = room.players.find((player) => player.username === username);

    if (!currentPlayer || currentPlayer.team !== 'Red' || currentPlayer.role !== 'Agent') {
      return res.status(403).json({ error: 'Only the Red Agent can start the game.' });
    }

    room.currentTurnTeam = 'Red';
    room.timerStartTime = Date.now();
    room.gameState = 'active';
    room.redTeamScore = 0; // Initialize scores
    room.blueTeamScore = 0;
    await room.save();

    const io = req.app.get('io');
    io.to(roomCode).emit('gameStarted', { currentTurnTeam: 'Red', timerStartTime: room.timerStartTime });
    res.status(200).json({ message: 'Game started successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start the game.', details: error.message });
  }
});

// Route to end a player's turn
router.post('/endTurn', async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.gameState !== GAME_STATES.ACTIVE) {
      return res.status(400).json({ error: 'Game is not active.' });
    }

    room.currentTurnTeam = room.currentTurnTeam === TEAMS.RED ? TEAMS.BLUE : TEAMS.RED; // Switch team
    room.timerStartTime = Date.now();
    await room.save();

    const io = req.app.get('io');
    io.to(roomCode).emit('updateRoom', room); // Emit updated room state
    res.status(200).json({ message: 'Turn ended successfully.', room });
  } catch (error) {
    console.error('Error ending turn:', error);
    res.status(500).json({ error: 'Failed to end turn.', details: error.message });
  }
});

// Fetch room details
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room state:', error);
    res.status(500).json({ error: 'Failed to fetch room state.', details: error.message });
  }
});

// Player leaves the room
router.delete('/leave', async (req, res) => {
  try {
    const { roomCode, username } = req.body;

    const room = await GameRoom.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const updatedPlayers = room.players.filter((player) => player.username !== username);
    room.players = updatedPlayers;

    const io = req.app.get('io');
    if (updatedPlayers.length === 0) {
      await GameRoom.deleteOne({ roomCode });
      io.to(roomCode).emit('roomDeleted');
      return res.status(200).json({ message: 'Room deleted as no players remain.' });
    }

    await room.save();
    io.to(roomCode).emit('updatePlayers', updatedPlayers);
    res.status(200).json({ message: 'Player removed successfully.', players: updatedPlayers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player.', details: error.message });
  }
});

module.exports = router;