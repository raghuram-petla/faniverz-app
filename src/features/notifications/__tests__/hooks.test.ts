import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useNotifications,
  useUnreadCount,
  useNotificationsPaginated,
  useNotificationMutations,
} from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockNotifications = [
  { id: 'n1', user_id: 'u1', title: 'New release', read: false },
  { id: 'n2', user_id: 'u1', title: 'Review reply', read: true },
  { id: 'n3', user_id: 'u1', title: 'OTT available', read: false },
];

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches notifications for a user', async () => {
    (api.fetchNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotifications('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNotifications);
    expect(api.fetchNotifications).toHaveBeenCalledWith('u1');
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useNotifications(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchNotifications).not.toHaveBeenCalled();
  });
});

describe('useUnreadCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the count of unread notifications', async () => {
    (api.fetchNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useUnreadCount('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe(2));
  });

  it('returns 0 when no notifications', async () => {
    (api.fetchNotifications as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useUnreadCount('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe(0));
  });

  it('returns 0 when all are read', async () => {
    const allRead = [
      { id: 'n1', read: true },
      { id: 'n2', read: true },
    ];
    (api.fetchNotifications as jest.Mock).mockResolvedValue(allRead);

    const { result } = renderHook(() => useUnreadCount('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe(0));
  });
});

describe('useNotificationsPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches paginated notifications for a user', async () => {
    (api.fetchNotificationsPaginated as jest.Mock).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotificationsPaginated('u1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchNotificationsPaginated).toHaveBeenCalledWith('u1', 0, expect.any(Number));
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useNotificationsPaginated(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.fetchNotificationsPaginated).not.toHaveBeenCalled();
  });
});

describe('useNotificationMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes markRead and markAllRead mutations', () => {
    const { result } = renderHook(() => useNotificationMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.markRead).toBeDefined();
    expect(result.current.markAllRead).toBeDefined();
  });

  it('markRead mutation calls markAsRead', async () => {
    (api.markAsRead as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markRead.mutate('n1');
    });

    await waitFor(() => expect(result.current.markRead.isSuccess).toBe(true));
    expect(api.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('markAllRead mutation calls markAllAsRead', async () => {
    (api.markAllAsRead as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markAllRead.mutate('u1');
    });

    await waitFor(() => expect(result.current.markAllRead.isSuccess).toBe(true));
    expect(api.markAllAsRead).toHaveBeenCalledWith('u1');
  });

  it('markRead mutation silently handles errors (onError is a no-op)', async () => {
    (api.markAsRead as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotificationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markRead.mutate('n1');
    });

    await waitFor(() => expect(result.current.markRead.isError).toBe(true));
    // No alert should be thrown — error is silent
  });

  it('markAllRead mutation silently handles errors (onError is a no-op)', async () => {
    (api.markAllAsRead as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotificationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markAllRead.mutate('u1');
    });

    await waitFor(() => expect(result.current.markAllRead.isError).toBe(true));
    // No alert — silent failure
  });
});
