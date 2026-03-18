'use client';

/**
 * Sequential bulk fill of missing fields for all existing movies with gaps.
 * State lives in browser memory only — lost on page reload (by design).
 *
 * @contract: run() processes movies one at a time, stopping on 429 rate limit.
 * @sideeffect: calls /api/sync/fill-fields per movie; invalidates ['admin','movies'] once on completion.
 * @edge: errors other than 429 are counted as failures but processing continues.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { ExistingMovieData } from '@/hooks/useSync';
import { getMissingFields, countMissing } from '@/lib/syncUtils';

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

export function useBulkFillMissing() {
  const [state, setState] = useState<BulkFillState>(INITIAL_STATE);
  const qc = useQueryClient();

  // @boundary: getSession() returns null when not logged in — bail early
  const run = async (movies: ExistingMovieData[]) => {
    const gapped = movies.filter((m) => countMissing(m) > 0);
    if (gapped.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setState((s) => ({ ...s, error: 'Not authenticated' }));
      return;
    }

    setState({ total: gapped.length, done: 0, failed: 0, isRunning: true, error: null });

    for (const movie of gapped) {
      const fields = getMissingFields(movie);
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
            // @edge: stop entirely on rate limit — admin can retry later
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
    // @sideeffect: single invalidation after all movies processed — not per-movie
    qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
  };

  const reset = () => setState(INITIAL_STATE);

  return { run, state, reset };
}
