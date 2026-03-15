'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAdminOttReleases, useUpdateOttRelease } from '@/hooks/useAdminOtt';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useFormChanges } from '@/hooks/useFormChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { Tv, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { FieldConfig } from '@/hooks/useFormChanges';

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'availableFrom', label: 'Available From', type: 'date' },
  { key: 'streamingUrl', label: 'Streaming URL', type: 'text' },
];

export default function EditOttReleasePage() {
  const params = useParams();
  const compositeId = params.id as string;
  const [movieId, platformId] = compositeId.split('~');

  const { data: releases, isLoading } = useAdminOttReleases();
  const release = releases?.find((r) => r.movie_id === movieId && r.platform_id === platformId);
  const updateRelease = useUpdateOttRelease();

  const [availableFrom, setAvailableFrom] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const initialRef = useRef<{ availableFrom: string; streamingUrl: string } | null>(null);

  useEffect(() => {
    if (release) {
      const loaded = {
        availableFrom: release.available_from ?? '',
        streamingUrl: release.streaming_url ?? '',
      };
      setAvailableFrom(loaded.availableFrom);
      setStreamingUrl(loaded.streamingUrl);
      initialRef.current = loaded;
    }
  }, [release]);

  const currentValues = useMemo(
    () => ({ availableFrom, streamingUrl }),
    [availableFrom, streamingUrl],
  );
  const { changes, isDirty, changeCount } = useFormChanges(
    FIELD_CONFIG,
    initialRef.current,
    currentValues,
  );

  useUnsavedChangesWarning(isDirty);

  function handleSave() {
    setSaveStatus('saving');
    updateRelease.mutate(
      {
        movieId,
        platformId,
        available_from: availableFrom || null,
        streaming_url: streamingUrl || null,
      },
      {
        onSuccess: () => {
          initialRef.current = { availableFrom, streamingUrl };
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        },
        onError: () => setSaveStatus('idle'),
      },
    );
  }

  const handleDiscard = useCallback(() => {
    if (!initialRef.current) return;
    setAvailableFrom(initialRef.current.availableFrom);
    setStreamingUrl(initialRef.current.streamingUrl);
  }, []);

  const handleRevertField = useCallback((key: string) => {
    if (!initialRef.current) return;
    if (key === 'availableFrom') setAvailableFrom(initialRef.current.availableFrom);
    if (key === 'streamingUrl') setStreamingUrl(initialRef.current.streamingUrl);
  }, []);

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

      <div className="bg-surface-card border border-outline rounded-xl p-6 space-y-6">
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
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={saveStatus}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onRevertField={handleRevertField}
      />
    </div>
  );
}
