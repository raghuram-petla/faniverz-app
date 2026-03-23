import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  useDiscoverMovies,
  useTmdbLookup,
  useImportMovies,
  useRefreshMovie,
  useImportActor,
  useRefreshActor,
  useStaleItems,
  useFillFields,
  useLinkTmdbId,
  useTmdbSearch,
  useMovieSearch,
  useActorSearch,
} from '@/hooks/useSync';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

const validSession = { access_token: 'tok-valid' };

describe('useSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockGetSession.mockResolvedValue({ data: { session: validSession } });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'ok' }),
    });
  });

  describe('syncApi helper (via useDiscoverMovies)', () => {
    it('calls signOut and throws when session is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(mockSignOut).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Session expired'));
    });

    it('calls signOut and throws on 401 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('throws with error message from JSON body on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request from server' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Bad request from server');
    });

    it('falls back to status code message when JSON parse fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('500'));
    });

    it('sends POST with body when body is provided', async () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024, month: 3, language: 'te' });
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sync/discover',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ year: 2024, month: 3, language: 'te' }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${validSession.access_token}`,
          }),
        }),
      );
    });
  });

  describe('useDiscoverMovies', () => {
    it('shows alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Error' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalled();
    });
  });

  describe('useTmdbLookup', () => {
    it('calls /api/sync/lookup with correct params', async () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbLookup(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ tmdbId: 123, type: 'movie' });
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sync/lookup',
        expect.objectContaining({
          body: JSON.stringify({ tmdbId: 123, type: 'movie' }),
        }),
      );
    });

    it('shows alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbLookup(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ tmdbId: 999, type: 'person' }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Not found');
    });
  });

  describe('useImportMovies', () => {
    it('invalidates caches on success', async () => {
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useImportMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ tmdbIds: [101, 102] });
      });
      // @contract MOVIE_SYNC_KEYS + 'platform-movie-ids' are all invalidated
      for (const key of [
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
        'platform-movie-ids',
      ]) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', key] });
      }
    });
  });

  describe('useRefreshMovie', () => {
    it('invalidates correct caches on success', async () => {
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useRefreshMovie(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('movie-uuid');
      });
      // @contract MOVIE_SYNC_KEYS are prefix-invalidated (no movie-uuid suffix needed)
      for (const key of [
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
      ]) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', key] });
      }
    });

    it('shows alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRefreshMovie(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('movie-uuid').catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Server error');
    });
  });

  describe('useImportActor', () => {
    it('calls /api/sync/import-actor with tmdbPersonId', async () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useImportActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync(555);
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sync/import-actor',
        expect.objectContaining({ body: JSON.stringify({ tmdbPersonId: 555 }) }),
      );
    });

    it('invalidates actors cache on success', async () => {
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useImportActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync(555);
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'actors'] });
    });

    it('shows "Import failed" alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Import failed' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useImportActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync(555).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Import failed');
    });
  });

  describe('useRefreshActor', () => {
    it('invalidates actor-specific cache on success', async () => {
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useRefreshActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('actor-uuid');
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'actor', 'actor-uuid'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'cast'] });
    });

    it('shows alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Refresh failed' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRefreshActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('actor-uuid').catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Refresh failed');
    });
  });

  describe('useStaleItems', () => {
    it('fetches stale movies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useStaleItems('movies'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sync/stale-items'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('includes days param when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useStaleItems('movies', 30), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('days=30'), expect.anything());
    });

    it('includes sinceYear param when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useStaleItems('movies', undefined, 2020), {
        wrapper: Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sinceYear=2020'),
        expect.anything(),
      );
    });
  });

  describe('useFillFields', () => {
    it('invalidates all relevant caches on success', async () => {
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useFillFields(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ tmdbId: 101, fields: ['title'] });
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movies'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movie'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'actors'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'sync'] });
    });
  });

  describe('useLinkTmdbId', () => {
    it('sends PATCH to /api/admin-crud with tmdb_id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'movie-1' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'movie-1', tmdbId: 12345 });
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin-crud',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ table: 'movies', id: 'movie-1', data: { tmdb_id: 12345 } }),
        }),
      );
    });

    it('throws and shows alert when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Conflict' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'movie-1', tmdbId: 999 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Conflict');
    });

    it('shows fallback error when session is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'movie-1', tmdbId: 123 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Session expired');
    });
  });

  describe('useTmdbSearch', () => {
    it('calls /api/sync/search with query params', async () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbSearch(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ query: 'Avatar', language: 'en' });
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sync/search',
        expect.objectContaining({ body: JSON.stringify({ query: 'Avatar', language: 'en' }) }),
      );
    });

    it('shows "Search failed" alert on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Search failed' }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbSearch(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ query: 'test' }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Search failed');
    });
  });

  describe('useMovieSearch', () => {
    it('is disabled when query length < 2', () => {
      const fromReturn = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom.mockReturnValue(fromReturn);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieSearch('a'), { wrapper: Wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is enabled when query length >= 2', async () => {
      const fromReturn = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'm1', title: 'Test' }], error: null }),
      };
      mockFrom.mockReturnValue(fromReturn);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieSearch('te'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('throws on DB error', async () => {
      const fromReturn = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockFrom.mockReturnValue(fromReturn);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useMovieSearch('te'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useActorSearch', () => {
    it('is disabled when query length < 2', () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useActorSearch('x'), { wrapper: Wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is enabled when query >= 2', async () => {
      const fromReturn = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'a1', name: 'Jane Doe' }],
          error: null,
        }),
      };
      mockFrom.mockReturnValue(fromReturn);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useActorSearch('ja'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('throws on DB error', async () => {
      const fromReturn = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockFrom.mockReturnValue(fromReturn);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useActorSearch('ja'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('syncApi — GET requests (no body)', () => {
    it('sends GET without Content-Type when body is undefined', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useStaleItems('movies'), { wrapper: Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const fetchCall = mockFetch.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('stale-items'),
      );
      expect(fetchCall).toBeDefined();
      expect(fetchCall![1].method).toBe('GET');
      expect(fetchCall![1].headers['Content-Type']).toBeUndefined();
      expect(fetchCall![1].body).toBeUndefined();
    });
  });

  describe('onError with non-Error objects', () => {
    it('useDiscoverMovies shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useDiscoverMovies(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ year: 2024 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });

    it('useTmdbLookup shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbLookup(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ tmdbId: 1, type: 'movie' }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });

    it('useRefreshMovie shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRefreshMovie(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('id').catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });

    it('useImportActor shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useImportActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync(1).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Import failed');
    });

    it('useRefreshActor shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useRefreshActor(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync('id').catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });

    it('useTmdbSearch shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useTmdbSearch(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ query: 'test' }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Search failed');
    });

    it('useLinkTmdbId shows fallback when error is not Error instance', async () => {
      mockFetch.mockRejectedValue('string-error');
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'm', tmdbId: 1 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Failed to link TMDB ID');
    });
  });

  describe('useLinkTmdbId — fallback error message', () => {
    it('uses fallback when body.error is null', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'm', tmdbId: 1 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Failed to link TMDB ID');
    });

    it('invalidates caches on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'm1' }),
      });
      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'm1', tmdbId: 123 });
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movies'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'movie'] });
    });

    it('uses fallback when json parse fails on link error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('parse fail');
        },
      });
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useLinkTmdbId(), { wrapper: Wrapper });
      await act(async () => {
        await result.current.mutateAsync({ movieId: 'm', tmdbId: 1 }).catch(() => {});
      });
      expect(window.alert).toHaveBeenCalledWith('Failed to link TMDB ID');
    });
  });
});
