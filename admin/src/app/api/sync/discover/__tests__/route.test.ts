import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/tmdb', () => ({
  discoverMoviesByLanguage: vi.fn(),
  discoverMoviesByLanguageAndMonth: vi.fn(),
}));

vi.mock('@/lib/sync-helpers', () => ({
  ensureTmdbApiKey: vi.fn(),
  errorResponse: vi.fn((_label: string, err: unknown) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }),
  verifyAdmin: vi.fn(),
  unauthorizedResponse: vi.fn(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),
}));

import { POST } from '@/app/api/sync/discover/route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { discoverMoviesByLanguage, discoverMoviesByLanguageAndMonth } from '@/lib/tmdb';
import { ensureTmdbApiKey, verifyAdmin } from '@/lib/sync-helpers';
import { makeNextRequest } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeNextRequest helper to build real NextRequest objects.
function makeRequest(body: Record<string, unknown>) {
  return makeNextRequest('http://localhost/api/sync/discover', body);
}

describe('POST /api/sync/discover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue({ id: 'admin-1' } as never);
    vi.mocked(ensureTmdbApiKey).mockReturnValue({ ok: true, apiKey: 'tmdb-key' });
    process.env.R2_PUBLIC_BASE_URL_POSTERS = 'https://r2.example/posters';
    process.env.R2_PUBLIC_BASE_URL_BACKDROPS = 'https://r2.example/backdrops';
  });

  it('returns 401 when user is not verified', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(null);
    const res = await POST(makeRequest({ year: 2024 }));
    expect(res.status).toBe(401);
  });

  it('returns error when TMDB API key is missing', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureTmdbApiKey).mockReturnValue({
      ok: false,
      response: NextResponse.json({ error: 'No key' }, { status: 503 }),
    });
    const res = await POST(makeRequest({ year: 2024 }));
    expect(res.status).toBe(503);
  });

  it('returns 400 for invalid year', async () => {
    const res = await POST(makeRequest({ year: 1800 }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid year');
  });

  it('returns 400 when year is missing', async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid year');
  });

  it('discovers movies with specific language', async () => {
    vi.mocked(discoverMoviesByLanguage).mockResolvedValue([
      {
        id: 1,
        title: 'Movie A',
        release_date: '2024-01-01',
        poster_path: null,
        original_language: 'te',
      },
    ]);
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
          is: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ year: 2024, language: 'te' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results.length).toBe(1);
    expect(discoverMoviesByLanguage).toHaveBeenCalledWith(2024, 'te', 'tmdb-key');
  });

  it('discovers movies for all languages when language is omitted', async () => {
    vi.mocked(discoverMoviesByLanguage).mockResolvedValue([]);
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
          is: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);
    // Mock languages table returning codes
    sb.from.mockImplementation((table: string) => {
      if (table === 'languages') {
        return {
          select: vi.fn().mockResolvedValue({ data: [{ code: 'te' }, { code: 'hi' }] }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
          is: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
    });

    await POST(makeRequest({ year: 2024 }));
    expect(discoverMoviesByLanguage).toHaveBeenCalledTimes(2);
  });

  it('falls back to te when languages table is empty', async () => {
    vi.mocked(discoverMoviesByLanguage).mockResolvedValue([]);
    const sb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'languages') {
          return { select: vi.fn().mockResolvedValue({ data: [] }) };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
            is: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    await POST(makeRequest({ year: 2024 }));
    expect(discoverMoviesByLanguage).toHaveBeenCalledWith(2024, 'te', 'tmdb-key');
  });

  it('discovers movies by month when months array is provided', async () => {
    vi.mocked(discoverMoviesByLanguageAndMonth).mockResolvedValue([
      {
        id: 1,
        title: 'Movie A',
        release_date: '2024-01-15',
        poster_path: null,
        original_language: 'te',
      },
    ]);
    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
          is: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ year: 2024, months: [1, 2], language: 'te' }));
    expect(res.status).toBe(200);
    expect(discoverMoviesByLanguageAndMonth).toHaveBeenCalledTimes(2);
  });

  it('deduplicates results across languages', async () => {
    vi.mocked(discoverMoviesByLanguage)
      .mockResolvedValueOnce([
        {
          id: 1,
          title: 'A',
          release_date: '2024-01-01',
          poster_path: null,
          original_language: 'te',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          title: 'A',
          release_date: '2024-01-01',
          poster_path: null,
          original_language: 'te',
        },
        {
          id: 2,
          title: 'B',
          release_date: '2024-02-01',
          poster_path: null,
          original_language: 'hi',
        },
      ]);
    const sb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'languages') {
          return { select: vi.fn().mockResolvedValue({ data: [{ code: 'te' }, { code: 'hi' }] }) };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
            is: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ year: 2024 }));
    const body = await res.json();
    expect(body.results.length).toBe(2); // deduped
  });

  it('resolves relative poster/backdrop URLs', async () => {
    vi.mocked(discoverMoviesByLanguage).mockResolvedValue([
      { id: 1, title: 'A', release_date: '2024-01-01', poster_path: null, original_language: 'te' },
    ]);
    const sb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'movies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'db-1',
                    tmdb_id: 1,
                    title: 'A',
                    poster_url: 'relative/poster.jpg',
                    backdrop_url: 'relative/backdrop.jpg',
                    synopsis: null,
                    release_date: null,
                    director: null,
                    runtime: null,
                    genres: null,
                    imdb_id: null,
                    title_te: null,
                    synopsis_te: null,
                    tagline: null,
                    tmdb_status: null,
                    tmdb_vote_average: null,
                    tmdb_vote_count: null,
                    budget: null,
                    revenue: null,
                    certification: null,
                    spoken_languages: null,
                  },
                ],
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [] }),
            is: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ year: 2024, language: 'te' }));
    const body = await res.json();
    expect(body.existingMovies[0].poster_url).toBe(
      'https://r2.example/posters/relative/poster.jpg',
    );
    expect(body.existingMovies[0].backdrop_url).toBe(
      'https://r2.example/backdrops/relative/backdrop.jpg',
    );
  });

  it('detects duplicate suspects', async () => {
    vi.mocked(discoverMoviesByLanguage).mockResolvedValue([
      {
        id: 100,
        title: 'Duplicate Movie',
        release_date: '2024-01-01',
        poster_path: null,
        original_language: 'te',
      },
    ]);
    let selectCallCount = 0;
    const sb = {
      from: vi.fn().mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // First select: fetch existing movies by tmdb_id — return empty
              return { in: vi.fn().mockResolvedValue({ data: [] }) };
            }
            // Second select: suspect query (title, tmdb_id is null)
            return {
              is: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [{ id: 'db-dup', title: 'Duplicate Movie', tmdb_id: null }],
                }),
              }),
            };
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ year: 2024, language: 'te' }));
    const body = await res.json();
    expect(body.duplicateSuspects[100]).toEqual({
      id: 'db-dup',
      title: 'Duplicate Movie',
    });
  });

  it('handles error and returns error response', async () => {
    vi.mocked(verifyAdmin).mockRejectedValue(new Error('Auth error'));
    const res = await POST(makeRequest({ year: 2024 }));
    expect(res.status).toBe(500);
  });
});
