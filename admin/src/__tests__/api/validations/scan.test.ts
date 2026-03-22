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

  it('returns 500 on DB error', async () => {
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
            order: () =>
              Promise.resolve({ data: null, error: { message: 'Connection failed' }, count: 0 }),
          }),
        }),
      };
    });

    const res = await POST(makeRequest({ entity: 'movies' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Connection failed');
  });

  it('classifies full R2 URLs correctly', async () => {
    mockMoviesTable([
      {
        id: 'mov-4',
        poster_url: 'https://r2.example.com/bucket/image.jpg',
        backdrop_url: null,
        title: 'R2 Movie',
        tmdb_id: 400,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    const data = await res.json();
    expect(data.results[0].urlType).toBe('full_r2');
  });

  it('handles entity with null tmdbField (platforms)', async () => {
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
            order: () =>
              Promise.resolve({
                data: [{ id: 'p1', logo_url: 'logo.png', name: 'Netflix' }],
                error: null,
                count: 1,
              }),
          }),
        }),
      };
    });

    const res = await POST(makeRequest({ entity: 'platforms' }));
    const data = await res.json();
    expect(data.results[0].tmdbId).toBeNull();
    expect(data.results[0].entityLabel).toBe('Netflix');
  });

  it('handles deep scan with full_r2 URL (extracts key)', async () => {
    mockMoviesTable([
      {
        id: 'mov-5',
        poster_url: 'https://r2.example.com/bucket/image.jpg',
        backdrop_url: null,
        title: 'Deep R2',
        tmdb_id: 500,
      },
    ]);

    mockSend
      .mockResolvedValueOnce({}) // original
      .mockResolvedValueOnce({}) // sm
      .mockResolvedValueOnce({}) // md
      .mockResolvedValueOnce({}); // lg

    const res = await POST(makeRequest({ entity: 'movies', deep: true }));
    const data = await res.json();
    expect(data.results[0].originalExists).toBe(true);
  });

  it('skips external URLs during deep scan', async () => {
    mockMoviesTable([
      {
        id: 'mov-6',
        poster_url: 'https://image.tmdb.org/t/p/w500/test.jpg',
        backdrop_url: null,
        title: 'TMDB Movie',
        tmdb_id: 600,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies', deep: true }));
    const data = await res.json();
    // External URLs should not trigger HeadObject calls
    expect(data.results[0].originalExists).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('handles null url fields by skipping them', async () => {
    mockMoviesTable([
      {
        id: 'mov-7',
        poster_url: 'test.jpg',
        backdrop_url: null,
        title: 'Partial',
        tmdb_id: 700,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    const data = await res.json();
    // poster_url has a value but backdrop_url is null — only poster scanned
    expect(data.results.length).toBe(1);
    expect(data.results[0].field).toBe('poster_url');
  });

  it('uses entity label or fallback to id when label field is null', async () => {
    mockMoviesTable([
      {
        id: 'mov-8',
        poster_url: 'test.jpg',
        backdrop_url: null,
        title: null,
        tmdb_id: null,
      },
    ]);

    const res = await POST(makeRequest({ entity: 'movies' }));
    const data = await res.json();
    // When title is null, entityLabel falls back to id
    expect(data.results[0].entityLabel).toBe('mov-8');
  });

  it('handles deep scan with URL without extension', async () => {
    mockMoviesTable([
      {
        id: 'mov-9',
        poster_url: 'no-extension-file',
        backdrop_url: null,
        title: 'No ext',
        tmdb_id: null,
      },
    ]);

    mockSend
      .mockResolvedValueOnce({}) // original
      .mockResolvedValueOnce({}) // sm
      .mockResolvedValueOnce({}) // md
      .mockResolvedValueOnce({}); // lg

    const res = await POST(makeRequest({ entity: 'movies', deep: true }));
    const data = await res.json();
    expect(data.results[0].originalExists).toBe(true);
  });

  it('scans actors entity correctly', async () => {
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
            order: () =>
              Promise.resolve({
                data: [
                  { id: 'a1', photo_url: 'actor.jpg', name: 'Test Actor', tmdb_person_id: 123 },
                ],
                error: null,
                count: 1,
              }),
          }),
        }),
      };
    });

    const res = await POST(makeRequest({ entity: 'actors' }));
    const data = await res.json();
    expect(data.results[0].entity).toBe('actors');
    expect(data.results[0].field).toBe('photo_url');
    expect(data.results[0].tmdbId).toBe(123);
  });
});
