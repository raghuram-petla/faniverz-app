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
import { Alert } from 'react-native';
import { useUpdateProfile } from '../useUpdateProfile';
import { useAuth } from '../../providers/AuthProvider';

const { __mocks } = require('@/lib/supabase');
const { mockFrom, mockUpdate, mockEq, mockSingle } = __mocks;

const mockUseAuth = useAuth as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
  return { wrapper, queryClient };
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('returns a mutation object with expected properties', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it('calls supabase update with correct table, user ID, and data', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    const updatedProfile = {
      id: 'user-1',
      display_name: 'Updated Name',
      bio: 'New bio',
    };
    mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Updated Name', bio: 'New bio' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Updated Name',
        bio: 'New bio',
        updated_at: expect.any(String),
      }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(result.current.data).toEqual(updatedProfile);
  });

  it('includes updated_at timestamp in the update payload', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Test' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).toHaveProperty('updated_at');
    // Verify it's a valid ISO date string
    expect(new Date(updateArg.updated_at).toISOString()).toBe(updateArg.updated_at);
  });

  it('handles updating a single field', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', avatar_url: 'https://example.com/avatar.jpg' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ avatar_url: 'https://example.com/avatar.jpg' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://example.com/avatar.jpg' }),
    );
  });

  it('handles updating multiple fields at once', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-2' } });
    mockSingle.mockResolvedValue({ data: { id: 'user-2' }, error: null });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    const updates = {
      display_name: 'New Name',
      bio: 'New bio',
      phone: '+1234567890',
      location: 'Hyderabad',
      is_profile_public: true,
      is_watchlist_public: false,
    };

    await act(async () => {
      result.current.mutate(updates);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updates));
    expect(mockEq).toHaveBeenCalledWith('id', 'user-2');
  });

  it('invalidates profile query on success', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      result.current.mutate({ display_name: 'New Name' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile', 'user-1'] });
  });

  it('throws error when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('handles supabase error response', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({
      data: null,
      error: new Error('Update failed: constraint violation'),
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Bad' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Update failed: constraint violation');
  });

  it('shows Alert on error', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
  });

  it('shows fallback Alert message when error has no message', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    const errorWithNoMessage = new Error();
    errorWithNoMessage.message = '';
    mockSingle.mockResolvedValue({
      data: null,
      error: errorWithNoMessage,
    });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update profile');
  });

  it('does not invalidate queries on error', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      result.current.mutate({ display_name: 'Fail' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('starts in idle state and transitions to success after mutation', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    // Should start in idle state
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isIdle).toBe(true);

    await act(async () => {
      result.current.mutate({ display_name: 'Loading' });
    });

    // After mutation completes, should be in success state
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});
