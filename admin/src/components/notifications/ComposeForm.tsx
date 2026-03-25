'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { MovieSearchField } from '@/components/notifications/MovieSearchField';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { BROADCAST_USER_ID } from '@shared/constants';
// @contract: notificationTypes must match notifications.type CHECK constraint in the database
const notificationTypes = ['release', 'watchlist', 'trending', 'reminder'] as const;
const inputClass =
  'w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent';

// @contract ComposeForm owns all form state for creating a notification
// @coupling Parent page provides the mutation and movies list
export interface ComposeFormProps {
  movies: Array<{ id: string; title: string }> | undefined;
  createNotification: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutate: (vars: any, opts?: { onSuccess?: () => void }) => void;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };
  onSuccess: () => void;
}

export function ComposeForm({ movies, createNotification, onSuccess }: ComposeFormProps) {
  const [type, setType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [movieId, setMovieId] = useState('');
  const [movieSearch, setMovieSearch] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledFor, setScheduledFor] = useState('');
  const [targetMode, setTargetMode] = useState<'broadcast' | 'user'>('broadcast');
  const [userEmail, setUserEmail] = useState('');
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [userLookupError, setUserLookupError] = useState('');

  const isDirty = useMemo(
    () => !!(type || title || message || movieId || scheduledFor || userEmail),
    [type, title, message, movieId, scheduledFor, userEmail],
  );

  useUnsavedChangesWarning(isDirty);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // @boundary: queries Supabase profiles table directly for single-user lookup
  // @edge: requires '@' in email before firing query to avoid unnecessary lookups
  const doLookup = useCallback(async (email: string) => {
    /* v8 ignore start */
    if (!email.includes('@')) return;
    /* v8 ignore stop */

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();
    if (error) {
      setUserLookupError('Lookup failed');
      return;
    }
    if (data) {
      setResolvedUserId(data.id);
    } else {
      setUserLookupError('No user found with this email');
    }
  }, []);

  // @sync: debounces email lookup by 400ms
  const handleUserLookup = (email: string) => {
    setUserEmail(email);
    setResolvedUserId(null);
    setUserLookupError('');
    /* v8 ignore start */
    if (debounceRef.current) clearTimeout(debounceRef.current);
    /* v8 ignore stop */

    if (!email.includes('@')) return;
    debounceRef.current = setTimeout(() => doLookup(email), 400);
  };

  // @sideeffect: inserts into notifications table
  // @boundary: BROADCAST_USER_ID is a sentinel UUID expanded by edge function
  // @invariant: submit blocked when targetMode is 'user' but no user was resolved
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMode === 'user' && !resolvedUserId) return;
    const now = new Date().toISOString();
    const userId = targetMode === 'user' && resolvedUserId ? resolvedUserId : BROADCAST_USER_ID;
    createNotification.mutate(
      {
        type: type as (typeof notificationTypes)[number],
        title,
        message,
        movie_id: movieId || null,
        scheduled_for:
          scheduleMode === 'scheduled' && scheduledFor ? new Date(scheduledFor).toISOString() : now,
        status: 'pending',
        user_id: userId,
        read: false,
      },
      { onSuccess },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-card border border-outline rounded-xl p-6 space-y-6"
    >
      {/* Target mode */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-on-surface-muted">Target</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="target"
              checked={targetMode === 'user'}
              onChange={() => setTargetMode('user')}
              className="accent-red-600"
            />
            <span className="text-sm text-on-surface">Specific user</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="target"
              checked={targetMode === 'broadcast'}
              onChange={() => setTargetMode('broadcast')}
              className="accent-red-600"
            />
            <span className="text-sm text-on-surface">Broadcast (all users)</span>
          </label>
        </div>
        {targetMode === 'user' && (
          <div className="space-y-2">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => handleUserLookup(e.target.value)}
              placeholder="User email address"
              className={inputClass}
            />
            {resolvedUserId && <p className="text-sm text-status-green">User found</p>}
            {userLookupError && <p className="text-sm text-status-red">{userLookupError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="type" className="block text-sm font-medium text-on-surface-muted">
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          className={inputClass}
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
        <label htmlFor="title" className="block text-sm font-medium text-on-surface-muted">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Notification title"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="block text-sm font-medium text-on-surface-muted">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={3}
          placeholder="Notification message body"
          className={`${inputClass} resize-none`}
        />
      </div>

      <MovieSearchField
        movies={movies}
        movieSearch={movieSearch}
        movieId={movieId}
        inputClass={inputClass}
        onSearchChange={(v) => {
          setMovieSearch(v);
          if (!v) setMovieId('');
        }}
        onMovieSelect={(id, title) => {
          setMovieId(id);
          setMovieSearch(title);
        }}
        onClear={() => {
          setMovieId('');
          setMovieSearch('');
        }}
      />

      {/* Schedule */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-on-surface-muted">Schedule</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule"
              checked={scheduleMode === 'immediate'}
              /* v8 ignore start */
              onChange={() => setScheduleMode('immediate')}
              /* v8 ignore stop */

              className="accent-red-600"
            />
            <span className="text-sm text-on-surface">Send immediately</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="schedule"
              checked={scheduleMode === 'scheduled'}
              onChange={() => setScheduleMode('scheduled')}
              className="accent-red-600"
            />
            <span className="text-sm text-on-surface">Schedule for later</span>
          </label>
        </div>
        {scheduleMode === 'scheduled' && (
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            required
            className={inputClass}
          />
        )}
      </div>

      {createNotification.isError && (
        <p className="text-status-red text-sm">
          {createNotification.error instanceof Error
            ? createNotification.error.message
            : 'Failed to create notification'}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={createNotification.isPending || (targetMode === 'user' && !resolvedUserId)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createNotification.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Send Notification
        </button>
        <Link
          href="/notifications"
          className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
