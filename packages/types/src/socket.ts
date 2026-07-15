export type SocketEvent =
  | 'meeting:join'
  | 'meeting:leave'
  | 'chat:send'
  | 'chat:typing-start'
  | 'chat:typing-stop'
  | 'reaction:send'
  | 'hand:raise'
  | 'hand:lower'
  | 'participant:mute'
  | 'participant:unmute'
  | 'participant:remove'
  | 'participant:admit'
  | 'participant:deny'
  | 'meeting:lock'
  | 'meeting:unlock'
  | 'meeting:end'
  | 'meeting:mute-all'
  | 'meeting:enable-mics'
  | 'meeting:enable-cams'
  | 'meeting:transfer-host'
  | 'meeting:promote-cohost'
  | 'meeting:demote-cohost'
  | 'role:assign'
  | 'media:state';

export type ServerEvent =
  | 'participant:joined'
  | 'participant:left'
  | 'participant:muted'
  | 'participant:unmuted'
  | 'participant:removed'
  | 'participant:admitted'
  | 'participant:denied'
  | 'participant:role-changed'
  | 'participant:hand-raised'
  | 'participant:hand-lowered'
  | 'chat:message'
  | 'chat:typing'
  | 'chat:stopped-typing'
  | 'chat:deleted'
  | 'reaction:received'
  | 'media:state'
  | 'meeting:locked'
  | 'meeting:unlocked'
  | 'meeting:ended'
  | 'meeting:muted-all'
  | 'meeting:enabled-mics'
  | 'meeting:enabled-cams'
  | 'meeting:host-transferred'
  | 'meeting:settings-changed'
  | 'meeting:waiting-participant'
  | 'meeting:waiting-participant-removed'
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
  | 'JOIN_TIMEOUT'
  | 'JOIN_FAILED'
  | 'MISCONFIGURED'
  | 'WAITING_ROOM';

export interface SocketError {
  code: SocketErrorCode;
  message: string;
}

export interface SocketResponse<T = void> {
  success: boolean;
  data?: T;
  error?: SocketError;
}

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

export interface ChatTypingPayload {
  roomCode: string;
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

export interface MeetingMuteAllPayload {
  roomCode: string;
}

export interface MeetingTransferHostPayload {
  roomCode: string;
  targetUserId: string;
}

export interface MeetingPromoteCohostPayload {
  roomCode: string;
  targetUserId: string;
}

export interface MediaStatePayload {
  roomCode: string;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface ParticipantJoinedEvent {
  userId: string;
  displayName: string;
  role: 'host' | 'co-host' | 'participant';
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  joinedAt: string;
}

export interface ChatMessageEvent {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ChatTypingEvent {
  userId: string;
  displayName: string;
}
