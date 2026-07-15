'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting-store';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { getSocket } from '@/lib/socket';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ChatPanel = memo(function ChatPanel({ roomCode }: { roomCode: string }) {
  const { chatMessages, currentUserId } = useMeetingStore();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(roomCode);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const send = useCallback(() => {
    if (!input.trim()) return;
    socket.emit('chat:send', { roomCode, content: input.trim() });
    stopTyping();
    setInput('');
  }, [input, roomCode, socket, stopTyping]);

  const handleInput = useCallback((value: string) => {
    setInput(value);
    if (value.trim()) {
      startTyping();
    }
  }, [startTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  const typingNames = Array.from(typingUsers.values()).filter((_, i, arr) => arr.indexOf(_) === i);
  const typingText = typingNames.length === 1
    ? `${typingNames[0]} is typing...`
    : typingNames.length > 1
    ? `${typingNames[0]} and ${typingNames.length - 1} more typing...`
    : '';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-xs text-text-secondary text-center pt-8">No messages yet</p>
        )}
        {chatMessages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {!isOwn && (
                  <span className="text-[10px] font-medium text-text-secondary">{msg.senderName}</span>
                )}
                <span className="text-[10px] text-text-secondary/50">{formatTime(msg.createdAt)}</span>
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  isOwn
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-bg-elevated text-text-primary rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {typingText && (
        <div className="px-3 py-1">
          <p className="text-[10px] text-text-secondary italic animate-pulse">{typingText}</p>
        </div>
      )}

      <div className="border-t border-border p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary placeholder:text-text-secondary/40"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});
