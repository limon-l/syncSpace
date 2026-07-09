'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { ping } from './actions';
import type { MeetingSummary } from '@syncspace/types';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ping().catch(() => {});
  }, []);

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
    try {
      const meeting = await api.post<{ roomCode: string }>('/api/meetings', {
        title: 'Meeting',
      });
      router.push(`/meeting/prejoin/${meeting.roomCode}`);
    } catch (err) {
      console.error('Failed to create meeting', err);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Hello, {user?.displayName}
          </h1>
          <p className="text-sm text-text-secondary">Ready to start a meeting?</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={createMeeting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            New Meeting
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Sign out
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium text-text-primary">Recent meetings</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-bg-surface"
              />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-surface p-8 text-center">
            <p className="text-text-secondary">No meetings yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Create a meeting to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{meeting.title}</p>
                  <p className="text-xs text-text-secondary">
                    {meeting.startedAt
                      ? new Date(meeting.startedAt).toLocaleDateString()
                      : 'Not started'}{' '}
                    · {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  meeting.status === 'active'
                    ? 'bg-success/20 text-success'
                    : 'bg-text-secondary/20 text-text-secondary'
                }`}>
                  {meeting.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
