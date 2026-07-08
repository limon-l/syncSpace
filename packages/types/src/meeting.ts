export type MeetingStatus = 'active' | 'ended' | 'scheduled';

export type ParticipantRole = 'host' | 'co-host' | 'participant';

export interface Meeting {
  id: string;
  roomCode: string;
  title: string;
  hostId: string;
  hostName: string;
  coHostIds: string[];
  status: MeetingStatus;
  isLocked: boolean;
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
  joinedAt: string;
}

export interface WaitingParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
}
