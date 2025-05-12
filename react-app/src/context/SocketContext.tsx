import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  reconnect: () => void;
}

// Create context with default values
const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  error: null,
  reconnect: () => {}
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initSocket = () => {
    try {
      // Clear any previous errors
      setError(null);
      
      // Initialize socket with error handling
      console.log('Initializing Socket.IO connection');
      
      const socketInstance = io(undefined, { // Added undefined as the first argument for URL, and options as second
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        // Don't parse incoming data as JSON to avoid parsing errors if it's not valid
        // Leave that to the receiver who can handle it properly
        forceNew: true
      });

      socketInstance.on('connect', () => {
        console.log('Socket.IO connected');
        setConnected(true);
        setError(null);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log(`Socket.IO disconnected: ${reason}`);
        setConnected(false);
      });

      socketInstance.on('connect_error', (err) => {
        console.error(`Socket.IO connection error: ${err.message}`);
        setConnected(false);
        setError(`Connection error: ${err.message}`);
      });

      socketInstance.on('error', (err) => {
        console.error(`Socket.IO error: ${err}`);
        setError(`Socket error: ${err}`);
      });
      
      // Handle JSON parsing errors specifically
      socketInstance.on('parse_error', (err) => {
        console.error(`Socket.IO parse error: ${err}`);
        setError(`Data parsing error. Try refreshing the page.`);
      });

      setSocket(socketInstance);

      // Cleanup function
      return () => {
        console.log('Cleaning up Socket.IO connection');
        socketInstance.disconnect();
        setSocket(null);
        setConnected(false);
      };
    } catch (err) {
      console.error('Error initializing Socket.IO:', err);
      setError(`Failed to initialize connection: ${err instanceof Error ? err.message : String(err)}`);
      return () => {};
    }
  };

  // Initialize socket on component mount
  useEffect(() => {
    const cleanup = initSocket();
    return cleanup;
  }, []);

  // Function to manually reconnect
  const reconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    
    initSocket();
  };

  return (
    <SocketContext.Provider value={{ socket, connected, error, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export type { SocketContextType }; // Exporting type separately

export default SocketContext;