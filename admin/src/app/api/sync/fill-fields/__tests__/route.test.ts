import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabase),
  getAuditableSupabaseAdmin: vi.fn(() => mockSupabase),
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

vi.mock('@/lib/sync-helpers', () => ({
  ensureAdminMutateAuth: vi.fn(),
  errorResponse: vi.fn((_label: string, err: unknown) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }),
}));

import { POST } from '@/app/api/sync/fill-fields/route';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import { getMovieDetails } from '@/lib/tmdb';
import { ensureAdminMutateAuth } from '@/lib/sync-helpers';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sync/fill-fields', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
  });
}

describe('POST /api/sync/fill-fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: true,
      auth: { user: { id: 'admin-42' } as never, role: 'super_admin' },
      apiKey: 'tmdb-key',
    });
  });

  it('returns error response when auth fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(ensureAdminMutateAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeRequest({ tmdbId: 1, fields: ['title'] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeRequest({ fields: ['title'] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when fields is empty', async () => {
    const res = await POST(makeRequest({ tmdbId: 1, fields: [] }));
    expect(res.status).toBe(400);
  });

  it('uses auditable supabase client and passes correct fields to update', async () => {
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

    const res = await POST(makeRequest({ tmdbId: 123, fields: ['title'] }));
    expect(res.status).toBe(200);
    expect(getAuditableSupabaseAdmin).toHaveBeenCalledWith('admin-42');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test' }));
  });

  it('returns 404 when movie not found in DB', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    const res = await POST(makeRequest({ tmdbId: 999, fields: ['title'] }));
    expect(res.status).toBe(404);
  });
});
