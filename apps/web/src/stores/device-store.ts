import { create } from 'zustand';

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

interface DeviceState {
  audioInputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioInput: string;
  selectedVideoInput: string;
  selectedAudioOutput: string;
  isEnumerating: boolean;

  setAudioInputDevices: (devices: MediaDeviceInfo[]) => void;
  setVideoInputDevices: (devices: MediaDeviceInfo[]) => void;
  setAudioOutputDevices: (devices: MediaDeviceInfo[]) => void;
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  setIsEnumerating: (v: boolean) => void;
  enumerateDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  audioInputDevices: [],
  videoInputDevices: [],
  audioOutputDevices: [],
  selectedAudioInput: 'default',
  selectedVideoInput: 'default',
  selectedAudioOutput: 'default',
  isEnumerating: false,

  setAudioInputDevices: (audioInputDevices) => set({ audioInputDevices }),
  setVideoInputDevices: (videoInputDevices) => set({ videoInputDevices }),
  setAudioOutputDevices: (audioOutputDevices) => set({ audioOutputDevices }),
  setSelectedAudioInput: (selectedAudioInput) => set({ selectedAudioInput }),
  setSelectedVideoInput: (selectedVideoInput) => set({ selectedVideoInput }),
  setSelectedAudioOutput: (selectedAudioOutput) => set({ selectedAudioOutput }),
  setIsEnumerating: (isEnumerating) => set({ isEnumerating }),

  enumerateDevices: async () => {
    set({ isEnumerating: true });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audioinput' }));
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'videoinput' }));
      const audioOutputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`, kind: d.kind as 'audiooutput' }));

      set({
        audioInputDevices: audioInputs,
        videoInputDevices: videoInputs,
        audioOutputDevices: audioOutputs,
        isEnumerating: false,
      });
    } catch {
      set({ isEnumerating: false });
    }
  },
}));
