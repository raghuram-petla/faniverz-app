import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockVerifyAdmin = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom: any = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdminCanMutate: (...args: unknown[]) => mockVerifyAdmin(...args),
  errorResponse: (_label: string, err: unknown) => ({
    body: { error: err instanceof Error ? err.message : 'manage-user failed' },
    status: 500,
    async json() {
      return this.body;
    },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('next/server', () => ({
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

import { POST } from '@/app/api/manage-user/route';

function makeRequest(body: Record<string, unknown>, authHeader?: string) {
  return {
    json: async () => body,
    headers: {
      get: (name: string) =>
        name === 'authorization' ? (authHeader ?? 'Bearer valid-token') : null,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockVerifyAdmin.mockReset();
  mockFrom.mockReset();
  mockUpdateUserById.mockReset();

  // Default: admin is authenticated
  mockVerifyAdmin.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@test.com' },
    role: 'admin',
  });
});

describe('POST /api/manage-user', () => {
  it('returns 401 when verifyAdmin returns null', async () => {
    mockVerifyAdmin.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ action: 'ban', userId: 'user-1' }));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when action is missing', async () => {
    const res = await POST(makeRequest({ userId: 'user-1' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing action or userId' });
  });

  it('returns 400 when userId is missing', async () => {
    const res = await POST(makeRequest({ action: 'ban' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing action or userId' });
  });

  it('successfully bans a user', async () => {
    mockUpdateUserById.mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ action: 'ban', userId: 'user-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true, action: 'banned' });

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      ban_duration: '87600h',
    });
  });

  it('successfully unbans a user', async () => {
    mockUpdateUserById.mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ action: 'unban', userId: 'user-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true, action: 'unbanned' });

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      ban_duration: 'none',
    });
  });

  it('successfully updates profile with allowed fields', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(
      makeRequest({
        action: 'update-profile',
        userId: 'user-1',
        fields: { display_name: 'New Name', bio: 'A bio', location: 'LA' },
      }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ success: true, action: 'updated' });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      display_name: 'New Name',
      bio: 'A bio',
      location: 'LA',
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('strips non-allowed fields from profile update', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(
      makeRequest({
        action: 'update-profile',
        userId: 'user-1',
        fields: {
          display_name: 'Safe Name',
          email: 'hack@evil.com',
          is_admin: true,
          role: 'superadmin',
        },
      }),
    );
    expect(res.status).toBe(200);

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).toHaveProperty('display_name', 'Safe Name');
    expect(updateArg).not.toHaveProperty('email');
    expect(updateArg).not.toHaveProperty('is_admin');
    expect(updateArg).not.toHaveProperty('role');
  });

  it('returns 400 when fields is missing on update-profile', async () => {
    const res = await POST(makeRequest({ action: 'update-profile', userId: 'user-1' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing fields' });
  });

  it('returns 400 when fields is not an object on update-profile', async () => {
    const res = await POST(
      makeRequest({ action: 'update-profile', userId: 'user-1', fields: 'not-an-object' }),
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing fields' });
  });

  it('returns 400 for unknown action', async () => {
    const res = await POST(makeRequest({ action: 'delete', userId: 'user-1' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Unknown action: delete' });
  });

  it('returns 500 when ban fails with supabase error', async () => {
    mockUpdateUserById.mockResolvedValueOnce({
      error: new Error('Auth service unavailable'),
    });

    const res = await POST(makeRequest({ action: 'ban', userId: 'user-1' }));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json).toEqual({ error: 'Auth service unavailable' });
  });

  it('returns 500 when unban fails with supabase error', async () => {
    mockUpdateUserById.mockResolvedValueOnce({
      error: new Error('Auth service unavailable'),
    });

    const res = await POST(makeRequest({ action: 'unban', userId: 'user-1' }));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json).toEqual({ error: 'Auth service unavailable' });
  });

  it('returns 500 when profile update fails with supabase error', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: new Error('Database connection failed'),
    });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(
      makeRequest({
        action: 'update-profile',
        userId: 'user-1',
        fields: { display_name: 'Name' },
      }),
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json).toEqual({ error: 'Database connection failed' });
  });
});
