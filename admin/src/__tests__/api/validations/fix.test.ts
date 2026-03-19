import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSend = vi.fn();
const mockUploadImageFromUrl = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/r2-client', () => ({
  getR2Client: () => ({ send: mockSend }),
}));

vi.mock('@/lib/r2-sync', () => ({
  uploadImageFromUrl: (...args: unknown[]) => mockUploadImageFromUrl(...args),
}));

vi.mock('@/lib/image-resize', () => ({
  generateVariants: vi.fn().mockResolvedValue([
    { suffix: '_sm', buffer: Buffer.from('sm'), contentType: 'image/jpeg' },
    { suffix: '_md', buffer: Buffer.from('md'), contentType: 'image/jpeg' },
    { suffix: '_lg', buffer: Buffer.from('lg'), contentType: 'image/jpeg' },
  ]),
}));

vi.mock('@/lib/variant-config', () => ({
  VARIANT_SPECS: {
    poster: [
      { suffix: '_sm', width: 200, quality: 80 },
      { suffix: '_md', width: 400, quality: 85 },
      { suffix: '_lg', width: 800, quality: 90 },
    ],
  },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: class {
    constructor(public params: unknown) {}
  },
  PutObjectCommand: class {
    constructor(public params: unknown) {}
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

import { POST } from '@/app/api/validations/fix/route';
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

function setupAdminAuth(role = 'admin') {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'admin_user_roles') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { role_id: role, status: 'active' }, error: null }),
          }),
        }),
      };
    }
    return {
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    };
  });
}

describe('POST /api/validations/fix', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockSend.mockReset();
    mockUploadImageFromUrl.mockReset();
  });

  it('returns 401 when unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    setupAdminAuth('viewer');
    const res = await POST(
      makeRequest({
        items: [
          {
            id: '1',
            entity: 'movies',
            field: 'poster_url',
            currentUrl: 'x',
            fixType: 'migrate_external',
          },
        ],
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when items is empty', async () => {
    setupAdminAuth();
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when too many items', async () => {
    setupAdminAuth();
    const items = Array.from({ length: 21 }, (_, i) => ({
      id: `${i}`,
      entity: 'movies',
      field: 'poster_url',
      currentUrl: 'x',
      fixType: 'migrate_external',
    }));
    const res = await POST(makeRequest({ items }));
    expect(res.status).toBe(400);
  });

  it('migrates external TMDB URL to R2', async () => {
    setupAdminAuth();
    mockUploadImageFromUrl.mockResolvedValue('abc123.jpg');

    const res = await POST(
      makeRequest({
        items: [
          {
            id: 'mov-1',
            entity: 'movies',
            field: 'poster_url',
            currentUrl: 'https://image.tmdb.org/t/p/w500/abc123.jpg',
            fixType: 'migrate_external',
          },
        ],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results[0].status).toBe('fixed');
    expect(data.results[0].newUrl).toBe('abc123.jpg');
    expect(mockUploadImageFromUrl).toHaveBeenCalledWith(
      'https://image.tmdb.org/t/p/original/abc123.jpg',
      'faniverz-movie-posters',
      'abc123.jpg',
    );
  });

  it('regenerates variants from R2 original', async () => {
    setupAdminAuth();
    mockSend.mockResolvedValueOnce({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
      ContentType: 'image/jpeg',
    });
    // Variant uploads
    mockSend.mockResolvedValue({});

    const res = await POST(
      makeRequest({
        items: [
          {
            id: 'mov-2',
            entity: 'movies',
            field: 'poster_url',
            currentUrl: 'test.jpg',
            fixType: 'regenerate_variants',
          },
        ],
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results[0].status).toBe('fixed');
  });

  it('returns failed for unknown entity/field', async () => {
    setupAdminAuth();
    const res = await POST(
      makeRequest({
        items: [
          {
            id: '1',
            entity: 'unknown',
            field: 'x',
            currentUrl: 'y',
            fixType: 'migrate_external',
          },
        ],
      }),
    );

    const data = await res.json();
    expect(data.results[0].status).toBe('failed');
    expect(data.results[0].error).toContain('Unknown entity/field');
  });

  it('handles upload errors gracefully', async () => {
    setupAdminAuth();
    mockUploadImageFromUrl.mockRejectedValue(new Error('Upload failed'));

    const res = await POST(
      makeRequest({
        items: [
          {
            id: 'mov-3',
            entity: 'movies',
            field: 'poster_url',
            currentUrl: 'https://image.tmdb.org/t/p/w500/fail.jpg',
            fixType: 'migrate_external',
          },
        ],
      }),
    );

    const data = await res.json();
    expect(data.results[0].status).toBe('failed');
    expect(data.results[0].error).toContain('Upload failed');
  });
});
