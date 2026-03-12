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

  it('discovers movies by year and returns existing tmdb ids', async () => {
    mockDiscoverTeluguMovies.mockResolvedValue([{ id: 100 }, { id: 200 }]);
    mockSelectIn.mockResolvedValue({ data: [{ tmdb_id: 100 }] });

    const res = await POST(makeRequest({ year: 2025 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(2);
    expect(data.existingTmdbIds).toEqual([100]);
  });

  it('discovers movies by year and month when month is provided', async () => {
    mockDiscoverTeluguMoviesByMonth.mockResolvedValue([{ id: 300 }]);
    mockSelectIn.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest({ year: 2025, month: 3 }));
    expect(res.status).toBe(200);
    expect(mockDiscoverTeluguMoviesByMonth).toHaveBeenCalledWith(2025, 3, 'test-tmdb-key');
  });
});
