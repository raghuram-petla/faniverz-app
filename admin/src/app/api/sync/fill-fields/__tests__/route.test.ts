import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/route-wrappers', () => ({
  withSyncAdmin: (_label: string, handler: Function) => handler,
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: vi.fn(),
  TMDB_IMAGE: {
    poster: (p: string) => `https://tmdb.org/w500${p}`,
    backdrop: (p: string) => `https://tmdb.org/w1280${p}`,
  },
}));

vi.mock('@/lib/tmdbTypes', () => ({
  extractTeluguTranslation: vi.fn(() => ({ titleTe: null, synopsisTe: null })),
  extractIndiaCertification: vi.fn(() => null),
}));

vi.mock('@/lib/r2-sync', () => ({
  maybeUploadImage: vi.fn(),
  R2_BUCKETS: { moviePosters: 'posters', movieBackdrops: 'backdrops' },
}));

vi.mock('@/lib/sync-images', () => ({ syncAllImages: vi.fn() }));
vi.mock('@/lib/sync-extended', () => ({
  syncVideos: vi.fn(),
  syncKeywords: vi.fn(),
  syncProductionCompanies: vi.fn(),
}));
vi.mock('@/lib/sync-watch-providers', () => ({ syncWatchProvidersMultiCountry: vi.fn() }));
vi.mock('@/lib/sync-cast', () => ({ syncCastCrewAdditive: vi.fn() }));

import { POST } from '@/app/api/sync/fill-fields/route';
import { getMovieDetails } from '@/lib/tmdb';
import { makeRouteWrapperCtx } from '@/__tests__/helpers/request-builders';

// @coupling Uses shared makeRouteWrapperCtx helper to build route-wrapper context objects.
function makeCtx(body: Record<string, unknown>) {
  return makeRouteWrapperCtx(
    'http://localhost/api/sync/fill-fields',
    body,
    mockSupabase as never,
    { userId: 'admin-42', role: 'super_admin' },
  );
}

describe('POST /api/sync/fill-fields', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeCtx({ fields: ['title'] }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when fields is empty', async () => {
    const res = await POST(makeCtx({ tmdbId: 1, fields: [] }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 404 when movie not found in DB', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    const res = await POST(makeCtx({ tmdbId: 999, fields: ['title'] }) as never);
    expect(res.status).toBe(404);
  });

  it('passes correct fields to movie update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: 'movie-1', original_language: 'en' } }),
        }),
      }),
      update: mockUpdate,
    });

    vi.mocked(getMovieDetails).mockResolvedValue({
      title: 'Test',
      overview: 'Overview',
      release_date: '2024-01-01',
      runtime: 120,
      genres: [],
      poster_path: null,
      backdrop_path: null,
      credits: { cast: [], crew: [] },
      videos: { results: [] },
      translations: { translations: [] },
      external_ids: {},
      tagline: '',
      status: 'Released',
      vote_average: 7,
      vote_count: 100,
      budget: 0,
      revenue: 0,
      release_dates: { results: [] },
      spoken_languages: [],
      production_companies: [],
      keywords: { keywords: [] },
    } as never);

    const res = await POST(makeCtx({ tmdbId: 123, fields: ['title'] }) as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test' }));
  });
});
