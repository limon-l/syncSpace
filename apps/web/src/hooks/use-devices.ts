'use client';

import { useCallback, useEffect } from 'react';
import { useDeviceStore } from '@/stores/device-store';

export function useDevices() {
  const {
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    isEnumerating,
    setSelectedAudioInput,
    setSelectedVideoInput,
    setSelectedAudioOutput,
    enumerateDevices,
  } = useDeviceStore();

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    function handleDeviceChange() {
      enumerateDevices();
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  const getConstraints = useCallback(
    (audioDeviceId?: string, videoDeviceId?: string): MediaStreamConstraints => ({
      audio: audioDeviceId && audioDeviceId !== 'default'
        ? { deviceId: { exact: audioDeviceId } }
        : true,
      video: videoDeviceId && videoDeviceId !== 'default'
        ? { deviceId: { exact: videoDeviceId } }
        : true,
    }),
    [],
  );

  return {
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    isEnumerating,
    setSelectedAudioInput,
    setSelectedVideoInput,
    setSelectedAudioOutput,
    enumerateDevices,
    getConstraints,
  };
}
