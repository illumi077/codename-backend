const GameRoom = require('../models/gameRoom'); // Import the game room schema

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join a specific room
    socket.on('joinRoom', async ({ roomCode, username }) => {
      console.log(`${username} is joining room: ${roomCode}`);
      socket.join(roomCode);

      const room = await GameRoom.findOne({ roomCode });
      if (room) {
        // Emit room data to keep players in sync
        io.to(roomCode).emit('roomDataUpdated', { players: room.players, gridState: room.gridState });
      }
    });

    // Leave a room
    socket.on('leaveRoom', async ({ roomCode, username }) => {
      console.log(`${username} is leaving room: ${roomCode}`);
      socket.leave(roomCode);

      const room = await GameRoom.findOne({ roomCode });
      if (room) {
        // Remove player from room
        room.players = room.players.filter((player) => player.username !== username);
        await room.save();

        // Notify remaining players
        io.to(roomCode).emit('roomDataUpdated', { players: room.players, gridState: room.gridState });
      }
    });

    // Tile clicked
    socket.on('tileClicked', async ({ roomCode, row, col, team }) => {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.gameState !== 'active') return;

      const tile = room.gridState[row][col];
      if (tile.revealed) return; // Prevent clicking already revealed tiles

      // Reveal the tile
      tile.revealed = true;
      await room.save();

      io.to(roomCode).emit('gridUpdated', room.gridState); // Notify clients of the updated grid

      // Handle tile logic
      if (tile.color === 'grey') {
        // Switch team if grey tile clicked
        room.currentTurnTeam = room.currentTurnTeam === 'Red' ? 'Blue' : 'Red';
        room.timerStartTime = Date.now(); // Reset timer for the next team
        await room.save();

        io.to(roomCode).emit('turnUpdated', room.currentTurnTeam); // Notify clients of the new turn
        io.to(roomCode).emit('turnSwitched', {
          currentTurnTeam: room.currentTurnTeam,
          timerStartTime: room.timerStartTime,
        });
      } else if (tile.color === 'black') {
        // End the game if black tile clicked
        room.gameState = 'ended';
        await room.save();

        io.to(roomCode).emit('gameEnded', {
          gridState: room.gridState,
          message: `${team === 'Red' ? 'Blue' : 'Red'} wins! Black tile guessed.`,
        });
      }
    });

    // Start the game
    socket.on('startGame', async ({ roomCode }) => {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      room.gameState = 'active';
      room.currentTurnTeam = 'Red'; // Red always starts
      room.timerStartTime = Date.now(); // Record start time for timer
      await room.save();

      io.to(roomCode).emit('gameStarted', {
        currentTurnTeam: room.currentTurnTeam,
        timerStartTime: room.timerStartTime,
      });
    });

    // End the turn voluntarily
    socket.on('endTurn', async ({ roomCode }) => {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.gameState !== 'active') return;

      room.currentTurnTeam = room.currentTurnTeam === 'Red' ? 'Blue' : 'Red';
      room.timerStartTime = Date.now();
      await room.save();

      io.to(roomCode).emit('turnUpdated', room.currentTurnTeam); // Notify clients of the new turn
      io.to(roomCode).emit('turnSwitched', {
        currentTurnTeam: room.currentTurnTeam,
        timerStartTime: room.timerStartTime,
      });
    });

    // Update room data when necessary (backend triggered event)
    socket.on('updateRoomData', async (roomCode) => {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      io.to(roomCode).emit('roomDataUpdated', {
        players: room.players,
        gridState: room.gridState,
      }); // Send updated room details to clients
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
