'use client';

import { useCallback, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useMeetingStore } from '@/stores/meeting-store';

export function useTypingIndicator(roomCode: string) {
  const { typingUsers, addTypingUser, removeTypingUser } = useMeetingStore();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    function onTyping(data: { userId: string; displayName: string }) {
      addTypingUser(data.userId, data.displayName);
    }

    function onStoppedTyping(data: { userId: string }) {
      removeTypingUser(data.userId);
    }

    socket.on('chat:typing', onTyping);
    socket.on('chat:stopped-typing', onStoppedTyping);

    return () => {
      socket.off('chat:typing', onTyping);
      socket.off('chat:stopped-typing', onStoppedTyping);
    };
  }, [addTypingUser, removeTypingUser]);

  const startTyping = useCallback(() => {
    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('chat:typing-start', { roomCode });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('chat:typing-stop', { roomCode });
    }, 2000);
  }, [roomCode]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      const socket = getSocket();
      isTypingRef.current = false;
      socket.emit('chat:typing-stop', { roomCode });
    }
  }, [roomCode]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        const socket = getSocket();
        socket.emit('chat:typing-stop', { roomCode });
      }
    };
  }, [roomCode]);

  return { typingUsers, startTyping, stopTyping };
}
