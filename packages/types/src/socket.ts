export type SocketEvent =
  | 'meeting:join'
  | 'meeting:leave'
  | 'chat:send'
  | 'reaction:send'
  | 'hand:raise'
  | 'hand:lower'
  | 'participant:mute'
  | 'participant:remove'
  | 'participant:admit'
  | 'meeting:lock'
  | 'meeting:unlock'
  | 'meeting:end'
  | 'role:assign'
  | 'media:state';

export type ServerEvent =
  | 'participant:joined'
  | 'participant:left'
  | 'participant:muted'
  | 'participant:removed'
  | 'participant:admitted'
  | 'participant:role-changed'
  | 'chat:message'
  | 'chat:deleted'
  | 'reaction:received'
  | 'hand:raised'
  | 'hand:lowered'
  | 'media:state'
  | 'meeting:locked'
  | 'meeting:unlocked'
  | 'meeting:ended'
  | 'error';

export type ReactionType = 'thumbsup' | 'clap' | 'laugh' | 'surprise' | 'heart';

export type SocketErrorCode =
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ROOM_FULL'
  | 'MEETING_ENDED'
  | 'MEETING_LOCKED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'CONNECTION_ERROR'
  | 'CONNECTION_TIMEOUT'
  | 'JOIN_TIMEOUT';

export interface SocketError {
  code: SocketErrorCode;
  message: string;
}

export interface SocketResponse<T = void> {
  success: boolean;
  data?: T;
  error?: SocketError;
}

// Client → Server event payloads
export interface MeetingJoinPayload {
  roomCode: string;
  displayName: string;
}

export interface MeetingLeavePayload {
  roomCode: string;
}

export interface ChatSendPayload {
  roomCode: string;
  content: string;
}

export interface ReactionSendPayload {
  roomCode: string;
  reaction: ReactionType;
}

export interface HandRaisePayload {
  roomCode: string;
}

export interface ParticipantMutePayload {
  roomCode: string;
  targetUserId: string;
}

export interface ParticipantRemovePayload {
  roomCode: string;
  targetUserId: string;
}

export interface ParticipantAdmitPayload {
  roomCode: string;
  targetUserId: string;
}

export interface MeetingLockPayload {
  roomCode: string;
}

export interface MediaStatePayload {
  roomCode: string;
  isMuted: boolean;
  isCameraOff: boolean;
}
