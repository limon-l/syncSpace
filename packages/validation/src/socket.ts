import { z } from 'zod';

const reactionTypeEnum = z.enum(['thumbsup', 'clap', 'laugh', 'surprise', 'heart']);

export const meetingJoinSchema = z.object({
  roomCode: z.string().length(8),
  displayName: z.string().min(1).max(50).trim(),
});

export const meetingLeaveSchema = z.object({
  roomCode: z.string().length(8),
});

export const chatSendSchema = z.object({
  roomCode: z.string().length(8),
  content: z.string().trim().min(1).max(2000),
});

export const chatTypingSchema = z.object({
  roomCode: z.string().length(8),
});

export const reactionSendSchema = z.object({
  roomCode: z.string().length(8),
  reaction: reactionTypeEnum,
});

export const handRaiseSchema = z.object({
  roomCode: z.string().length(8),
});

export const participantActionSchema = z.object({
  roomCode: z.string().length(8),
  targetUserId: z.string(),
});

export const meetingLockSchema = z.object({
  roomCode: z.string().length(8),
});

export const mediaStateSchema = z.object({
  roomCode: z.string().length(8),
  isMuted: z.boolean(),
  isCameraOff: z.boolean(),
});

export const meetingSettingsSchema = z.object({
  waitingRoom: z.boolean().optional(),
  muteOnJoin: z.boolean().optional(),
  cameraOffOnJoin: z.boolean().optional(),
  allowParticipantUnmute: z.boolean().optional(),
  allowParticipantCam: z.boolean().optional(),
});

export const meetingTransferHostSchema = z.object({
  roomCode: z.string().length(8),
  targetUserId: z.string(),
});
