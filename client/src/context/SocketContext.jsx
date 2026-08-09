import { createContext, useContext, useEffect, useState } from 'react';
import socket from '../services/socket';

const SocketContext = createContext(null);

/**
 * SocketProvider — connects the socket once on mount, disconnects on unmount.
 * Exposes the socket instance and a live `isConnected` boolean to the whole app.
 */
export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect
    socket.connect();

    const onConnect = () => {
      console.log('[Socket.io] ✅ Connected — id:', socket.id);
      setIsConnected(true);
    };
    const onDisconnect = (reason) => {
      console.warn('[Socket.io] ❌ Disconnected —', reason);
      setIsConnected(false);
    };
    const onError = (err) => {
      console.error('[Socket.io] Error —', err.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

/** Hook — consume the socket context in any component */
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}

export default SocketContext;
