import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: vi.fn(),
  getPersonDetails: vi.fn(),
  getMovieImages: vi.fn(),
  getWatchProviders: vi.fn(),
  TMDB_IMAGE: {
    poster: (p: string) => `https://tmdb.org/w500${p}`,
    backdrop: (p: string) => `https://tmdb.org/w1280${p}`,
    profile: (p: string) => `https://tmdb.org/w185${p}`,
  },
}));

vi.mock('@/lib/tmdbTypes', () => ({
  extractIndiaCertification: vi.fn(() => 'U/A'),
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

import { POST } from '@/app/api/sync/lookup/route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails, getPersonDetails, getMovieImages, getWatchProviders } from '@/lib/tmdb';
import { ensureTmdbApiKey, verifyAdmin } from '@/lib/sync-helpers';
import { makeNextRequest } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeNextRequest helper to build real NextRequest objects.
function makeRequest(body: Record<string, unknown>) {
  return makeNextRequest('http://localhost/api/sync/lookup', body);
}

const makeMovieDetail = (overrides: Record<string, unknown> = {}) => ({
  id: 123,
  title: 'Test Movie',
  overview: 'A great movie',
  release_date: '2024-01-01',
  runtime: 120,
  original_language: 'en',
  genres: [{ id: 1, name: 'Action' }],
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  credits: {
    cast: [{ id: 1, name: 'Actor A' }],
    crew: [{ id: 2, name: 'Dir', job: 'Director' }],
  },
  videos: { results: [{ site: 'YouTube', key: 'abc' }] },
  translations: {
    translations: [
      { iso_639_1: 'te', data: { title: 'Telugu Title', overview: 'Telugu overview' } },
    ],
  },
  external_ids: { imdb_id: 'tt12345' },
  tagline: 'Great tagline',
  status: 'Released',
  vote_average: 7.5,
  vote_count: 1000,
  budget: 50000000,
  revenue: 100000000,
  release_dates: { results: [] },
  spoken_languages: [{ iso_639_1: 'en' }, { iso_639_1: 'te' }],
  production_companies: [{ id: 1 }],
  keywords: { keywords: [{ id: 1, name: 'hero' }] },
  ...overrides,
});

describe('POST /api/sync/lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue({ id: 'admin-1' } as never);
    vi.mocked(ensureTmdbApiKey).mockReturnValue({ ok: true, apiKey: 'tmdb-key' });
  });

  it('returns 401 when user is not verified', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(null);
    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    expect(res.status).toBe(401);
  });

  it('returns error when TMDB API key is missing', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureTmdbApiKey).mockReturnValue({
      ok: false,
      response: NextResponse.json({ error: 'No key' }, { status: 503 }),
    });
    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    expect(res.status).toBe(503);
  });

  it('returns 400 when tmdbId or type is missing', async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain('required');
  });

  it('looks up a movie and returns preview data', async () => {
    const detail = makeMovieDetail();
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({
      posters: [{ file_path: '/p1.jpg' }],
      backdrops: [],
    } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([{ provider_name: 'Netflix' }] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.type).toBe('movie');
    expect(body.existsInDb).toBe(false);
    expect(body.data.title).toBe('Test Movie');
    expect(body.data.director).toBe('Dir');
    expect(body.data.posterCount).toBe(1);
    expect(body.data.providerNames).toEqual(['Netflix']);
    expect(body.data.titleTe).toBe('Telugu Title');
  });

  it('re-fetches movie details with original language when not en', async () => {
    const detail = makeMovieDetail({ original_language: 'te' });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    // Should be called twice: first without language, then with 'te'
    expect(getMovieDetails).toHaveBeenCalledTimes(2);
    expect(getMovieDetails).toHaveBeenCalledWith(123, 'tmdb-key', 'te');
  });

  it('fetches DB counts for existing movie', async () => {
    const detail = makeMovieDetail();
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    let fromCallCount = 0;
    const sb = {
      from: vi.fn().mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // movies table — check if exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'movie-uuid' } }),
              }),
            }),
          };
        }
        // DB count queries — movie_images, movie_videos, movie_keywords, etc.
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ movie_id: 'movie-uuid' }] }),
            })),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.existsInDb).toBe(true);
    expect(body.existingId).toBe('movie-uuid');
    expect(body.data.dbPosterCount).toBe(1);
  });

  it('looks up a person and returns preview data', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      id: 456,
      name: 'Actor Name',
      biography: 'Bio text',
      birthday: '1990-01-01',
      place_of_birth: 'Mumbai',
      profile_path: '/profile.jpg',
      gender: 1,
    } as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 456, type: 'person' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.type).toBe('person');
    expect(body.data.name).toBe('Actor Name');
    expect(body.data.photoUrl).toBe('https://tmdb.org/w185/profile.jpg');
  });

  it('returns existing person when in DB', async () => {
    vi.mocked(getPersonDetails).mockResolvedValue({
      id: 456,
      name: 'Actor Name',
      biography: null,
      birthday: null,
      place_of_birth: null,
      profile_path: null,
      gender: 0,
    } as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'actor-uuid' } }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 456, type: 'person' }));
    const body = await res.json();
    expect(body.existsInDb).toBe(true);
    expect(body.existingId).toBe('actor-uuid');
    expect(body.data.photoUrl).toBeNull();
  });

  it('handles error and returns error response', async () => {
    vi.mocked(verifyAdmin).mockRejectedValue(new Error('Auth error'));
    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    expect(res.status).toBe(500);
  });

  it('handles movie with no director', async () => {
    const detail = makeMovieDetail({
      credits: { cast: [], crew: [{ id: 2, name: 'Writer', job: 'Writer' }] },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.data.director).toBeNull();
  });

  it('handles movie with no poster/backdrop path', async () => {
    const detail = makeMovieDetail({ poster_path: null, backdrop_path: null });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.data.posterUrl).toBeNull();
    expect(body.data.backdropUrl).toBeNull();
  });

  it('handles movie with no translations', async () => {
    const detail = makeMovieDetail({
      translations: { translations: [] },
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.data.titleTe).toBeNull();
    expect(body.data.synopsisTe).toBeNull();
  });

  it('maps platform_id from dbPlatformNames for existing movie', async () => {
    const detail = makeMovieDetail();
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'movies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'movie-uuid' } }),
              }),
            }),
          };
        }
        if (table === 'movie_platforms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ platform_id: 'plat-1' }, { platform_id: 'plat-2' }],
              }),
            }),
          };
        }
        // Default for other tables (movie_images, movie_videos, movie_keywords, movie_production_houses)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }),
        };
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.existsInDb).toBe(true);
    expect(body.data.dbPlatformNames).toEqual(['plat-1', 'plat-2']);
  });

  it('handles missing external_ids and keywords', async () => {
    const detail = makeMovieDetail({
      external_ids: null,
      keywords: null,
      tagline: '',
      status: '',
      budget: 0,
      revenue: 0,
      spoken_languages: null,
      production_companies: null,
    });
    vi.mocked(getMovieDetails).mockResolvedValue(detail as never);
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [] } as never);
    vi.mocked(getWatchProviders).mockResolvedValue([] as never);

    const sb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(sb as never);

    const res = await POST(makeRequest({ tmdbId: 123, type: 'movie' }));
    const body = await res.json();
    expect(body.data.imdbId).toBeNull();
    expect(body.data.keywordCount).toBe(0);
    expect(body.data.tagline).toBeNull();
    expect(body.data.spokenLanguages).toEqual([]);
    expect(body.data.productionCompanyCount).toBe(0);
  });
});
