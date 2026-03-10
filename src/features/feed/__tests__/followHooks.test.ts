jest.mock('../followApi');

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123' },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  })),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEntityFollows, useFollowEntity, useUnfollowEntity } from '../followHooks';
import { fetchUserFollows, followEntity, unfollowEntity } from '../followApi';

const mockFetchUserFollows = fetchUserFollows as jest.MockedFunction<typeof fetchUserFollows>;
const mockFollowEntity = followEntity as jest.MockedFunction<typeof followEntity>;
const mockUnfollowEntity = unfollowEntity as jest.MockedFunction<typeof unfollowEntity>;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useEntityFollows', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns follow data and followSet', async () => {
    mockFetchUserFollows.mockResolvedValue([
      { id: '1', user_id: 'user-123', entity_type: 'movie', entity_id: 'm1', created_at: '' },
      { id: '2', user_id: 'user-123', entity_type: 'actor', entity_id: 'a1', created_at: '' },
    ]);

    const { result } = renderHook(() => useEntityFollows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.followSet.has('movie:m1')).toBe(true);
    expect(result.current.followSet.has('actor:a1')).toBe(true);
    expect(result.current.followSet.has('movie:m2')).toBe(false);
  });

  it('returns empty set when no data', async () => {
    mockFetchUserFollows.mockResolvedValue([]);

    const { result } = renderHook(() => useEntityFollows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.followSet.size).toBe(0);
  });
});

describe('useFollowEntity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls followEntity with correct args', async () => {
    mockFollowEntity.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFollowEntity).toHaveBeenCalledWith('user-123', 'movie', 'm1');
  });
});

describe('useUnfollowEntity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls unfollowEntity with correct args', async () => {
    mockUnfollowEntity.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnfollowEntity).toHaveBeenCalledWith('user-123', 'movie', 'm1');
  });
});
