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

// @boundary Proxy to /api/sync/* Next.js routes — server handles TMDB API key securely
// @contract GET when body is undefined; POST with JSON body otherwise
// @edge 401 → sign out so AuthProvider redirects to /login
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
  // @edge: non-JSON error responses (e.g., HTML 500) would throw SyntaxError — catch and fallback
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Sync API error: ${res.status}`);
  return data as T;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Discover Telugu movies from TMDB by year/month. */
export function useDiscoverMovies() {
  return useMutation({
    mutationFn: (params: { year: number; month?: number }) =>
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

/** Import movies from TMDB by their IDs. Max 5 per batch. */
// @sideeffect Creates movies + cast + crew in DB; invalidates both sync and movies caches
// @edge Max 5 per batch enforced server-side — larger arrays will be rejected
export function useImportMovies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tmdbIds: number[]) => syncApi<ImportMoviesResponse>('import-movies', { tmdbIds }),
    // @sideeffect Import creates movies + actors + cast/crew — invalidate all affected caches
    // @coupling 'movie' (singular) is the single-movie cache used by edit pages
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor'] });
      qc.invalidateQueries({ queryKey: ['admin', 'cast'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Refresh an existing movie from TMDB. */
// @sideeffect Overwrites movie fields with latest TMDB data; invalidates movie + sync caches
export function useRefreshMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movieId: string) => syncApi<RefreshMovieResponse>('refresh-movie', { movieId }),
    // @sideeffect Refresh may update cast/crew — invalidate cast cache for the movie
    onSuccess: (_data, movieId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'cast', movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
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
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
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
    // @sideeffect Actor name/photo changes affect cast views that JOIN with actors
    onSuccess: (_data, actorId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor', actorId] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'cast'] });
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
    // @coupling 'movie' (singular) is the single-movie cache used by edit pages
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor'] });
      qc.invalidateQueries({ queryKey: ['admin', 'cast'] });
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Failed to link TMDB ID');
    },
  });
}

/** Search TMDB for both movies and actors by name. */
export function useTmdbSearch() {
  return useMutation({
    mutationFn: (query: string) => syncApi<TmdbSearchAllResult>('search', { query }),
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
