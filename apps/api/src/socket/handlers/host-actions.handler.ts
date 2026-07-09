import type { Server, Socket } from 'socket.io';
import { participantActionSchema, meetingLockSchema } from '@syncspace/validation';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import type { IMeeting } from '../../models/meeting.model.js';
import type { SocketUser } from '../socket.server.js';

type AckCallback = (response: {
  success: boolean;
  error?: { code: string; message: string };
}) => void;

function isHostOrCoHost(userId: string, meeting: IMeeting): boolean {
  return (
    meeting.hostId.toString() === userId ||
    meeting.coHostIds.some((id) => id.toString() === userId)
  );
}

function isHost(userId: string, meeting: IMeeting): boolean {
  return meeting.hostId.toString() === userId;
}

export function registerHostActionHandlers(io: Server, socket: Socket) {
  const user = (socket as unknown as { user: SocketUser }).user;

  socket.on('participant:mute', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can mute participants' } });

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { isMuted: true },
      );

      io.to(`meeting:${roomCode}`).emit('participant:muted', { userId: targetUserId, mutedBy: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('participant:remove', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can remove participants' } });

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { leftAt: new Date() },
      );

      io.to(`meeting:${roomCode}`).emit('participant:removed', { userId: targetUserId });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:lock', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host can lock the meeting' } });

      meeting.isLocked = true;
      await meeting.save();

      io.to(`meeting:${roomCode}`).emit('meeting:locked', { lockedBy: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:unlock', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can unlock the meeting' } });

      meeting.isLocked = false;
      await meeting.save();

      io.to(`meeting:${roomCode}`).emit('meeting:unlocked', { unlockedBy: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:end', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host can end the meeting' } });

      meeting.status = 'ended';
      meeting.endedAt = new Date();
      await meeting.save();

      await ParticipantSession.updateMany(
        { meetingId: meeting._id, leftAt: null },
        { leftAt: new Date() },
      );

      io.to(`meeting:${roomCode}`).emit('meeting:ended', { endedBy: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });
}
