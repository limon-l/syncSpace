import type { Server, Socket } from 'socket.io';
import { chatSendSchema } from '@syncspace/validation';
import { Meeting } from '../../models/meeting.model.js';
import { Message } from '../../models/message.model.js';
import { logger } from '../../lib/logger.js';
import type { SocketUser } from '../socket.server.js';
import type { SocketResponse } from '@syncspace/types';

type AckCallback = (response: SocketResponse<{ messageId: string }>) => void;

export function registerChatHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('chat:send', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, content } = chatSendSchema.parse(payload);

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      }

      if (meeting.status === 'ended') {
        return ack?.({ success: false, error: { code: 'MEETING_ENDED', message: 'Meeting has ended' } });
      }

      const message = await Message.create({
        meetingId: meeting._id,
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
    } catch (error) {
      logger.error(error, 'chat:send error');
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });
}
