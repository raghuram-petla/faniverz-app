'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateNotification } from '@/hooks/useAdminNotifications';
import { useAdminMovies } from '@/hooks/useAdminMovies';
import { Bell, ArrowLeft, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

const notificationTypes = ['release', 'watchlist', 'trending', 'reminder'] as const;

export default function ComposeNotificationPage() {
  const router = useRouter();
  const { data: movies } = useAdminMovies();
  const createNotification = useCreateNotification();

  const [type, setType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [movieId, setMovieId] = useState('');
  const [movieSearch, setMovieSearch] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledFor, setScheduledFor] = useState('');

  const filteredMovies = movies?.filter((m) =>
    m.title.toLowerCase().includes(movieSearch.toLowerCase()),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    createNotification.mutate(
      {
        type: type as (typeof notificationTypes)[number],
        title,
        message,
        movie_id: movieId || null,
        scheduled_for:
          scheduleMode === 'scheduled' && scheduledFor ? new Date(scheduledFor).toISOString() : now,
        status: 'pending',
        user_id: '00000000-0000-0000-0000-000000000000', // broadcast placeholder
        read: false,
      },
      { onSuccess: () => router.push('/notifications') },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Compose Notification</h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-white/60">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select type...</option>
            {notificationTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-white/60">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Notification title"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-medium text-white/60">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={3}
            placeholder="Notification message body"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
          />
        </div>

        {/* Movie search (optional) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/60">Movie (optional)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={movieSearch}
              onChange={(e) => {
                setMovieSearch(e.target.value);
                if (!e.target.value) setMovieId('');
              }}
              placeholder="Search movies..."
              className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>
          {movieSearch && filteredMovies && filteredMovies.length > 0 && !movieId && (
            <div className="bg-zinc-800 border border-white/10 rounded-lg max-h-40 overflow-y-auto">
              {filteredMovies.slice(0, 10).map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => {
                    setMovieId(movie.id);
                    setMovieSearch(movie.title);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  {movie.title}
                </button>
              ))}
            </div>
          )}
          {movieId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-400">Selected</span>
              <button
                type="button"
                onClick={() => {
                  setMovieId('');
                  setMovieSearch('');
                }}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white/60">Schedule</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="schedule"
                checked={scheduleMode === 'immediate'}
                onChange={() => setScheduleMode('immediate')}
                className="accent-red-600"
              />
              <span className="text-sm text-white">Send immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="schedule"
                checked={scheduleMode === 'scheduled'}
                onChange={() => setScheduleMode('scheduled')}
                className="accent-red-600"
              />
              <span className="text-sm text-white">Schedule for later</span>
            </label>
          </div>
          {scheduleMode === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          )}
        </div>

        {createNotification.isError && (
          <p className="text-red-400 text-sm">
            {createNotification.error instanceof Error
              ? createNotification.error.message
              : 'Failed to create notification'}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createNotification.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createNotification.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Send Notification
          </button>
          <Link
            href="/notifications"
            className="px-6 py-2.5 text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
