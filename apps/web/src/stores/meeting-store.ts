import { create } from 'zustand';
import type { ChatMessage, Participant, SocketError, MeetingSettings, WaitingParticipant } from '@syncspace/types';
import { DEFAULT_MEETING_SETTINGS } from '@syncspace/types';

type ViewMode = 'gallery' | 'speaker';
type SidePanel = 'people' | 'chat' | 'notes' | 'files' | 'settings' | null;

interface MeetingState {
  roomCode: string | null;
  displayName: string;
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  chatMessages: ChatMessage[];
  typingUsers: Map<string, string>;
  isLocked: boolean;
  viewMode: ViewMode;
  sidePanel: SidePanel;
  socketError: SocketError | null;
  isConnected: boolean;
  settings: MeetingSettings;
  localMicOn: boolean;
  localCamOn: boolean;
  localHandRaised: boolean;
  localScreenSharing: boolean;
  isFullscreen: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'unknown';
  activeSpeakerId: string | null;
  currentUserId: string;

  setRoomCode: (roomCode: string | null) => void;
  setDisplayName: (name: string) => void;
  setCurrentUserId: (id: string) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  addWaitingParticipant: (participant: WaitingParticipant) => void;
  removeWaitingParticipant: (userId: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  addTypingUser: (userId: string, displayName: string) => void;
  removeTypingUser: (userId: string) => void;
  setIsLocked: (locked: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSidePanel: (panel: SidePanel) => void;
  setSocketError: (error: SocketError | null) => void;
  setConnected: (connected: boolean) => void;
  setSettings: (settings: MeetingSettings) => void;
  setLocalMicOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  setLocalCamOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  setLocalHandRaised: (raised: boolean | ((prev: boolean) => boolean)) => void;
  setLocalScreenSharing: (sharing: boolean) => void;
  setIsFullscreen: (fs: boolean) => void;
  setConnectionQuality: (quality: 'good' | 'fair' | 'poor' | 'unknown') => void;
  setActiveSpeakerId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  roomCode: null as string | null,
  displayName: '',
  participants: [] as Participant[],
  waitingParticipants: [] as WaitingParticipant[],
  chatMessages: [] as ChatMessage[],
  typingUsers: new Map<string, string>(),
  isLocked: false,
  viewMode: 'gallery' as ViewMode,
  sidePanel: null as SidePanel,
  socketError: null as SocketError | null,
  isConnected: false,
  settings: {
    waitingRoom: false,
    muteOnJoin: true,
    cameraOffOnJoin: true,
    allowParticipantUnmute: true,
    allowParticipantCam: true,
  } as MeetingSettings,
  localMicOn: false,
  localCamOn: false,
  localHandRaised: false,
  localScreenSharing: false,
  isFullscreen: false,
  connectionQuality: 'unknown' as const,
  activeSpeakerId: null as string | null,
  currentUserId: '',
};

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,

  setRoomCode: (roomCode) => set({ roomCode }),
  setDisplayName: (displayName) => set({ displayName }),
  setCurrentUserId: (currentUserId) => set({ currentUserId }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((state) => ({
      participants: state.participants.some((p) => p.userId === participant.userId)
        ? state.participants
        : [...state.participants, participant],
    })),
  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),
  updateParticipant: (userId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.userId === userId ? { ...p, ...updates } : p,
      ),
    })),
  addWaitingParticipant: (participant) =>
    set((state) => ({
      waitingParticipants: state.waitingParticipants.some((p) => p.userId === participant.userId)
        ? state.waitingParticipants
        : [...state.waitingParticipants, participant],
    })),
  removeWaitingParticipant: (userId) =>
    set((state) => ({
      waitingParticipants: state.waitingParticipants.filter((p) => p.userId !== userId),
    })),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  addTypingUser: (userId, displayName) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      next.set(userId, displayName);
      return { typingUsers: next };
    }),
  removeTypingUser: (userId) =>
    set((state) => {
      const next = new Map(state.typingUsers);
      next.delete(userId);
      return { typingUsers: next };
    }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSidePanel: (sidePanel) => set({ sidePanel }),
  setSocketError: (socketError) => set({ socketError }),
  setConnected: (isConnected) => set({ isConnected }),
  setSettings: (settings) => set({ settings }),
  setLocalMicOn: (on) => set((state) => ({ localMicOn: typeof on === 'function' ? on(state.localMicOn) : on })),
  setLocalCamOn: (on) => set((state) => ({ localCamOn: typeof on === 'function' ? on(state.localCamOn) : on })),
  setLocalHandRaised: (on) => set((state) => ({ localHandRaised: typeof on === 'function' ? on(state.localHandRaised) : on })),
  setLocalScreenSharing: (localScreenSharing) => set({ localScreenSharing }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
  setActiveSpeakerId: (activeSpeakerId) => set({ activeSpeakerId }),
  reset: () => {
    set({ ...initialState, typingUsers: new Map() });
  },
}));
