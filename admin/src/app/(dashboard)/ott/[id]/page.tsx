'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdminOttReleases, useUpdateOttRelease } from '@/hooks/useAdminOtt';
import { Tv, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditOttReleasePage() {
  const router = useRouter();
  const params = useParams();
  const compositeId = params.id as string;
  const [movieId, platformId] = compositeId.split('~');

  const { data: releases, isLoading } = useAdminOttReleases();
  const release = releases?.find((r) => r.movie_id === movieId && r.platform_id === platformId);
  const updateRelease = useUpdateOttRelease();

  const [availableFrom, setAvailableFrom] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');

  useEffect(() => {
    if (release) {
      setAvailableFrom(release.available_from ?? '');
      setStreamingUrl(release.streaming_url ?? '');
    }
  }, [release]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRelease.mutate(
      {
        movieId,
        platformId,
        available_from: availableFrom || null,
        streaming_url: streamingUrl || null,
      },
      {
        onSuccess: () => router.push('/ott'),
        onError: (err) => alert(`Error: ${err instanceof Error ? err.message : 'Update failed'}`),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
      </div>
    );
  }

  if (!release) {
    return <div className="text-center py-20 text-on-surface-muted">OTT release not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/ott"
          className="p-2 text-on-surface-subtle hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Edit OTT Release</h1>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg px-4 py-3 text-sm text-on-surface-muted">
        <span className="font-medium text-on-surface">{release.movie?.title ?? movieId}</span>
        {' on '}
        <span className="font-medium" style={{ color: release.platform?.color }}>
          {release.platform?.name ?? platformId}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-card border border-outline rounded-xl p-6 space-y-6"
      >
        <div className="space-y-2">
          <label
            htmlFor="available_from"
            className="block text-sm font-medium text-on-surface-muted"
          >
            Available From{' '}
            <span className="text-on-surface-subtle font-normal">(leave blank if live now)</span>
          </label>
          <input
            id="available_from"
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="streaming_url"
            className="block text-sm font-medium text-on-surface-muted"
          >
            Streaming URL{' '}
            <span className="text-on-surface-subtle font-normal">(deep link to the movie)</span>
          </label>
          <input
            id="streaming_url"
            type="url"
            value={streamingUrl}
            onChange={(e) => setStreamingUrl(e.target.value)}
            placeholder="https://www.aha.video/movie/..."
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {updateRelease.isError && (
          <p className="text-red-400 text-sm">
            {updateRelease.error instanceof Error
              ? updateRelease.error.message
              : 'Failed to update'}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={updateRelease.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
          >
            {updateRelease.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
          <Link
            href="/ott"
            className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
