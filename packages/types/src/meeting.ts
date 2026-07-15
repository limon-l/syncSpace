export type MeetingStatus = 'active' | 'ended' | 'scheduled';

export type ParticipantRole = 'host' | 'co-host' | 'participant';

export interface MeetingSettings {
  waitingRoom: boolean;
  muteOnJoin: boolean;
  cameraOffOnJoin: boolean;
  allowParticipantUnmute: boolean;
  allowParticipantCam: boolean;
}

export const DEFAULT_MEETING_SETTINGS: MeetingSettings = {
  waitingRoom: false,
  muteOnJoin: true,
  cameraOffOnJoin: true,
  allowParticipantUnmute: true,
  allowParticipantCam: true,
};

export interface Meeting {
  id: string;
  roomCode: string;
  title: string;
  hostId: string;
  hostName: string;
  coHostIds: string[];
  status: MeetingStatus;
  isLocked: boolean;
  settings: MeetingSettings;
  participantCount: number;
  maxParticipants: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface MeetingSummary {
  id: string;
  roomCode: string;
  title: string;
  hostName: string;
  status: MeetingStatus;
  participantCount: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface CreateMeetingRequest {
  title?: string;
  maxParticipants?: number;
}

export interface JoinMeetingResponse {
  roomToken: string;
  livekitToken: string;
  meeting: Meeting;
}

export interface Participant {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface WaitingParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
}
