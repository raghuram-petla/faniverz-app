jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn(() => ({ single: mockSingle }));
  const mockEq = jest.fn(() => ({ select: mockSelect }));
  const mockUpdate = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({ update: mockUpdate }));

  return {
    supabase: {
      from: mockFrom,
    },
    __mocks: { mockFrom, mockUpdate, mockEq, mockSelect, mockSingle },
  };
});

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
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

describe('useUpdateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls update API with profile data', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    const updatedProfile = {
      id: 'user-1',
      display_name: 'Updated Name',
      email: 'test@test.com',
    };
    mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ display_name: 'Updated Name' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updatedProfile);
  });

  it('invalidates profile query on success', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    mockSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    function CustomWrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: CustomWrapper });

    await act(async () => {
      result.current.mutate({ display_name: 'New Name' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile', 'user-1'] });
  });

  it('handles error from supabase', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    mockSingle.mockResolvedValue({ data: null, error: new Error('Update failed') });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('throws error when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });
});
