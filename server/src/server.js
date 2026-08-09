require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');
const { startSimulator } = require('./simulator/simulator');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas and start server
const startServer = async () => {
  await connectDB();

  // Create native HTTP server and attach Socket.io
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
    },
  });

  // Initialise socket handler (stores io instance, wires connection events)
  socketHandler.init(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📡 Health endpoint:    http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.io ready on  ws://localhost:${PORT}`);
  });

  // Start the machine degradation simulator (unless disabled)
  const simulatorEnabled = process.env.SIMULATOR_ENABLED !== 'false';
  if (simulatorEnabled) {
    console.log('🤖 Simulator enabled — starting machine degradation simulator...');
    await startSimulator();
  } else {
    console.log('🤖 Simulator disabled (SIMULATOR_ENABLED=false)');
  }
};

startServer();

