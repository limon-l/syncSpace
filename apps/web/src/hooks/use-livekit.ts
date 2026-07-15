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

const CONNECT_TIMEOUT_MS = 20_000;

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
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(async () => {
    if (connectedRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    if (!LIVEKIT_URL) {
      setIsConnecting(false);
      setIsConnected(false);
      connectedRef.current = false;
      connectingRef.current = false;
      setError('LiveKit URL not configured. Set NEXT_PUBLIC_LIVEKIT_URL. Video/audio disabled.');
      return;
    }

    if (!handlersAttachedRef.current) {
      room.on('connected', () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setIsConnected(true);
        setIsConnecting(false);
        connectedRef.current = true;
        connectingRef.current = false;
        setLocalParticipant(room.localParticipant);
      });

      room.on('disconnected', () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
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
          if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
          }
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

      const connectPromise = room.connect(url, token);
      const timeoutPromise = new Promise<never>((_, reject) => {
        connectTimeoutRef.current = setTimeout(() => {
          connectTimeoutRef.current = null;
          reject(new Error('Connection timed out. Please check your network and try again.'));
        }, CONNECT_TIMEOUT_MS);
      });

      await Promise.race([connectPromise, timeoutPromise]);
    } catch (err) {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      room.disconnect();
      const message = err instanceof Error ? err.message : 'Failed to connect to LiveKit';
      setError(message);
      setIsConnecting(false);
      setIsConnected(false);
      connectedRef.current = false;
      connectingRef.current = false;
      onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [roomName, room, onParticipantConnected, onParticipantDisconnected, onTrackSubscribed, onError]);

  const disconnect = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    room.disconnect();
    connectedRef.current = false;
    connectingRef.current = false;
    setIsConnected(false);
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
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
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
