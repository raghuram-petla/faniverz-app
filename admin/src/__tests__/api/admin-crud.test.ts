import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockUpdateFn = vi.fn();
const mockInsertFn = vi.fn();
const mockDeleteFn = vi.fn();

// Build chainable query mock — supports .eq(), .select(), .single(), and direct await
function chainable(finalResult: unknown) {
  const makeProxy = (): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Make it thenable so `await query` resolves to finalResult
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => resolve(finalResult);
          }
          if (prop === 'single' || prop === 'maybeSingle') {
            return () => Promise.resolve(finalResult);
          }
          // Any other method returns a new chainable proxy
          return () => makeProxy();
        },
      },
    );
  return makeProxy();
}

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
      // For verifyAdmin
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role_id: 'admin', status: 'active' }, error: null }),
        }),
      }),
      // For mutations
      update: (...args: unknown[]) => {
        mockUpdateFn(...args);
        return chainable({ data: { id: 'test-id', name: 'Updated' }, error: null });
      },
      insert: (...args: unknown[]) => {
        mockInsertFn(...args);
        return chainable({ data: { id: 'new-id', name: 'Created' }, error: null });
      },
      delete: (...args: unknown[]) => {
        mockDeleteFn(...args);
        return chainable({ error: null });
      },
    }),
  }),
}));

import { PATCH, POST, DELETE } from '@/app/api/admin-crud/route';

function makeRequest(method: string, body: Record<string, unknown>): NextRequest {
  return {
    headers: { get: () => 'Bearer valid-token' },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function makeUnauthRequest(body: Record<string, unknown>): NextRequest {
  return {
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
});

describe('PATCH /api/admin-crud', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await PATCH(makeUnauthRequest({ table: 'movies', id: '1', data: { title: 'X' } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when table or id or data is missing', async () => {
    const res = await PATCH(makeRequest('PATCH', { table: 'movies' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 for disallowed tables', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { table: 'profiles', id: '1', data: { name: 'X' } }),
    );
    expect(res.status).toBe(403);
  });

  it('updates and returns the row for allowed tables', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { table: 'movies', id: 'test-id', data: { title: 'Updated' } }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdateFn).toHaveBeenCalledWith({ title: 'Updated' });
  });
});

describe('POST /api/admin-crud', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await POST(makeUnauthRequest({ table: 'movies', data: { title: 'New' } }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for disallowed tables', async () => {
    const res = await POST(makeRequest('POST', { table: 'profiles', data: { name: 'X' } }));
    expect(res.status).toBe(403);
  });

  it('inserts and returns the row for allowed tables', async () => {
    const res = await POST(makeRequest('POST', { table: 'movies', data: { title: 'New' } }));
    expect(res.status).toBe(200);
    expect(mockInsertFn).toHaveBeenCalledWith({ title: 'New' });
  });
});

describe('DELETE /api/admin-crud', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await DELETE(makeUnauthRequest({ table: 'movies', id: '1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when both id and filters are missing', async () => {
    const res = await DELETE(makeRequest('DELETE', { table: 'movies' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 for disallowed tables', async () => {
    const res = await DELETE(makeRequest('DELETE', { table: 'profiles', id: '1' }));
    expect(res.status).toBe(403);
  });

  it('deletes by id for allowed tables', async () => {
    const res = await DELETE(makeRequest('DELETE', { table: 'movies', id: 'del-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it('accepts filters for composite-key deletes', async () => {
    const res = await DELETE(
      makeRequest('DELETE', {
        table: 'movie_production_houses',
        filters: { movie_id: 'm1', production_house_id: 'ph1' },
      }),
    );
    expect(res.status).toBe(200);
  });
});
