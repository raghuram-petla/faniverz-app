import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockGetMovieDetails = vi.fn();
const mockGetPersonDetails = vi.fn();
const mockMaybeSingle = vi.fn();

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

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieDetails: (...args: unknown[]) => mockGetMovieDetails(...args),
  getPersonDetails: (...args: unknown[]) => mockGetPersonDetails(...args),
  extractTrailerUrl: (videos: Array<{ key: string; site: string; type: string }>) => {
    const t = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
    return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
  },
  TMDB_IMAGE: {
    poster: (path: string) => `https://image.tmdb.org/t/p/w500${path}`,
    backdrop: (path: string) => `https://image.tmdb.org/t/p/w1280${path}`,
    profile: (path: string) => `https://image.tmdb.org/t/p/w185${path}`,
  },
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

import { POST } from '@/app/api/sync/lookup/route';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

describe('POST /api/sync/lookup', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockGetMovieDetails.mockReset();
    mockGetPersonDetails.mockReset();
    mockMaybeSingle.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }, ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when tmdbId is missing', async () => {
    const res = await POST(makeRequest({ type: 'movie' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await POST(makeRequest({ tmdbId: 100 }));
    expect(res.status).toBe(400);
  });

  it('looks up a movie by tmdb id', async () => {
    mockGetMovieDetails.mockResolvedValue({
      id: 100,
      title: 'Test Movie',
      overview: 'A test movie',
      release_date: '2025-01-01',
      runtime: 120,
      genres: [{ name: 'Drama' }],
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      credits: {
        cast: [{ name: 'Actor' }],
        crew: [{ job: 'Director', name: 'Director Name' }],
      },
      videos: {
        results: [{ key: 'abc123', site: 'YouTube', type: 'Trailer' }],
      },
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ tmdbId: 100, type: 'movie' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('movie');
    expect(data.existsInDb).toBe(false);
    expect(data.data.title).toBe('Test Movie');
    expect(data.data.director).toBe('Director Name');
  });

  it('looks up a person by tmdb id', async () => {
    mockGetPersonDetails.mockResolvedValue({
      id: 500,
      name: 'Test Actor',
      biography: 'A biography',
      birthday: '1990-01-01',
      place_of_birth: 'Hyderabad',
      profile_path: '/profile.jpg',
      gender: 1,
    });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'actor-1' }, error: null });

    const res = await POST(makeRequest({ tmdbId: 500, type: 'person' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('person');
    expect(data.existsInDb).toBe(true);
    expect(data.existingId).toBe('actor-1');
    expect(data.data.name).toBe('Test Actor');
  });
});
