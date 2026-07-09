'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Meeting } from '@syncspace/types';

export default function PrejoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
        setDisplayName(user?.displayName || '');
      } catch {
        setError('Meeting not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomCode, user?.displayName]);

  useEffect(() => {
    let cancelled = false;

    async function startPreview() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameras(devices.filter((d) => d.kind === 'videoinput'));
        setMicrophones(devices.filter((d) => d.kind === 'audioinput'));

        const s = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        const videoDevice = devices.find((d) => d.kind === 'videoinput');
        const audioDevice = devices.find((d) => d.kind === 'audioinput');
        setSelectedCam(videoDevice?.deviceId ?? '');
        setSelectedMic(audioDevice?.deviceId ?? '');
      } catch {
        // Permission denied or no devices
      }
    }

    startPreview();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function switchCamera(deviceId: string) {
    setSelectedCam(deviceId);
    streamRef.current?.getVideoTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: true,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      // device switch failed
    }
  }

  function toggleMic() {
    const next = !micEnabled;
    setMicEnabled(next);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
  }

  function toggleCam() {
    const next = !camEnabled;
    setCamEnabled(next);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
  }

  async function joinMeeting() {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setJoining(true);
    router.push(`/meeting/room/${roomCode}?name=${encodeURIComponent(displayName.trim())}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <motion.p
          className="text-text-secondary"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading meeting...
        </motion.p>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 text-danger"
        >
          {error}
        </motion.p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-primary hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMic}
            className={`rounded-md px-3 py-1.5 text-xs ${
              micEnabled
                ? 'bg-bg-elevated text-text-primary'
                : 'bg-danger/20 text-danger'
            }`}
          >
            Mic {micEnabled ? 'On' : 'Off'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleCam}
            className={`rounded-md px-3 py-1.5 text-xs ${
              camEnabled
                ? 'bg-bg-elevated text-text-primary'
                : 'bg-danger/20 text-danger'
            }`}
          >
            Cam {camEnabled ? 'On' : 'Off'}
          </motion.button>
        </div>

        <AnimatePresence>
          {cameras.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {microphones.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

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

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-4 text-sm text-danger"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={joinMeeting}
          disabled={joining || !displayName.trim()}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Join meeting'}
        </motion.button>
      </motion.div>
    </div>
  );
}
