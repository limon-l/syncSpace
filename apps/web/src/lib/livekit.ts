'use client';

import { Room, LocalParticipant, type RoomEvent, type RemoteParticipant, type Participant, type TrackPublication, createLocalTracks, type LocalTrack, type LocalVideoTrack, type LocalAudioTrack } from 'livekit-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

export async function fetchLiveKitToken(roomName: string): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API_BASE}/api/livekit/token/${roomName}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch LiveKit token');
  }

  return res.json();
}

export function createLiveKitRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: { width: 640, height: 480 },
    },
  });
}

export async function connectToLiveKit(
  room: Room,
  token: string,
): Promise<void> {
  const url = LIVEKIT_URL;
  if (!url) {
    throw new Error('LiveKit URL not configured');
  }

  await room.connect(url, token);
}

export async function createLocalMediaStream(
  audio = true,
  video = true,
): Promise<{ audioTrack?: LocalAudioTrack; videoTrack?: LocalVideoTrack }> {
  const tracks = await createLocalTracks({ audio, video });
  const audioTrack = tracks.find((t): t is LocalAudioTrack => t.kind === 'audio');
  const videoTrack = tracks.find((t): t is LocalVideoTrack => t.kind === 'video');
  return { audioTrack, videoTrack };
}

export function getParticipantIdentity(participant: Participant): string {
  return participant.identity;
}

export function isLocalParticipant(participant: Participant): boolean {
  return participant instanceof LocalParticipant;
}

export { Room };
export type { RemoteParticipant, LocalParticipant, Participant, RoomEvent, TrackPublication, LocalTrack, LocalVideoTrack, LocalAudioTrack };
