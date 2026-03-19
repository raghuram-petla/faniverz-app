import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('next/server', () => ({
  NextRequest: class {
    private _headers: Map<string, string>;
    constructor(_url: string, init?: { headers?: Record<string, string> }) {
      this._headers = new Map(Object.entries(init?.headers ?? {}));
    }
    get headers() {
      return { get: (name: string) => this._headers.get(name) ?? null };
    }
  },
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

import { GET } from '@/app/api/validations/summary/route';
import type { NextRequest } from 'next/server';

function makeRequest(authHeader = 'Bearer valid-token'): NextRequest {
  const headers = new Map<string, string>();
  headers.set('authorization', authHeader);

  return {
    headers: { get: (name: string) => headers.get(name) ?? null },
  } as unknown as NextRequest;
}

describe('GET /api/validations/summary', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('returns 401 when unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns summary counts for each entity', async () => {
    // Setup admin role check
    mockFrom.mockImplementation((table: string) => {
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
      // Return mock data for image tables
      return {
        select: () =>
          Promise.resolve({
            data: [
              { poster_url: '12345.jpg' },
              { poster_url: 'https://image.tmdb.org/t/p/w500/abc.jpg' },
              { poster_url: null },
            ],
            error: null,
          }),
      };
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entities).toBeDefined();
    expect(Array.isArray(data.entities)).toBe(true);
    expect(data.entities.length).toBeGreaterThan(0);

    const first = data.entities[0];
    expect(first).toHaveProperty('total');
    expect(first).toHaveProperty('external');
    expect(first).toHaveProperty('local');
    expect(first).toHaveProperty('nullCount');
  });

  it('classifies URLs correctly', async () => {
    mockFrom.mockImplementation((table: string) => {
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
      if (table === 'movies') {
        return {
          select: () =>
            Promise.resolve({
              data: [
                { poster_url: 'local-key.jpg' },
                { poster_url: 'https://image.tmdb.org/t/p/w500/external.jpg' },
                { poster_url: null },
              ],
              error: null,
            }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    });

    const res = await GET(makeRequest());
    const data = await res.json();
    const moviePosters = data.entities.find(
      (e: { entity: string; field: string }) => e.entity === 'movies' && e.field === 'poster_url',
    );
    expect(moviePosters).toBeDefined();
    expect(moviePosters.local).toBe(1);
    expect(moviePosters.external).toBe(1);
    expect(moviePosters.nullCount).toBe(1);
    expect(moviePosters.total).toBe(3);
  });

  it('handles DB errors gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
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
        select: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
      };
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should return empty array since all queries failed
    expect(data.entities).toEqual([]);
  });
});
