import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

import {
  useAdminEndUsers,
  useBanUser,
  useUnbanUser,
  useUpdateEndUserProfile,
} from '@/hooks/useAdminEndUsers';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Build a chainable mock — every method returns self, await resolves with data */
function buildChain(
  data: unknown[] | null = [],
  error: { message: string } | null = null,
  count: number | null = 0,
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data, error, count };

  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === 'catch') return () => self;
      if (!target[prop as string]) {
        target[prop as string] = vi.fn().mockReturnValue(self);
      }
      return target[prop as string];
    },
  });

  return { self, chain };
}

const mockUsers = [
  {
    id: 'usr-1',
    display_name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Movie fan',
    location: 'Hyderabad',
    preferred_lang: 'te',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'usr-2',
    display_name: 'Jane Smith',
    username: null,
    email: 'jane@example.com',
    avatar_url: null,
    bio: null,
    location: null,
    preferred_lang: 'en',
    created_at: '2024-02-01T00:00:00Z',
  },
];

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
});

describe('useAdminEndUsers', () => {
  it('queries profiles table', async () => {
    const { self } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('selects the correct columns with count', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.select).toHaveBeenCalledWith(
      'id, display_name, username, email, avatar_url, bio, location, preferred_lang, created_at',
      { count: 'exact' },
    );
  });

  it('orders by created_at descending', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('applies range for pagination (page 0, size 50)', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0, pageSize: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('applies range for page 2 with pageSize 25', async () => {
    const { self, chain } = buildChain(mockUsers, null, 100);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 2, pageSize: 25 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.range).toHaveBeenCalledWith(50, 74);
  });

  it('calls search_profiles RPC and email ILIKE when search is provided', async () => {
    // RPC returns matching user IDs
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email ILIKE query chain
    const { self: emailSelf } = buildChain([{ id: 'usr-2' }], null);
    // Final fetch-by-IDs query chain
    const { self: fetchSelf } = buildChain(mockUsers, null, 2);

    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      // First call: email ILIKE lookup; second call: fetch by merged IDs
      if (fromCallCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('search_profiles', {
      search_term: 'john',
      result_limit: 1000,
      result_offset: 0,
    });
  });

  it('does not call RPC when search is empty', async () => {
    const { self } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns users and totalCount', async () => {
    const { self } = buildChain(mockUsers, null, 42);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.users).toEqual(mockUsers);
    expect(result.current.data?.totalCount).toBe(42);
  });

  it('returns empty users array when data is null', async () => {
    const { self } = buildChain(null, null, 0);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.users).toEqual([]);
    expect(result.current.data?.totalCount).toBe(0);
  });

  it('throws when supabase returns an error', async () => {
    const { self } = buildChain(null, { message: 'Permission denied' }, null);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('uses default pageSize of 50', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });

  it('returns empty when both RPC and email search find no matches', async () => {
    // RPC returns no results
    mockRpc.mockResolvedValue({ data: [], error: null });
    // Email ILIKE returns no results
    const { self: emailSelf } = buildChain([], null);
    mockFrom.mockReturnValue(emailSelf);

    const { result } = renderHook(() => useAdminEndUsers({ search: 'nonexistent', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.users).toEqual([]);
    expect(result.current.data?.totalCount).toBe(0);
  });

  it('handles RPC rejection gracefully (allSettled)', async () => {
    // RPC rejects
    mockRpc.mockRejectedValue(new Error('RPC failed'));
    // Email ILIKE returns one match
    const { self: emailSelf } = buildChain([{ id: 'usr-1' }], null);
    // Final fetch-by-IDs query chain
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, 1);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });

  it('handles email search rejection gracefully (allSettled)', async () => {
    // RPC returns one match
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email ILIKE rejects (via buildChain with error)
    const { self: emailSelf } = buildChain(null, { message: 'email search failed' });
    // Final fetch-by-IDs
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, 1);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });

  it('handles RPC returning error in value (not rejection)', async () => {
    // RPC resolves but with error
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });
    // Email ILIKE returns match
    const { self: emailSelf } = buildChain([{ id: 'usr-1' }], null);
    // Final fetch
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, 1);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });

  it('handles search with null count from final query', async () => {
    // RPC returns match
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email returns no matches
    const { self: emailSelf } = buildChain([], null);
    // Final fetch returns null count
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, null);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalCount).toBe(0);
  });

  it('handles null count in non-search path', async () => {
    const { self } = buildChain(mockUsers, null, null);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalCount).toBe(0);
  });

  it('handles null data in search final query', async () => {
    // RPC returns match
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email returns no matches
    const { self: emailSelf } = buildChain([], null);
    // Final fetch returns null data
    const { self: fetchSelf } = buildChain(null, null, 0);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toEqual([]);
  });

  it('handles email search returning null data (not error)', async () => {
    // RPC returns match
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email returns null data (no error) — the ?? [] fallback should kick in
    const { self: emailSelf } = buildChain(null, null);
    // Final fetch
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, 1);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });

  it('throws when Phase 2 query returns an error during search', async () => {
    // RPC returns match
    mockRpc.mockResolvedValue({ data: [{ id: 'usr-1' }], error: null });
    // Email returns no matches
    const { self: emailSelf } = buildChain([], null);
    // Final fetch returns error
    const { self: fetchSelf } = buildChain(null, { message: 'Phase 2 error' }, null);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('handles RPC returning null data (not error)', async () => {
    // RPC resolves with null data (no error)
    mockRpc.mockResolvedValue({ data: null, error: null });
    // Email returns match
    const { self: emailSelf } = buildChain([{ id: 'usr-1' }], null);
    // Final fetch
    const { self: fetchSelf } = buildChain(mockUsers.slice(0, 1), null, 1);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emailSelf;
      return fetchSelf;
    });

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });

  it('escapes LIKE wildcards in email search string', async () => {
    // RPC returns no results
    mockRpc.mockResolvedValue({ data: [], error: null });
    // Email ILIKE chain — we track the ilike call
    const { self: emailSelf, chain: emailChain } = buildChain([], null);

    mockFrom.mockReturnValue(emailSelf);

    const { result } = renderHook(() => useAdminEndUsers({ search: '50%_off\\test', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The email ILIKE should have escaped % _ and \ with backslash
    expect(emailChain.ilike).toHaveBeenCalledWith('email', '%50\\%\\_off\\\\test%');
  });
});

describe('useBanUser', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    global.fetch = mockFetch;
  });

  it('calls /api/manage-user with action=ban', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('usr-1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/manage-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      },
      body: JSON.stringify({ action: 'ban', userId: 'usr-1' }),
    });
  });

  it('shows alert when session is expired', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('usr-1');
      } catch {
        // expected to throw
      }
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Session expired'));
    });
  });

  it('shows alert when API returns non-ok response with error body', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'User not found' }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('usr-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('User not found');
    });
  });

  it('shows fallback error message when API returns non-ok with no error body', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('parse failed')),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBanUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('usr-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to ban user');
    });
  });
});

describe('useUnbanUser', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    global.fetch = mockFetch;
  });

  it('calls /api/manage-user with action=unban', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUnbanUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('usr-1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/manage-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      },
      body: JSON.stringify({ action: 'unban', userId: 'usr-1' }),
    });
  });

  it('shows alert on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUnbanUser(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync('usr-1');
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });
});

describe('useUpdateEndUserProfile', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    global.fetch = mockFetch;
  });

  it('calls /api/manage-user with action=update-profile and fields', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateEndUserProfile(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        userId: 'usr-1',
        fields: { display_name: 'New Name', bio: 'New bio' },
      });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/manage-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      },
      body: JSON.stringify({
        action: 'update-profile',
        userId: 'usr-1',
        fields: { display_name: 'New Name', bio: 'New bio' },
      }),
    });
  });

  it('shows alert on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateEndUserProfile(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ userId: 'usr-1', fields: {} });
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });
});
