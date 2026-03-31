import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

global.fetch = mockFetch;

import {
  useAdminEndUsers,
  useBanUser,
  useUnbanUser,
  useUpdateEndUserProfile,
} from '@/hooks/useAdminEndUsers';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

// Build a chainable query: .select().order().range()
function makeProfilesChain(resolvedValue: unknown) {
  const range = vi.fn().mockResolvedValue(resolvedValue);
  const order = vi.fn().mockReturnValue({ range });
  const inFn = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ order, in: inFn });
  return { select };
}

describe('useAdminEndUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('fetches end users without search via paginated query', async () => {
    const users = [{ id: 'u-1', display_name: 'Alice', email: 'alice@test.com' }];
    mockFrom.mockReturnValueOnce(makeProfilesChain({ data: users, error: null, count: 1 }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
    expect(result.current.data?.totalCount).toBe(1);
    // No RPC call when search is empty
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('uses default page size of 50 without search', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '', page: 0 }), { wrapper: Wrapper });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
  });

  it('uses custom pageSize', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '', page: 0, pageSize: 10 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    expect(rangeMock).toHaveBeenCalledWith(0, 9);
  });

  it('uses page offset correctly', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '', page: 2, pageSize: 10 }), { wrapper: Wrapper });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    expect(rangeMock).toHaveBeenCalledWith(20, 29);
  });

  it('calls search_profiles RPC when search is non-empty', async () => {
    // Phase 1a: search_profiles RPC
    mockRpc.mockResolvedValue({ data: [{ id: 'u-1' }], error: null });
    // Phase 1b: email ILIKE — from('profiles').select('id').ilike().limit()
    const emailIlikeMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const emailLimitMock = vi.fn().mockReturnValue(emailIlikeMock);
    // Phase 2: fetch full profiles — from('profiles').select(...).in().order().range()
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const inMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectPhase2Mock = vi.fn().mockReturnValue({ in: inMock });
    // Email ILIKE chain: select().ilike().limit()
    const ilikeMock = vi
      .fn()
      .mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const selectEmailMock = vi.fn().mockReturnValue({ ilike: ilikeMock });

    mockFrom
      .mockReturnValueOnce({ select: selectEmailMock }) // email ILIKE
      .mockReturnValueOnce({ select: selectPhase2Mock }); // phase 2

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: 'alice', page: 0 }), { wrapper: Wrapper });

    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith(
      'search_profiles',
      expect.objectContaining({
        search_term: 'alice',
      }),
    );
  });

  it('returns empty result when search finds no matches', async () => {
    // RPC returns no IDs, email ILIKE returns no IDs
    mockRpc.mockResolvedValue({ data: [], error: null });
    const ilikeMock = vi
      .fn()
      .mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const selectEmailMock = vi.fn().mockReturnValue({ ilike: ilikeMock });
    mockFrom.mockReturnValueOnce({ select: selectEmailMock });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminEndUsers({ search: 'zzznomatch', page: 0 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toEqual([]);
    expect(result.current.data?.totalCount).toBe(0);
  });

  it('throws when no-search query fails', async () => {
    const rangeMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns totalCount=0 when count is null', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: null });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalCount).toBe(0);
  });
});

describe('useBanUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });
  });

  it('calls POST /api/manage-user with action=ban', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    mockFrom.mockReturnValue(makeProfilesChain({ data: [], error: null, count: 0 }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('user-1');
    });

    const postCall = mockFetch.mock.calls.find((c) => c[0] === '/api/manage-user');
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1].body);
    expect(body.action).toBe('ban');
    expect(body.userId).toBe('user-1');
  });

  it('throws when session is missing', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Session expired')),
    );
  });

  it('calls alert on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Ban failed' }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Ban failed'));
  });

  it('uses fallback error message when body.error is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to ban user'));
  });
});

describe('useUnbanUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });
  });

  it('calls POST /api/manage-user with action=unban', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    mockFrom.mockReturnValue(makeProfilesChain({ data: [], error: null, count: 0 }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnbanUser(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('user-1');
    });

    const postCall = mockFetch.mock.calls.find((c) => c[0] === '/api/manage-user');
    const body = JSON.parse(postCall![1].body);
    expect(body.action).toBe('unban');
  });

  it('calls alert with fallback message when error has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUnbanUser(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('user-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to unban user'));
  });
});

describe('useUpdateEndUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });
  });

  it('calls POST /api/manage-user with action=update-profile', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    mockFrom.mockReturnValue(makeProfilesChain({ data: [], error: null, count: 0 }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateEndUserProfile(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        userId: 'user-1',
        fields: { display_name: 'New Name' },
      });
    });

    const postCall = mockFetch.mock.calls.find((c) => c[0] === '/api/manage-user');
    const body = JSON.parse(postCall![1].body);
    expect(body.action).toBe('update-profile');
    expect(body.userId).toBe('user-1');
    expect(body.fields).toEqual({ display_name: 'New Name' });
  });

  it('calls alert with fallback message when error.message is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateEndUserProfile(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ userId: 'u-1', fields: { display_name: 'X' } });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to update-profile user'));
  });
});
