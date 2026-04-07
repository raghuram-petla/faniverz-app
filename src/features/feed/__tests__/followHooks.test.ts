jest.mock('../followApi');

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

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
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useEntityFollows,
  useEnrichedFollows,
  useFollowEntity,
  useUnfollowEntity,
} from '../followHooks';
import { fetchUserFollows, fetchEnrichedFollows, followEntity, unfollowEntity } from '../followApi';

const mockFetchUserFollows = fetchUserFollows as jest.MockedFunction<typeof fetchUserFollows>;
const mockFetchEnrichedFollows = fetchEnrichedFollows as jest.MockedFunction<
  typeof fetchEnrichedFollows
>;
const mockFollowEntity = followEntity as jest.MockedFunction<typeof followEntity>;
const mockUnfollowEntity = unfollowEntity as jest.MockedFunction<typeof unfollowEntity>;

describe('useEntityFollows', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not fetch when user is null', () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });

    const { result } = renderHook(() => useEntityFollows(), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.followSet.size).toBe(0);
  });

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

  it('rolls back optimistic update and shows Alert on follow error', async () => {
    mockFollowEntity.mockRejectedValue(new Error('Follow failed'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Seed existing follows in cache so onMutate has a previousFollows context
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const existingFollow = {
      id: 'f-1',
      user_id: 'user-123',
      entity_type: 'actor' as const,
      entity_id: 'a1',
      created_at: '',
    };
    client.setQueryData(['entity-follows', 'user-123'], [existingFollow]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useFollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    // Cache should be rolled back to the seeded value
    expect(client.getQueryData(['entity-follows', 'user-123'])).toEqual([existingFollow]);
    alertSpy.mockRestore();
  });

  it('throws when user is not logged in', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });

    const { result } = renderHook(() => useFollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles onError without previous follows in context (no cache)', async () => {
    mockFollowEntity.mockRejectedValue(new Error('Follow failed'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Use fresh client with no cached data, so context.previousFollows is undefined
    const { result } = renderHook(() => useFollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('useEnrichedFollows', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not fetch when user is null', () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });

    const { result } = renderHook(() => useEnrichedFollows(), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches enriched follows for authenticated user', async () => {
    const enriched = [
      {
        entity_type: 'movie' as const,
        entity_id: 'm1',
        name: 'Movie',
        image_url: null,
        created_at: '',
      },
    ];
    mockFetchEnrichedFollows.mockResolvedValue(enriched);

    const { result } = renderHook(() => useEnrichedFollows(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEnrichedFollows).toHaveBeenCalledWith('user-123');
    expect(result.current.data).toEqual(enriched);
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

  it('rolls back optimistic update and shows Alert on unfollow error', async () => {
    mockUnfollowEntity.mockRejectedValue(new Error('Unfollow failed'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Seed existing follows so onMutate has previousFollows context
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const existingFollow = {
      id: 'f-2',
      user_id: 'user-123',
      entity_type: 'movie' as const,
      entity_id: 'm1',
      created_at: '',
    };
    client.setQueryData(['entity-follows', 'user-123'], [existingFollow]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    // Cache should be rolled back to original (with the follow restored)
    expect(client.getQueryData(['entity-follows', 'user-123'])).toEqual([existingFollow]);
    alertSpy.mockRestore();
  });

  it('throws when user is not logged in', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles onError without previous follows in context (no cache)', async () => {
    mockUnfollowEntity.mockRejectedValue(new Error('Unfollow failed'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('optimistic update handles old=undefined (null coalescing fallback)', async () => {
    mockUnfollowEntity.mockResolvedValue(undefined);

    // Use a fresh client with NO cached entity-follows data at all
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Do NOT seed any cache — old will be undefined in setQueryData callback
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useFollowEntity — optimistic old=undefined', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistic update handles old=undefined via ?? fallback', async () => {
    mockFollowEntity.mockResolvedValue(undefined);

    // Use a fresh client with NO cached entity-follows data at all
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useFollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('primaryUpdater spreads old ?? [] when old is null (covers ...(old ?? []) branch)', async () => {
    mockFollowEntity.mockResolvedValue(undefined);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Set null data so primaryUpdater is called with null, triggering the ?? [] fallback
    client.setQueryData(['entity-follows', 'user-123'], null);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useFollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // After optimistic update with null base, cache should have the temp follow
    const cached = client.getQueryData<unknown[]>(['entity-follows', 'user-123']);
    expect(Array.isArray(cached)).toBe(true);
    expect((cached as unknown[]).length).toBe(1);
  });

  it('user?.id ?? empty-string branch is covered when user is null', async () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    (useAuth as jest.Mock).mockReturnValueOnce({ user: null });

    mockFollowEntity.mockRejectedValue(new Error('Must be logged in to follow'));
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Set null data so primaryUpdater is called (not skipped by undefined check)
    client.setQueryData(['entity-follows', undefined], null);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useFollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    alertSpy.mockRestore();
  });
});

describe('useUnfollowEntity — old=null branch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('primaryUpdater filters old ?? [] when old is null (covers ?? [] branch line 102)', async () => {
    mockUnfollowEntity.mockResolvedValue(undefined);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Set null data so primaryUpdater is called with null, triggering the ?? [] fallback
    client.setQueryData(['entity-follows', 'user-123'], null);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useUnfollowEntity(), { wrapper });

    await act(async () => {
      result.current.mutate({ entityType: 'movie', entityId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // After filter on empty [] (from null ?? []), result should be empty array
    const cached = client.getQueryData<unknown[]>(['entity-follows', 'user-123']);
    expect(Array.isArray(cached)).toBe(true);
  });
});
