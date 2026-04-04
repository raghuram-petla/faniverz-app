'use client';

// @contract: run() processes only movies with real TMDB mismatches, not just null fields.
// @sideeffect: calls /api/sync/fill-fields per movie; invalidates ['admin','movies'] on completion.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';
import { FILLABLE_DATA_FIELDS, type FillableDataField } from '@/lib/syncUtils';
import { getStatus } from '@/components/sync/fieldDiffHelpers';

export interface BulkFillState {
  total: number;
  done: number;
  failed: number;
  isRunning: boolean;
  error: string | null;
}

const INITIAL_STATE: BulkFillState = {
  total: 0,
  done: 0,
  failed: 0,
  isRunning: false,
  error: null,
};

/** @contract returns fields where local DB differs from TMDB (missing or changed) */
function getGappedFields(movie: ExistingMovieData, tmdb: LookupMovieData): FillableDataField[] {
  return FILLABLE_DATA_FIELDS.filter((f) => getStatus(movie, tmdb, f) !== 'same');
}

export function useBulkFillMissing() {
  const [state, setState] = useState<BulkFillState>(INITIAL_STATE);
  const qc = useQueryClient();

  /** @param tmdbMap pre-fetched TMDB data keyed by tmdb_id */
  const run = async (movies: ExistingMovieData[], tmdbMap?: Map<number, LookupMovieData>) => {
    // @contract only process movies with real TMDB mismatches
    const gapped = movies.filter((m) => {
      const tmdb = tmdbMap?.get(m.tmdb_id);
      if (!tmdb) return false;
      return getGappedFields(m, tmdb).length > 0;
    });
    if (gapped.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setState((s) => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    setState({ total: gapped.length, done: 0, failed: 0, isRunning: true, error: null });

    // @sync: sequential processing — each movie waits for the previous to complete.
    // No parallelism to avoid TMDB rate limits (40 req/10s). A batch of 50 movies
    // takes ~2-3 minutes. If the browser tab is closed mid-loop, completed movies
    // persist but remaining movies are skipped with no cleanup or resume mechanism.
    for (const movie of gapped) {
      const tmdb = tmdbMap?.get(movie.tmdb_id);
      /* v8 ignore start */
      const fields = tmdb ? getGappedFields(movie, tmdb) : [];
      /* v8 ignore stop */

      if (fields.length === 0) {
        setState((s) => ({ ...s, done: s.done + 1 }));
        continue;
      }

      try {
        const res = await fetch('/api/sync/fill-fields', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tmdbId: movie.tmdb_id, fields }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) {
            setState((s) => ({
              ...s,
              isRunning: false,
              failed: s.failed + 1,
              error: body.error ?? 'TMDB rate limited — wait a moment and retry',
            }));
            return;
          }
          setState((s) => ({ ...s, failed: s.failed + 1 }));
        } else {
          setState((s) => ({ ...s, done: s.done + 1 }));
        }
      } catch {
        setState((s) => ({ ...s, failed: s.failed + 1 }));
      }
    }

    setState((s) => ({ ...s, isRunning: false }));
    // @coupling 'movie' (singular) is the single-movie cache used by edit pages
    qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    qc.invalidateQueries({ queryKey: ['admin', 'movie'] });
    qc.invalidateQueries({ queryKey: ['admin', 'cast'] });
    // @sideeffect: fill-fields may create actors + cast rows; dashboard counts may change
    qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
    qc.invalidateQueries({ queryKey: ['admin', 'actor'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    // @sideeffect: fill-fields can update release_date/in_theaters — theater views become stale
    qc.invalidateQueries({ queryKey: ['admin', 'theater-movies'] });
    qc.invalidateQueries({ queryKey: ['admin', 'upcoming-movies'] });
    qc.invalidateQueries({ queryKey: ['admin', 'upcoming-rereleases'] });
    qc.invalidateQueries({ queryKey: ['admin', 'theater-search'] });
  };

  const reset = () => setState(INITIAL_STATE);

  return { run, state, reset };
}
