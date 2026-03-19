'use client';

import { Film, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { LookupResult } from '@/hooks/useSync';

export interface MoviePreviewProps {
  result: LookupResult & { type: 'movie' };
  isPending: boolean;
  onImport: () => void;
}

/** @contract shows TMDB movie details with import/re-sync action; existsInDb controls button label */
export function MoviePreview({ result, isPending, onImport }: MoviePreviewProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex gap-5">
        {result.data.posterUrl ? (
          <img
            src={result.data.posterUrl}
            alt={result.data.title}
            className="w-32 h-48 object-cover rounded-lg shrink-0"
          />
        ) : (
          <div className="w-32 h-48 bg-surface-muted rounded-lg flex items-center justify-center shrink-0">
            <Film className="w-8 h-8 text-on-surface-disabled" />
          </div>
        )}
        <div className="space-y-2 min-w-0">
          <h3 className="text-lg font-semibold text-on-surface">{result.data.title}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-on-surface-subtle">Release:</span>{' '}
              <span className="text-on-surface">{result.data.releaseDate || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Runtime:</span>{' '}
              <span className="text-on-surface">
                {result.data.runtime ? `${result.data.runtime} min` : '—'}
              </span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Director:</span>{' '}
              <span className="text-on-surface">{result.data.director || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-subtle">Cast:</span>{' '}
              <span className="text-on-surface">{result.data.castCount} members</span>
            </div>
            <div className="col-span-2">
              <span className="text-on-surface-subtle">Genres:</span>{' '}
              <span className="text-on-surface">
                {(result.data.genres ?? []).join(', ') || '—'}
              </span>
            </div>
          </div>
          {result.data.overview && (
            <p className="text-sm text-on-surface-muted line-clamp-3">{result.data.overview}</p>
          )}
          <div className="flex items-center gap-3 pt-2">
            {result.existsInDb ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-status-green">
                <CheckCircle className="w-4 h-4" /> Already in database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-status-yellow">
                <AlertCircle className="w-4 h-4" /> Not in database
              </span>
            )}
            <button
              onClick={onImport}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {result.existsInDb ? 'Re-sync from TMDB' : 'Import Movie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
