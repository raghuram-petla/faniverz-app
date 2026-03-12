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
        urls: ['https://r2.cloudflarestorage.com/ok.jpg', 'https://evil.com/bad.jpg'],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('allows URLs from r2.cloudflarestorage.com', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://abc.r2.cloudflarestorage.com/img.jpg'] }));
    expect(res.status).toBe(200);
  });

  it('allows URLs from image.tmdb.org', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://image.tmdb.org/t/p/w500/poster.jpg'] }));
    expect(res.status).toBe(200);
  });

  it('allows URLs from pub- CDN domains', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://pub-abc123.r2.dev/img.jpg'] }));
    expect(res.status).toBe(200);
  });

  it('returns ok for accessible URLs', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://r2.cloudflarestorage.com/img.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([
      { url: 'https://r2.cloudflarestorage.com/img.jpg', status: 'ok' },
    ]);
    expect(mockFetch).toHaveBeenCalledWith('https://r2.cloudflarestorage.com/img.jpg', {
      method: 'HEAD',
    });
  });

  it('returns missing for 404 URLs', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const res = await POST(makeRequest({ urls: ['https://r2.cloudflarestorage.com/missing.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([
      { url: 'https://r2.cloudflarestorage.com/missing.jpg', status: 'missing' },
    ]);
  });

  it('returns error for network failures', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const res = await POST(makeRequest({ urls: ['https://r2.cloudflarestorage.com/fail.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([
      { url: 'https://r2.cloudflarestorage.com/fail.jpg', status: 'error' },
    ]);
  });

  it('handles multiple URLs in parallel', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('fail'));

    const urls = [
      'https://r2.cloudflarestorage.com/a.jpg',
      'https://r2.cloudflarestorage.com/b.jpg',
      'https://r2.cloudflarestorage.com/c.jpg',
    ];
    const res = await POST(makeRequest({ urls }));
    const data = await res.json();
    expect(data.results).toHaveLength(3);
    expect(data.results[0].status).toBe('ok');
    expect(data.results[1].status).toBe('missing');
    expect(data.results[2].status).toBe('error');
  });
});
