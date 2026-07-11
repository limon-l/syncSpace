'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { MeetingSummary } from '@syncspace/types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, LogOut, Video, Calendar, Users, Link2, ArrowRight,
  Clock, History, ChevronRight, Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const joinInputRef = useRef<HTMLInputElement>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      const data = await api.get<MeetingSummary[]>('/api/meetings/history');
      setMeetings(data);
    } catch {
      // not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  async function createMeeting() {
    setCreating(true);
    try {
      const meeting = await api.post<{ roomCode: string }>('/api/meetings', {
        title: `${user?.displayName}'s Meeting`,
      });
      router.push(`/meeting/prejoin/${meeting.roomCode}`);
    } catch (err) {
      console.error('Failed to create meeting', err);
      setCreating(false);
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase();
    if (!code) return;

    setJoining(true);
    setJoinError('');

    try {
      await api.get<{ roomCode: string }>(`/api/meetings/${code}`);
      router.push(`/meeting/prejoin/${code}`);
    } catch (err: any) {
      if (err?.status === 404) {
        setJoinError('Meeting not found. Check the code and try again.');
      } else {
        setJoinError(err?.message || 'Failed to join meeting');
      }
      setJoining(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  const activeMeetings = meetings.filter((m) => m.status === 'active');
  const pastMeetings = meetings.filter((m) => m.status !== 'active');

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Video size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">SyncSpace</h1>
              <p className="text-xs text-text-secondary">Video meetings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 rounded-xl bg-bg-surface/60 border border-border px-3.5 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm text-text-primary">{user?.displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-surface/50 px-3.5 py-2 text-sm text-text-secondary transition-all hover:border-text-secondary/30 hover:text-text-primary backdrop-blur-sm"
              title="Sign out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* New Meeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg-surface/80 to-bg-surface/40 p-6 sm:p-8 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-all" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
                <Video size={22} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">New Meeting</h2>
              <p className="text-sm text-text-secondary mb-5">Start an instant meeting</p>
              <button
                onClick={createMeeting}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {creating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    Start Meeting
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Join Meeting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg-surface/80 to-bg-surface/40 p-6 sm:p-8 transition-all hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5"
          >
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/5 blur-2xl" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-emerald-400 shadow-lg shadow-secondary/20">
                <Link2 size={22} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">Join Meeting</h2>
              <p className="text-sm text-text-secondary mb-5">Enter a code or link to join</p>
              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    ref={joinInputRef}
                    type="text"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value); setJoinError(''); }}
                    placeholder="Enter meeting code"
                    className="flex-1 rounded-xl border border-border bg-bg-primary/60 px-4 py-2.5 text-sm text-text-primary outline-none transition-all focus:border-secondary/50 focus:bg-bg-primary/80 placeholder:text-text-secondary/40"
                  />
                  <button
                    type="submit"
                    disabled={joining || !joinCode.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-secondary to-emerald-400 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-secondary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {joining ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {joinError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-danger"
                    >
                      {joinError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Meetings */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <History size={16} className="text-text-secondary" />
            <h2 className="text-base font-semibold text-text-primary">Recent meetings</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-bg-surface/30 overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-bg-elevated animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-bg-elevated animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-bg-elevated animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-dashed border-border bg-bg-surface/20 p-12 text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-elevated">
                <Video size={24} className="text-text-secondary" />
              </div>
              <p className="text-base font-medium text-text-primary">No meetings yet</p>
              <p className="mt-1 text-sm text-text-secondary">
                Start or join a meeting to see it here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {/* Active meetings */}
              {activeMeetings.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-success uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Live now
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeMeetings.map((meeting, i) => (
                      <MeetingCard key={meeting.id} meeting={meeting} index={i} router={router} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past meetings */}
              {pastMeetings.length > 0 && (
                <>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2.5">Past</p>
                  {pastMeetings.map((meeting, i) => (
                    <MeetingRow key={meeting.id} meeting={meeting} index={i} router={router} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  index,
  router,
}: {
  meeting: MeetingSummary;
  index: number;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => router.push(`/meeting/prejoin/${meeting.roomCode}`)}
      className="group text-left rounded-xl border border-border bg-bg-surface/40 p-4 transition-all hover:border-success/30 hover:bg-bg-surface/70 hover:shadow-lg hover:shadow-success/5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 shrink-0">
          <Video size={16} className="text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{meeting.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Users size={11} />
              {meeting.participantCount}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
              Live
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </motion.button>
  );
}

function MeetingRow({
  meeting,
  index,
  router,
}: {
  meeting: MeetingSummary;
  index: number;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={() => router.push(`/meeting/prejoin/${meeting.roomCode}`)}
      className="group w-full text-left rounded-xl border border-border bg-bg-surface/20 px-4 py-3 transition-all hover:border-border hover:bg-bg-surface/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated shrink-0">
          <Clock size={15} className="text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary truncate">{meeting.title}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {meeting.startedAt
              ? new Date(meeting.startedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Not started'}
            {' · '}
            {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-text-secondary/10 text-text-secondary">
          Past
        </span>
        <ChevronRight size={15} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </motion.button>
  );
}
