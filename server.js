const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors()); // Handle CORS
app.use(express.json()); // Parse JSON requests
app.use(morgan('dev')); // Log HTTP requests

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;

console.log('MONGO_URI:', process.env.MONGO_URI);

if (!mongoURI) {
  console.error('MONGO_URI is not defined in environment variables.');
  process.exit(1); // Exit the process if no MongoDB URI is provided
}

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process on fatal connection errors
  });

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomCode) => {
    socket.join(roomCode);
    console.log(`User joined room: ${roomCode}`);
    // Notify other users in the room
    socket.to(roomCode).emit('userJoined', socket.id);
  });

  socket.on('tileRevealed', ({ roomCode, index }) => {
    console.log(`Tile revealed in room: ${roomCode}, index: ${index}`);
    io.to(roomCode).emit('updateTile', { index });
  });

  socket.on('leaveRoom', (roomCode) => {
    socket.leave(roomCode);
    console.log(`User left room: ${roomCode}`);
    // Notify other users in the room
    socket.to(roomCode).emit('userLeft', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Attach Socket.IO instance to the app
app.set('io', io);
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Game Room Service!');
});


// Routes
const roomRoutes = require('./routes/roomRoutes');
app.use('/api/rooms', roomRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is up and running!' });
});

// Error Handling Middleware
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  res.status(error.status || 500).json({
    error: {
      message: error.message,
    },
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
