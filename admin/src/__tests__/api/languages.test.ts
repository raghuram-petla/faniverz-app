import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextResponseMock } from './test-utils';
import type { NextRequest } from 'next/server';

const mockVerifyAdmin = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        order: (...args: unknown[]) => mockOrder(...args),
      }),
    }),
  }),
}));

vi.mock('next/server', () => nextResponseMock);

import { GET } from '@/app/api/languages/route';

function makeRequest(authHeader = 'Bearer valid-token') {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue({ id: 'admin-1' });
});

describe('GET /api/languages', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns languages on success', async () => {
    const langs = [
      { id: '1', code: 'te', name: 'Telugu' },
      { id: '2', code: 'ta', name: 'Tamil' },
    ];
    mockOrder.mockResolvedValue({ data: langs, error: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(langs);
  });

  it('returns 500 when DB query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('DB error');
  });

  it('returns 500 on unexpected exception', async () => {
    mockVerifyAdmin.mockRejectedValue(new Error('boom'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
