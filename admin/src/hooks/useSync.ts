'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { TmdbDiscoverMovie } from '@/lib/tmdb';
// Re-export for consumers that only import from this module
export type { FillableField } from '@/lib/syncUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Full DB snapshot of a movie that already exists — used for field-level diff. */
export interface ExistingMovieData {
  id: string;
  tmdb_id: number;
  title: string | null;
  synopsis: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  director: string | null;
  runtime: number | null;
  genres: string[] | null;
}

export interface DiscoverResult {
  results: TmdbDiscoverMovie[];
  /** Full DB snapshots for movies already in our DB — derive existingTmdbIds via .map(m => m.tmdb_id) */
  existingMovies: ExistingMovieData[];
}

export interface FillFieldsResponse {
  movieId: string;
  /** Field keys that were actually updated (e.g. 'cast' omitted if already had entries). */
  updatedFields: string[];
}

export interface LookupMovieData {
  tmdbId: number;
  title: string;
  overview: string;
  releaseDate: string;
  runtime: number | null;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  director: string | null;
  castCount: number;
  crewCount: number;
}

export interface LookupPersonData {
  tmdbPersonId: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  photoUrl: string | null;
  gender: number;
}

export type LookupResult =
  | { type: 'movie'; existsInDb: boolean; existingId: string | null; data: LookupMovieData }
  | { type: 'person'; existsInDb: boolean; existingId: string | null; data: LookupPersonData };

export interface ImportMovieResult {
  movieId: string;
  title: string;
  tmdbId: number;
  isNew: boolean;
  castCount: number;
  crewCount: number;
}

export interface ImportMoviesResponse {
  syncLogId: string;
  results: ImportMovieResult[];
  errors: Array<{ tmdbId: number; message: string }>;
}

export interface RefreshMovieResponse {
  syncLogId: string;
  result: ImportMovieResult;
}

export interface RefreshActorResponse {
  syncLogId: string;
  result: {
    actorId: string;
    name: string;
    updated: boolean;
    fields: string[];
  };
}

export interface StaleItem {
  id: string;
  title?: string;
  name?: string;
  tmdb_id?: number;
  tmdb_person_id?: number;
  tmdb_last_synced_at?: string | null;
}

export interface StaleItemsResponse {
  type: string;
  items: StaleItem[];
  days?: number;
}

// ── API fetch helper ──────────────────────────────────────────────────────────

// @boundary Proxy to /api/sync/* Next.js routes — server handles TMDB API key securely
// @contract GET when body is undefined; POST with JSON body otherwise
// @assumes caller is authenticated — getSession() returns null only when session has expired
// @edge 401 from server means JWT expired mid-session (autoRefreshToken:false) — sign out
//       so AuthProvider's onAuthStateChange fires null → DashboardLayout redirects to /login
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

  const data = await res.json();
  if (res.status === 401) {
    void supabase.auth.signOut();
    throw new Error('Session expired — please sign in again.');
  }
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
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
// @nullable days param — omitted uses server default staleness threshold
export function useStaleItems(type: 'movies' | 'actors-missing-bios', days?: number) {
  const params = new URLSearchParams({ type });
  if (days !== undefined) params.set('days', String(days));

  return useQuery({
    queryKey: ['admin', 'sync', 'stale', type, days],
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
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
    },
    // @contract: callers surface errors via fillFields.isError + fillFields.error
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
