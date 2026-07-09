import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { Meeting } from '../../models/meeting.model.js';
import { ParticipantSession } from '../../models/participant-session.model.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import type { IUser } from '../../models/user.model.js';
import type { MeetingStatus } from '@syncspace/types';

function generateRoomCode(): string {
  return nanoid(8).toLowerCase();
}

export async function createMeeting(
  user: IUser,
  title: string = 'Meeting',
  maxParticipants: number = 8,
) {
  let roomCode: string;
  let attempts = 0;

  do {
    roomCode = generateRoomCode();
    attempts++;
  } while (await Meeting.findOne({ roomCode }) && attempts < 5);

  const meeting = await Meeting.create({
    roomCode,
    title,
    hostId: user._id,
    maxParticipants,
    startedAt: new Date(),
  });

  await ParticipantSession.create({
    meetingId: meeting._id,
    userId: user._id,
    role: 'host',
    isMuted: false,
    isCameraOff: true,
    isHandRaised: false,
    joinedAt: new Date(),
  });

  return {
    id: meeting._id.toString(),
    roomCode: meeting.roomCode,
    title: meeting.title,
    hostId: meeting.hostId.toString(),
    hostName: user.displayName,
    coHostIds: [],
    status: meeting.status as MeetingStatus,
    isLocked: meeting.isLocked,
    participantCount: 1,
    maxParticipants: meeting.maxParticipants,
    startedAt: meeting.startedAt?.toISOString() ?? null,
    endedAt: null,
    createdAt: meeting.createdAt.toISOString(),
  };
}

export async function getMeeting(roomCode: string) {
  const meeting = await Meeting.findOne({ roomCode }).populate('hostId', 'displayName');
  if (!meeting) {
    throw new NotFoundError('Meeting');
  }

  const participantCount = await ParticipantSession.countDocuments({
    meetingId: meeting._id,
    leftAt: null,
  });

  return {
    id: meeting._id.toString(),
    roomCode: meeting.roomCode,
    title: meeting.title,
    hostId: meeting.hostId._id.toString(),
    hostName: (meeting.hostId as unknown as { displayName: string }).displayName,
    coHostIds: meeting.coHostIds.map((id) => id.toString()),
    status: meeting.status as MeetingStatus,
    isLocked: meeting.isLocked,
    participantCount,
    maxParticipants: meeting.maxParticipants,
    startedAt: meeting.startedAt?.toISOString() ?? null,
    endedAt: meeting.endedAt?.toISOString() ?? null,
    createdAt: meeting.createdAt.toISOString(),
  };
}

export async function joinMeeting(roomCode: string, userId: string) {
  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) throw new NotFoundError('Meeting');
  if (meeting.status === 'ended') throw new ValidationError('Meeting has ended');

  const activeCount = await ParticipantSession.countDocuments({
    meetingId: meeting._id,
    leftAt: null,
  });

  if (activeCount >= meeting.maxParticipants) {
    throw new ValidationError('Meeting is full');
  }

  const existingSession = await ParticipantSession.findOne({
    meetingId: meeting._id,
    userId,
    leftAt: null,
  });

  if (!existingSession) {
    await ParticipantSession.create({
      meetingId: meeting._id,
      userId,
      role: 'participant',
      joinedAt: new Date(),
    });
  }

  if (!meeting.participantIds.some((id) => id.toString() === userId)) {
    meeting.participantIds.push(userId as unknown as mongoose.Types.ObjectId);
    await meeting.save();
  }

  return { meetingId: meeting._id.toString() };
}

export async function leaveMeeting(roomCode: string, userId: string) {
  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) return;

  await ParticipantSession.updateOne(
    { meetingId: meeting._id, userId, leftAt: null },
    { leftAt: new Date() },
  );

  meeting.participantIds = meeting.participantIds.filter(
    (id) => id.toString() !== userId,
  );
  await meeting.save();
}

export async function endMeeting(roomCode: string, userId: string) {
  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) throw new NotFoundError('Meeting');
  if (meeting.hostId.toString() !== userId) {
    throw new ForbiddenError('Only the host can end the meeting');
  }

  meeting.status = 'ended';
  meeting.endedAt = new Date();
  await meeting.save();

  await ParticipantSession.updateMany(
    { meetingId: meeting._id, leftAt: null },
    { leftAt: new Date() },
  );

  return { meetingId: meeting._id.toString() };
}

export async function lockMeeting(roomCode: string, userId: string, lock: boolean) {
  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) throw new NotFoundError('Meeting');

  if (meeting.hostId.toString() !== userId) {
    throw new ForbiddenError('Only the host can lock the meeting');
  }

  meeting.isLocked = lock;
  await meeting.save();

  return { isLocked: meeting.isLocked };
}

export async function getMeetingHistory(userId: string) {
  const meetings = await Meeting.find({ hostId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return Promise.all(
    meetings.map(async (m) => {
      const participantCount = await ParticipantSession.countDocuments({
        meetingId: m._id,
      });

      return {
        id: m._id.toString(),
        roomCode: m.roomCode,
        title: m.title,
        hostName: '',
        status: m.status as MeetingStatus,
        participantCount,
        startedAt: m.startedAt?.toISOString() ?? null,
        endedAt: m.endedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      };
    }),
  );
}
