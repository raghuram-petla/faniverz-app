import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextResponseMock } from './test-utils';
import type { NextRequest } from 'next/server';

const mockVerifyAdminWithRole = vi.fn();
const mockSelectEq = vi.fn();
const mockSingleRole = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdminWithRole: (...args: unknown[]) => mockVerifyAdminWithRole(...args),
  errorResponse: (label: string, err: unknown) => ({
    body: { error: err instanceof Error ? err.message : `${label} failed` },
    status: 500,
    async json() {
      return this.body;
    },
  }),
  unauthorizedResponse: () => ({
    body: { error: 'Unauthorized' },
    status: 401,
    async json() {
      return this.body;
    },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'admin_user_roles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSingleRole(),
            }),
          }),
        };
      }
      // admin_ph_assignments
      return {
        select: () => ({
          eq: (...args: unknown[]) => mockSelectEq(...args),
        }),
      };
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('next/server', () => nextResponseMock);

import { GET, POST } from '@/app/api/user-ph-assignments/route';

function makeGetRequest(userId?: string, authHeader = 'Bearer valid-token') {
  const url = userId
    ? `http://localhost/api/user-ph-assignments?userId=${userId}`
    : 'http://localhost/api/user-ph-assignments';
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function makePostRequest(body: Record<string, unknown>, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyAdminWithRole.mockResolvedValue({ user: { id: 'admin-1' }, role: 'root' });
});

describe('GET /api/user-ph-assignments', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminWithRole.mockResolvedValue(null);
    const res = await GET(makeGetRequest('user-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing userId parameter');
  });

  it('returns PH assignments on success', async () => {
    const assignments = [
      { production_house_id: 'ph-1', assigned_by: 'admin-1', created_at: '2026-01-01' },
    ];
    mockSelectEq.mockResolvedValue({ data: assignments, error: null });
    const res = await GET(makeGetRequest('user-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(assignments);
  });

  it('returns 500 when DB query fails', async () => {
    mockSelectEq.mockResolvedValue({ data: null, error: { message: 'Query failed' } });
    const res = await GET(makeGetRequest('user-1'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Query failed');
  });

  it('returns 500 on unexpected exception', async () => {
    mockVerifyAdminWithRole.mockRejectedValue(new Error('boom'));
    const res = await GET(makeGetRequest('user-1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/user-ph-assignments', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminWithRole.mockResolvedValue(null);
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-root/super_admin roles', async () => {
    mockVerifyAdminWithRole.mockResolvedValue({ user: { id: 'a1' }, role: 'admin' });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Only super admins');
  });

  it('allows super_admin role', async () => {
    mockVerifyAdminWithRole.mockResolvedValue({ user: { id: 'sa1' }, role: 'super_admin' });
    mockSingleRole.mockResolvedValue({ data: { role_id: 'production_house_admin' }, error: null });
    mockRpc.mockResolvedValue({ error: null });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await POST(makePostRequest({ productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing userId or productionHouseIds array');
  });

  it('returns 400 when productionHouseIds is not an array', async () => {
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: 'not-array' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when target user is not found', async () => {
    mockSingleRole.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Target user not found');
  });

  it('returns 400 when target user is not production_house_admin role', async () => {
    mockSingleRole.mockResolvedValue({ data: { role_id: 'admin' }, error: null });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('production_house_admin role users');
  });

  it('calls rpc with correct parameters on success', async () => {
    mockSingleRole.mockResolvedValue({ data: { role_id: 'production_house_admin' }, error: null });
    mockRpc.mockResolvedValue({ error: null });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1', 'ph2'] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('replace_user_ph_assignments', {
      p_user_id: 'u1',
      p_production_house_ids: ['ph1', 'ph2'],
      p_assigned_by: 'admin-1',
    });
  });

  it('returns 500 when rpc fails', async () => {
    mockSingleRole.mockResolvedValue({ data: { role_id: 'production_house_admin' }, error: null });
    mockRpc.mockResolvedValue({ error: new Error('RPC failed') });
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(500);
  });

  it('returns 500 on unexpected exception', async () => {
    mockVerifyAdminWithRole.mockRejectedValue(new Error('boom'));
    const res = await POST(makePostRequest({ userId: 'u1', productionHouseIds: ['ph1'] }));
    expect(res.status).toBe(500);
  });
});
