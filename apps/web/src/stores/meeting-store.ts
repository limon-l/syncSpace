import { create } from 'zustand';
import type { Participant } from '@syncspace/types';

interface MeetingState {
  roomCode: string | null;
  participants: Participant[];
  isLocked: boolean;
  isGridMode: boolean;
  sidePanel: 'people' | 'chat' | null;
  setRoomCode: (roomCode: string | null) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  setIsLocked: (locked: boolean) => void;
  setGridMode: (grid: boolean) => void;
  setSidePanel: (panel: 'people' | 'chat' | null) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  roomCode: null,
  participants: [],
  isLocked: false,
  isGridMode: true,
  sidePanel: null,
  setRoomCode: (roomCode) => set({ roomCode }),
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
  setIsLocked: (isLocked) => set({ isLocked }),
  setGridMode: (isGridMode) => set({ isGridMode }),
  setSidePanel: (sidePanel) => set({ sidePanel }),
  reset: () =>
    set({
      roomCode: null,
      participants: [],
      isLocked: false,
      isGridMode: true,
      sidePanel: null,
    }),
}));
