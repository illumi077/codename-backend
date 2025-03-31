const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db'); // Database connection
require('dotenv').config(); // Load environment variables
const roomRoutes = require('./routes/roomRoutes'); // Room-related API routes
const socketHandler = require('./sockets/socketHandler'); // Socket.IO logic

const app = express();

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: true })); // Handle URL-encoded payloads
const cors = require('cors');
app.use(cors()); // Allow cross-origin requests

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/rooms', roomRoutes); // API endpoints for room management

// Default route for root-level requests
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Game Room Service!');
});

// Create HTTP server and setup Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with your frontend URL for production
    methods: ['GET', 'POST', 'DELETE'],
  },
});

// Invoke Socket.IO logic
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
