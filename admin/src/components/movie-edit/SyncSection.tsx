'use client';

/**
 * TMDB Sync section for the movie edit page.
 * Fetches TMDB data, shows field-by-field diff, and lets admins selectively apply changes.
 *
 * @contract Reuses FieldDiffPanel, useFillFields, applyTmdbFields — zero duplication
 * with the bulk sync page. Both pages share the exact same comparison + apply code path.
 * @coupling sync/FieldDiffPanel, sync/fieldDiffHelpers, sync/syncHelpers, hooks/useSync, lib/syncUtils
 */

import { useState, useMemo, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useTmdbMovieLookup,
  useFillFields,
  type ExistingMovieData,
  type LookupMovieData,
} from '@/hooks/useSync';
import type { MovieForm } from '@/hooks/useMovieEditTypes';
import { FILLABLE_DATA_FIELDS } from '@/lib/syncUtils';
import { getStatus } from '@/components/sync/fieldDiffHelpers';
import { FieldDiffPanel } from '@/components/sync/FieldDiffPanel';
import { applyTmdbFields } from '@/components/sync/syncHelpers';

// ── Props ────────────────────────────────────────────────────────────────────

export interface SyncSectionProps {
  /** @contract Patches parent form + initialForm so synced values don't trigger unsaved-changes dock */
  onFieldsApplied?: (patch: Partial<MovieForm>) => void;
  /** @contract Full movie row from useAdminMovie — superset of ExistingMovieData */
  movie: {
    id: string;
    tmdb_id: number;
    title: string | null;
    synopsis: string | null;
    release_date: string | null;
    poster_url: string | null;
    backdrop_url: string | null;
    director: string | null;
    runtime: number | null;
    genres: string[] | null;
    imdb_id: string | null;
    title_te: string | null;
    synopsis_te: string | null;
    tagline: string | null;
    tmdb_status: string | null;
    tmdb_vote_average: number | null;
    tmdb_vote_count: number | null;
    budget: number | null;
    revenue: number | null;
    certification: string | null;
    spoken_languages: string[] | null;
    /** @contract Pass original_language to skip redundant TMDB language-detection fetch */
    original_language: string | null;
  };
}

/** @contract Picks ExistingMovieData fields from the full movie row */
function toExistingMovieData(m: SyncSectionProps['movie']): ExistingMovieData {
  return {
    id: m.id,
    tmdb_id: m.tmdb_id,
    title: m.title,
    synopsis: m.synopsis,
    release_date: m.release_date,
    poster_url: m.poster_url,
    backdrop_url: m.backdrop_url,
    director: m.director,
    runtime: m.runtime,
    genres: m.genres,
    imdb_id: m.imdb_id,
    title_te: m.title_te,
    synopsis_te: m.synopsis_te,
    tagline: m.tagline,
    tmdb_status: m.tmdb_status,
    tmdb_vote_average: m.tmdb_vote_average,
    tmdb_vote_count: m.tmdb_vote_count,
    budget: m.budget,
    revenue: m.revenue,
    certification: m.certification,
    spoken_languages: m.spoken_languages,
  };
}

/** @contract Maps DB field names from updatedFields to MovieForm-compatible patch.
 *  @assumes Only fields that exist in BOTH ExistingMovieData and MovieForm are mapped. */
function buildFormPatch(fields: string[], m: ExistingMovieData): Partial<MovieForm> {
  const patch: Partial<MovieForm> = {};
  for (const f of fields) {
    if (f === 'title') patch.title = m.title ?? '';
    else if (f === 'synopsis') patch.synopsis = m.synopsis ?? '';
    else if (f === 'genres') patch.genres = m.genres ?? [];
    else if (f === 'certification') patch.certification = m.certification ?? '';
    else if (f === 'tagline') patch.tagline = m.tagline ?? '';
    else if (f === 'release_date') patch.release_date = m.release_date ?? '';
    else if (f === 'runtime') patch.runtime = m.runtime?.toString() ?? '';
    else if (f === 'poster_url') patch.poster_url = m.poster_url ?? '';
    else if (f === 'backdrop_url') patch.backdrop_url = m.backdrop_url ?? '';
  }
  return patch;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SyncSection({ movie, onFieldsApplied }: SyncSectionProps) {
  const [localMovie, setLocalMovie] = useState<ExistingMovieData>(() => toExistingMovieData(movie));
  const [appliedFields, setAppliedFields] = useState<string[]>([]);

  // @contract useQuery auto-fetches on mount and handles React strict mode correctly
  const lookup = useTmdbMovieLookup(movie.tmdb_id, movie.original_language);
  const fillFields = useFillFields();

  // @edge Sync local state when parent movie data changes (e.g. after cache invalidation)
  useEffect(() => setLocalMovie(toExistingMovieData(movie)), [movie]);

  const tmdbData: LookupMovieData | null =
    lookup.data?.type === 'movie' && lookup.data.data.tmdbId === movie.tmdb_id
      ? lookup.data.data
      : null;

  const gapCount = useMemo(() => {
    if (!tmdbData) return null;
    return FILLABLE_DATA_FIELDS.filter((f) => getStatus(localMovie, tmdbData, f) !== 'same').length;
  }, [localMovie, tmdbData]);

  // @contract Same apply logic as ExistingMovieRow — calls fill-fields, optimistic update
  const handleApply = async (fields: string[], forceResyncCast: boolean) => {
    const payload: { tmdbId: number; fields: string[]; forceResyncCast?: boolean } = {
      tmdbId: movie.tmdb_id,
      fields,
    };
    if (forceResyncCast) payload.forceResyncCast = true;
    const res = await fillFields.mutateAsync(payload);
    setAppliedFields((prev) => [...new Set([...prev, ...res.updatedFields])]);
    if (tmdbData && res.updatedFields.length > 0) {
      const { movie: updatedMovie } = applyTmdbFields(localMovie, tmdbData, res.updatedFields);
      setLocalMovie(updatedMovie);
      // @sideeffect Patch parent form + initialForm so synced fields don't trigger the dock
      const patch = buildFormPatch(res.updatedFields, updatedMovie);
      if (Object.keys(patch).length > 0) onFieldsApplied?.(patch);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header with gap count + re-fetch button ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {lookup.isFetching ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching from TMDB…
            </span>
          ) : gapCount !== null && gapCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-yellow">
              <AlertCircle className="w-4 h-4" />
              {gapCount} gap{gapCount !== 1 ? 's' : ''} found
            </span>
          ) : gapCount !== null ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-green">
              <CheckCircle2 className="w-4 h-4" />
              All fields in sync
            </span>
          ) : null}
        </div>
        {!lookup.isFetching && tmdbData && (
          <button
            onClick={() => lookup.refetch()}
            className="flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-on-surface transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-fetch from TMDB
          </button>
        )}
      </div>

      {/* ── Error states ── */}
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

      {/* ── Field diff panel — reused from sync page ── */}
      {tmdbData && (
        <FieldDiffPanel
          movie={localMovie}
          tmdb={tmdbData}
          appliedFields={appliedFields}
          isSaving={fillFields.isPending}
          onApply={handleApply}
        />
      )}
    </div>
  );
}
