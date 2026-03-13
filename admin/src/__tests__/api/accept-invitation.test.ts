import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom: any = vi.fn();

const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('next/server', () => {
  return {
    NextRequest: class {
      private body: unknown;
      public headers: Map<string, string>;
      constructor(
        url: string,
        init?: { method?: string; body?: string; headers?: Record<string, string> },
      ) {
        this.body = init?.body ? JSON.parse(init.body) : null;
        this.headers = new Map(Object.entries(init?.headers ?? {}));
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
  };
});

import { POST } from '@/app/api/accept-invitation/route';

function makeRequest(body: Record<string, unknown>, authHeader?: string) {
  return {
    json: async () => body,
    headers: {
      get: (name: string) =>
        name === 'authorization' ? (authHeader ?? 'Bearer valid-token') : null,
    },
  } as unknown as NextRequest;
}

const INVITATION = {
  id: 'inv-1',
  email: 'user@test.com',
  role_id: 'admin',
  status: 'pending',
  invited_by: 'admin-1',
  production_house_ids: null,
  expires_at: '2099-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  mockFrom.mockReset();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@test.com' } },
    error: null,
  });
});

describe('POST /api/accept-invitation', () => {
  it('returns 401 when authorization header is missing', async () => {
    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }, ''));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when identity does not match', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'different-user', email: 'other@test.com' } },
      error: null,
    });

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json).toEqual({ error: 'Identity mismatch' });
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ userId: 'user-1' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing email or userId' });
  });

  it('returns 400 when userId is missing', async () => {
    const res = await POST(makeRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json).toEqual({ error: 'Missing email or userId' });
  });

  it('returns 404 when no valid invitation found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEqStatus = vi.fn().mockReturnValue({ gte: mockGte });
    const mockEqEmail = vi.fn().mockReturnValue({ eq: mockEqStatus });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEmail });

    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json).toEqual({ error: 'No valid invitation found' });
  });

  it('returns role=existing when user already has a role', async () => {
    // Mock for admin_invitations lookup
    const mockInvSingle = vi.fn().mockResolvedValue({ data: INVITATION, error: null });
    const mockInvLimit = vi.fn().mockReturnValue({ single: mockInvSingle });
    const mockInvOrder = vi.fn().mockReturnValue({ limit: mockInvLimit });
    const mockInvGte = vi.fn().mockReturnValue({ order: mockInvOrder });
    const mockInvEqStatus = vi.fn().mockReturnValue({ gte: mockInvGte });
    const mockInvEqEmail = vi.fn().mockReturnValue({ eq: mockInvEqStatus });
    const mockInvSelect = vi.fn().mockReturnValue({ eq: mockInvEqEmail });

    // Mock for admin_user_roles lookup (existing role)
    const mockRoleSingle = vi.fn().mockResolvedValue({ data: { id: 'role-1' }, error: null });
    const mockRoleEqUser = vi.fn().mockReturnValue({ maybeSingle: mockRoleSingle });
    const mockRoleSelect = vi.fn().mockReturnValue({ eq: mockRoleEqUser });

    // Mock for admin_invitations update (mark accepted)
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_invitations') {
        // First call is select, subsequent calls are update
        if (!mockFrom._invSelectUsed) {
          mockFrom._invSelectUsed = true;
          return { select: mockInvSelect };
        }
        return { update: mockUpdate };
      }
      if (table === 'admin_user_roles') {
        return { select: mockRoleSelect };
      }
      return {};
    });
    mockFrom._invSelectUsed = false;

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ role: 'existing' });

    // Verify invitation was marked as accepted
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
  });

  it('creates role assignment and marks invitation accepted for valid invitation', async () => {
    // Mock for admin_invitations lookup
    const mockInvSingle = vi.fn().mockResolvedValue({ data: INVITATION, error: null });
    const mockInvLimit = vi.fn().mockReturnValue({ single: mockInvSingle });
    const mockInvOrder = vi.fn().mockReturnValue({ limit: mockInvLimit });
    const mockInvGte = vi.fn().mockReturnValue({ order: mockInvOrder });
    const mockInvEqStatus = vi.fn().mockReturnValue({ gte: mockInvGte });
    const mockInvEqEmail = vi.fn().mockReturnValue({ eq: mockInvEqStatus });
    const mockInvSelect = vi.fn().mockReturnValue({ eq: mockInvEqEmail });

    // Mock for admin_user_roles select (no existing role)
    const mockRoleSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockRoleEqUser = vi.fn().mockReturnValue({ maybeSingle: mockRoleSingle });
    const mockRoleSelect = vi.fn().mockReturnValue({ eq: mockRoleEqUser });

    // Mock for admin_user_roles insert
    const mockRoleInsert = vi.fn().mockResolvedValue({ error: null });

    // Mock for admin_invitations update (mark accepted)
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    let invCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_invitations') {
        invCallCount++;
        if (invCallCount === 1) return { select: mockInvSelect };
        return { update: mockUpdate };
      }
      if (table === 'admin_user_roles') {
        // First call is select (check existing), second is insert
        if (!mockFrom._roleInsertUsed) {
          mockFrom._roleInsertUsed = true;
          return { select: mockRoleSelect };
        }
        return { insert: mockRoleInsert };
      }
      return {};
    });
    mockFrom._roleInsertUsed = false;

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ role: 'admin' });

    // Verify role was inserted
    expect(mockRoleInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      role_id: 'admin',
      assigned_by: 'admin-1',
    });

    // Verify invitation was marked as accepted
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('creates PH assignments when invitation has production_house_ids', async () => {
    const invitationWithPh = {
      ...INVITATION,
      production_house_ids: ['ph-1', 'ph-2'],
    };

    // Mock for admin_invitations lookup
    const mockInvSingle = vi.fn().mockResolvedValue({ data: invitationWithPh, error: null });
    const mockInvLimit = vi.fn().mockReturnValue({ single: mockInvSingle });
    const mockInvOrder = vi.fn().mockReturnValue({ limit: mockInvLimit });
    const mockInvGte = vi.fn().mockReturnValue({ order: mockInvOrder });
    const mockInvEqStatus = vi.fn().mockReturnValue({ gte: mockInvGte });
    const mockInvEqEmail = vi.fn().mockReturnValue({ eq: mockInvEqStatus });
    const mockInvSelect = vi.fn().mockReturnValue({ eq: mockInvEqEmail });

    // Mock for admin_user_roles select (no existing role)
    const mockRoleSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockRoleEqUser = vi.fn().mockReturnValue({ maybeSingle: mockRoleSingle });
    const mockRoleSelect = vi.fn().mockReturnValue({ eq: mockRoleEqUser });

    // Mock for admin_user_roles insert
    const mockRoleInsert = vi.fn().mockResolvedValue({ error: null });

    // Mock for admin_ph_assignments insert
    const mockPhInsert = vi.fn().mockResolvedValue({ error: null });

    // Mock for admin_invitations update (mark accepted)
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    let invCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_invitations') {
        invCallCount++;
        if (invCallCount === 1) return { select: mockInvSelect };
        return { update: mockUpdate };
      }
      if (table === 'admin_user_roles') {
        if (!mockFrom._roleInsertUsed) {
          mockFrom._roleInsertUsed = true;
          return { select: mockRoleSelect };
        }
        return { insert: mockRoleInsert };
      }
      if (table === 'admin_ph_assignments') {
        return { insert: mockPhInsert };
      }
      return {};
    });
    mockFrom._roleInsertUsed = false;

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ role: 'admin' });

    // Verify PH assignments were created
    expect(mockPhInsert).toHaveBeenCalledWith([
      { user_id: 'user-1', production_house_id: 'ph-1', assigned_by: 'admin-1' },
      { user_id: 'user-1', production_house_id: 'ph-2', assigned_by: 'admin-1' },
    ]);
  });

  it('returns 500 when role insertion fails', async () => {
    // Mock for admin_invitations lookup
    const mockInvSingle = vi.fn().mockResolvedValue({ data: INVITATION, error: null });
    const mockInvLimit = vi.fn().mockReturnValue({ single: mockInvSingle });
    const mockInvOrder = vi.fn().mockReturnValue({ limit: mockInvLimit });
    const mockInvGte = vi.fn().mockReturnValue({ order: mockInvOrder });
    const mockInvEqStatus = vi.fn().mockReturnValue({ gte: mockInvGte });
    const mockInvEqEmail = vi.fn().mockReturnValue({ eq: mockInvEqStatus });
    const mockInvSelect = vi.fn().mockReturnValue({ eq: mockInvEqEmail });

    // Mock for admin_user_roles select (no existing role)
    const mockRoleSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockRoleEqUser = vi.fn().mockReturnValue({ maybeSingle: mockRoleSingle });
    const mockRoleSelect = vi.fn().mockReturnValue({ eq: mockRoleEqUser });

    // Mock for admin_user_roles insert (fails)
    const mockRoleInsert = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_invitations') {
        return { select: mockInvSelect };
      }
      if (table === 'admin_user_roles') {
        if (!mockFrom._roleInsertUsed) {
          mockFrom._roleInsertUsed = true;
          return { select: mockRoleSelect };
        }
        return { insert: mockRoleInsert };
      }
      return {};
    });
    mockFrom._roleInsertUsed = false;

    const res = await POST(makeRequest({ email: 'user@test.com', userId: 'user-1' }));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json).toEqual({ error: 'Failed to assign role' });
  });
});
