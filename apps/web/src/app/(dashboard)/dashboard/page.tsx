'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { MeetingSummary } from '@syncspace/types';
import { motion } from 'motion/react';
import { Plus, LogOut, Video, Calendar, Users, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
        title: 'Meeting',
      });
      router.push(`/meeting/prejoin/${meeting.roomCode}`);
    } catch (err) {
      console.error('Failed to create meeting', err);
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
              Hello, {user?.displayName}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary mt-1">Ready to start a meeting?</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={createMeeting}
              disabled={creating}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary-glow disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              New Meeting
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-surface/50 px-5 py-2.5 text-sm text-text-secondary transition-all hover:border-text-secondary/30 hover:text-text-primary backdrop-blur-sm"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-4 sm:mb-6 text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Recent meetings
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-bg-surface/50 overflow-hidden">
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="h-5 w-3/4 animate-pulse rounded-md bg-bg-elevated" />
                    <div className="h-4 w-1/2 animate-pulse rounded-md bg-bg-elevated" />
                    <div className="h-4 w-1/3 animate-pulse rounded-md bg-bg-elevated" />
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-bg-surface/30 p-8 sm:p-12 text-center backdrop-blur-sm"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-elevated">
                <Video size={24} className="text-text-secondary" />
              </div>
              <p className="text-base sm:text-lg font-medium text-text-primary">No meetings yet</p>
              <p className="mt-1 text-sm text-text-secondary">
                Create a meeting to get started
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {meetings.map((meeting, i) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group rounded-xl border border-border bg-bg-surface/50 p-4 sm:p-5 transition-all hover:border-primary/30 hover:bg-bg-surface/80 hover:shadow-lg hover:shadow-primary/5 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-1.5">
                        {meeting.startedAt
                          ? new Date(meeting.startedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Not started'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Users size={12} className="text-text-secondary" />
                        <span className="text-xs text-text-secondary">
                          {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      meeting.status === 'active'
                        ? 'bg-success/15 text-success'
                        : 'bg-text-secondary/10 text-text-secondary'
                    }`}>
                      {meeting.status === 'active' ? 'Live' : 'Past'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
