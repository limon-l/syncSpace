import type { Server, Socket } from 'socket.io';
import { reactionSendSchema } from '@syncspace/validation';

export function registerReactionHandlers(io: Server, socket: Socket) {
  const user = (socket as any).user;

  socket.on('reaction:send', async (payload, ack) => {
    try {
      const { roomCode, reaction } = reactionSendSchema.parse(payload);

      io.to(`meeting:${roomCode}`).emit('reaction:received', {
        userId: user.id,
        displayName: user.displayName,
        reaction,
      });

      if (ack) ack({ success: true });
    } catch (error: any) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  });
}
