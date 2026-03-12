import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useAdminEndUsers } from '@/hooks/useAdminEndUsers';

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
});
