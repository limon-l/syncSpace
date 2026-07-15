'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { motion } from 'motion/react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL || (SOCKET_URL ? `${SOCKET_URL}/collab` : '/collab');

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

interface RemoteUser {
  name: string;
  color: string;
}

export function CollaborativePad({ roomCode, displayName }: { roomCode: string; displayName: string }) {
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<number, RemoteUser>>(new Map());
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const colorRef = useRef(CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(COLLAB_URL, roomCode, ydoc, {
      connect: true,
    });

    providerRef.current = provider;

    provider.awareness.setLocalStateField('user', {
      name: displayName,
      color: colorRef.current,
    });

    const ytext = ydoc.getText('notes');
    ytextRef.current = ytext;

    const updateText = () => {
      setText(ytext.toString());
    };
    ytext.observe(updateText);

    provider.on('sync', (synced: boolean) => {
      setIsConnected(synced);
    });

    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const newUsers = new Map<number, RemoteUser>();
      states.forEach((state, clientId) => {
        const user = state?.user as RemoteUser | undefined;
        if (user && clientId !== ydoc.clientID) {
          newUsers.set(clientId, user);
        }
      });
      setRemoteUsers(newUsers);
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      ytext.unobserve(updateText);
      provider.awareness.off('change', handleAwarenessChange);
      provider.disconnect();
      ydoc.destroy();
    };
  }, [roomCode, displayName]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ytext = ytextRef.current;
    if (!ytext) return;

    const newValue = e.target.value;
    const currentValue = ytext.toString();

    if (newValue !== currentValue) {
      let diffStart = 0;
      while (diffStart < currentValue.length && currentValue[diffStart] === newValue[diffStart]) {
        diffStart++;
      }
      let diffEndOld = currentValue.length;
      let diffEndNew = newValue.length;
      while (
        diffEndOld > diffStart &&
        diffEndNew > diffStart &&
        currentValue[diffEndOld - 1] === newValue[diffEndNew - 1]
      ) {
        diffEndOld--;
        diffEndNew--;
      }

      ytext.delete(diffStart, diffEndOld - diffStart);
      ytext.insert(diffStart, newValue.slice(diffStart, diffEndNew));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-medium text-text-primary">Collaborative Notes</span>
        <div className="flex items-center gap-2">
          {Array.from(remoteUsers.entries()).map(([clientId, user]) => (
            <span
              key={clientId}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{ backgroundColor: user.color + '20', color: user.color }}
            >
              {user.name}
            </span>
          ))}
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}
            title={isConnected ? 'Connected' : 'Connecting...'}
          />
        </div>
      </div>

      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Type your notes here... they sync in real-time"
          className="w-full h-full resize-none bg-transparent p-4 text-sm text-text-primary placeholder:text-text-secondary/30 outline-none font-mono leading-relaxed"
          spellCheck={false}
        />
      </div>
    </motion.div>
  );
}
