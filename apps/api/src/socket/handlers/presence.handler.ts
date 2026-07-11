import mongoose from 'mongoose';
import type { Server, Socket } from 'socket.io';
import { meetingJoinSchema, meetingLeaveSchema } from '@syncspace/validation';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import { logger } from '../../lib/logger.js';
import type { SocketUser } from '../socket.server.js';
import type { SocketErrorCode, SocketResponse } from '@syncspace/types';

type AckCallback = (response: SocketResponse<{ displayName: string }>) => void;

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('meeting:join', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, displayName } = meetingJoinSchema.parse(payload);

      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) {
        return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      }

      if (meeting.status === 'ended') {
        return ack?.({ success: false, error: { code: 'MEETING_ENDED', message: 'Meeting has ended' } });
      }

      if (meeting.isLocked && meeting.hostId.toString() !== user.id) {
        return ack?.({ success: false, error: { code: 'MEETING_LOCKED', message: 'Meeting is locked. Ask the host to unlock it.' } });
      }

      const activeCount = await ParticipantSession.countDocuments({
        meetingId: meeting._id,
        leftAt: null,
      });

      if (activeCount >= meeting.maxParticipants) {
        return ack?.({ success: false, error: { code: 'ROOM_FULL', message: 'Meeting is full' } });
      }

      let session = await ParticipantSession.findOne({
        meetingId: meeting._id,
        userId: user.id,
        leftAt: null,
      });

      if (!session) {
        session = await ParticipantSession.create({
          meetingId: meeting._id,
          userId: user.id,
          role: meeting.hostId.toString() === user.id ? 'host' : 'participant',
          joinedAt: new Date(),
        });
      }

      if (!meeting.participantIds.some((id) => id.toString() === user.id)) {
        meeting.participantIds.push(new mongoose.Types.ObjectId(user.id));
        await meeting.save();
      }

      socket.join(`meeting:${roomCode}`);

      socket.to(`meeting:${roomCode}`).emit('participant:joined', {
        userId: user.id,
        displayName: displayName || user.displayName,
        role: session.role,
        isMuted: session.isMuted,
        isCameraOff: session.isCameraOff,
        isHandRaised: session.isHandRaised,
        joinedAt: session.joinedAt.toISOString(),
      });

      if (ack) ack({ success: true, data: { displayName: displayName || user.displayName } });
    } catch (error) {
      logger.error(error, 'meeting:join error');
      const err = error as Error & { code?: string };
      if (ack) ack({ success: false, error: { code: (err.code as SocketErrorCode) || 'VALIDATION_ERROR', message: err.message } });
    }
  });

  socket.on('hand:raise', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = payload as { roomCode: string };

      await ParticipantSession.updateOne(
        { meetingId: (await Meeting.findOne({ roomCode }))?._id, userId: user.id, leftAt: null },
        { isHandRaised: true },
      );

      socket.to(`meeting:${roomCode}`).emit('hand:raised', { userId: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });

  socket.on('hand:lower', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = payload as { roomCode: string };

      await ParticipantSession.updateOne(
        { meetingId: (await Meeting.findOne({ roomCode }))?._id, userId: user.id, leftAt: null },
        { isHandRaised: false },
      );

      socket.to(`meeting:${roomCode}`).emit('hand:lowered', { userId: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:leave', async (payload: unknown, ack?: (response: SocketResponse) => void) => {
    try {
      const { roomCode } = meetingLeaveSchema.parse(payload);

      const meeting = await Meeting.findOne({ roomCode });
      if (meeting) {
        await ParticipantSession.updateOne(
          { meetingId: meeting._id, userId: user.id, leftAt: null },
          { leftAt: new Date() },
        );

        meeting.participantIds = meeting.participantIds.filter(
          (id) => id.toString() !== user.id,
        );
        await meeting.save();
      }

      socket.leave(`meeting:${roomCode}`);
      socket.to(`meeting:${roomCode}`).emit('participant:left', { userId: user.id });

      if (ack) ack({ success: true });
    } catch (error) {
      logger.error(error, 'meeting:leave error');
      if (ack) ack({ success: false, error: { code: 'VALIDATION_ERROR', message: (error as Error).message } });
    }
  });
}
