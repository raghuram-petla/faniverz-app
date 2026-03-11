jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../activityApi', () => ({
  fetchUserActivity: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchUserActivity } from '../activityApi';
import { useUserActivity } from '../activityHooks';

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = fetchUserActivity as jest.Mock;

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useUserActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns activity when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'vote' }]);

    const { result } = renderHook(() => useUserActivity('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetch).toHaveBeenCalledWith('u1', 'all', 0);
  });

  it('does not fetch when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

    expect(result.current.data).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
