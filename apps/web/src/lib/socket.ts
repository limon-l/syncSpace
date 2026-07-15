import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;

let socket: Socket | null = null;

export function getSocketUrl(): string {
  return SOCKET_URL;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 60000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (s.connected) return s;
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
