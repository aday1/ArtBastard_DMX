import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
// Create context with default values
const SocketContext = createContext({
    socket: null,
    connected: false,
    error: null,
    reconnect: () => { }
});
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const initSocket = () => {
        try {
            // Clear any previous errors
            setError(null);
            // Initialize socket with error handling
            console.log('Initializing Socket.IO connection');
            // Use window.location to automatically connect to the correct host
            const socketUrl = process.env.NODE_ENV === 'production'
                ? window.location.origin
                : 'http://localhost:3000'; // Explicitly set the backend URL in development
            console.log(`[SocketContext] Connecting to socket at: ${socketUrl}`);
            const socketInstance = io(socketUrl, {
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                forceNew: true,
                autoConnect: true,
                transports: ['websocket', 'polling']
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
        }
        catch (err) {
            console.error('Error initializing Socket.IO:', err);
            setError(`Failed to initialize connection: ${err instanceof Error ? err.message : String(err)}`);
            return () => { };
        }
    };
    // Initialize socket on component mount
    useEffect(() => {
        const cleanup = initSocket();
        return cleanup;
    }, []);
    // Function to manually reconnect
    const reconnect = () => {
        console.log('[SocketContext] Manual reconnection requested');
        if (socket) {
            console.log('[SocketContext] Disconnecting existing socket...');
            socket.disconnect();
            socket.connect(); // Try to reconnect the existing socket first
            console.log('[SocketContext] Socket reconnection initiated');
        }
        else {
            console.log('[SocketContext] No socket instance, creating new one');
            initSocket();
        }
    };
    return (_jsx(SocketContext.Provider, { value: { socket, connected, error, reconnect }, children: children }));
};
export const useSocket = () => {
    // Ensure the store is accessible globally for MIDI functionality
    React.useEffect(() => {
        if (typeof window !== 'undefined' && !window.useStore) {
            // Import dynamically to avoid circular dependencies
            import('../store').then(module => {
                window.useStore = module.useStore;
                console.log('Global store reference initialized in SocketContext');
            }).catch(err => {
                console.error('Failed to initialize global store reference:', err);
            });
        }
    }, []);
    return useContext(SocketContext);
};
export default SocketContext;
