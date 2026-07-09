import type { Server, Socket } from 'socket.io';
import { mediaStateSchema } from '@syncspace/validation';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import type { SocketUser } from '../socket.server.js';
import type { SocketResponse } from '@syncspace/types';

type AckCallback = (response: SocketResponse) => void;

export function registerMediaHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('media:state', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, isMuted, isCameraOff } = mediaStateSchema.parse(payload);

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      }

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: user.id, leftAt: null },
        { isMuted, isCameraOff },
      );

      socket.to(`meeting:${roomCode}`).emit('media:state', {
        userId: user.id,
        isMuted,
        isCameraOff,
      });

      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });
}
