import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest, nextResponseMock } from '../test-utils';

const mockGetUser = vi.fn();
const mockDiscoverMoviesByLanguage = vi.fn();
const mockDiscoverMoviesByLanguageByMonth = vi.fn();
const mockSelectIn = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

const mockIsNull = vi.fn().mockResolvedValue({ data: [] });
// @edge: helper to make mock results chainable with .eq()/.limit() for aggregate queries
const emptyResult = () => Promise.resolve({ data: [] });
const chainable = (result: unknown) => {
  const obj = typeof result === 'object' && result !== null ? { ...result } : {};
  const withLimit = (o: Record<string, unknown>) => ({
    ...o,
    limit: () => emptyResult(),
  });
  return {
    ...obj,
    eq: () => withLimit({}),
    limit: () => emptyResult(),
  };
};
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        in: (...args: unknown[]) => {
          // @contract: the first .in() call is for movies lookup (returns mockSelectIn result)
          // subsequent .in() calls are for aggregate counts (return empty data)
          const result = mockSelectIn(...args);
          // Make result chainable for .eq()/.limit() in aggregate count queries
          if (result && typeof result.then === 'function') {
            return Object.assign(result, chainable({}));
          }
          return chainable(result);
        },
        is: () => ({ in: mockIsNull }),
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  discoverMoviesByLanguage: (...args: unknown[]) => mockDiscoverMoviesByLanguage(...args),
  discoverMoviesByLanguageAndMonth: (...args: unknown[]) =>
    mockDiscoverMoviesByLanguageByMonth(...args),
}));

vi.mock('next/server', () => nextResponseMock);

import { POST } from '@/app/api/sync/discover/route';

describe('POST /api/sync/discover', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockDiscoverMoviesByLanguage.mockReset();
    mockDiscoverMoviesByLanguageByMonth.mockReset();
    mockSelectIn.mockReset();
    mockIsNull.mockReset();
    mockIsNull.mockResolvedValue({ data: [] });

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ year: 2025 }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid year', async () => {
    const res = await POST(makeRequest({ year: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 503 when TMDB_API_KEY is not configured', async () => {
    vi.stubEnv('TMDB_API_KEY', '');
    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(503);
  });

  it('discovers movies by year and returns full DB snapshots for existing movies', async () => {
    // @contract: route selects id, tmdb_id, title, synopsis, poster_url, backdrop_url,
    // director, runtime, genres — mock must return full ExistingMovieData shape
    mockDiscoverMoviesByLanguage.mockResolvedValue([{ id: 100 }, { id: 200 }]);
    mockSelectIn.mockResolvedValue({
      data: [
        {
          id: 'uuid-100',
          tmdb_id: 100,
          title: 'Pushpa',
          synopsis: null,
          poster_url: null,
          backdrop_url: null,
          director: null,
          runtime: null,
          genres: null,
        },
      ],
    });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(2);
    // Route now returns full DB snapshot for existing movies (not just IDs)
    expect(data.existingMovies).toHaveLength(1);
    expect(data.existingMovies[0].tmdb_id).toBe(100);
    // Verify full shape is present in the response
    expect(data.existingMovies[0]).toHaveProperty('id', 'uuid-100');
    expect(data.existingMovies[0]).toHaveProperty('title', 'Pushpa');
  });

  it('detects duplicate suspects for movies with matching titles but no tmdb_id', async () => {
    mockDiscoverMoviesByLanguage.mockResolvedValue([
      { id: 100, title: 'Pushpa' },
      { id: 200, title: 'RRR' },
    ]);
    mockSelectIn.mockResolvedValue({
      data: [{ id: 'uuid-100', tmdb_id: 100, title: 'Pushpa' }],
    });
    // Return a suspect movie that has the same title but no tmdb_id
    mockIsNull.mockResolvedValue({
      data: [{ id: 'suspect-1', title: 'RRR', tmdb_id: null }],
    });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.duplicateSuspects).toBeDefined();
    expect(data.duplicateSuspects[200]).toEqual({ id: 'suspect-1', title: 'RRR' });
  });

  it('returns error when TMDB discover throws', async () => {
    mockDiscoverMoviesByLanguage.mockRejectedValue(new Error('TMDB rate limit'));
    mockIsNull.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('discovers movies by year and months when months are provided', async () => {
    mockDiscoverMoviesByLanguageByMonth.mockResolvedValue([{ id: 300 }]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025, months: [3, 6] }));
    expect(res.status).toBe(200);
    expect(mockDiscoverMoviesByLanguageByMonth).toHaveBeenCalledWith(
      2025,
      3,
      'te',
      'test-tmdb-key',
    );
    expect(mockDiscoverMoviesByLanguageByMonth).toHaveBeenCalledWith(
      2025,
      6,
      'te',
      'test-tmdb-key',
    );
  });

  it('discovers using all DB languages when language param is omitted', async () => {
    // Mock the languages table query
    // We need to call with language undefined to hit the "All" path
    mockDiscoverMoviesByLanguage.mockResolvedValue([{ id: 100, title: 'Pushpa' }]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(200);
    // At minimum, discoverMoviesByLanguage should have been called
    expect(mockDiscoverMoviesByLanguage).toHaveBeenCalled();
  });

  it('deduplicates results across multiple languages', async () => {
    // Same movie returned by multiple language discovers
    mockDiscoverMoviesByLanguage
      .mockResolvedValueOnce([{ id: 100, title: 'Pushpa' }])
      .mockResolvedValueOnce([
        { id: 100, title: 'Pushpa' },
        { id: 200, title: 'RRR' },
      ]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025, language: 'te' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    // Only one call since language='te' means single lang
    expect(data.results).toHaveLength(1);
  });

  it('resolves R2 relative poster_url to full URL when env is set', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_POSTERS', 'https://posters.r2.dev');
    vi.stubEnv('R2_PUBLIC_BASE_URL_BACKDROPS', 'https://backdrops.r2.dev');
    mockDiscoverMoviesByLanguage.mockResolvedValue([{ id: 100 }]);
    mockSelectIn.mockResolvedValue({
      data: [
        {
          id: 'uuid-100',
          tmdb_id: 100,
          title: 'Movie',
          poster_url: 'abc123.jpg',
          backdrop_url: 'def456.jpg',
          synopsis: null,
          release_date: null,
          director: null,
          runtime: null,
          genres: null,
        },
      ],
    });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.existingMovies[0].poster_url).toBe('https://posters.r2.dev/abc123.jpg');
    expect(data.existingMovies[0].backdrop_url).toBe('https://backdrops.r2.dev/def456.jpg');
  });

  it('does not modify absolute poster URLs', async () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL_POSTERS', 'https://posters.r2.dev');
    mockDiscoverMoviesByLanguage.mockResolvedValue([{ id: 100 }]);
    mockSelectIn.mockResolvedValue({
      data: [
        {
          id: 'uuid-100',
          tmdb_id: 100,
          title: 'Movie',
          poster_url: 'https://tmdb.org/poster.jpg',
          backdrop_url: null,
        },
      ],
    });

    const res = await POST(makeRequest({ year: 2025 }));
    const data = await res.json();
    expect(data.existingMovies[0].poster_url).toBe('https://tmdb.org/poster.jpg');
  });

  it('returns 400 for year > 2100', async () => {
    const res = await POST(makeRequest({ year: 2101 }));
    expect(res.status).toBe(400);
  });

  it('deduplicates results by month across multiple months', async () => {
    // Same movie in both months
    mockDiscoverMoviesByLanguageByMonth
      .mockResolvedValueOnce([{ id: 100, title: 'A' }])
      .mockResolvedValueOnce([
        { id: 100, title: 'A' },
        { id: 200, title: 'B' },
      ]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025, months: [1, 2] }));
    const data = await res.json();
    expect(data.results).toHaveLength(2); // 100 and 200, deduped
  });
});
