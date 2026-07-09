'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Meeting } from '@syncspace/types';
import { Mic, MicOff, Video, VideoOff, Loader2, ArrowRight } from 'lucide-react';

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={24} className="text-primary" />
        </motion.div>
        <motion.p
          className="text-sm text-text-secondary"
          animate={{ opacity: [0.5, 1, 0.5] }}
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
          className="mb-2 text-lg text-danger"
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md lg:max-w-lg"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-lg sm:text-xl font-semibold text-text-primary">{meeting?.title || 'Meeting'}</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 font-mono">{roomCode}</p>
        </div>

        <div className="relative mb-4 overflow-hidden rounded-2xl bg-bg-surface border border-border">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full object-cover"
          />
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            <span className={`rounded-lg px-2 py-1 text-xs backdrop-blur-sm flex items-center gap-1 ${micEnabled ? 'bg-black/50 text-white' : 'bg-danger/80 text-white'}`}>
              {micEnabled ? <Mic size={12} /> : <MicOff size={12} />}
              {micEnabled ? 'Mic On' : 'Mic Off'}
            </span>
            <span className={`rounded-lg px-2 py-1 text-xs backdrop-blur-sm flex items-center gap-1 ${camEnabled ? 'bg-black/50 text-white' : 'bg-danger/80 text-white'}`}>
              {camEnabled ? <Video size={12} /> : <VideoOff size={12} />}
              {camEnabled ? 'Cam On' : 'Cam Off'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleMic}
            className={`flex-1 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              micEnabled
                ? 'bg-bg-elevated text-text-primary border border-border'
                : 'bg-danger/20 text-danger border border-danger/30'
            }`}
          >
            {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            {micEnabled ? 'Microphone On' : 'Microphone Off'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleCam}
            className={`flex-1 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              camEnabled
                ? 'bg-bg-elevated text-text-primary border border-border'
                : 'bg-danger/20 text-danger border border-danger/30'
            }`}
          >
            {camEnabled ? <Video size={14} /> : <VideoOff size={14} />}
            {camEnabled ? 'Camera On' : 'Camera Off'}
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
                className="mb-2 w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
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
                className="mb-4 w-full rounded-xl border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
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
          <label className="mb-1.5 block text-sm text-text-secondary">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-surface/50 px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:bg-bg-surface placeholder:text-text-secondary/40"
            placeholder="Your name"
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
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary-glow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Joining...
            </>
          ) : (
            <>
              Join meeting
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
