import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(URL, {
      auth: { token: localStorage.getItem('accessToken') },
      reconnectionAttempts: 10,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 6000,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export default { connectSocket, getSocket, disconnectSocket };
