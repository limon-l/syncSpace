import type { Server, Socket } from 'socket.io';
import { chatTypingSchema } from '@syncspace/validation';
import { logger } from '../../lib/logger.js';
import type { SocketUser } from '../socket.server.js';

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerTypingHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('chat:typing-start', (payload: unknown) => {
    try {
      const { roomCode } = chatTypingSchema.parse(payload);

      socket.to(`meeting:${roomCode}`).emit('chat:typing', {
        userId: user.id,
        displayName: user.displayName,
      });

      const key = `${roomCode}:${user.id}`;
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key)!);
      }

      typingTimers.set(key, setTimeout(() => {
        socket.to(`meeting:${roomCode}`).emit('chat:stopped-typing', {
          userId: user.id,
        });
        typingTimers.delete(key);
      }, 3000));
    } catch {
      // ignore parse errors for typing events
    }
  });

  socket.on('chat:typing-stop', (payload: unknown) => {
    try {
      const { roomCode } = chatTypingSchema.parse(payload);

      socket.to(`meeting:${roomCode}`).emit('chat:stopped-typing', {
        userId: user.id,
      });

      const key = `${roomCode}:${user.id}`;
      if (typingTimers.has(key)) {
        clearTimeout(typingTimers.get(key)!);
        typingTimers.delete(key);
      }
    } catch {
      // ignore
    }
  });

  socket.on('disconnect', () => {
    for (const [key, timer] of typingTimers.entries()) {
      if (key.includes(user.id)) {
        clearTimeout(timer);
        typingTimers.delete(key);
      }
    }
  });
}
