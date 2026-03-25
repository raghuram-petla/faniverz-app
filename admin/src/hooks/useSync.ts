'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
// Re-export types so consumers can import from this module
export type { FillableField } from '@/lib/syncUtils';
export type {
  ExistingMovieData,
  DiscoverResult,
  DuplicateSuspect,
  FillFieldsResponse,
  LookupMovieData,
  LookupPersonData,
  LookupResult,
  ImportMovieResult,
  ImportMoviesResponse,
  RefreshMovieResponse,
  RefreshActorResponse,
  StaleItem,
  StaleItemsResponse,
  TmdbSearchAllResult,
} from '@/hooks/useSyncTypes';
import type {
  DiscoverResult,
  FillFieldsResponse,
  LookupResult,
  ImportMoviesResponse,
  RefreshMovieResponse,
  RefreshActorResponse,
  StaleItemsResponse,
  TmdbSearchAllResult,
} from '@/hooks/useSyncTypes';

// @boundary Proxy to /api/sync/* routes — server handles TMDB API key securely
async function syncApi<T>(path: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    void supabase.auth.signOut();
    throw new Error('Session expired — please sign in again.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api/sync/${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // @edge: check status before parsing JSON — non-JSON 401 responses (e.g., HTML from edge proxy) would throw SyntaxError
  if (res.status === 401) {
    void supabase.auth.signOut();
    throw new Error('Session expired — please sign in again.');
  }
  // @edge: non-JSON error responses (e.g., HTML 500/504 from edge proxy) — catch and fallback
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error ?? `Sync API error: ${res.status}`);
    // @contract: attach HTTP status for retry logic (504 = gateway timeout, retryable)
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
  return data as T;
}

// @contract Helper to invalidate common cache keys after sync operations
function invalidateSync(qc: ReturnType<typeof useQueryClient>, keys: string[]) {
  for (const key of keys) qc.invalidateQueries({ queryKey: ['admin', key] });
}

const MOVIE_SYNC_KEYS = [
  'sync',
  'movies',
  'movie',
  'actors',
  'actor',
  'cast',
  'videos',
  'images',
  'movie-production-houses',
  'theatrical-runs',
  'dashboard',
  'theater-movies',
  'upcoming-movies',
  'upcoming-rereleases',
  'theater-search',
];

/** Discover movies from TMDB by language, year, and optional month. */
export function useDiscoverMovies() {
  return useMutation({
    mutationFn: (params: { year: number; months?: number[]; language?: string }) =>
      syncApi<DiscoverResult>('discover', params),
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Preview a TMDB movie or person before importing. */
export function useTmdbLookup() {
  return useMutation({
    mutationFn: (params: { tmdbId: number; type: 'movie' | 'person' }) =>
      syncApi<LookupResult>('lookup', params),
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Import movies from TMDB by their IDs. Max 5 per batch (server-side enforced). */
// @sideeffect Creates movies + cast + crew in DB; invalidates sync + movies caches
export function useImportMovies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { tmdbIds: number[]; originalLanguage?: string }) =>
      syncApi<ImportMoviesResponse>('import-movies', params),
    onSuccess: () => {
      invalidateSync(qc, [...MOVIE_SYNC_KEYS, 'platform-movie-ids']);
    },
    // @contract: no onError — handled in DiscoverByYear retry loop (avoids alert flash on 504)
  });
}

/** Refresh an existing movie from TMDB. */
// @sideeffect Overwrites movie fields with latest TMDB data; invalidates movie + sync caches
export function useRefreshMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movieId: string) => syncApi<RefreshMovieResponse>('refresh-movie', { movieId }),
    // @sideeffect Refresh may update cast/crew, release_date, in_theaters
    // @contract MOVIE_SYNC_KEYS includes 'movie' and 'cast' which prefix-match movieId-scoped keys
    onSuccess: () => {
      invalidateSync(qc, MOVIE_SYNC_KEYS);
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Import an actor directly from TMDB by their TMDB person ID. */
export function useImportActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tmdbPersonId: number) =>
      syncApi<{
        syncLogId: string;
        result: { actorId: string; name: string; tmdbPersonId: number };
      }>('import-actor', { tmdbPersonId }),
    onSuccess: () => {
      invalidateSync(qc, ['sync', 'actors', 'dashboard']);
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Import failed');
    },
  });
}

/** Refresh an existing actor from TMDB. */
export function useRefreshActor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actorId: string) => syncApi<RefreshActorResponse>('refresh-actor', { actorId }),
    onSuccess: (_data, actorId) => {
      invalidateSync(qc, ['sync', 'actors', 'cast']);
      qc.invalidateQueries({ queryKey: ['admin', 'actor', actorId] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Fetch stale movies or actors missing bios. */
// @nullable days — omitted uses server default; sinceYear — restricts to movies from that year onward
export function useStaleItems(
  type: 'movies' | 'actors-missing-bios',
  days?: number,
  sinceYear?: number,
) {
  const params = new URLSearchParams({ type });
  if (days !== undefined) params.set('days', String(days));
  if (sinceYear !== undefined) params.set('sinceYear', String(sinceYear));

  return useQuery({
    queryKey: ['admin', 'sync', 'stale', type, days, sinceYear],
    queryFn: () => syncApi<StaleItemsResponse>(`stale-items?${params.toString()}`),
  });
}

/**
 * Apply admin-selected fields to an existing movie from TMDB.
 * Only the fields in the request are written — others are left untouched.
 */
// @sideeffect: updates movies row; may create actors + movie_cast rows for 'cast' field
export function useFillFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tmdbId,
      fields,
      forceResyncCast,
    }: {
      tmdbId: number;
      fields: string[];
      forceResyncCast?: boolean;
    }) => syncApi<FillFieldsResponse>('fill-fields', { tmdbId, fields, forceResyncCast }),
    onSuccess: () => {
      invalidateSync(qc, MOVIE_SYNC_KEYS);
    },
    // @contract: callers surface errors via fillFields.isError + fillFields.error
  });
}

/** @sideeffect Sets tmdb_id on an existing movie — used for duplicate resolution on sync page */
export function useLinkTmdbId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ movieId, tmdbId }: { movieId: string; tmdbId: number }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');
      const res = await fetch('/api/admin-crud', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ table: 'movies', id: movieId, data: { tmdb_id: tmdbId } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to link TMDB ID');
      }
      return res.json();
    },
    onSuccess: () => invalidateSync(qc, ['movies', 'movie']),
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Failed to link TMDB ID');
    },
  });
}

/** Search TMDB for both movies and actors by name. */
export function useTmdbSearch() {
  return useMutation({
    mutationFn: (params: { query: string; language?: string }) =>
      syncApi<TmdbSearchAllResult>('search', params),
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Search failed');
    },
  });
}

/** Search existing movies by title (typeahead). */
// @edge enabled guard at query.length>=2 prevents excessive DB calls on single-char input
export function useMovieSearch(query: string) {
  return useQuery({
    queryKey: ['admin', 'movie-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, release_date, tmdb_id, tmdb_last_synced_at, poster_url')
        .ilike('title', `%${query}%`)
        .order('release_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}

/** Search existing actors by name (typeahead). */
export function useActorSearch(query: string) {
  return useQuery({
    queryKey: ['admin', 'actor-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from('actors')
        .select('id, name, tmdb_person_id, photo_url, biography, birth_date')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}
