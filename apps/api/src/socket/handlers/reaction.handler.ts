import type { Server, Socket } from 'socket.io';
import { reactionSendSchema } from '@syncspace/validation';
import type { SocketUser } from '../socket.server.js';
import type { SocketResponse } from '@syncspace/types';

type AckCallback = (response: SocketResponse) => void;

export function registerReactionHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('reaction:send', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, reaction } = reactionSendSchema.parse(payload);

      io.to(`meeting:${roomCode}`).emit('reaction:received', {
        userId: user.id,
        displayName: user.displayName,
        reaction,
      });

      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });
}
