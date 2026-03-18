import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockDiscoverTeluguMovies = vi.fn();
const mockDiscoverTeluguMoviesByMonth = vi.fn();
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

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        in: mockSelectIn,
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  discoverTeluguMovies: (...args: unknown[]) => mockDiscoverTeluguMovies(...args),
  discoverTeluguMoviesByMonth: (...args: unknown[]) => mockDiscoverTeluguMoviesByMonth(...args),
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

import { POST } from '@/app/api/sync/discover/route';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

describe('POST /api/sync/discover', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockGetUser.mockReset();
    mockDiscoverTeluguMovies.mockReset();
    mockDiscoverTeluguMoviesByMonth.mockReset();
    mockSelectIn.mockReset();

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
    // trailer_url, director, runtime, genres — mock must return full ExistingMovieData shape
    mockDiscoverTeluguMovies.mockResolvedValue([{ id: 100 }, { id: 200 }]);
    mockSelectIn.mockResolvedValue({
      data: [
        {
          id: 'uuid-100',
          tmdb_id: 100,
          title: 'Pushpa',
          synopsis: null,
          poster_url: null,
          backdrop_url: null,
          trailer_url: null,
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

  it('discovers movies by year and month when month is provided', async () => {
    mockDiscoverTeluguMoviesByMonth.mockResolvedValue([{ id: 300 }]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025, month: 3 }));
    expect(res.status).toBe(200);
    expect(mockDiscoverTeluguMoviesByMonth).toHaveBeenCalledWith(2025, 3, 'test-tmdb-key');
  });
});
