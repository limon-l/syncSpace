import { create } from 'zustand';
import type { ChatMessage, Participant, SocketError } from '@syncspace/types';

interface MeetingState {
  roomCode: string | null;
  displayName: string;
  participants: Participant[];
  chatMessages: ChatMessage[];
  isLocked: boolean;
  isGridMode: boolean;
  sidePanel: 'people' | 'chat' | 'notes' | 'files' | null;
  socketError: SocketError | null;
  isConnected: boolean;
  localMicOn: boolean;
  localCamOn: boolean;
  localHandRaised: boolean;

  setRoomCode: (roomCode: string | null) => void;
  setDisplayName: (name: string) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  addChatMessage: (message: ChatMessage) => void;
  setIsLocked: (locked: boolean) => void;
  setGridMode: (grid: boolean) => void;
  setSidePanel: (panel: 'people' | 'chat' | 'notes' | 'files' | null) => void;
  setSocketError: (error: SocketError | null) => void;
  setConnected: (connected: boolean) => void;
  setLocalMicOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  setLocalCamOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  setLocalHandRaised: (raised: boolean | ((prev: boolean) => boolean)) => void;
  reset: () => void;
}

const initialState = {
  roomCode: null,
  displayName: '',
  participants: [],
  chatMessages: [],
  isLocked: false,
  isGridMode: true,
  sidePanel: null as 'people' | 'chat' | 'notes' | null,
  socketError: null as SocketError | null,
  isConnected: false,
  localMicOn: true,
  localCamOn: false,
  localHandRaised: false,
};

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,

  setRoomCode: (roomCode) => set({ roomCode }),
  setDisplayName: (displayName) => set({ displayName }),
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
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  setIsLocked: (isLocked) => set({ isLocked }),
  setGridMode: (isGridMode) => set({ isGridMode }),
  setSidePanel: (sidePanel) => set({ sidePanel }),
  setSocketError: (socketError) => set({ socketError }),
  setConnected: (isConnected) => set({ isConnected }),
  setLocalMicOn: (on) => set((state) => ({ localMicOn: typeof on === 'function' ? on(state.localMicOn) : on })),
  setLocalCamOn: (on) => set((state) => ({ localCamOn: typeof on === 'function' ? on(state.localCamOn) : on })),
  setLocalHandRaised: (on) => set((state) => ({ localHandRaised: typeof on === 'function' ? on(state.localHandRaised) : on })),
  reset: () => set(initialState),
}));
