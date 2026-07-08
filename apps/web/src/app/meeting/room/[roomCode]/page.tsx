'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMeetingStore } from '@/stores/meeting-store';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import type { Participant } from '@syncspace/types';
import { Mic, MicOff, Video, VideoOff, MonitorUp, Hand, MessageCircle, Users, LogOut, Lock } from 'lucide-react';

export default function MeetingRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const {
    participants,
    isLocked,
    sidePanel,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setIsLocked,
    setSidePanel,
    setRoomCode,
    reset,
  } = useMeetingStore();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ senderName: string; content: string; id: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState<Array<{ id: number; reaction: string; userId: string }>>([]);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);

  const currentUser = { id: 'me', displayName: 'You' };

  useEffect(() => {
    setRoomCode(roomCode);
    const socket = connectSocket();

    socket.emit('meeting:join', { roomCode, displayName: 'User' });

    socket.on('participant:joined', (data: any) => {
      addParticipant(data);
    });

    socket.on('participant:left', (data: { userId: string }) => {
      removeParticipant(data.userId);
    });

    socket.on('participant:muted', (data: { userId: string }) => {
      updateParticipant(data.userId, { isMuted: true });
    });

    socket.on('participant:removed', (data: { userId: string }) => {
      if (data.userId === 'me') {
        router.push('/dashboard');
        return;
      }
      removeParticipant(data.userId);
    });

    socket.on('chat:message', (data: any) => {
      setChatMessages((prev) => [...prev, { id: data.messageId, senderName: data.senderName, content: data.content }]);
    });

    socket.on('reaction:received', (data: any) => {
      const id = Date.now();
      setReactions((prev) => [...prev, { id, reaction: data.reaction, userId: data.userId }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    });

    socket.on('hand:raised', (data: { userId: string }) => {
      updateParticipant(data.userId, { isHandRaised: true });
    });

    socket.on('hand:lowered', (data: { userId: string }) => {
      updateParticipant(data.userId, { isHandRaised: false });
    });

    socket.on('meeting:locked', () => setIsLocked(true));
    socket.on('meeting:unlocked', () => setIsLocked(false));
    socket.on('meeting:ended', () => {
      router.push('/dashboard');
    });

    return () => {
      socket.emit('meeting:leave', { roomCode });
      disconnectSocket();
      reset();
    };
  }, [roomCode]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const socket = getSocket();
    socket.emit('chat:send', { roomCode, content: chatInput.trim() });
    setChatInput('');
  }, [chatInput, roomCode]);

  const sendReaction = useCallback((reaction: string) => {
    const socket = getSocket();
    socket.emit('reaction:send', { roomCode, reaction });
  }, [roomCode]);

  const toggleHand = useCallback(() => {
    const socket = getSocket();
    setHandRaised((prev) => {
      const newState = !prev;
      socket.emit(newState ? 'hand:raise' : 'hand:lower', { roomCode });
      return newState;
    });
  }, [roomCode]);

  const leaveMeeting = useCallback(() => {
    const socket = getSocket();
    socket.emit('meeting:leave', { roomCode });
    disconnectSocket();
    reset();
    router.push('/dashboard');
  }, [roomCode, router, reset]);

  const participantList = participants.length > 0
    ? participants
    : [
        { userId: '1', displayName: 'You', role: 'host', isMuted: !micOn, isCameraOff: !camOn, isHandRaised: handRaised, joinedAt: new Date().toISOString() },
      ] as Participant[];

  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">SyncSpace</span>
          <span className="text-sm text-text-secondary">·</span>
          <span className="text-sm text-text-secondary">{roomCode}</span>
          {isLocked && <Lock size={14} className="text-warning" />}
        </div>
        <div className="text-sm text-text-secondary">
          {participantList.length} participant{participantList.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {participantList.map((p) => (
              <div
                key={p.userId}
                className="relative flex aspect-video items-center justify-center rounded-lg bg-bg-surface"
              >
                {p.isCameraOff ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
                    <span className="text-lg font-medium text-text-primary">
                      {p.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="text-text-secondary">Video</div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5">
                  <span className="text-xs text-white">{p.displayName}</span>
                  {p.role === 'host' && <span className="text-[10px] text-primary">HOST</span>}
                  {p.isHandRaised && <span className="text-xs text-warning">✋</span>}
                  {p.isMuted && <MicOff size={10} className="text-danger" />}
                </div>
                {/* Reactions floating */}
                {reactions.filter((r) => r.userId === p.userId).map((r) => (
                  <span key={r.id} className="absolute bottom-10 animate-bounce text-2xl">
                    {r.reaction === 'thumbsup' ? '👍' : r.reaction === 'clap' ? '👏' : r.reaction === 'laugh' ? '😂' : r.reaction === 'surprise' ? '😮' : '❤️'}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-80 border-l border-border bg-bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
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
              </div>
              <button
                onClick={() => setSidePanel(null)}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Close
              </button>
            </div>

            {sidePanel === 'people' && (
              <div className="p-3 space-y-1">
                {participantList.map((p) => (
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
                      {p.isHandRaised && <span className="text-xs">✋</span>}
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

            {sidePanel === 'chat' && (
              <div className="flex flex-col h-[calc(100%-40px)]">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.map((msg) => (
                    <div key={msg.id}>
                      <p className="text-xs text-text-secondary">{msg.senderName}</p>
                      <p className="text-sm text-text-primary">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={setMessagesEndRef} />
                </div>
                <div className="border-t border-border p-2 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-primary"
                  />
                  <button
                    onClick={sendChat}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-bg-surface px-4 py-3">
        <button
          onClick={() => { setMicOn((p) => !p); }}
          className={`rounded-full p-3 ${
            micOn ? 'bg-bg-elevated text-text-primary' : 'bg-danger text-white'
          }`}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          onClick={() => { setCamOn((p) => !p); }}
          className={`rounded-full p-3 ${
            camOn ? 'bg-bg-elevated text-text-primary' : 'bg-danger text-white'
          }`}
        >
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button
          className="rounded-full bg-bg-elevated p-3 text-text-primary"
        >
          <MonitorUp size={18} />
        </button>

        <button
          onClick={toggleHand}
          className={`rounded-full p-3 ${
            handRaised ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
        >
          <Hand size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')}
          className={`rounded-full p-3 ${
            sidePanel === 'chat' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
        >
          <MessageCircle size={18} />
        </button>

        <button
          onClick={() => setSidePanel(sidePanel === 'people' ? null : 'people')}
          className={`rounded-full p-3 ${
            sidePanel === 'people' ? 'bg-primary text-white' : 'bg-bg-elevated text-text-primary'
          }`}
        >
          <Users size={18} />
        </button>

        {/* Reaction buttons */}
        <div className="flex gap-1">
          {['👍', '👏', '😂', '😮', '❤️'].map((emoji, i) => (
            <button
              key={i}
              onClick={() => sendReaction(['thumbsup', 'clap', 'laugh', 'surprise', 'heart'][i])}
              className="rounded-full bg-bg-elevated px-2 py-1 text-sm hover:bg-bg-elevated/80"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={leaveMeeting}
          className="rounded-full bg-danger/20 p-3 text-danger hover:bg-danger/30"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
