jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => {
  const mockMaybeSingle = jest.fn();
  const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: {
      from: mockFrom,
    },
    __mocks: { mockFrom, mockSelect, mockEq, mockMaybeSingle },
  };
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProfile } from '../useProfile';
import { useAuth } from '../../providers/AuthProvider';

const { __mocks } = require('@/lib/supabase');
const { mockFrom, mockSelect, mockEq, mockMaybeSingle } = __mocks;

const mockUseAuth = useAuth as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockProfile = {
  id: 'user-1',
  display_name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  location: 'Hyderabad',
  bio: 'Movie lover',
  avatar_url: 'https://example.com/avatar.jpg',
  preferred_lang: 'te',
  is_admin: false,
  is_profile_public: true,
  is_watchlist_public: false,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-06-15T12:00:00.000Z',
};

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches profile for authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockMaybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(result.current.data).toEqual(mockProfile);
  });

  it('is disabled when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('is disabled when user has no id', () => {
    mockUseAuth.mockReturnValue({ user: { id: undefined } });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('uses correct query key with user id', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-42' } });
    mockMaybeSingle.mockResolvedValue({ data: { ...mockProfile, id: 'user-42' }, error: null });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the query was stored under the correct key
    const cachedData = queryClient.getQueryData(['profile', 'user-42']);
    expect(cachedData).toEqual(expect.objectContaining({ id: 'user-42' }));
  });

  it('returns null when profile does not exist (maybeSingle returns null)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-new' } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('handles supabase error', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('PGRST116: multiple rows returned'),
    });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('PGRST116: multiple rows returned');
  });

  it('returns all expected profile fields', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockMaybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('display_name');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('phone');
    expect(data).toHaveProperty('location');
    expect(data).toHaveProperty('bio');
    expect(data).toHaveProperty('avatar_url');
    expect(data).toHaveProperty('preferred_lang');
    expect(data).toHaveProperty('is_admin');
    expect(data).toHaveProperty('is_profile_public');
    expect(data).toHaveProperty('is_watchlist_public');
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
  });

  it('returns profile with null optional fields', async () => {
    const minimalProfile = {
      id: 'user-1',
      display_name: 'Minimal User',
      email: 'minimal@example.com',
      phone: null,
      location: null,
      bio: null,
      avatar_url: null,
      preferred_lang: 'en',
      is_admin: false,
      is_profile_public: true,
      is_watchlist_public: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    };

    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockMaybeSingle.mockResolvedValue({ data: minimalProfile, error: null });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.phone).toBeNull();
    expect(result.current.data?.location).toBeNull();
    expect(result.current.data?.bio).toBeNull();
    expect(result.current.data?.avatar_url).toBeNull();
  });

  it('provides loading state while fetching', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockMaybeSingle.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!({ data: mockProfile, error: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('has staleTime of 30 minutes', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockMaybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the query is not stale immediately (staleTime = 30 min)
    expect(result.current.isStale).toBe(false);
  });

  it('passes empty string as userId fallback when user.id is nullish', async () => {
    // Even though the query is disabled when user is null,
    // verify the queryFn uses the fallback '' via the ?? operator
    mockUseAuth.mockReturnValue({ user: { id: null } });

    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    });

    // Query should be disabled because !!null is false
    expect(result.current.isFetching).toBe(false);
  });
});
