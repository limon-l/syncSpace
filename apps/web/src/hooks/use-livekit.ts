'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  type RemoteParticipant,
  type LocalParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  createLocalTracks,
  type LocalVideoTrack,
  type LocalAudioTrack,
} from 'livekit-client';
import { fetchLiveKitToken, connectToLiveKit, LIVEKIT_URL } from '@/lib/livekit';

interface UseLiveKitOptions {
  roomName: string;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onError?: (error: Error) => void;
}

interface UseLiveKitReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  participants: RemoteParticipant[];
  localParticipant: LocalParticipant | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
}

export function useLiveKit({
  roomName,
  onParticipantConnected,
  onParticipantDisconnected,
  onTrackSubscribed,
  onError,
}: UseLiveKitOptions): UseLiveKitReturn {
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: { width: 640, height: 480 },
    },
  }));
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const connectedRef = useRef(false);
  const connectingRef = useRef(false);
  const handlersAttachedRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectedRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    if (!handlersAttachedRef.current) {
      room.on('connected', () => {
        setIsConnected(true);
        setIsConnecting(false);
        connectedRef.current = true;
        connectingRef.current = false;
        setLocalParticipant(room.localParticipant);
      });

      room.on('disconnected', () => {
        setIsConnected(false);
        setIsConnecting(false);
        connectedRef.current = false;
        connectingRef.current = false;
        setLocalParticipant(null);
        setParticipants([]);
      });

      room.on('participantConnected', (participant: RemoteParticipant) => {
        setParticipants((prev) => [...prev, participant]);
        onParticipantConnected?.(participant);
      });

      room.on('participantDisconnected', (participant: RemoteParticipant) => {
        setParticipants((prev) => prev.filter((p) => p.identity !== participant.identity));
        onParticipantDisconnected?.(participant);
      });

      room.on('trackSubscribed', (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        onTrackSubscribed?.(track, publication, participant);
      });

      room.on('connectionStateChanged', (state) => {
        if (state === 'disconnected') {
          setIsConnected(false);
          setIsConnecting(false);
          connectedRef.current = false;
          connectingRef.current = false;
        }
      });

      handlersAttachedRef.current = true;
    }

    try {
      const { token } = await fetchLiveKitToken(roomName);
      const url = LIVEKIT_URL;
      if (!url) throw new Error('LiveKit URL not configured');

      await room.connect(url, token);
    } catch (err) {
      room.disconnect();
      const message = err instanceof Error ? err.message : 'Failed to connect to LiveKit';
      setError(message);
      setIsConnecting(false);
      connectingRef.current = false;
      onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [roomName, room, onParticipantConnected, onParticipantDisconnected, onTrackSubscribed, onError]);

  const disconnect = useCallback(() => {
    room.disconnect();
    connectedRef.current = false;
    connectingRef.current = false;
    setIsConnecting(false);
  }, [room]);

  const toggleMic = useCallback(async () => {
    const local = room.localParticipant;
    if (!local) return;

    if (local.isMicrophoneEnabled) {
      await local.setMicrophoneEnabled(false);
    } else {
      await local.setMicrophoneEnabled(true);
    }
  }, [room]);

  const toggleCamera = useCallback(async () => {
    const local = room.localParticipant;
    if (!local) return;

    if (local.isCameraEnabled) {
      await local.setCameraEnabled(false);
    } else {
      await local.setCameraEnabled(true);
    }
  }, [room]);

  useEffect(() => {
    return () => {
      room.disconnect();
      connectedRef.current = false;
      connectingRef.current = false;
    };
  }, [room]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    participants,
    localParticipant,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
  };
}
