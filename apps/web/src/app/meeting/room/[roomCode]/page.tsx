'use client';

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMeetingStore } from '@/stores/meeting-store';
import { getSocket, connectSocket, disconnectSocket, getSocketUrl } from '@/lib/socket';
import { useLiveKit } from '@/hooks/use-livekit';
import type { ChatMessage, Participant as ParticipantType, SocketError } from '@syncspace/types';
import { CollaborativePad } from '@/components/collaborative-pad';
import { FilesPanel } from '@/components/files-panel';
import { MeetingToolbar } from '@/components/meeting/meeting-toolbar';
import { ParticipantPanel } from '@/components/meeting/participant-panel';
import { ChatPanel } from '@/components/meeting/chat-panel';
import { SettingsModal } from '@/components/meeting/settings-modal';
import { useMeetingPermissions } from '@/hooks/use-meeting-permissions';
import { useAuthStore } from '@/stores/auth-store';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorDown } from 'lucide-react';
import { type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from 'livekit-client';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const ParticipantVideoTile = memo(function ParticipantVideoTile({
  participant,
  isLocal,
  isSpeaking,
  isScreenSharing,
}: {
  participant: RemoteParticipant;
  isLocal: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<RemoteTrack | null>(null);

  useEffect(() => {
    function handleTrackSubscribed(track: RemoteTrack) {
      if (track.kind === 'video') setVideoTrack(track);
      if (track.kind === 'audio') setAudioTrack(track);
    }
    function handleTrackUnsubscribed(track: RemoteTrack) {
      if (track.kind === 'video') setVideoTrack((prev) => (prev === track ? null : prev));
      if (track.kind === 'audio') setAudioTrack((prev) => (prev === track ? null : prev));
    }
    function handleLocalTrackPublished(pub: RemoteTrackPublication) {
      if (pub.track) {
        if (pub.track.kind === 'video') setVideoTrack(pub.track);
        if (pub.track.kind === 'audio') setAudioTrack(pub.track);
      }
    }
    function handleLocalTrackUnpublished(pub: RemoteTrackPublication) {
      if (pub.track) {
        if (pub.track.kind === 'video') setVideoTrack((prev) => (prev === pub.track ? null : prev));
        if (pub.track.kind === 'audio') setAudioTrack((prev) => (prev === pub.track ? null : prev));
      }
    }

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
    if (isLocal) {
      participant.on('trackPublished', handleLocalTrackPublished);
      participant.on('trackUnpublished', handleLocalTrackUnpublished);
    }
    participant.trackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);
      if (isLocal) {
        participant.off('trackPublished', handleLocalTrackPublished);
        participant.off('trackUnpublished', handleLocalTrackUnpublished);
      }
    };
  }, [participant, isLocal]);

  useEffect(() => {
    if (videoRef.current && videoTrack?.mediaStream) videoRef.current.srcObject = videoTrack.mediaStream;
  }, [videoTrack]);

  useEffect(() => {
    if (audioRef.current && audioTrack?.mediaStream) audioRef.current.srcObject = audioTrack.mediaStream;
  }, [audioTrack]);

  const displayName = participant.name || participant.identity;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      className={`relative flex aspect-video items-center justify-center rounded-xl overflow-hidden ${
        isSpeaking ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : ''
      } ${isScreenSharing ? 'ring-2 ring-secondary' : ''} bg-bg-surface border border-border/50`}
    >
      {videoTrack ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
          <span className="text-xl font-medium text-text-primary">{initial}</span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
        <span className="text-xs text-white">{displayName}{isLocal ? ' (You)' : ''}</span>
      </div>
      {isSpeaking && (
        <div className="absolute bottom-2 right-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </motion.div>
  );
});

function ScreenShareTile({ participant }: { participant: RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [screenTrack, setScreenTrack] = useState<RemoteTrack | null>(null);

  useEffect(() => {
    function handleTrackSubscribed(track: RemoteTrack) {
      if (track.kind === 'video' && track.source === 'screen_share') setScreenTrack(track);
    }
    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.trackPublications.forEach((pub) => { if (pub.track) handleTrackSubscribed(pub.track); });
    return () => { participant.off('trackSubscribed', handleTrackSubscribed); };
  }, [participant]);

  useEffect(() => {
    if (videoRef.current && screenTrack?.mediaStream) videoRef.current.srcObject = screenTrack.mediaStream;
  }, [screenTrack]);

  if (!screenTrack) return null;

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-bg-surface border border-border">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
        <span className="text-xs text-white">{participant.name || participant.identity} is sharing</span>
      </div>
    </div>
  );
}

export default function MeetingRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const searchParams = useSearchParams();
  const displayName = searchParams.get('name') || '';
  const router = useRouter();
  const hasJoined = useRef(false);

  const {
    participants, isLocked, sidePanel, localMicOn, localCamOn, socketError, isConnected,
    viewMode, settings, activeSpeakerId, waitingParticipants,
    setDisplayName, addParticipant, removeParticipant, updateParticipant,
    setIsLocked, setSidePanel, setRoomCode, setConnected, setSocketError,
    addChatMessage, setLocalMicOn, setLocalCamOn, setSettings,
    setActiveSpeakerId, setParticipants, setCurrentUserId, addWaitingParticipant,
    removeWaitingParticipant, setLocalScreenSharing, reset,
  } = useMeetingStore();

  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const lk = useLiveKit({ roomName: roomCode });

  useEffect(() => {
    setRoomCode(roomCode);
    setDisplayName(displayName);
    setCurrentUserId(userId);
  }, [roomCode, displayName, userId, setRoomCode, setDisplayName, setCurrentUserId]);

  useEffect(() => {
    if (!lk.isConnected || !lk.room) return;
    const room = lk.room;
    function handleActiveSpeakersChanged(speakers: Array<{ identity: string }>) {
      setActiveSpeakerId(speakers[0]?.identity ?? null);
    }
    room.on('activeSpeakersChanged', handleActiveSpeakersChanged);
    return () => { room.off('activeSpeakersChanged', handleActiveSpeakersChanged); };
  }, [lk.isConnected, lk.room, setActiveSpeakerId]);

  useEffect(() => {
    const socketUrl = getSocketUrl();
    if (!socketUrl) {
      setSocketError({ code: 'MISCONFIGURED', message: 'Server URL not configured.' });
      return;
    }

    hasJoined.current = false;
    const socket = connectSocket();
    setConnected(socket.connected);

    const CONNECT_TIMEOUT_MS = 60_000;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;
    let joinAckTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!socket.connected) {
      connectTimeout = setTimeout(() => {
        const state = useMeetingStore.getState();
        if (!state.isConnected && !state.socketError) {
          setSocketError({ code: 'CONNECTION_TIMEOUT', message: `Unable to connect to server at ${socketUrl}. The server may be starting up.` });
        }
      }, CONNECT_TIMEOUT_MS);
    }

    function emitJoin() {
      if (hasJoined.current) return;
      hasJoined.current = true;
      joinAckTimeout = setTimeout(() => {
        const state = useMeetingStore.getState();
        if (!state.socketError) setSocketError({ code: 'JOIN_TIMEOUT', message: 'Server is not responding.' });
      }, 15_000);

      socket.emit('meeting:join', { roomCode, displayName }, (response: any) => {
        if (joinAckTimeout) { clearTimeout(joinAckTimeout); joinAckTimeout = null; }
        if (!response?.success) {
          setSocketError(response?.error || { code: 'JOIN_FAILED', message: 'Failed to join meeting' });
        } else {
          if (response.data?.participants) setParticipants(response.data.participants);
          if (response.data?.settings) setSettings(response.data.settings);
          lk.connect();
        }
      });
    }

    function onConnect() {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      setSocketError(null);
      setConnected(true);
      emitJoin();
    }

    function onDisconnect() { setConnected(false); }

    function onConnectError(error: Error) {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      const msg = error?.message || 'Unknown error';
      if (msg.includes('UNAUTHORIZED')) {
        try { socket.disconnect(); } catch {}
        setSocketError({ code: 'UNAUTHORIZED', message: 'Your session has expired. Please log in again.' });
      } else {
        setSocketError({ code: 'CONNECTION_ERROR', message: `Connection failed: ${msg}` });
      }
    }

    function onReconnectFailed() {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      setSocketError({ code: 'CONNECTION_ERROR', message: `Failed to connect to ${socketUrl} after multiple attempts.` });
    }

    function onError(data: SocketError) { setSocketError(data); }

    function onParticipantJoined(data: ParticipantType) {
      addParticipant(data);
      toast(`${data.displayName} joined`, { duration: 3000 });
    }

    function onParticipantLeft(data: { userId: string }) {
      const p = useMeetingStore.getState().participants.find((p) => p.userId === data.userId);
      removeParticipant(data.userId);
      if (p) toast(`${p.displayName} left`, { duration: 3000 });
    }

    function onParticipantMuted(data: { userId: string }) {
      updateParticipant(data.userId, { isMuted: true });
      if (data.userId === userId) { useMeetingStore.getState().setLocalMicOn(false); }
    }

    function onParticipantUnmuted(data: { userId: string }) {
      updateParticipant(data.userId, { isMuted: false });
      if (data.userId === userId) { useMeetingStore.getState().setLocalMicOn(true); }
    }

    function onParticipantRemoved(data: { userId: string }) {
      if (data.userId === userId) { toast.error('You were removed from the meeting'); router.push('/dashboard'); return; }
      removeParticipant(data.userId);
    }

    function onMeetingLocked() { setIsLocked(true); toast('Meeting locked by host'); }
    function onMeetingUnlocked() { setIsLocked(false); toast('Meeting unlocked'); }

    function onMeetingEnded() {
      toast.info('Meeting ended by host');
      lk.disconnect();
      router.push('/dashboard');
    }

    function onMutedAll() {
      useMeetingStore.getState().setLocalMicOn(false);
      toast.info('You have been muted by the host');
    }

    function onSettingsChanged(data: { settings: any }) {
      setSettings(data.settings);
    }

    function onWaitingParticipant(data: { userId: string; displayName: string; joinedAt: string }) {
      addWaitingParticipant(data);
      toast.info(`${data.displayName} is waiting to join`);
    }

    function onWaitingParticipantRemoved(data: { userId: string }) {
      removeWaitingParticipant(data.userId);
    }

    function onRoleChanged(data: { userId: string; role: string }) {
      if (data.userId === userId) {
        toast.info(`Your role changed to ${data.role}`);
      }
      updateParticipant(data.userId, { role: data.role as any });
    }

    function onHandRaised(data: { userId: string }) { updateParticipant(data.userId, { isHandRaised: true }); }
    function onHandLowered(data: { userId: string }) { updateParticipant(data.userId, { isHandRaised: false }); }
    function onMediaState(data: { userId: string; isMuted: boolean; isCameraOff: boolean }) {
      updateParticipant(data.userId, { isMuted: data.isMuted, isCameraOff: data.isCameraOff });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect_failed', onReconnectFailed);
    socket.on('error', onError);
    socket.on('participant:joined', onParticipantJoined);
    socket.on('participant:left', onParticipantLeft);
    socket.on('participant:muted', onParticipantMuted);
    socket.on('participant:unmuted', onParticipantUnmuted);
    socket.on('participant:removed', onParticipantRemoved);
    socket.on('meeting:locked', onMeetingLocked);
    socket.on('meeting:unlocked', onMeetingUnlocked);
    socket.on('meeting:ended', onMeetingEnded);
    socket.on('meeting:muted-all', onMutedAll);
    socket.on('meeting:settings-changed', onSettingsChanged);
    socket.on('meeting:waiting-participant', onWaitingParticipant);
    socket.on('meeting:waiting-participant-removed', onWaitingParticipantRemoved);
    socket.on('participant:role-changed', onRoleChanged);
    socket.on('participant:hand-raised', onHandRaised);
    socket.on('participant:hand-lowered', onHandLowered);
    socket.on('media:state', onMediaState);

    if (socket.connected && !hasJoined.current) emitJoin();

    return () => {
      if (connectTimeout) clearTimeout(connectTimeout);
      if (joinAckTimeout) clearTimeout(joinAckTimeout);
      socket.emit('meeting:leave', { roomCode });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect_failed', onReconnectFailed);
      socket.off('error', onError);
      socket.off('participant:joined', onParticipantJoined);
      socket.off('participant:left', onParticipantLeft);
      socket.off('participant:muted', onParticipantMuted);
      socket.off('participant:unmuted', onParticipantUnmuted);
      socket.off('participant:removed', onParticipantRemoved);
      socket.off('meeting:locked', onMeetingLocked);
      socket.off('meeting:unlocked', onMeetingUnlocked);
      socket.off('meeting:ended', onMeetingEnded);
      socket.off('meeting:muted-all', onMutedAll);
      socket.off('meeting:settings-changed', onSettingsChanged);
      socket.off('meeting:waiting-participant', onWaitingParticipant);
      socket.off('meeting:waiting-participant-removed', onWaitingParticipantRemoved);
      socket.off('participant:role-changed', onRoleChanged);
      socket.off('participant:hand-raised', onHandRaised);
      socket.off('participant:hand-lowered', onHandLowered);
      socket.off('media:state', onMediaState);
      disconnectSocket();
      lk.disconnect();
      reset();
      hasJoined.current = false;
    };
  }, [roomCode, displayName, userId, router, retryCount]);

  useEffect(() => {
    if (lk.isConnected && lk.localParticipant) {
      lk.localParticipant.setMicrophoneEnabled(localMicOn);
      lk.localParticipant.setCameraEnabled(localCamOn);
    }
  }, [lk.isConnected, lk.localParticipant, localMicOn, localCamOn]);

  const toggleMic = useCallback(() => {
    setLocalMicOn((prev) => {
      const next = !prev;
      getSocket().emit('media:state', { roomCode, isMuted: !next, isCameraOff: !useMeetingStore.getState().localCamOn });
      if (lk.localParticipant) lk.localParticipant.setMicrophoneEnabled(next);
      return next;
    });
  }, [roomCode, lk.localParticipant]);

  const toggleCam = useCallback(() => {
    setLocalCamOn((prev) => {
      const next = !prev;
      getSocket().emit('media:state', { roomCode, isMuted: !useMeetingStore.getState().localMicOn, isCameraOff: !next });
      if (lk.localParticipant) lk.localParticipant.setCameraEnabled(next);
      return next;
    });
  }, [roomCode, lk.localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenShareStream?.getTracks().forEach((t) => t.stop());
      setScreenShareStream(null);
      setScreenSharing(false);
      setLocalScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenShareStream(null);
        setScreenSharing(false);
        setLocalScreenSharing(false);
      });
      setScreenShareStream(stream);
      setScreenSharing(true);
      setLocalScreenSharing(true);
    } catch { setScreenSharing(false); }
  }, [screenSharing, screenShareStream, setLocalScreenSharing]);

  const leaveMeeting = useCallback(() => {
    getSocket().emit('meeting:leave', { roomCode });
    lk.disconnect();
    disconnectSocket();
    reset();
    router.push('/dashboard');
  }, [roomCode, router, reset]);

  const allRemoteParticipants = lk.participants;
  const hasScreenShare = allRemoteParticipants.some((p) => p.trackPublications.has('screen_share'));

  const gridCols = useMemo(() => {
    const count = allRemoteParticipants.length + (lk.localParticipant ? 1 : 0);
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4';
  }, [allRemoteParticipants.length, !!lk.localParticipant]);

  if (socketError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="h-12 w-12 rounded-full bg-danger/15 flex items-center justify-center">
            <span className="text-danger text-lg">!</span>
          </div>
          <p className="text-lg text-danger font-medium">{socketError.message}</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => { setSocketError(null); disconnectSocket(); setRetryCount((c) => c + 1); }} className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
              Retry
            </button>
            <button onClick={() => { reset(); disconnectSocket(); router.push('/dashboard'); }} className="rounded-xl bg-bg-elevated px-5 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated/80 border border-border transition-colors">
              Return to dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (lk.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary gap-3">
        <p className="mb-1 text-lg text-danger">Video Connection Error</p>
        <p className="text-sm text-text-secondary max-w-md text-center">{lk.error}</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => lk.connect()} className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">Retry</button>
          <button onClick={() => { reset(); disconnectSocket(); router.push('/dashboard'); }} className="text-sm text-text-secondary hover:text-text-primary transition-colors">Return to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg-primary overflow-hidden">
      <AnimatePresence>
        {(!isConnected || lk.isConnecting) && (
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 bg-primary/90 py-1.5 text-center text-xs text-white backdrop-blur-sm">
            {!isConnected ? 'Connecting to server...' : 'Connecting to video...'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent shrink-0">SyncSpace</span>
          <span className="text-text-secondary hidden sm:inline">·</span>
          <span className="text-xs sm:text-sm text-text-secondary font-mono truncate">{roomCode}</span>
          {isLocked && <span className="text-warning text-xs">🔒</span>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {lk.isConnected && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          )}
          <span className="text-xs sm:text-sm text-text-secondary">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <motion.div layout className="flex-1 overflow-y-auto p-2 sm:p-3">
            {hasScreenShare && (
              <div className="mb-2 sm:mb-3">
                {allRemoteParticipants.filter((p) => p.trackPublications.has('screen_share')).map((p) => (
                  <ScreenShareTile key={`screen-${p.identity}`} participant={p} />
                ))}
              </div>
            )}

            <motion.div layout className={`grid ${gridCols} gap-2 sm:gap-3`}>
              {allRemoteParticipants.length === 0 && !lk.localParticipant ? (
                <div className="col-span-full flex flex-col items-center justify-center aspect-video rounded-xl bg-bg-surface border border-border gap-3">
                  <motion.div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  <motion.p className="text-text-secondary text-sm" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                    {!isConnected ? 'Connecting to server...' : lk.isConnecting ? 'Connecting to video...' : 'Setting up meeting...'}
                  </motion.p>
                </div>
              ) : (
                <>
                  {lk.localParticipant && lk.room && (
                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                      <ParticipantVideoTile participant={lk.localParticipant as unknown as RemoteParticipant} isLocal isSpeaking={activeSpeakerId === lk.localParticipant.identity} isScreenSharing={screenSharing} />
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {allRemoteParticipants.map((p) => (
                      <motion.div key={p.identity} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                        <ParticipantVideoTile participant={p} isLocal={false} isSpeaking={activeSpeakerId === p.identity} isScreenSharing={false} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </motion.div>

          <MeetingToolbar roomCode={roomCode} onToggleMic={toggleMic} onToggleCam={toggleCam} onToggleScreenShare={toggleScreenShare} onLeave={leaveMeeting} screenSharing={screenSharing} />
        </div>

        <AnimatePresence>
          {sidePanel === 'people' && (
            <motion.div key="panel-people" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex border-l border-border bg-bg-surface flex-col overflow-hidden">
              <ParticipantPanel roomCode={roomCode} />
            </motion.div>
          )}
          {sidePanel === 'chat' && (
            <motion.div key="panel-chat" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex border-l border-border bg-bg-surface flex-col overflow-hidden">
              <ChatPanel roomCode={roomCode} />
            </motion.div>
          )}
          {sidePanel === 'files' && (
            <motion.div key="panel-files" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex border-l border-border bg-bg-surface flex-col overflow-hidden">
              <FilesPanel roomCode={roomCode} userId={userId} />
            </motion.div>
          )}
          {sidePanel === 'notes' && (
            <motion.div key="panel-notes" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex border-l border-border bg-bg-surface flex-col overflow-hidden">
              <CollaborativePad roomCode={roomCode} displayName={displayName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SettingsModal open={sidePanel === 'settings'} onClose={() => setSidePanel(null)} roomCode={roomCode} />
    </div>
  );
}
