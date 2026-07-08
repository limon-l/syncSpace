'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Meeting } from '@syncspace/types';

export default function PrejoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Meeting>(`/api/meetings/${roomCode}`);
        setMeeting(data);
        setDisplayName(data.hostName);
      } catch {
        setError('Meeting not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomCode]);

  async function startPreview() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
      setMicrophones(devices.filter((d) => d.kind === 'audioinput'));

      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }

      if (devices.length > 0) {
        setSelectedCam(devices.find((d) => d.kind === 'videoinput')?.deviceId ?? '');
        setSelectedMic(devices.find((d) => d.kind === 'audioinput')?.deviceId ?? '');
      }
    } catch {
      // Permission denied or no devices
    }
  }

  useEffect(() => {
    startPreview();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function switchCamera(deviceId: string) {
    setSelectedCam(deviceId);
    stream?.getVideoTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: true,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      // device switch failed
    }
  }

  function toggleMic() {
    setMicEnabled((prev) => {
      stream?.getAudioTracks().forEach((t) => (t.enabled = !prev));
      return !prev;
    });
  }

  function toggleCam() {
    setCamEnabled((prev) => {
      stream?.getVideoTracks().forEach((t) => (t.enabled = !prev));
      return !prev;
    });
  }

  async function joinMeeting() {
    setJoining(true);
    try {
      await api.post(`/api/meetings/${roomCode}/join`, { displayName });
      router.push(`/meeting/room/${roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join meeting');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">Loading meeting...</p>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-lg">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">{meeting?.title}</h1>
        <p className="mb-6 text-sm text-text-secondary">Room: {roomCode}</p>

        <div className="mb-4 overflow-hidden rounded-lg bg-bg-surface">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full object-cover"
          />
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={toggleMic}
            className={`rounded-md px-3 py-1.5 text-xs ${
              micEnabled
                ? 'bg-bg-elevated text-text-primary'
                : 'bg-danger/20 text-danger'
            }`}
          >
            Mic {micEnabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={toggleCam}
            className={`rounded-md px-3 py-1.5 text-xs ${
              camEnabled
                ? 'bg-bg-elevated text-text-primary'
                : 'bg-danger/20 text-danger'
            }`}
          >
            Cam {camEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {cameras.length > 1 && (
          <select
            value={selectedCam}
            onChange={(e) => switchCamera(e.target.value)}
            className="mb-2 w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        {microphones.length > 1 && (
          <select
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            className="mb-4 w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          >
            {microphones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `Mic ${mic.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm text-text-secondary">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-text-primary outline-none focus:border-primary"
            maxLength={50}
          />
        </div>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <button
          onClick={joinMeeting}
          disabled={joining || !displayName.trim()}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Join meeting'}
        </button>
      </div>
    </div>
  );
}
