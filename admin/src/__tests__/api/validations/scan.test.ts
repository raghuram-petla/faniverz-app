import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSend = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/r2-client', () => ({
  getR2Client: () => ({ send: mockSend }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  HeadObjectCommand: class {
    Bucket: string;
    Key: string;
    constructor(params: { Bucket: string; Key: string }) {
      this.Bucket = params.Bucket;
      this.Key = params.Key;
    }
  },
}));

vi.mock('next/server', () => ({
  NextRequest: class {
    private body: unknown;
    private _headers: Map<string, string>;
    constructor(_url: string, init?: { body?: string; headers?: Record<string, string> }) {
      this.body = init?.body ? JSON.parse(init.body) : null;
      this._headers = new Map(Object.entries(init?.headers ?? {}));
    }
    async json() {
      return this.body;
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

import { POST } from '@/app/api/validations/scan/route';
import type { NextRequest } from 'next/server';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token'): NextRequest {
  const bodyStr = JSON.stringify(body);
  const headers = new Map<string, string>();
  headers.set('authorization', authHeader);

  return {
    json: async () => JSON.parse(bodyStr),
    headers: { get: (name: string) => headers.get(name) ?? null },
  } as unknown as NextRequest;
}

function mockMoviesTable(rows: Record<string, unknown>[]) {
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
      select: () => ({
        not: () => ({
          order: () => Promise.resolve({ data: rows, error: null, count: rows.length }),
        }),
      }),
    };
  });
}

describe('POST /api/validations/scan', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockSend.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('returns 401 when unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const res = await POST(makeRequest({ entity: 'movies' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid entity', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
    }));

    const res = await POST(makeRequest({ entity: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('classifies local URLs without HeadObject calls (basic scan)', async () => {
    mockMoviesTable([
      {
        id: 'mov-1',
        poster_url: '12345.jpg',
        backdrop_url: 'bg.jpg',
        title: 'Movie 1',
        tmdb_id: 100,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].urlType).toBe('local');
    expect(data.results[0].entityLabel).toBe('Movie 1');
    // Basic scan: variant fields are null (no HeadObject calls)
    expect(data.results[0].originalExists).toBeNull();
    expect(data.results[0].variants.sm).toBeNull();
    // No HeadObject calls made
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('detects external TMDB URLs', async () => {
    mockMoviesTable([
      {
        id: 'mov-2',
        poster_url: 'https://image.tmdb.org/t/p/w500/abc.jpg',
        backdrop_url: null,
        title: 'External Movie',
        tmdb_id: 200,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    const data = await res.json();
    const externalResult = data.results.find((r: { urlType: string }) => r.urlType === 'external');
    expect(externalResult).toBeDefined();
    expect(externalResult.originalExists).toBeNull();
  });

  it('performs HeadObject checks only when deep=true', async () => {
    mockMoviesTable([
      { id: 'mov-3', poster_url: 'test.jpg', backdrop_url: null, title: 'Test', tmdb_id: 300 },
    ]);

    // Original exists, sm exists, md missing, lg missing
    mockSend
      .mockResolvedValueOnce({}) // original
      .mockResolvedValueOnce({}) // sm
      .mockRejectedValueOnce(new Error('NotFound')) // md
      .mockRejectedValueOnce(new Error('NotFound')); // lg

    const res = await POST(makeRequest({ entity: 'movies', deep: true }));
    const data = await res.json();
    const result = data.results[0];
    expect(result.originalExists).toBe(true);
    expect(result.variants.sm).toBe(true);
    expect(result.variants.md).toBe(false);
    expect(result.variants.lg).toBe(false);
    expect(mockSend).toHaveBeenCalled();
  });

  it('returns total count', async () => {
    mockMoviesTable([{ id: 'a', poster_url: 'a.jpg', backdrop_url: null, title: 'A', tmdb_id: 1 }]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    const data = await res.json();
    expect(data.total).toBe(1);
  });
});
