'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useComposeNotification } from '@/hooks/useAdminNotifications';

export default function ComposeNotificationPage() {
  const router = useRouter();
  const compose = useComposeNotification();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'digest_subscribers' | 'movie_watchlisters'>('all');
  const [movieId, setMovieId] = useState('');
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledFor, setScheduledFor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    compose.mutate(
      {
        title,
        body,
        target,
        movie_id: movieId ? Number(movieId) : undefined,
        scheduled_for:
          scheduleType === 'scheduled' && scheduledFor
            ? new Date(scheduledFor).toISOString()
            : undefined,
        data: movieId ? { movieId: Number(movieId) } : undefined,
      },
      {
        onSuccess: (count) => {
          alert(`Notification queued for ${count} users.`);
          router.push('/notifications');
        },
      }
    );
  };

  return (
    <div data-testid="compose-notification-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Compose Notification</h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Body *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body"
            rows={3}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Target Audience</label>
          <select
            value={target}
            onChange={(e) =>
              setTarget(e.target.value as 'all' | 'digest_subscribers' | 'movie_watchlisters')
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Users</option>
            <option value="digest_subscribers">Digest Subscribers</option>
            <option value="movie_watchlisters">Movie Watchlisters</option>
          </select>
        </div>

        {target === 'movie_watchlisters' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Movie ID</label>
            <input
              type="number"
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              placeholder="Enter movie ID"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Schedule</label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="schedule"
                checked={scheduleType === 'immediate'}
                onChange={() => setScheduleType('immediate')}
              />
              Send Immediately
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="schedule"
                checked={scheduleType === 'scheduled'}
                onChange={() => setScheduleType('scheduled')}
              />
              Schedule for Later
            </label>
          </div>
          {scheduleType === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <div className="bg-white rounded-lg border p-3">
            <p className="font-medium text-sm">{title || 'Notification Title'}</p>
            <p className="text-sm text-gray-600">{body || 'Notification body text...'}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={compose.isPending || !title || !body}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {compose.isPending ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  );
}
