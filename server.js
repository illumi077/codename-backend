const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db'); // Database connection
require('dotenv').config(); // Load environment variables
const roomRoutes = require('./routes/roomRoutes'); // Room-related API routes
const socketHandler = require('./sockets/socketHandler'); // Socket.IO logic
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(express.urlencoded({ extended: true })); // Handle URL-encoded payloads
app.use(cors({ origin: 'http://localhost:5173' })); // Allow requests from frontend origin

// Handle Preflight Requests
app.options('*', cors()); // Enable preflight for all routes

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
    origin: 'http://localhost:5173', // Allow requests from frontend origin
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
