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
  Hand, MessageCircle, Users, LogOut, Lock, ScreenShare, FileText, File,
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

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);

    participant.trackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);
    };
  }, [participant]);

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
      className={`relative flex aspect-video items-center justify-center rounded-lg overflow-hidden ${
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
          <span className="text-lg font-medium text-text-primary">{initial}</span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} />

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5">
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
    <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-surface">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5">
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
    const socket = connectSocket();
    setConnected(socket.connected);

    function onConnect() {
      setConnected(true);
      if (!hasJoined.current) {
        hasJoined.current = true;
        socket.emit('meeting:join', { roomCode, displayName }, (response: any) => {
          if (!response?.success) {
            setSocketError(response?.error || { code: 'CONNECTION_ERROR', message: 'Failed to join meeting' });
          } else {
            lk.connect();
          }
        });
      }
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onConnectError() {
      setSocketError({ code: 'CONNECTION_ERROR', message: 'Failed to connect to server' });
    }

    function onError(data: SocketError) {
      setSocketError(data);
    }

    function onParticipantJoined(data: ParticipantType) {
      addParticipant(data);
      toast(`${data.displayName} joined`, { duration: 3000 });
    }

    function onParticipantLeft(data: { userId: string }) {
      const p = participants.find((p) => p.userId === data.userId);
      removeParticipant(data.userId);
      if (p) toast(`${p.displayName} left`, { duration: 3000 });
    }

    function onParticipantMuted(data: { userId: string; mutedBy: string }) {
      updateParticipant(data.userId, { isMuted: true });
    }

    function onParticipantRemoved(data: { userId: string }) {
      if (data.userId === useMeetingStore.getState().participants.find(
        (p) => p.userId === data.userId
      )?.userId) {
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
      hasJoined.current = true;
      socket.emit('meeting:join', { roomCode, displayName }, (response: any) => {
        if (!response?.success) {
          setSocketError(response?.error || { code: 'CONNECTION_ERROR', message: 'Failed to join meeting' });
        } else {
          lk.connect();
        }
      });
    }

    return () => {
      socket.emit('meeting:leave', { roomCode });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
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
  }, [roomCode, displayName, router, setConnected, setSocketError, addParticipant,
      removeParticipant, updateParticipant, addChatMessage, setIsLocked, setSidePanel,
      setRoomCode, reset]);

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
      socket.emit('media:state', { roomCode, isMuted: !next, isCameraOff: !localCamOn });
      return next;
    });
  }, [roomCode, localCamOn, setLocalMicOn]);

  const toggleCam = useCallback(() => {
    setLocalCamOn((prev) => {
      const next = !prev;
      const socket = getSocket();
      socket.emit('media:state', { roomCode, isMuted: !localMicOn, isCameraOff: !next });
      return next;
    });
  }, [roomCode, localMicOn, setLocalCamOn]);

  const toggleHand = useCallback(() => {
    setLocalHandRaised((prev) => {
      const next = !prev;
      const socket = getSocket();
      socket.emit(next ? 'hand:raise' : 'hand:lower', { roomCode });
      return next;
    });
  }, [roomCode, setLocalHandRaised]);

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

  if (socketError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
        <p className="mb-2 text-lg text-danger">{socketError.message}</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-primary hover:underline">
          Return to dashboard
        </button>
      </div>
    );
  }

  const allRemoteParticipants = lk.participants;
  const hasScreenShare = allRemoteParticipants.some(
    (p) => p.trackPublications.has('screen_share'),
  );

  return (
      <div className="flex h-screen flex-col bg-bg-primary">
        <AnimatePresence>
          {!isConnected && lk.isConnected && (
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-50 bg-warning/90 py-1 text-center text-xs text-white"
            >
              Reconnecting...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">SyncSpace</span>
          <span className="text-sm text-text-secondary">·</span>
          <span className="text-sm text-text-secondary">{roomCode}</span>
          {isLocked && <Lock size={14} className="text-warning" />}
        </div>
        <div className="flex items-center gap-3">
          {!isConnected && <span className="text-xs text-warning">Reconnecting...</span>}
          {lk.isConnected && <span className="text-xs text-success">Live</span>}
          <span className="text-sm text-text-secondary">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <motion.div layout className="flex-1 overflow-y-auto p-2">
          <AnimatePresence>
            {hasScreenShare && (
              <motion.div
                key="screen-share"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden"
              >
                {allRemoteParticipants.map((p) => (
                  <ScreenShareTile key={`screen-${p.identity}`} participant={p} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allRemoteParticipants.length === 0 && !lk.localParticipant ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full flex items-center justify-center aspect-video rounded-lg bg-bg-surface"
              >
                <motion.p
                  className="text-text-secondary"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Connecting...
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

        <AnimatePresence>
          {sidePanel && (
            <motion.div
              key="side-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-l border-border bg-bg-surface flex flex-col overflow-hidden"
            >
            <div className="flex items-center justify-between border-b border-border px-4 py-2 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setSidePanel('people')}
                  className={`text-xs px-2 py-1 rounded ${
                    sidePanel === 'people' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  People
                </button>
                <button
                  onClick={() => setSidePanel('chat')}
                  className={`text-xs px-2 py-1 rounded ${
                    sidePanel === 'chat' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setSidePanel('notes')}
                  className={`text-xs px-2 py-1 rounded ${
                    sidePanel === 'notes' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  Notes
                </button>
                <button
                  onClick={() => setSidePanel('files')}
                  className={`text-xs px-2 py-1 rounded ${
                    sidePanel === 'files' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  Files
                </button>
              </div>
              <button onClick={() => setSidePanel(null)} className="text-xs text-text-secondary hover:text-text-primary">
                Close
              </button>
            </div>

            {sidePanel === 'people' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {participants.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-bg-elevated">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-xs text-text-primary">
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-text-primary">{p.displayName}</p>
                        {p.role !== 'participant' && (
                          <p className="text-[10px] text-primary">{p.role === 'host' ? 'Host' : 'Co-host'}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.isHandRaised && <span className="text-xs text-warning">✋</span>}
                      {p.isMuted ? <MicOff size={14} className="text-danger" /> : <Mic size={14} className="text-text-secondary" />}
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
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-text-secondary text-center pt-8">No messages yet</p>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id}>
                      <p className="text-xs text-text-secondary">{msg.senderName}</p>
                      <p className="text-sm text-text-primary">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="border-t border-border p-2 flex gap-2 flex-shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-primary"
                  />
                  <button onClick={sendChat} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary-hover">
                    Send
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}</AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border bg-bg-surface px-4 py-3">
        <button
          onClick={toggleMic}
          className={`rounded-full p-3 transition-colors ${
            localMicOn ? 'bg-bg-elevated text-text-primary' : 'bg-danger text-white'
          }`}
          title={localMicOn ? 'Mute microphone (M)' : 'Unmute microphone (M)'}
        >
          {localMicOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          onClick={toggleCam}
          className={`rounded-full p-3 transition-colors ${
            localCamOn ? 'bg-bg-elevated text-text-primary' : 'bg-danger text-white'
          }`}
          title={localCamOn ? 'Turn off camera (V)' : 'Turn on camera (V)'}
        >
          {localCamOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`rounded-full p-3 transition-colors ${
            screenSharing ? 'bg-danger text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {screenSharing ? <MonitorDown size={18} /> : <MonitorUp size={18} />}
        </button>

        <button
          onClick={toggleHand}
          className={`rounded-full p-3 transition-colors ${
            localHandRaised ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title={localHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')}
          className={`rounded-full p-3 transition-colors ${
            sidePanel === 'chat' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title="Chat"
        >
          <MessageCircle size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'files' ? null : 'files')}
          className={`rounded-full p-3 transition-colors ${
            sidePanel === 'files' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title="Files"
        >
          <File size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'notes' ? null : 'notes')}
          className={`rounded-full p-3 transition-colors ${
            sidePanel === 'notes' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title="Collaborative Notes"
        >
          <FileText size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'people' ? null : 'people')}
          className={`rounded-full p-3 transition-colors ${
            sidePanel === 'people' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
          title="Participants"
        >
          <Users size={18} />
        </button>

        <button
          onClick={leaveMeeting}
          className="rounded-full bg-danger/20 p-3 text-danger hover:bg-danger/30 transition-colors"
          title="Leave meeting"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
