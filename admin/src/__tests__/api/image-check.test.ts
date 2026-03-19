import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

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

vi.mock('next/server', () => ({
  NextRequest: class {
    private body: unknown;
    private _headers: Map<string, string>;
    constructor(
      _url: string,
      init?: { method?: string; body?: string; headers?: Record<string, string> },
    ) {
      this.body = init?.body ? JSON.parse(init.body) : null;
      this._headers = new Map(Object.entries(init?.headers ?? {}));
    }
    async json() {
      return this.body;
    }
    get headers() {
      return {
        get: (name: string) => this._headers.get(name) ?? null,
      };
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

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { POST } from '@/app/api/image-check/route';
import type { NextRequest } from 'next/server';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token'): NextRequest {
  return new (require('next/server').NextRequest)('http://localhost/api/image-check', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: authHeader },
  }) as NextRequest;
}

describe('POST /api/image-check', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ urls: ['https://r2.cloudflarestorage.com/a.jpg'] }, ''));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    const res = await POST(makeRequest({ urls: ['https://r2.cloudflarestorage.com/a.jpg'] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when urls is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when urls is empty', async () => {
    const res = await POST(makeRequest({ urls: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when urls contains non-strings', async () => {
    const res = await POST(makeRequest({ urls: [123] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 10 URLs', async () => {
    const urls = Array.from({ length: 11 }, (_, i) => `https://r2.cloudflarestorage.com/${i}.jpg`);
    const res = await POST(makeRequest({ urls }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for URLs from disallowed domains', async () => {
    const res = await POST(makeRequest({ urls: ['https://evil.com/malicious.jpg'] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('allowed CDN domains');
  });

  it('returns 400 when any URL is from a disallowed domain', async () => {
    const res = await POST(
      makeRequest({
        urls: ['https://cdn.faniverz.com/ok.jpg', 'https://evil.com/bad.jpg'],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('allows URLs from faniverz.com CDN', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://cdn.faniverz.com/img.jpg'] }));
    expect(res.status).toBe(200);
  });

  it('allows TMDB image URLs (fallback when R2 not configured)', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://image.tmdb.org/t/p/w500/abc123.jpg'] }));
    expect(res.status).toBe(200);
  });

  it('allows local storage URLs in dev mode', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    try {
      mockFetch.mockResolvedValue({ ok: true });
      const res = await POST(
        makeRequest({ urls: ['http://10.0.0.23:9000/faniverz-movie-posters/img.jpg'] }),
      );
      expect(res.status).toBe(200);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    }
  });

  it('allows localhost URLs in dev mode', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    try {
      mockFetch.mockResolvedValue({ ok: true });
      const res = await POST(
        makeRequest({ urls: ['http://localhost:9000/faniverz-movie-posters/img.jpg'] }),
      );
      expect(res.status).toBe(200);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    }
  });

  it('rejects LAN URLs when not in dev mode', async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
    try {
      const res = await POST(
        makeRequest({ urls: ['http://10.0.0.23:9000/faniverz-movie-posters/img.jpg'] }),
      );
      expect(res.status).toBe(400);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    }
  });

  it('returns ok for accessible URLs', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://cdn.faniverz.com/img.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([{ url: 'https://cdn.faniverz.com/img.jpg', status: 'ok' }]);
    expect(mockFetch).toHaveBeenCalledWith('https://cdn.faniverz.com/img.jpg', {
      method: 'HEAD',
    });
  });

  it('returns missing for 404 URLs', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const res = await POST(makeRequest({ urls: ['https://cdn.faniverz.com/missing.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([
      { url: 'https://cdn.faniverz.com/missing.jpg', status: 'missing' },
    ]);
  });

  it('returns error for network failures', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const res = await POST(makeRequest({ urls: ['https://cdn.faniverz.com/fail.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([{ url: 'https://cdn.faniverz.com/fail.jpg', status: 'error' }]);
  });

  it('handles multiple URLs in parallel', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('fail'));

    const urls = [
      'https://cdn.faniverz.com/a.jpg',
      'https://cdn.faniverz.com/b.jpg',
      'https://cdn.faniverz.com/c.jpg',
    ];
    const res = await POST(makeRequest({ urls }));
    const data = await res.json();
    expect(data.results).toHaveLength(3);
    expect(data.results[0].status).toBe('ok');
    expect(data.results[1].status).toBe('missing');
    expect(data.results[2].status).toBe('error');
  });
});
