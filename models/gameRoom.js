const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  wordSet: { type: [String], required: true },
  patterns: { type: [String], required: true },
  revealedTiles: { type: [Boolean], default: Array(25).fill(false) },
  players: [
    {
      username: { type: String, required: true },
      role: { type: String, enum: ['Spymaster', 'Agent'], required: true },
      team: { type: String, enum: ['Red', 'Blue'], required: true },
    },
  ],
  currentTurnTeam: { type: String, enum: ['Red', 'Blue'], default: null },
  gameState: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  timerStartTime: { type: Date, default: null },
  turnHistory: { type: Array, default: [] },
  redTeamScore: { type: Number, default: 0 },
  blueTeamScore: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  tileActions: {
    type: [Object], // [{index: Number, clickedBy: String, timestamp: Date}]
    default: [],
  },
  maxPlayers: { type: Number, default: 10 },
});

module.exports = mongoose.model('GameRoom', gameRoomSchema);
