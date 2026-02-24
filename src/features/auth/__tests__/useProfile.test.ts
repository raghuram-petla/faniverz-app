jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockEq = jest.fn(() => ({ single: mockSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: {
      from: mockFrom,
    },
    __mocks: { mockFrom, mockSelect, mockEq, mockSingle },
  };
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../providers/AuthProvider';

const { __mocks } = require('@/lib/supabase');
const { mockSingle } = __mocks;

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
  email: 'test@test.com',
  phone: null,
  location: null,
  bio: null,
  avatar_url: null,
  preferred_lang: 'en',
  is_admin: false,
  created_at: '2025-01-01',
};

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches profile for authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
  });

  it('is disabled when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
  });

  it('returns profile data shape', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty('display_name');
    expect(result.current.data).toHaveProperty('email');
    expect(result.current.data).toHaveProperty('preferred_lang');
  });

  it('handles error from supabase', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
