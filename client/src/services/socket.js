import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create a single shared socket instance for the entire app.
// The SocketContext provider controls connect/disconnect lifecycle.
const socket = io(SOCKET_URL, {
  autoConnect: false,       // manually connect inside SocketContext
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
});

export default socket;
