import type { Server, Socket } from 'socket.io';
import { meetingJoinSchema, meetingLeaveSchema } from '@syncspace/validation';
import * as meetingService from '../../modules/meeting/meeting.service.js';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import { logger } from '../../lib/logger.js';

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const user = (socket as any).user;

  socket.on('meeting:join', async (payload, ack) => {
    try {
      const { roomCode } = meetingJoinSchema.parse(payload);
      await meetingService.joinMeeting(roomCode, user.id);

      socket.join(`meeting:${roomCode}`);

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      }

      const session = await ParticipantSession.findOne({
        userId: user.id,
        meetingId: meeting._id,
        leftAt: null,
      });

      io.to(`meeting:${roomCode}`).emit('participant:joined', {
        userId: user.id,
        displayName: user.displayName,
        role: session?.role ?? 'participant',
        isMuted: session?.isMuted ?? false,
        isCameraOff: session?.isCameraOff ?? true,
      });

      if (ack) ack({ success: true });
    } catch (error: any) {
      logger.error(error, 'meeting:join error');
      if (ack) ack({ success: false, error: { code: error.code || 'ERROR', message: error.message } });
    }
  });

  socket.on('meeting:leave', async (payload, ack) => {
    try {
      const { roomCode } = meetingLeaveSchema.parse(payload);
      await meetingService.leaveMeeting(roomCode, user.id);
      socket.leave(`meeting:${roomCode}`);

      socket.to(`meeting:${roomCode}`).emit('participant:left', { userId: user.id });

      if (ack) ack({ success: true });
    } catch (error: any) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: error.message } });
    }
  });
}
