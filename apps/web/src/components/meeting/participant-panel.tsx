'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Crown, Shield, Hand, Search, MoreVertical, UserMinus, UserCheck, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMeetingStore } from '@/stores/meeting-store';
import { useMeetingPermissions } from '@/hooks/use-meeting-permissions';
import { getSocket } from '@/lib/socket';

export const ParticipantPanel = memo(function ParticipantPanel({ roomCode }: { roomCode: string }) {
  const { participants, waitingParticipants, currentUserId } = useMeetingStore();
  const perms = useMeetingPermissions();
  const socket = getSocket();
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filteredParticipants = useMemo(() => {
    if (!search.trim()) return participants;
    const q = search.toLowerCase();
    return participants.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [participants, search]);

  const sortedParticipants = useMemo(() => {
    const roleOrder = { host: 0, 'co-host': 1, participant: 2 };
    return [...filteredParticipants].sort((a, b) => {
      const ra = roleOrder[a.role] ?? 2;
      const rb = roleOrder[b.role] ?? 2;
      if (ra !== rb) return ra - rb;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [filteredParticipants]);

  const handleMute = useCallback((userId: string) => {
    socket.emit('participant:mute', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleUnmute = useCallback((userId: string) => {
    socket.emit('participant:unmute', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleRemove = useCallback((userId: string) => {
    if (!confirm('Remove this participant?')) return;
    socket.emit('participant:remove', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleAdmit = useCallback((userId: string) => {
    socket.emit('participant:admit', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleDeny = useCallback((userId: string) => {
    socket.emit('participant:deny', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handlePromote = useCallback((userId: string) => {
    socket.emit('meeting:promote-cohost', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleDemote = useCallback((userId: string) => {
    socket.emit('meeting:demote-cohost', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  const handleTransferHost = useCallback((userId: string) => {
    if (!confirm('Transfer host role? You will become a participant.')) return;
    socket.emit('meeting:transfer-host', { roomCode, targetUserId: userId });
  }, [roomCode, socket]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Participants ({participants.length})
          </h3>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary placeholder:text-text-secondary/40"
          />
        </div>
      </div>

      {waitingParticipants.length > 0 && (
        <div className="border-b border-border px-4 py-2 flex-shrink-0">
          <p className="text-xs font-medium text-warning mb-2">Waiting ({waitingParticipants.length})</p>
          {waitingParticipants.map((wp) => (
            <div key={wp.userId} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-warning/20 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-warning">{wp.displayName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xs text-text-primary">{wp.displayName}</span>
              </div>
              <div className="flex items-center gap-1">
                {perms.canAdmitOthers && (
                  <>
                    <button onClick={() => handleAdmit(wp.userId)} className="rounded-md bg-success/20 p-1 text-success hover:bg-success/30 transition-colors" title="Admit">
                      <UserCheck size={12} />
                    </button>
                    <button onClick={() => handleDeny(wp.userId)} className="rounded-md bg-danger/20 p-1 text-danger hover:bg-danger/30 transition-colors" title="Deny">
                      <UserMinus size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {sortedParticipants.map((p) => (
            <motion.div
              key={p.userId}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="border-b border-border/50 last:border-b-0"
            >
              <div
                className="flex items-center justify-between px-4 py-2 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                onClick={() => setExpandedUser(expandedUser === p.userId ? null : p.userId)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-bg-elevated flex items-center justify-center">
                      <span className="text-sm text-text-primary font-medium">{p.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-bg-surface" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-text-primary truncate">{p.displayName}</span>
                      {p.userId === currentUserId && <span className="text-[10px] text-text-secondary">(You)</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {p.role === 'host' && (
                        <span className="flex items-center gap-0.5 text-[10px] text-warning">
                          <Crown size={10} /> Host
                        </span>
                      )}
                      {p.role === 'co-host' && (
                        <span className="flex items-center gap-0.5 text-[10px] text-primary">
                          <Shield size={10} /> Co-host
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.isHandRaised && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-warning"
                    >
                      <Hand size={14} />
                    </motion.span>
                  )}
                  <span className={p.isMuted ? 'text-danger' : 'text-text-secondary'}>
                    {p.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  </span>
                  <span className={p.isCameraOff ? 'text-danger' : 'text-text-secondary'}>
                    {p.isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {expandedUser === p.userId && p.userId !== currentUserId && perms.isHostOrCoHost && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-bg-elevated/30 flex flex-wrap gap-1.5">
                      {p.isMuted ? (
                        <button onClick={() => handleUnmute(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          Request unmute
                        </button>
                      ) : (
                        <button onClick={() => handleMute(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                          Mute
                        </button>
                      )}
                      {perms.canPromoteCohost && p.role === 'participant' && (
                        <button onClick={() => handlePromote(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          Make co-host
                        </button>
                      )}
                      {perms.canDemoteCohost && p.role === 'co-host' && (
                        <button onClick={() => handleDemote(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors">
                          Remove co-host
                        </button>
                      )}
                      {perms.canTransferHost && p.role !== 'host' && (
                        <button onClick={() => handleTransferHost(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors">
                          <ArrowUpCircle size={10} className="inline mr-0.5" /> Transfer host
                        </button>
                      )}
                      {perms.canRemoveOthers && p.role !== 'host' && (
                        <button onClick={() => handleRemove(p.userId)} className="text-[10px] px-2 py-1 rounded-md bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
