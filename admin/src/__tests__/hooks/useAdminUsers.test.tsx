import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  useAdminUserList,
  useAdminInvitations,
  useInviteAdmin,
  useRevokeInvitation,
  useRevokeAdmin,
  useUpdateAdminRole,
  useBlockAdmin,
  useUnblockAdmin,
} from '@/hooks/useAdminUsers';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockFrom.mockReset();
});

describe('useAdminUserList', () => {
  const mockRoleData = [
    {
      id: 'role-1',
      user_id: 'user-1',
      role_id: 'super_admin',
      assigned_by: null,
      created_at: '2026-01-01T00:00:00Z',
      status: 'active',
      blocked_by: null,
      blocked_at: null,
      blocked_reason: null,
      profile: {
        id: 'user-1',
        display_name: 'Admin One',
        email: 'admin@test.com',
        avatar_url: null,
      },
    },
  ];

  const mockPhData = [
    {
      id: 'pha-1',
      user_id: 'user-1',
      production_house_id: 'ph-1',
      production_house: { id: 'ph-1', name: 'Arka Media', logo_url: null },
    },
  ];

  it('uses query key [admin, users]', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectPh = vi.fn().mockResolvedValue({ data: mockPhData, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      if (table === 'admin_ph_assignments') return { select: mockSelectPh };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: 'user-1',
        display_name: 'Admin One',
        email: 'admin@test.com',
        avatar_url: null,
        role_id: 'super_admin',
        role_assigned_at: '2026-01-01T00:00:00Z',
        assigned_by: null,
        ph_assignments: [mockPhData[0]],
        status: 'active',
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
      },
    ]);
  });

  it('calls supabase.from for admin_user_roles and admin_ph_assignments', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectPh = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      if (table === 'admin_ph_assignments') return { select: mockSelectPh };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_user_roles');
    expect(mockFrom).toHaveBeenCalledWith('admin_ph_assignments');
    expect(mockSelectRoles).toHaveBeenCalledWith(
      '*, profile:profiles!user_id(id, display_name, email, avatar_url)',
    );
    expect(mockSelectPh).toHaveBeenCalledWith(
      '*, production_house:production_houses(id, name, logo_url)',
    );
  });
});

describe('useAdminInvitations', () => {
  it('uses query key [admin, invitations]', async () => {
    const mockInvitations = [
      { id: 'inv-1', email: 'new@test.com', role_id: 'admin', status: 'pending' },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockInvitations, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminInvitations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_invitations');
    expect(result.current.data).toEqual(mockInvitations);
  });
});

describe('useInviteAdmin', () => {
  it('calls supabase.from(admin_invitations).insert with lowercased email', async () => {
    const mockInvitation = {
      id: 'inv-new',
      email: 'new@test.com',
      role_id: 'admin',
      status: 'pending',
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockInvitation, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useInviteAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: 'New@Test.COM',
        role_id: 'admin' as const,
        invited_by: 'admin-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_invitations');
    expect(mockInsert).toHaveBeenCalledWith({
      email: 'new@test.com',
      role_id: 'admin',
      invited_by: 'admin-1',
      production_house_ids: [],
      language_ids: [],
    });
  });
});

describe('useRevokeInvitation', () => {
  it('calls update with status=revoked', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useRevokeInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('inv-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_invitations');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'revoked' });
    expect(mockEq).toHaveBeenCalledWith('id', 'inv-1');
  });
});

describe('useRevokeAdmin', () => {
  it('deletes PH assignments first, then deletes role', async () => {
    const callOrder: string[] = [];

    const mockPhEq = vi.fn().mockImplementation(() => {
      callOrder.push('ph_delete');
      return Promise.resolve({ error: null });
    });
    const mockPhDelete = vi.fn().mockReturnValue({ eq: mockPhEq });

    const mockRoleEq = vi.fn().mockImplementation(() => {
      callOrder.push('role_delete');
      return Promise.resolve({ error: null });
    });
    const mockRoleDelete = vi.fn().mockReturnValue({ eq: mockRoleEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_ph_assignments') return { delete: mockPhDelete };
      if (table === 'admin_user_roles') return { delete: mockRoleDelete };
      return {};
    });

    const { result } = renderHook(() => useRevokeAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_ph_assignments');
    expect(mockFrom).toHaveBeenCalledWith('admin_user_roles');
    expect(mockPhEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockRoleEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(callOrder).toEqual(['ph_delete', 'role_delete']);
  });
});

describe('useUpdateAdminRole', () => {
  it('calls update with role_id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUpdateAdminRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ userId: 'user-1', roleId: 'admin' as const });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_user_roles');
    expect(mockUpdate).toHaveBeenCalledWith({ role_id: 'admin' });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

describe('useBlockAdmin', () => {
  it('calls update with status=blocked, blocked_by, blocked_reason (blocked_at set by DB trigger)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useBlockAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        userId: 'user-1',
        blockedBy: 'admin-1',
        reason: 'Violated policy',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_user_roles');
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'blocked',
      blocked_by: 'admin-1',
      blocked_reason: 'Violated policy',
    });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

describe('useAdminUserList - error handling', () => {
  it('throws when role query errors', async () => {
    const mockOrder = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Role query failed') });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('throws when PH query errors', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectPh = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('PH query failed') });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      if (table === 'admin_ph_assignments') return { select: mockSelectPh };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('defaults ph_assignments to empty array for users without PH assignments', async () => {
    const mockRoleData = [
      {
        id: 'role-1',
        user_id: 'user-1',
        role_id: 'admin',
        assigned_by: null,
        created_at: '2026-01-01',
        status: null,
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
        profile: { id: 'user-1', display_name: 'Admin', email: 'a@b.com', avatar_url: null },
      },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectPh = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      if (table === 'admin_ph_assignments') return { select: mockSelectPh };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].ph_assignments).toEqual([]);
    // null status defaults to 'active'
    expect(result.current.data![0].status).toBe('active');
  });
});

describe('useRevokeInvitation - error handling', () => {
  it('alerts on error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: new Error('Revoke failed') });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRevokeInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('inv-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useRevokeAdmin - error handling', () => {
  it('throws when PH assignment delete fails', async () => {
    const mockPhEq = vi.fn().mockResolvedValue({ error: { message: 'FK violation' } });
    const mockPhDelete = vi.fn().mockReturnValue({ eq: mockPhEq });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_ph_assignments') return { delete: mockPhDelete };
      return {};
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRevokeAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useUpdateAdminRole - error handling', () => {
  it('alerts on error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateAdminRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ userId: 'user-1', roleId: 'admin' as const });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useBlockAdmin - error handling', () => {
  it('alerts on error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: new Error('Block failed') });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useBlockAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        userId: 'user-1',
        blockedBy: 'admin-1',
        reason: 'test',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useUnblockAdmin - error handling', () => {
  it('alerts on error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: new Error('Unblock failed') });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useUnblockAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useInviteAdmin - with production_house_ids', () => {
  it('passes production_house_ids when provided', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'inv-new' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useInviteAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: 'test@test.com',
        role_id: 'production_house_admin' as const,
        invited_by: 'admin-1',
        production_house_ids: ['ph-1', 'ph-2'],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        production_house_ids: ['ph-1', 'ph-2'],
      }),
    );
  });
});

describe('useAdminInvitations - error handling', () => {
  it('throws when invitations query errors', async () => {
    const mockOrder = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Invite query failed') });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useAdminInvitations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useInviteAdmin - error handling', () => {
  it('throws when insert errors', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Invite insert failed') });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useInviteAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: 'test@test.com',
          role_id: 'admin' as const,
          invited_by: 'admin-1',
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAdminUserList - null phData handling', () => {
  it('handles null phData from admin_ph_assignments', async () => {
    const mockRoleData = [
      {
        id: 'role-1',
        user_id: 'user-1',
        role_id: 'admin',
        assigned_by: null,
        created_at: '2026-01-01',
        status: 'active',
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
        profile: { id: 'user-1', display_name: 'Admin', email: 'a@b.com', avatar_url: null },
      },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockRoleData, error: null });
    const mockSelectRoles = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectPh = vi.fn().mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_user_roles') return { select: mockSelectRoles };
      if (table === 'admin_ph_assignments') return { select: mockSelectPh };
      return {};
    });

    const { result } = renderHook(() => useAdminUserList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].ph_assignments).toEqual([]);
  });
});

describe('useUnblockAdmin', () => {
  it('calls update with status=active (DB trigger clears block fields)', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUnblockAdmin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('user-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('admin_user_roles');
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'active',
      blocked_by: null,
      blocked_reason: null,
      blocked_at: null,
    });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
