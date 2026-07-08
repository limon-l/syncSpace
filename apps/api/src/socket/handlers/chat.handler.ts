import type { Server, Socket } from 'socket.io';
import { chatSendSchema } from '@syncspace/validation';
import { Message } from '../../models/message.model.js';
import { logger } from '../../lib/logger.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  const user = (socket as any).user;

  socket.on('chat:send', async (payload, ack) => {
    try {
      const { roomCode, content } = chatSendSchema.parse(payload);

      const message = await Message.create({
        meetingId: roomCode,
        senderId: user.id,
        senderName: user.displayName,
        content,
        type: 'text',
      });

      io.to(`meeting:${roomCode}`).emit('chat:message', {
        messageId: message._id.toString(),
        senderId: user.id,
        senderName: user.displayName,
        content,
        createdAt: message.createdAt.toISOString(),
      });

      if (ack) ack({ success: true, data: { messageId: message._id.toString() } });
    } catch (error: any) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  });
}
