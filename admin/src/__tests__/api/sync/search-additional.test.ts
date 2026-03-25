/**
 * Additional branch coverage for /api/sync/search route.
 * Covers: language param, empty query, duplicate suspects, missing tmdb key, error handler.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockVerifyAdmin = vi.fn();
const mockEnsureTmdbApiKey = vi.fn();
const mockSearchMovies = vi.fn();
const mockSearchPersons = vi.fn();
const mockSelectIn = vi.fn();
const mockIsNull = vi.fn();
const mockErrorResponse = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  ensureTmdbApiKey: () => mockEnsureTmdbApiKey(),
  errorResponse: (...args: unknown[]) => mockErrorResponse(...args),
  unauthorizedResponse: () => ({
    body: { error: 'Unauthorized' },
    status: 401,
    async json() {
      return this.body;
    },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        in: mockSelectIn,
        is: () => ({ in: mockIsNull }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
  searchPersons: (...args: unknown[]) => mockSearchPersons(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/search/route';

describe('POST /api/sync/search — additional branches', () => {
  beforeEach(() => {
    mockVerifyAdmin.mockReset();
    mockEnsureTmdbApiKey.mockReset();
    mockSearchMovies.mockReset();
    mockSearchPersons.mockReset();
    mockSelectIn.mockReset();
    mockIsNull.mockReset();
    mockErrorResponse.mockReset();

    mockIsNull.mockResolvedValue({ data: [] });
    mockVerifyAdmin.mockResolvedValue({ id: 'user-1', email: 'admin@test.com' });
    mockEnsureTmdbApiKey.mockReturnValue({ ok: true, apiKey: 'test-tmdb-key' });
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValue({ data: [] });
  });

  it('returns tmdb key response when no tmdb key configured', async () => {
    const errorResp = { status: 500, body: { error: 'TMDB key missing' } };
    mockEnsureTmdbApiKey.mockReturnValue({ ok: false, response: errorResp });

    const res = await POST(makeRequest({ query: 'test' }));
    // When !tmdb.ok the route returns tmdb.response directly
    expect(res).toBe(errorResp);
  });

  it('returns 400 when query is empty string', async () => {
    const res = await POST(makeRequest({ query: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('at least 2 characters');
  });

  it('passes language to searchMovies when provided', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);

    await POST(makeRequest({ query: 'baahubali', language: 'te' }));

    expect(mockSearchMovies).toHaveBeenCalledWith('baahubali', 'test-tmdb-key', 'te');
  });

  it('passes undefined to searchMovies when language not provided', async () => {
    await POST(makeRequest({ query: 'test movie' }));
    expect(mockSearchMovies).toHaveBeenCalledWith('test movie', 'test-tmdb-key', undefined);
  });

  it('detects duplicate suspects for unmatched movies with same title in DB', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 999, title: 'Duplicate Film' }]);
    mockSearchPersons.mockResolvedValue([]);
    // No match by tmdb_id
    mockSelectIn.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });
    // But there's a title-based duplicate (no tmdb_id)
    mockIsNull.mockResolvedValue({
      data: [{ id: 'db-movie-1', title: 'Duplicate Film', tmdb_id: null }],
    });

    const res = await POST(makeRequest({ query: 'Duplicate Film' }));
    const data = await res.json();
    expect(data.movies.duplicateSuspects).toHaveProperty('999');
    expect(data.movies.duplicateSuspects[999]).toMatchObject({ id: 'db-movie-1' });
  });

  it('returns empty duplicateSuspects when no title matches', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 111, title: 'Unique Movie' }]);
    mockSearchPersons.mockResolvedValue([]);
    mockSelectIn.mockResolvedValue({ data: [] });
    mockIsNull.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ query: 'Unique Movie' }));
    const data = await res.json();
    expect(data.movies.duplicateSuspects).toEqual({});
  });

  it('calls errorResponse on unexpected exception', async () => {
    mockSearchMovies.mockRejectedValue(new Error('TMDB API down'));
    mockErrorResponse.mockReturnValue({
      status: 500,
      body: { error: 'TMDB API down' },
      json: async () => ({ error: 'TMDB API down' }),
    });

    const res = await POST(makeRequest({ query: 'query' }));
    expect(mockErrorResponse).toHaveBeenCalledWith('Search', expect.any(Error));
    expect(res.status).toBe(500);
  });

  it('skips duplicate check when all movies already matched by tmdb_id', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 100, title: 'Matched Movie' }]);
    mockSearchPersons.mockResolvedValue([]);
    // Movie IS matched by tmdb_id
    mockSelectIn
      .mockResolvedValueOnce({ data: [{ tmdb_id: 100 }] })
      .mockResolvedValueOnce({ data: [] });

    const res = await POST(makeRequest({ query: 'Matched Movie' }));
    const data = await res.json();
    // No unmatched titles — duplicateSuspects should be empty
    expect(data.movies.duplicateSuspects).toEqual({});
  });
});
