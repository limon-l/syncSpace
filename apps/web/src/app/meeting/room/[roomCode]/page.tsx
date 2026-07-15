'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMeetingStore } from '@/stores/meeting-store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useLiveKit } from '@/hooks/use-livekit';
import type { ChatMessage, Participant as ParticipantType, SocketError } from '@syncspace/types';
import { CollaborativePad } from '@/components/collaborative-pad';
import { FilesPanel } from '@/components/files-panel';
import { useAuthStore } from '@/stores/auth-store';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorDown,
  Hand, MessageCircle, Users, LogOut, Lock, ScreenShare, FileText, File, X,
} from 'lucide-react';
import { type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from 'livekit-client';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

function ParticipantVideoTile({
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
      if (track.kind === 'video') setVideoTrack((prev) => prev === track ? null : prev);
      if (track.kind === 'audio') setAudioTrack((prev) => prev === track ? null : prev);
    }

    function handleLocalTrackPublished(pub: RemoteTrackPublication) {
      if (pub.track) {
        if (pub.track.kind === 'video') setVideoTrack(pub.track);
        if (pub.track.kind === 'audio') setAudioTrack(pub.track);
      }
    }

    function handleLocalTrackUnpublished(pub: RemoteTrackPublication) {
      if (pub.track) {
        if (pub.track.kind === 'video') setVideoTrack((prev) => prev === pub.track ? null : prev);
        if (pub.track.kind === 'audio') setAudioTrack((prev) => prev === pub.track ? null : prev);
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
    if (videoRef.current && videoTrack?.mediaStream) {
      videoRef.current.srcObject = videoTrack.mediaStream;
    }
  }, [videoTrack]);

  useEffect(() => {
    if (audioRef.current && audioTrack?.mediaStream) {
      audioRef.current.srcObject = audioTrack.mediaStream;
    }
  }, [audioTrack]);

  const displayName = participant.name || participant.identity;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      className={`relative flex aspect-video items-center justify-center rounded-xl overflow-hidden ${
        isSpeaking ? 'ring-2 ring-primary' : ''
      } ${isScreenSharing ? 'ring-2 ring-secondary' : ''} bg-bg-surface`}
    >
      {videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-bg-elevated">
          <span className="text-lg sm:text-xl font-medium text-text-primary">{initial}</span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} />

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-2 py-1">
        <span className="text-xs text-white">{displayName}{isLocal ? ' (You)' : ''}</span>
        {isScreenSharing && <ScreenShare size={10} className="text-secondary" />}
      </div>
      {isSpeaking && (
        <div className="absolute bottom-2 right-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </motion.div>
  );
}

function ScreenShareTile({ participant }: { participant: RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [screenTrack, setScreenTrack] = useState<RemoteTrack | null>(null);

  useEffect(() => {
    function handleTrackSubscribed(track: RemoteTrack) {
      if (track.kind === 'video' && track.source === 'screen_share') {
        setScreenTrack(track);
      }
    }

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.trackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
    };
  }, [participant]);

  useEffect(() => {
    if (videoRef.current && screenTrack?.mediaStream) {
      videoRef.current.srcObject = screenTrack.mediaStream;
    }
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
    participants, isLocked, sidePanel, chatMessages, localMicOn, localCamOn, localHandRaised, socketError, isConnected,
    setDisplayName, addParticipant, removeParticipant, updateParticipant,
    setIsLocked, setSidePanel, setRoomCode, setConnected, setSocketError,
    addChatMessage, setLocalMicOn, setLocalCamOn, setLocalHandRaised, reset,
  } = useMeetingStore();

  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lk = useLiveKit({
    roomName: roomCode,
  });

  useEffect(() => {
    setRoomCode(roomCode);
    setDisplayName(displayName);
  }, [roomCode, displayName, setRoomCode, setDisplayName]);

  useEffect(() => {
    if (!lk.isConnected || !lk.room) return;

    const room = lk.room;

    function handleActiveSpeakersChanged(speakers: Array<{ identity: string }>) {
      const primary = speakers[0];
      setActiveSpeakerId(primary?.identity ?? null);
    }

    room.on('activeSpeakersChanged', handleActiveSpeakersChanged);
    return () => {
      room.off('activeSpeakersChanged', handleActiveSpeakersChanged);
    };
  }, [lk.isConnected, lk.room]);

  useEffect(() => {
    hasJoined.current = false;
    const socket = connectSocket();
    setConnected(socket.connected);

    const CONNECT_TIMEOUT_MS = 20_000;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;
    let joinAckTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!socket.connected) {
      connectTimeout = setTimeout(() => {
        const state = useMeetingStore.getState();
        if (!state.isConnected && !state.socketError) {
          setSocketError({ code: 'CONNECTION_TIMEOUT', message: 'Unable to connect to server. Please check your internet connection and try again.' });
        }
      }, CONNECT_TIMEOUT_MS);
    }

    function emitJoin() {
      if (hasJoined.current) return;
      hasJoined.current = true;

      joinAckTimeout = setTimeout(() => {
        const state = useMeetingStore.getState();
        if (!state.socketError) {
          setSocketError({ code: 'JOIN_TIMEOUT', message: 'Server is not responding. Please try again.' });
        }
      }, 10_000);

      socket.emit('meeting:join', { roomCode, displayName }, (response: any) => {
        if (joinAckTimeout) { clearTimeout(joinAckTimeout); joinAckTimeout = null; }
        if (!response?.success) {
          setSocketError(response?.error || { code: 'JOIN_FAILED', message: 'Failed to join meeting' });
        } else {
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

    function onDisconnect() {
      setConnected(false);
    }

    function onConnectError(error: Error) {
      if (error?.message?.includes('UNAUTHORIZED')) {
        if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
        try { socket.disconnect(); } catch {}
        setSocketError({ code: 'UNAUTHORIZED', message: 'Your session has expired. Please log in again.' });
      }
    }

    function onReconnectFailed() {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      setSocketError({ code: 'CONNECTION_ERROR', message: 'Failed to connect to server. Please check your internet connection and try again.' });
    }

    function onError(data: SocketError) {
      setSocketError(data);
    }

    function onParticipantJoined(data: ParticipantType) {
      addParticipant(data);
      toast(`${data.displayName} joined`, { duration: 3000 });
    }

    function onParticipantLeft(data: { userId: string }) {
      const p = useMeetingStore.getState().participants.find((p) => p.userId === data.userId);
      removeParticipant(data.userId);
      if (p) toast(`${p.displayName} left`, { duration: 3000 });
    }

    function onParticipantMuted(data: { userId: string; mutedBy: string }) {
      updateParticipant(data.userId, { isMuted: true });
    }

    function onParticipantRemoved(data: { userId: string }) {
      if (data.userId === userId) {
        router.push('/dashboard');
        return;
      }
      removeParticipant(data.userId);
    }

    function onChatMessage(data: ChatMessage) {
      addChatMessage(data);
    }

    function onReactionReceived(data: { userId: string; displayName: string; reaction: string }) {
      const event = new CustomEvent('reaction', { detail: data });
      window.dispatchEvent(event);
    }

    function onHandRaised(data: { userId: string }) {
      updateParticipant(data.userId, { isHandRaised: true });
    }

    function onHandLowered(data: { userId: string }) {
      updateParticipant(data.userId, { isHandRaised: false });
    }

    function onMediaState(data: { userId: string; isMuted: boolean; isCameraOff: boolean }) {
      updateParticipant(data.userId, { isMuted: data.isMuted, isCameraOff: data.isCameraOff });
    }

    function onMeetingLocked() { setIsLocked(true); }
    function onMeetingUnlocked() { setIsLocked(false); }

    function onMeetingEnded() {
      lk.disconnect();
      router.push('/dashboard');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect_failed', onReconnectFailed);
    socket.on('error', onError);
    socket.on('participant:joined', onParticipantJoined);
    socket.on('participant:left', onParticipantLeft);
    socket.on('participant:muted', onParticipantMuted);
    socket.on('participant:removed', onParticipantRemoved);
    socket.on('chat:message', onChatMessage);
    socket.on('reaction:received', onReactionReceived);
    socket.on('hand:raised', onHandRaised);
    socket.on('hand:lowered', onHandLowered);
    socket.on('media:state', onMediaState);
    socket.on('meeting:locked', onMeetingLocked);
    socket.on('meeting:unlocked', onMeetingUnlocked);
    socket.on('meeting:ended', onMeetingEnded);

    if (socket.connected && !hasJoined.current) {
      emitJoin();
    }

    return () => {
      if (connectTimeout) { clearTimeout(connectTimeout); }
      if (joinAckTimeout) { clearTimeout(joinAckTimeout); }
      socket.emit('meeting:leave', { roomCode });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect_failed', onReconnectFailed);
      socket.off('error', onError);
      socket.off('participant:joined', onParticipantJoined);
      socket.off('participant:left', onParticipantLeft);
      socket.off('participant:muted', onParticipantMuted);
      socket.off('participant:removed', onParticipantRemoved);
      socket.off('chat:message', onChatMessage);
      socket.off('reaction:received', onReactionReceived);
      socket.off('hand:raised', onHandRaised);
      socket.off('hand:lowered', onHandLowered);
      socket.off('media:state', onMediaState);
      socket.off('meeting:locked', onMeetingLocked);
      socket.off('meeting:unlocked', onMeetingUnlocked);
      socket.off('meeting:ended', onMeetingEnded);
      disconnectSocket();
      lk.disconnect();
      reset();
      hasJoined.current = false;
    };
  }, [roomCode, displayName, userId, router, setConnected, setSocketError, addParticipant,
      removeParticipant, updateParticipant, addChatMessage, setIsLocked, setSidePanel,
      setRoomCode, reset, retryCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (lk.isConnected && lk.localParticipant) {
      lk.localParticipant.setMicrophoneEnabled(localMicOn);
      lk.localParticipant.setCameraEnabled(localCamOn);
    }
  }, [lk.isConnected, lk.localParticipant]);

  const toggleMic = useCallback(() => {
    setLocalMicOn((prev) => {
      const next = !prev;
      const socket = getSocket();
      const state = useMeetingStore.getState();
      socket.emit('media:state', { roomCode, isMuted: !next, isCameraOff: !state.localCamOn });
      if (lk.localParticipant) {
        lk.localParticipant.setMicrophoneEnabled(next);
      }
      return next;
    });
  }, [roomCode, setLocalMicOn, lk.localParticipant]);

  const toggleCam = useCallback(() => {
    setLocalCamOn((prev) => {
      const next = !prev;
      const socket = getSocket();
      const state = useMeetingStore.getState();
      socket.emit('media:state', { roomCode, isMuted: !state.localMicOn, isCameraOff: !next });
      if (lk.localParticipant) {
        lk.localParticipant.setCameraEnabled(next);
      }
      return next;
    });
  }, [roomCode, setLocalCamOn, lk.localParticipant]);

  const toggleHand = useCallback(() => {
    setLocalHandRaised((prev) => {
      const next = !prev;
      const socket = getSocket();
      socket.emit(next ? 'hand:raise' : 'hand:lower', { roomCode });
      return next;
    });
  }, [roomCode]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenShareStream?.getTracks().forEach((t) => t.stop());
      setScreenShareStream(null);
      setScreenSharing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenShareStream(null);
        setScreenSharing(false);
      });

      setScreenShareStream(stream);
      setScreenSharing(true);
    } catch {
      setScreenSharing(false);
    }
  }, [screenSharing, screenShareStream]);

  const leaveMeeting = useCallback(() => {
    const socket = getSocket();
    socket.emit('meeting:leave', { roomCode });
    lk.disconnect();
    disconnectSocket();
    reset();
    router.push('/dashboard');
  }, [roomCode, router, reset]);

  const [chatInput, setChatInput] = useState('');

  function sendChat() {
    if (!chatInput.trim()) return;
    const socket = getSocket();
    socket.emit('chat:send', { roomCode, content: chatInput.trim() });
    setChatInput('');
  }

  function openPanel(panel: 'people' | 'chat' | 'notes' | 'files') {
    if (window.innerWidth < 1024) {
      setMobilePanelOpen(true);
    }
    setSidePanel(panel);
  }

  function closePanel() {
    setSidePanel(null);
    setMobilePanelOpen(false);
  }

  if (socketError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 max-w-sm text-center"
        >
          <div className="h-12 w-12 rounded-full bg-danger/15 flex items-center justify-center">
            <span className="text-danger text-lg">!</span>
          </div>
          <p className="text-lg text-danger font-medium">{socketError.message}</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => {
                setSocketError(null);
                disconnectSocket();
                setRetryCount((c) => c + 1);
              }}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                reset();
                disconnectSocket();
                router.push('/dashboard');
              }}
              className="rounded-xl bg-bg-elevated px-5 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated/80 border border-border transition-colors"
            >
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
        <p className="mb-1 text-lg text-danger">Connection Error</p>
        <p className="text-sm text-text-secondary max-w-md text-center">{lk.error}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { lk.connect(); }}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
          <button onClick={() => {
            reset();
            disconnectSocket();
            router.push('/dashboard');
          }} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  const allRemoteParticipants = lk.participants;
  const hasScreenShare = allRemoteParticipants.some(
    (p) => p.trackPublications.has('screen_share'),
  );

  const sidePanelContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 flex-shrink-0">
        <div className="flex gap-1.5">
          {(['people', 'chat', 'notes', 'files'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSidePanel(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                sidePanel === p ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {p === 'people' ? 'People' : p === 'chat' ? 'Chat' : p === 'notes' ? 'Notes' : 'Files'}
            </button>
          ))}
        </div>
        <button onClick={closePanel} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      {sidePanel === 'people' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-bg-elevated transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-sm text-text-primary font-medium">
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-text-primary">{p.displayName}</p>
                  {p.role !== 'participant' && (
                    <p className="text-[10px] text-primary">{p.role === 'host' ? 'Host' : 'Co-host'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {p.isHandRaised && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-xs">
                    ✋
                  </span>
                )}
                {p.isMuted ? (
                  <MicOff size={14} className="text-danger" />
                ) : (
                  <Mic size={14} className="text-text-secondary" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sidePanel === 'notes' && (
        <div className="flex-1 overflow-hidden">
          <CollaborativePad roomCode={roomCode} displayName={displayName} />
        </div>
      )}

      {sidePanel === 'files' && (
        <FilesPanel roomCode={roomCode} userId={userId} />
      )}

      {sidePanel === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-xs text-text-secondary text-center pt-8">No messages yet</p>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id}>
                <p className="text-xs text-text-secondary font-medium">{msg.senderName}</p>
                <p className="text-sm text-text-primary">{msg.content}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-secondary/40"
            />
            <button
              onClick={sendChat}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-bg-primary overflow-hidden">
      <AnimatePresence>
        {lk.isConnecting && !lk.isConnected && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 bg-primary/90 py-1.5 text-center text-xs text-white backdrop-blur-sm"
          >
            Connecting to meeting...
          </motion.div>
        )}
        {!isConnected && lk.isConnected && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 bg-warning/90 py-1.5 text-center text-xs text-white backdrop-blur-sm"
          >
            Reconnecting...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent shrink-0">
            SyncSpace
          </span>
          <span className="text-text-secondary hidden sm:inline">·</span>
          <span className="text-xs sm:text-sm text-text-secondary font-mono truncate">{roomCode}</span>
          {isLocked && <Lock size={14} className="text-warning shrink-0" />}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {lk.isConnecting && !lk.isConnected && <span className="text-xs text-primary">Connecting...</span>}
          {!isConnected && lk.isConnected && <span className="text-xs text-warning">Reconnecting...</span>}
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
            <AnimatePresence>
              {hasScreenShare && (
                <motion.div
                  key="screen-share"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 sm:mb-3 overflow-hidden"
                >
                  {allRemoteParticipants.filter((p) => p.trackPublications.has('screen_share')).map((p) => (
                    <ScreenShareTile key={`screen-${p.identity}`} participant={p} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
              {allRemoteParticipants.length === 0 && !lk.localParticipant ? (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center aspect-video rounded-xl bg-bg-surface border border-border gap-3"
                >
                  <motion.div
                    className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.p
                    className="text-text-secondary text-sm"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {!isConnected ? 'Connecting to server...' : lk.isConnecting ? 'Connecting to video...' : 'Setting up meeting...'}
                  </motion.p>
                </motion.div>
              ) : (
                <>
                  {lk.localParticipant && lk.room && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ParticipantVideoTile
                        participant={lk.localParticipant as unknown as RemoteParticipant}
                        isLocal
                        isSpeaking={activeSpeakerId === lk.localParticipant.identity}
                        isScreenSharing={screenSharing}
                      />
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {allRemoteParticipants.map((p) => (
                      <motion.div
                        key={p.identity}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ParticipantVideoTile
                          participant={p}
                          isLocal={false}
                          isSpeaking={activeSpeakerId === p.identity}
                          isScreenSharing={false}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </motion.div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2 border-t border-border bg-bg-surface/80 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 overflow-x-auto">
            <button
              onClick={toggleMic}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                localMicOn ? 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80' : 'bg-danger text-white'
              }`}
              title={localMicOn ? 'Mute microphone (M)' : 'Unmute microphone (M)'}
            >
              {localMicOn ? <Mic size={16} className="sm:size-[18px]" /> : <MicOff size={16} className="sm:size-[18px]" />}
            </button>

            <button
              onClick={toggleCam}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                localCamOn ? 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80' : 'bg-danger text-white'
              }`}
              title={localCamOn ? 'Turn off camera (V)' : 'Turn on camera (V)'}
            >
              {localCamOn ? <Video size={16} className="sm:size-[18px]" /> : <VideoOff size={16} className="sm:size-[18px]" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                screenSharing ? 'bg-danger text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title={screenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {screenSharing ? <MonitorDown size={16} className="sm:size-[18px]" /> : <MonitorUp size={16} className="sm:size-[18px]" />}
            </button>

            <div className="w-px h-6 sm:h-8 bg-border mx-0.5 sm:mx-1" />

            <button
              onClick={toggleHand}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                localHandRaised ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title={localHandRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand size={16} className="sm:size-[18px]" />
            </button>

            <div className="w-px h-6 sm:h-8 bg-border mx-0.5 sm:mx-1" />

            <button
              onClick={() => { openPanel('chat'); }}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                sidePanel === 'chat' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title="Chat"
            >
              <MessageCircle size={16} className="sm:size-[18px]" />
            </button>

            <button
              onClick={() => { openPanel('people'); }}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                sidePanel === 'people' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title="Participants"
            >
              <Users size={16} className="sm:size-[18px]" />
            </button>

            <button
              onClick={() => { openPanel('notes'); }}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                sidePanel === 'notes' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title="Collaborative Notes"
            >
              <FileText size={16} className="sm:size-[18px]" />
            </button>

            <button
              onClick={() => { openPanel('files'); }}
              className={`rounded-full p-2 sm:p-3 transition-all ${
                sidePanel === 'files' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
              }`}
              title="Files"
            >
              <File size={16} className="sm:size-[18px]" />
            </button>

            <div className="w-px h-6 sm:h-8 bg-border mx-0.5 sm:mx-1" />

            <button
              onClick={leaveMeeting}
              className="rounded-full bg-danger/20 p-2 sm:p-3 text-danger hover:bg-danger/30 transition-all"
              title="Leave meeting"
            >
              <LogOut size={16} className="sm:size-[18px]" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {sidePanel && (
            <motion.div
              key="side-panel-desktop"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="hidden lg:flex border-l border-border bg-bg-surface flex-col overflow-hidden"
            >
              {sidePanelContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {sidePanel && mobilePanelOpen && (
          <motion.div
            key="side-panel-mobile"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
            <motion.div
              className="relative ml-auto w-full max-w-sm bg-bg-surface border-l border-border flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {sidePanelContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
