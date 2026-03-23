import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextResponseMock } from '../test-utils';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockLimit = vi.fn();
const mockGetSupabaseAdmin = vi.fn();

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

function makeDefaultSupabaseAdmin() {
  return {
    from: (table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          not: () => ({
            or: () => ({
              order: () => ({
                limit: mockLimit,
              }),
            }),
            is: () => ({
              order: () => ({
                limit: mockLimit,
              }),
            }),
          }),
        }),
      };
    },
  };
}

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
}));

vi.mock('next/server', () => nextResponseMock);

import { GET } from '@/app/api/sync/stale-items/route';

function makeRequest(queryString: string, authHeader = 'Bearer valid-token') {
  return {
    url: `http://localhost/api/sync/stale-items${queryString}`,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

describe('GET /api/sync/stale-items', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockLimit.mockReset();
    mockGetSupabaseAdmin.mockReset();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
    mockGetSupabaseAdmin.mockReturnValue(makeDefaultSupabaseAdmin());
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await GET(makeRequest('?type=movies', ''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await GET(makeRequest('?type=movies'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid type parameter', async () => {
    const res = await GET(makeRequest('?type=invalid'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid type');
  });

  it('returns stale movies', async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 'movie-1', title: 'Test', tmdb_id: 100, tmdb_last_synced_at: null }],
      error: null,
    });

    const res = await GET(makeRequest('?type=movies&days=30'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('movies');
    expect(data.items).toHaveLength(1);
    expect(data.days).toBe(30);
  });

  it('returns actors missing bios', async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 'actor-1', name: 'Test Actor', tmdb_person_id: 500 }],
      error: null,
    });

    const res = await GET(makeRequest('?type=actors-missing-bios'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('actors-missing-bios');
    expect(data.items).toHaveLength(1);
  });

  it('returns 500 when database query fails', async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });

    const res = await GET(makeRequest('?type=movies'));
    expect(res.status).toBe(500);
  });

  it('returns stale movies with sinceYear filter', async () => {
    // sinceYear adds .gte() to the query chain before .order().limit()
    mockGetSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'admin_user_roles') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            not: () => ({
              or: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () =>
                      Promise.resolve({
                        data: [
                          {
                            id: 'movie-2',
                            title: 'Recent',
                            tmdb_id: 200,
                            tmdb_last_synced_at: null,
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
                order: () => ({
                  limit: mockLimit,
                }),
              }),
            }),
          }),
        };
      },
    });

    const res = await GET(makeRequest('?type=movies&days=30&sinceYear=2024'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('movies');
    expect(data.items).toHaveLength(1);
  });

  it('returns actors missing bios with sinceYear using RPC', async () => {
    mockGetSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'admin_user_roles') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
      rpc: () =>
        Promise.resolve({
          data: [{ id: 'actor-rpc', name: 'RPC Actor', tmdb_person_id: 600 }],
          error: null,
        }),
    });

    const res = await GET(makeRequest('?type=actors-missing-bios&sinceYear=2024'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('actors-missing-bios');
    expect(data.items).toHaveLength(1);
  });

  it('returns default days=30 when days param not provided', async () => {
    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    });

    const res = await GET(makeRequest('?type=movies'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.days).toBe(30);
  });

  it('returns 500 when actors-missing-bios DB query fails', async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });

    const res = await GET(makeRequest('?type=actors-missing-bios'));
    expect(res.status).toBe(500);
  });

  it('returns 400 for invalid type parameter', async () => {
    const res = await GET(makeRequest('?type=invalid'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid type');
  });

  it('returns actors-missing-bios without sinceYear', async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 'actor-1', name: 'Actor 1', tmdb_person_id: 100 }],
      error: null,
    });

    const res = await GET(makeRequest('?type=actors-missing-bios'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('actors-missing-bios');
    expect(data.items).toHaveLength(1);
  });

  it('returns 500 when actors-missing-bios RPC fails with sinceYear', async () => {
    mockGetSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'admin_user_roles') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
      rpc: () =>
        Promise.resolve({
          data: null,
          error: new Error('RPC failed'),
        }),
    });

    const res = await GET(makeRequest('?type=actors-missing-bios&sinceYear=2024'));
    expect(res.status).toBe(500);
  });
});
