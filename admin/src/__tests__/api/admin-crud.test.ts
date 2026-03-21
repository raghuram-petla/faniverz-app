import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

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

// @boundary Flexible mock that handles all table queries used by verifyAdminWithLanguages + admin-crud
const chainable = (data: unknown) => {
  const obj = {
    select: () => obj,
    eq: () => obj,
    in: () => obj,
    single: () => Promise.resolve({ data, error: null }),
    then: (fn: (v: { data: unknown; error: null }) => void) =>
      Promise.resolve({ data, error: null }).then(fn),
  };
  // Make chainable also directly thenable (for non-.single() queries)
  return new Proxy(obj, {
    get(target, prop) {
      if (prop === 'then')
        return (fn: (v: unknown) => void) => Promise.resolve({ data, error: null }).then(fn);
      return (target as Record<string, unknown>)[prop as string];
    },
  });
};

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'admin_user_roles') return chainable({ role_id: 'admin', status: 'active' });
      if (table === 'user_languages') return chainable([{ language_id: 'lang-te' }]);
      if (table === 'languages') return chainable([{ code: 'te' }]);
      // Default: movies, movie_images, etc.
      return chainable({ movie_id: 'm1', original_language: 'te' });
    },
    rpc: (...args: unknown[]) => {
      mockRpc(...args);
      return Promise.resolve({ data: { id: 'test-id', title: 'Test' }, error: null });
    },
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

  it('calls admin_crud RPC with correct params', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { table: 'movies', id: 'test-id', data: { title: 'Updated' } }),
    );
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('admin_crud', {
      p_admin_id: 'admin-1',
      p_table: 'movies',
      p_operation: 'update',
      p_data: { title: 'Updated' },
      p_id: 'test-id',
      p_filters: null,
    });
  });

  it('passes filters when id is not provided', async () => {
    await PATCH(
      makeRequest('PATCH', {
        table: 'movie_platforms',
        filters: { movie_id: 'm1', platform_id: 'aha' },
        data: { available_from: '2026-01-01' },
      }),
    );
    expect(mockRpc).toHaveBeenCalledWith('admin_crud', {
      p_admin_id: 'admin-1',
      p_table: 'movie_platforms',
      p_operation: 'update',
      p_data: { available_from: '2026-01-01' },
      p_id: null,
      p_filters: { movie_id: 'm1', platform_id: 'aha' },
    });
  });
});

describe('POST /api/admin-crud', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await POST(makeUnauthRequest({ table: 'movies', data: { title: 'New' } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when table or data is missing', async () => {
    const res = await POST(makeRequest('POST', { table: 'movies' }));
    expect(res.status).toBe(400);
  });

  it('calls admin_crud RPC with insert operation', async () => {
    const res = await POST(makeRequest('POST', { table: 'movies', data: { title: 'New' } }));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('admin_crud', {
      p_admin_id: 'admin-1',
      p_table: 'movies',
      p_operation: 'insert',
      p_data: { title: 'New' },
      p_id: null,
      p_filters: null,
    });
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

  it('rejects top-level entity delete by admin role', async () => {
    const res = await DELETE(makeRequest('DELETE', { table: 'movies', id: 'del-1' }));
    // @invariant admin role cannot hard-delete top-level entities — only root/super_admin can
    expect(res.status).toBe(403);
  });

  it('allows admin to delete child entities with matching language', async () => {
    const res = await DELETE(
      makeRequest('DELETE', {
        table: 'movie_production_houses',
        filters: { movie_id: 'm1', production_house_id: 'ph1' },
      }),
    );
    // @contract admin can delete movie child entities within their language scope
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('admin_crud', {
      p_admin_id: 'admin-1',
      p_table: 'movie_production_houses',
      p_operation: 'delete',
      p_data: null,
      p_id: null,
      p_filters: { movie_id: 'm1', production_house_id: 'ph1' },
    });
  });
});
