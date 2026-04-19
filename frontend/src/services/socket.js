/**
 * services/socket.js  v2.0
 * – Refreshes auth token on reconnect (handles long-idle tabs)
 * – Exposes connection state
 * – Prevents duplicate instances
 */
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || '';  // empty = same origin (Vite proxy in dev)

let socket = null;

export const connectSocket = () => {
  if (socket) {
    // Already exists — update token in case it was refreshed
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(URL, {
    auth: { token: localStorage.getItem('accessToken') },
    reconnectionAttempts:    15,
    reconnectionDelay:       1000,
    reconnectionDelayMax:    8000,
    randomizationFactor:     0.5,
    transports:              ['websocket', 'polling'],
    autoConnect:             false,
    // Send updated token on every reconnect attempt
    reconnectionAttempts:    Infinity,
  });

  // Re-send fresh token on every reconnection
  socket.on('reconnect_attempt', () => {
    socket.auth = { token: localStorage.getItem('accessToken') };
  });

  return socket;
};

export const getSocket  = () => socket;
export const isConnected = () => !!socket?.connected;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket, isConnected };
