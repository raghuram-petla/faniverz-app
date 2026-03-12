'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { TmdbDiscoverMovie } from '@/lib/tmdb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiscoverResult {
  results: TmdbDiscoverMovie[];
  existingTmdbIds: number[];
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

async function syncApi<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/sync/${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
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
export function useImportMovies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tmdbIds: number[]) => syncApi<ImportMoviesResponse>('import-movies', { tmdbIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Refresh an existing movie from TMDB. */
export function useRefreshMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movieId: string) => syncApi<RefreshMovieResponse>('refresh-movie', { movieId }),
    onSuccess: (_data, movieId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', movieId] });
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
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
    onSuccess: (_data, actorId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
      qc.invalidateQueries({ queryKey: ['admin', 'actor', actorId] });
      qc.invalidateQueries({ queryKey: ['admin', 'actors'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Operation failed');
    },
  });
}

/** Fetch stale movies or actors missing bios. */
export function useStaleItems(type: 'movies' | 'actors-missing-bios', days?: number) {
  const params = new URLSearchParams({ type });
  if (days !== undefined) params.set('days', String(days));

  return useQuery({
    queryKey: ['admin', 'sync', 'stale', type, days],
    queryFn: () => syncApi<StaleItemsResponse>(`stale-items?${params.toString()}`),
  });
}

/** Search existing movies by title (typeahead). */
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
