'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Loader2, Film } from 'lucide-react';
import {
  useTmdbLookup,
  useFillFields,
  type ExistingMovieData,
  type LookupMovieData,
} from '@/hooks/useSync';
import { FILLABLE_DATA_FIELDS } from '@/lib/syncUtils';
import { getStatus } from './fieldDiffHelpers';
import { FieldDiffPanel } from './FieldDiffPanel';
import { applyTmdbFields } from './syncHelpers';

export interface ExistingMovieRowProps {
  movie: ExistingMovieData;
  justImported: boolean;
  prefetchedTmdb: LookupMovieData | null;
  /** @sideeffect called after per-movie apply so parent can update gap counts + tmdb data */
  onMovieUpdated?: (updated: ExistingMovieData, updatedTmdb?: LookupMovieData) => void;
}

export function ExistingMovieRow({
  movie: movieProp,
  justImported,
  prefetchedTmdb,
  onMovieUpdated,
}: ExistingMovieRowProps) {
  const [open, setOpen] = useState(false);
  const [appliedFields, setAppliedFields] = useState<string[]>([]);
  const [movie, setMovie] = useState(movieProp);
  // @edge sync local state when parent updates (e.g. after bulk fill)
  useEffect(() => setMovie(movieProp), [movieProp]);
  const lookup = useTmdbLookup();
  const fillFields = useFillFields();

  const tmdbData =
    prefetchedTmdb ??
    (lookup.data?.type === 'movie' && lookup.data.data.tmdbId === movie.tmdb_id
      ? lookup.data.data
      : null);

  const gapCount = useMemo(() => {
    if (!tmdbData) return null;
    return FILLABLE_DATA_FIELDS.filter((f) => getStatus(movie, tmdbData, f) !== 'same').length;
  }, [movie, tmdbData]);

  const handleToggle = () => {
    if (justImported) return;
    setOpen((o) => !o);
  };

  const handleApply = async (fields: string[], forceResyncCast: boolean) => {
    const payload: { tmdbId: number; fields: string[]; forceResyncCast?: boolean } = {
      tmdbId: movie.tmdb_id,
      fields,
    };
    if (forceResyncCast) payload.forceResyncCast = true;
    const res = await fillFields.mutateAsync(payload);
    setAppliedFields((prev) => [...new Set([...prev, ...res.updatedFields])]);
    if (tmdbData && res.updatedFields.length > 0) {
      const { movie: updatedMovie, tmdb: updatedTmdb } = applyTmdbFields(
        movie,
        tmdbData,
        res.updatedFields,
      );
      setMovie(updatedMovie);
      onMovieUpdated?.(updatedMovie, updatedTmdb);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors text-left"
      >
        <div className="w-10 h-14 bg-surface-muted rounded shrink-0 overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-4 h-4 text-on-surface-disabled" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">{movie.title ?? '—'}</p>
          <p
            className={`text-xs mt-0.5 ${
              justImported
                ? 'text-status-blue'
                : gapCount === null
                  ? 'text-on-surface-subtle'
                  : gapCount > 0
                    ? 'text-status-yellow'
                    : 'text-status-green'
            }`}
          >
            {justImported
              ? 'Just imported'
              : gapCount === null
                ? 'Checking...'
                : gapCount > 0
                  ? `${gapCount} gap${gapCount > 1 ? 's' : ''}`
                  : 'No gaps'}
          </p>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-on-surface-muted shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-on-surface-muted shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 bg-surface-muted/30">
          {lookup.isPending && (
            <div className="flex items-center gap-2 py-4 text-sm text-on-surface-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching from TMDB…
            </div>
          )}
          {lookup.isError && (
            <p className="py-3 text-sm text-status-red">
              {lookup.error instanceof Error ? lookup.error.message : 'TMDB fetch failed'}
            </p>
          )}
          {fillFields.isError && (
            <p className="py-2 text-sm text-status-red">
              {fillFields.error instanceof Error ? fillFields.error.message : 'Apply failed'}
            </p>
          )}
          {tmdbData && (
            <FieldDiffPanel
              movie={movie}
              tmdb={tmdbData}
              appliedFields={appliedFields}
              isSaving={fillFields.isPending}
              onApply={handleApply}
            />
          )}
        </div>
      )}
    </div>
  );
}
