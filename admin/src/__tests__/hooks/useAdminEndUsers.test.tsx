import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
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

  it('applies or filter when search is provided', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: 'john', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.or).toHaveBeenCalledWith(
      'display_name.ilike.%john%,username.ilike.%john%,email.ilike.%john%',
    );
  });

  it('does not call or filter when search is empty', async () => {
    const { self, chain } = buildChain(mockUsers, null, 2);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.or).toBeUndefined();
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

  it('escapes LIKE wildcards in search string', async () => {
    const { self, chain } = buildChain([], null, 0);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminEndUsers({ search: '50%_off\\test', page: 0 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // % _ and \ should be escaped with backslash
    expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('\\%\\_off\\\\test'));
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
