import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class {
    private body: unknown;
    constructor(_url: string, init?: { method?: string; body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : null;
    }
    async json() {
      return this.body;
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

function makeRequest(body: unknown): NextRequest {
  return new (require('next/server').NextRequest)('http://localhost/api/image-check', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/image-check', () => {
  beforeEach(() => {
    mockFetch.mockReset();
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
    const urls = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`);
    const res = await POST(makeRequest({ urls }));
    expect(res.status).toBe(400);
  });

  it('returns ok for accessible URLs', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST(makeRequest({ urls: ['https://example.com/img.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([{ url: 'https://example.com/img.jpg', status: 'ok' }]);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/img.jpg', { method: 'HEAD' });
  });

  it('returns missing for 404 URLs', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const res = await POST(makeRequest({ urls: ['https://example.com/missing.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([{ url: 'https://example.com/missing.jpg', status: 'missing' }]);
  });

  it('returns error for network failures', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const res = await POST(makeRequest({ urls: ['https://example.com/fail.jpg'] }));
    const data = await res.json();
    expect(data.results).toEqual([{ url: 'https://example.com/fail.jpg', status: 'error' }]);
  });

  it('handles multiple URLs in parallel', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('fail'));

    const urls = ['https://r2.dev/a.jpg', 'https://r2.dev/b.jpg', 'https://r2.dev/c.jpg'];
    const res = await POST(makeRequest({ urls }));
    const data = await res.json();
    expect(data.results).toHaveLength(3);
    expect(data.results[0].status).toBe('ok');
    expect(data.results[1].status).toBe('missing');
    expect(data.results[2].status).toBe('error');
  });
});
