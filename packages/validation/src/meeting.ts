import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().max(100, 'Title must be at most 100 characters').trim().default('Meeting'),
  maxParticipants: z.number().int().min(2).max(16).default(8),
});

export const roomCodeParam = z.object({
  roomCode: z.string().length(8, 'Invalid room code'),
});

export const joinMeetingSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50)
    .trim(),
});

export const meetingSettingsUpdateSchema = z.object({
  waitingRoom: z.boolean().optional(),
  muteOnJoin: z.boolean().optional(),
  cameraOffOnJoin: z.boolean().optional(),
  allowParticipantUnmute: z.boolean().optional(),
  allowParticipantCam: z.boolean().optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
export type MeetingSettingsUpdate = z.infer<typeof meetingSettingsUpdateSchema>;
