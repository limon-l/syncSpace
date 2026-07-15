import type { Server, Socket } from 'socket.io';
import { participantActionSchema, meetingLockSchema, meetingTransferHostSchema } from '@syncspace/validation';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import type { IMeeting } from '../../models/meeting.model.js';
import type { SocketUser } from '../socket.server.js';
import { logger } from '../../lib/logger.js';

type AckCallback = (response: {
  success: boolean;
  data?: unknown;
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

  socket.on('participant:unmute', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can unmute participants' } });

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { isMuted: false },
      );

      io.to(`meeting:${roomCode}`).emit('participant:unmuted', { userId: targetUserId, unmutedBy: user.id });
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
      if (isHost(targetUserId, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot remove the host' } });

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { leftAt: new Date() },
      );

      meeting.participantIds = meeting.participantIds.filter(
        (id) => id.toString() !== targetUserId,
      );
      await meeting.save();

      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => (s as unknown as { user: SocketUser }).user?.id === targetUserId,
      );
      if (targetSocket) {
        targetSocket.emit('participant:removed', { userId: targetUserId, removedBy: user.id });
        targetSocket.leave(`meeting:${roomCode}`);
      }

      io.to(`meeting:${roomCode}`).emit('participant:left', { userId: targetUserId });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('participant:admit', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can admit participants' } });

      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => (s as unknown as { user: SocketUser }).user?.id === targetUserId,
      );
      if (targetSocket) {
        targetSocket.emit('participant:admitted', { roomCode, admittedBy: user.id });
      }

      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('participant:deny', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can deny participants' } });

      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => (s as unknown as { user: SocketUser }).user?.id === targetUserId,
      );
      if (targetSocket) {
        targetSocket.emit('participant:denied', { roomCode, deniedBy: user.id });
      }

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

  socket.on('meeting:mute-all', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can mute all' } });

      await ParticipantSession.updateMany(
        { meetingId: meeting._id, leftAt: null, userId: { $ne: user.id } },
        { isMuted: true },
      );

      io.to(`meeting:${roomCode}`).emit('meeting:muted-all', { mutedBy: user.id });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:enable-mics', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can enable mics' } });

      meeting.settings.allowParticipantUnmute = true;
      await meeting.save();

      io.to(`meeting:${roomCode}`).emit('meeting:enabled-mics', { enabledBy: user.id });
      io.to(`meeting:${roomCode}`).emit('meeting:settings-changed', { settings: meeting.settings });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:enable-cams', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode } = meetingLockSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHostOrCoHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host or co-host can enable cameras' } });

      meeting.settings.allowParticipantCam = true;
      await meeting.save();

      io.to(`meeting:${roomCode}`).emit('meeting:enabled-cams', { enabledBy: user.id });
      io.to(`meeting:${roomCode}`).emit('meeting:settings-changed', { settings: meeting.settings });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:transfer-host', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = meetingTransferHostSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host can transfer host role' } });
      if (targetUserId === user.id) return ack?.({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot transfer host to yourself' } });

      const oldHostId = meeting.hostId;
      meeting.hostId = new (await import('mongoose')).default.Types.ObjectId(targetUserId);
      meeting.coHostIds = meeting.coHostIds.filter((id) => id.toString() !== targetUserId);
      await meeting.save();

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { role: 'host' },
      );
      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: oldHostId.toString(), leftAt: null },
        { role: 'participant' },
      );

      io.to(`meeting:${roomCode}`).emit('meeting:host-transferred', {
        fromUserId: user.id,
        toUserId: targetUserId,
      });
      if (ack) ack({ success: true });
    } catch (error) {
      logger.error(error, 'meeting:transfer-host error');
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:promote-cohost', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host can promote to co-host' } });

      if (!meeting.coHostIds.some((id) => id.toString() === targetUserId)) {
        meeting.coHostIds.push(new (await import('mongoose')).default.Types.ObjectId(targetUserId));
        await meeting.save();
      }

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { role: 'co-host' },
      );

      io.to(`meeting:${roomCode}`).emit('participant:role-changed', {
        userId: targetUserId,
        role: 'co-host',
        changedBy: user.id,
      });
      if (ack) ack({ success: true });
    } catch (error) {
      if (ack) ack({ success: false, error: { code: 'ERROR', message: (error as Error).message } });
    }
  });

  socket.on('meeting:demote-cohost', async (payload: unknown, ack?: AckCallback) => {
    try {
      const { roomCode, targetUserId } = participantActionSchema.parse(payload);
      const meeting = await Meeting.findOne({ roomCode });
      if (!meeting) return ack?.({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });
      if (!isHost(user.id, meeting)) return ack?.({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only host can demote co-host' } });

      meeting.coHostIds = meeting.coHostIds.filter((id) => id.toString() !== targetUserId);
      await meeting.save();

      await ParticipantSession.updateOne(
        { meetingId: meeting._id, userId: targetUserId, leftAt: null },
        { role: 'participant' },
      );

      io.to(`meeting:${roomCode}`).emit('participant:role-changed', {
        userId: targetUserId,
        role: 'participant',
        changedBy: user.id,
      });
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
