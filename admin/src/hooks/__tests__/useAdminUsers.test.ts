import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Build chainable supabase mock
const mockFrom = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
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

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

// Build a supabase chain that resolves .order() with given value
function makeRolesChain(resolvedValue: unknown) {
  const order = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn().mockReturnValue({ order });
  return { select };
}

// Build a supabase chain that resolves .select() directly (PH query)
function makePhChain(resolvedValue: unknown) {
  const select = vi.fn().mockResolvedValue(resolvedValue);
  return { select };
}

// Build a supabase chain that resolves .order() from select → order
function makeInvitationsChain(resolvedValue: unknown) {
  const order = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn().mockReturnValue({ order });
  return { select };
}

describe('useAdminUserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('fetches role data and PH assignments, merges them', async () => {
    const roleData = [
      {
        id: 'row-1',
        user_id: 'user-1',
        role_id: 'admin',
        assigned_by: null,
        created_at: '2025-01-01',
        status: 'active',
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
        profile: { id: 'user-1', display_name: 'Alice', email: 'alice@test.com', avatar_url: null },
      },
    ];
    const phData = [
      {
        user_id: 'user-1',
        id: 'ph-1',
        production_house: { id: 'ph-1', name: 'Studio', logo_url: null },
      },
    ];

    mockFrom
      .mockReturnValueOnce(makeRolesChain({ data: roleData, error: null }))
      .mockReturnValueOnce(makePhChain({ data: phData, error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminUserList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const users = result.current.data!;
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('alice@test.com');
    expect(users[0].role_id).toBe('admin');
    expect(users[0].ph_assignments).toHaveLength(1);
  });

  it('throws when roles query fails', async () => {
    mockFrom.mockReturnValueOnce(makeRolesChain({ data: null, error: { message: 'DB error' } }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminUserList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('defaults status to active when status field is missing', async () => {
    const roleData = [
      {
        id: 'row-1',
        user_id: 'user-1',
        role_id: 'admin',
        assigned_by: null,
        created_at: '2025-01-01',
        status: undefined,
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
        profile: { id: 'user-1', display_name: 'Bob', email: 'bob@test.com', avatar_url: null },
      },
    ];
    mockFrom
      .mockReturnValueOnce(makeRolesChain({ data: roleData, error: null }))
      .mockReturnValueOnce(makePhChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminUserList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].status).toBe('active');
  });

  it('assigns empty ph_assignments when user has no PH links', async () => {
    const roleData = [
      {
        id: 'row-1',
        user_id: 'user-2',
        role_id: 'viewer',
        assigned_by: null,
        created_at: '2025-01-01',
        status: 'active',
        blocked_by: null,
        blocked_at: null,
        blocked_reason: null,
        profile: { id: 'user-2', display_name: 'Carol', email: 'carol@test.com', avatar_url: null },
      },
    ];
    mockFrom
      .mockReturnValueOnce(makeRolesChain({ data: roleData, error: null }))
      .mockReturnValueOnce(makePhChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminUserList(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].ph_assignments).toEqual([]);
  });
});

describe('useAdminInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns invitations', async () => {
    const invitations = [
      { id: 'inv-1', email: 'test@test.com', status: 'pending', role_id: 'admin' },
    ];
    mockFrom.mockReturnValueOnce(makeInvitationsChain({ data: invitations, error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminInvitations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(invitations);
  });

  it('errors when query fails', async () => {
    mockFrom.mockReturnValueOnce(makeInvitationsChain({ data: null, error: { message: 'fail' } }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminInvitations(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useInviteAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes email to lowercase before insert', async () => {
    const insertedInvitation = { id: 'inv-1', email: 'alice@test.com' };
    const singleFn = vi.fn().mockResolvedValue({ data: insertedInvitation, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValueOnce({ insert: insertFn });
    // Invalidation fetches
    mockFrom.mockReturnValue(makeInvitationsChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInviteAdmin(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'ALICE@TEST.COM',
        role_id: 'admin',
        invited_by: 'admin-1',
        production_house_ids: ['ph-1'],
      });
    });

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ email: 'alice@test.com' }));
  });

  it('uses empty array for production_house_ids when not provided', async () => {
    const insertedInvitation = { id: 'inv-1', email: 'test@test.com' };
    const singleFn = vi.fn().mockResolvedValue({ data: insertedInvitation, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValueOnce({ insert: insertFn });
    mockFrom.mockReturnValue(makeInvitationsChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInviteAdmin(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@test.com',
        role_id: 'admin',
        invited_by: 'admin-1',
      });
    });

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ production_house_ids: [] }));
  });
});

describe('useRevokeInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('updates invitation status to revoked', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });
    mockFrom.mockReturnValue(makeInvitationsChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('inv-1');
    });

    expect(updateFn).toHaveBeenCalledWith({ status: 'revoked' });
    expect(eqFn).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('calls alert on error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('inv-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('DB error'));
  });
});

describe('useRevokeAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('deletes PH assignments then role assignment', async () => {
    const phEqFn = vi.fn().mockResolvedValue({ error: null });
    const phDeleteFn = vi.fn().mockReturnValue({ eq: phEqFn });

    const roleEqFn = vi.fn().mockResolvedValue({ error: null });
    const roleDeleteFn = vi.fn().mockReturnValue({ eq: roleEqFn });

    mockFrom
      .mockReturnValueOnce({ delete: phDeleteFn })
      .mockReturnValueOnce({ delete: roleDeleteFn });
    // Invalidation
    mockFrom.mockReturnValue(makeRolesChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevokeAdmin(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('user-1');
    });

    expect(phEqFn).toHaveBeenCalledWith('user_id', 'user-1');
    expect(roleEqFn).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('throws descriptive error when PH delete fails', async () => {
    const phEqFn = vi.fn().mockResolvedValue({ error: { message: 'PH fail' } });
    const phDeleteFn = vi.fn().mockReturnValue({ eq: phEqFn });
    mockFrom.mockReturnValueOnce({ delete: phDeleteFn });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevokeAdmin(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('PH assignment delete failed'),
      ),
    );
  });
});

describe('useUpdateAdminRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('updates role_id for user', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });
    mockFrom.mockReturnValue(makeRolesChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateAdminRole(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: 'user-1', roleId: 'admin' });
    });

    expect(updateFn).toHaveBeenCalledWith({ role_id: 'admin' });
    expect(eqFn).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('calls alert on error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'Update failed' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateAdminRole(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ userId: 'user-1', roleId: 'admin' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Update failed'));
  });
});

describe('useBlockAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('updates status to blocked with blocked_by and reason', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });
    mockFrom.mockReturnValue(makeRolesChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBlockAdmin(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        userId: 'user-1',
        blockedBy: 'admin-1',
        reason: 'Violation',
      });
    });

    expect(updateFn).toHaveBeenCalledWith({
      status: 'blocked',
      blocked_by: 'admin-1',
      blocked_reason: 'Violation',
    });
  });

  it('calls alert on error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'Block failed' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBlockAdmin(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          userId: 'user-1',
          blockedBy: 'admin-1',
          reason: 'Test',
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Block failed'));
  });
});

describe('useUnblockAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('sets status to active for user', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });
    mockFrom.mockReturnValue(makeRolesChain({ data: [], error: null }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnblockAdmin(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('user-1');
    });

    expect(updateFn).toHaveBeenCalledWith({
      status: 'active',
      blocked_by: null,
      blocked_reason: null,
      blocked_at: null,
    });
    expect(eqFn).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('calls alert with fallback message when error has no message', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: '' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnblockAdmin(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
  });
});
