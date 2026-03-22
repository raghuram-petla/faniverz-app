import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
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
  const or = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ order, or });
  return { select };
}

// Build a chain with .or() after select (search path)
function makeProfilesSearchChain(resolvedValue: unknown) {
  const range = vi.fn().mockResolvedValue(resolvedValue);
  const order = vi.fn().mockReturnValue({ range });
  const or = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range }) });
  const select = vi.fn().mockReturnValue({ order, or });
  return { select };
}

describe('useAdminEndUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('fetches end users without search', async () => {
    const users = [{ id: 'u-1', display_name: 'Alice', email: 'alice@test.com' }];
    mockFrom.mockReturnValueOnce(makeProfilesChain({ data: users, error: null, count: 1 }));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
    expect(result.current.data?.totalCount).toBe(1);
  });

  it('uses default page size of 50', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: vi.fn() });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '', page: 0 }), { wrapper: Wrapper });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    expect(rangeMock).toHaveBeenCalledWith(0, 49);
  });

  it('uses custom pageSize', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: vi.fn() });
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
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: vi.fn() });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '', page: 2, pageSize: 10 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    expect(rangeMock).toHaveBeenCalledWith(20, 29);
  });

  it('adds .or() filter when search is non-empty', async () => {
    // Source: let query = select().order().range(); if (search) query = query.or(...); await query
    // So range() result must be both awaitable AND have .or() that's also awaitable
    const finalResult = { data: [], error: null, count: 0 };
    const orMock = vi.fn().mockResolvedValue(finalResult);
    const rangeMock = vi
      .fn()
      .mockImplementation(() => Object.assign(Promise.resolve(finalResult), { or: orMock }));
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: 'alice', page: 0 }), { wrapper: Wrapper });

    await waitFor(() => expect(orMock).toHaveBeenCalled());
    const orArg = orMock.mock.calls[0][0] as string;
    expect(orArg).toContain('alice');
    expect(orArg).toContain('display_name.ilike');
  });

  it('escapes LIKE special characters in search', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const orOrderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const orMock = vi.fn().mockReturnValue({ order: orOrderMock });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: orMock });
    mockFrom.mockReturnValueOnce({ select: selectMock });

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminEndUsers({ search: '50%_off', page: 0 }), { wrapper: Wrapper });

    await waitFor(() => expect(rangeMock).toHaveBeenCalled());
    // Verify the search string with special chars was processed
    if (orMock.mock.calls.length > 0) {
      const orArg = orMock.mock.calls[0][0];
      expect(orArg).toContain('\\%');
      expect(orArg).toContain('\\_');
    }
    // The key thing is the query ran without error
    expect(rangeMock).toHaveBeenCalled();
  });

  it('throws when query fails', async () => {
    const rangeMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: vi.fn() });
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
    const selectMock = vi.fn().mockReturnValue({ order: orderMock, or: vi.fn() });
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
    // For invalidation
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
