import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockVerifyAdmin = vi.fn();
const mockEnsureTmdbApiKey = vi.fn();
const mockSearchMovies = vi.fn();
const mockSearchPersons = vi.fn();
const mockSelectIn = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  ensureTmdbApiKey: () => mockEnsureTmdbApiKey(),
  errorResponse: (label: string, err: unknown) => ({
    body: { error: err instanceof Error ? err.message : `${label} failed` },
    status: 500,
    async json() {
      return this.body;
    },
  }),
  unauthorizedResponse: () => ({
    body: { error: 'Unauthorized' },
    status: 401,
    async json() {
      return this.body;
    },
  }),
}));

const mockIsNull = vi.fn();
const mockLanguagesSelect = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'languages') {
        return { select: () => mockLanguagesSelect() };
      }
      return {
        select: () => ({
          in: mockSelectIn,
          is: () => ({ in: mockIsNull }),
        }),
      };
    },
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
  searchPersons: (...args: unknown[]) => mockSearchPersons(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/search/route';

describe('POST /api/sync/search', () => {
  beforeEach(() => {
    mockVerifyAdmin.mockReset();
    mockEnsureTmdbApiKey.mockReset();
    mockSearchMovies.mockReset();
    mockSearchPersons.mockReset();
    mockSelectIn.mockReset();
    mockIsNull.mockReset();
    mockLanguagesSelect.mockReset();
    mockIsNull.mockResolvedValue({ data: [] });
    // @contract Default: supported languages = te, hi — filters out unsupported languages
    mockLanguagesSelect.mockResolvedValue({
      data: [{ code: 'te' }, { code: 'hi' }, { code: 'en' }],
    });

    mockVerifyAdmin.mockResolvedValue({ id: 'user-1', email: 'admin@test.com' });
    mockEnsureTmdbApiKey.mockReturnValue({ ok: true, apiKey: 'test-tmdb-key' });
  });

  it('returns 401 when not authorized', async () => {
    mockVerifyAdmin.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ query: 'test' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when query is less than 2 characters', async () => {
    const res = await POST(makeRequest({ query: 'a' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('at least 2 characters');
  });

  it('returns combined movies and actors response', async () => {
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'Movie A' },
      { id: 200, title: 'Movie B' },
    ]);
    mockSearchPersons.mockResolvedValue([
      { id: 10, name: 'Actor A' },
      { id: 20, name: 'Actor B' },
    ]);
    mockSelectIn
      .mockResolvedValueOnce({ data: [{ tmdb_id: 100 }] })
      .mockResolvedValueOnce({ data: [{ tmdb_person_id: 10 }] });

    const res = await POST(makeRequest({ query: 'Search Term' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    // Response has both movies and actors keys
    expect(data).toHaveProperty('movies');
    expect(data).toHaveProperty('actors');

    // Movies section
    expect(data.movies.results).toHaveLength(2);
    expect(data.movies.existingTmdbIds).toEqual([100]);
    expect(data.movies.duplicateSuspects).toEqual({});

    // Actors section
    expect(data.actors.results).toHaveLength(2);
    expect(data.actors.existingTmdbPersonIds).toEqual([10]);
  });

  it('returns empty arrays when no results found', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);

    const res = await POST(makeRequest({ query: 'nonexistent' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.movies.results).toHaveLength(0);
    expect(data.movies.existingTmdbIds).toEqual([]);
    expect(data.actors.results).toHaveLength(0);
    expect(data.actors.existingTmdbPersonIds).toEqual([]);
  });

  it('does not require a type parameter', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);

    // No type in body — should still work
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(200);
  });

  it('filters out movies in unsupported languages', async () => {
    mockLanguagesSelect.mockResolvedValue({ data: [{ code: 'te' }, { code: 'hi' }] });
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'Telugu Movie', original_language: 'te' },
      { id: 200, title: 'French Movie', original_language: 'fr' },
      { id: 300, title: 'Hindi Movie', original_language: 'hi' },
    ]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

    const res = await POST(makeRequest({ query: 'test movie' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    // French movie should be filtered out
    expect(data.movies.results).toHaveLength(2);
    expect(data.movies.results.map((m: { id: number }) => m.id)).toEqual([100, 300]);
  });

  it('returns error when TMDB API key is missing', async () => {
    mockEnsureTmdbApiKey.mockReturnValue({
      ok: false,
      response: {
        body: { error: 'TMDB_API_KEY not set' },
        status: 500,
        async json() {
          return this.body;
        },
      },
    });
    const res = await POST(makeRequest({ query: 'test' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when an unexpected error is thrown', async () => {
    mockSearchMovies.mockRejectedValue(new Error('Unexpected TMDB error'));
    const res = await POST(makeRequest({ query: 'test' }));
    expect(res.status).toBe(500);
  });

  it('returns 400 when query is empty', async () => {
    const res = await POST(makeRequest({ query: '' }));
    expect(res.status).toBe(400);
  });

  it('passes language parameter to searchMovies when provided', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);
    const res = await POST(makeRequest({ query: 'test movie', language: 'hi' }));
    expect(res.status).toBe(200);
    expect(mockSearchMovies).toHaveBeenCalledWith('test movie', 'test-tmdb-key', 'hi');
  });

  it('finds duplicate suspects by matching titles', async () => {
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'Duplicate Movie', original_language: 'te' },
      { id: 200, title: 'Unique Movie', original_language: 'te' },
    ]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn
      .mockResolvedValueOnce({ data: [] }) // no existing movies by tmdb_id
      .mockResolvedValueOnce({ data: [] }); // no existing actors
    // Mock the suspects query — returns a movie with matching title but no tmdb_id
    mockIsNull.mockResolvedValue({
      data: [{ id: 'db-dup', title: 'Duplicate Movie', tmdb_id: null }],
    });

    const res = await POST(makeRequest({ query: 'Duplicate' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.movies.duplicateSuspects).toHaveProperty('100');
    expect(data.movies.duplicateSuspects[100].id).toBe('db-dup');
  });

  it('keeps movies with null original_language when filtering by supported langs', async () => {
    mockLanguagesSelect.mockResolvedValue({ data: [{ code: 'te' }] });
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'No Lang', original_language: null },
      { id: 200, title: 'French', original_language: 'fr' },
    ]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

    const res = await POST(makeRequest({ query: 'test' }));
    const data = await res.json();
    // null original_language passes the filter (!m.original_language evaluates to true)
    expect(data.movies.results).toHaveLength(1);
    expect(data.movies.results[0].id).toBe(100);
  });

  it('handles null supportedLangs via nullish coalesce', async () => {
    mockLanguagesSelect.mockResolvedValue({ data: null });
    mockSearchMovies.mockResolvedValue([{ id: 100, title: 'Movie', original_language: 'te' }]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

    const res = await POST(makeRequest({ query: 'test' }));
    const data = await res.json();
    // With supportedCodes.size === 0, all movies pass
    expect(data.movies.results).toHaveLength(1);
  });

  it('handles null movieExisting data via nullish coalesce', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 100, title: 'Movie', original_language: 'te' }]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn
      .mockResolvedValueOnce({ data: null }) // null movie existing
      .mockResolvedValueOnce({ data: null }); // null person existing

    const res = await POST(makeRequest({ query: 'test' }));
    const data = await res.json();
    expect(data.movies.existingTmdbIds).toEqual([]);
    expect(data.actors.existingTmdbPersonIds).toEqual([]);
  });

  it('handles null suspects data in duplicate check', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 100, title: 'Movie', original_language: 'te' }]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });
    mockIsNull.mockResolvedValue({ data: null });

    const res = await POST(makeRequest({ query: 'test' }));
    const data = await res.json();
    expect(data.movies.duplicateSuspects).toEqual({});
  });

  it('returns all movies when no supported languages in DB', async () => {
    mockLanguagesSelect.mockResolvedValue({ data: [] });
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'Movie A', original_language: 'te' },
      { id: 200, title: 'Movie B', original_language: 'fr' },
    ]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

    const res = await POST(makeRequest({ query: 'test' }));
    const data = await res.json();

    expect(data.movies.results).toHaveLength(2);
  });
});
