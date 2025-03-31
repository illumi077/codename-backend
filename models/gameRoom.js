const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true }, // Room's unique identifier
  gridState: [
    {
      word: { type: String, required: true }, // Word displayed on the tile
      color: { type: String, enum: ['red', 'blue', 'grey', 'black'], required: true }, // Tile type
      revealed: { type: Boolean, default: false }, // Whether the tile has been revealed
    },
  ],
  players: [
    {
      username: { type: String, required: true }, // Player's name
      role: { type: String, enum: ['Spymaster', 'Agent'], required: true }, // Player's role
      team: { type: String, enum: ['Red', 'Blue'], required: true }, // Player's team
    },
  ],
  currentTurnTeam: { type: String, enum: ['Red', 'Blue'], default: null }, // Team whose turn it currently is
  gameState: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' }, // Game's state
  timerStartTime: { type: Date, default: null }, // Timestamp when the turn timer started
});

module.exports = mongoose.model('GameRoom', gameRoomSchema);
