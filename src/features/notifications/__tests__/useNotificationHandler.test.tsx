import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

const mockPush = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

import { useNotificationHandler } from '../useNotificationHandler';

// Helper to capture the notification response callback
function captureResponseCallback(): (response: unknown) => void {
  let captured: (response: unknown) => void = () => {};
  (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementationOnce(
    (cb: (response: unknown) => void) => {
      captured = cb;
      return { remove: jest.fn() };
    },
  );
  return (...args: unknown[]) => captured(args[0]);
}

function buildResponse(data: Record<string, unknown> | null | undefined) {
  return {
    notification: {
      request: {
        content: {
          data,
        },
      },
    },
  };
}

describe('useNotificationHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets notification handler on module load and handleNotification returns correct flags', async () => {
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
    // Find the handler argument from the most recent call
    const calls = (Notifications.setNotificationHandler as jest.Mock).mock.calls;
    const handlerArg = calls[calls.length - 1]?.[0];
    expect(handlerArg).toBeDefined();
    if (handlerArg?.handleNotification) {
      const behavior = await handlerArg.handleNotification({} as never);
      expect(behavior.shouldShowAlert).toBe(true);
      expect(behavior.shouldPlaySound).toBe(true);
      expect(behavior.shouldSetBadge).toBe(true);
      expect(behavior.shouldShowBanner).toBe(true);
      expect(behavior.shouldShowList).toBe(true);
    }
  });

  it('adds notification response listener on mount', () => {
    renderHook(() => useNotificationHandler());

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('navigates to movie when notification has movie_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ movie_id: 'movie-123' }));

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-123');
  });

  it('navigates to notifications screen when no movie_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({}));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to notifications screen when data is null', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse(null));

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to notifications screen when data is undefined', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse(undefined));

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to actor when notification has actor_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ actor_id: 'actor-1' }));

    expect(mockPush).toHaveBeenCalledWith('/actor/actor-1');
  });

  it('navigates to production house when notification has production_house_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ production_house_id: 'ph-1' }));

    expect(mockPush).toHaveBeenCalledWith('/production-house/ph-1');
  });

  it('navigates to notifications when payload has non-string movie_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ movie_id: 123 }));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('prioritizes movie_id over actor_id when both present', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ movie_id: 'movie-1', actor_id: 'actor-1' }));

    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('navigates to notifications when data has unrecognized keys', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ unknown_key: 'value' }));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('invalidates notifications query on every notification response', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ movie_id: 'movie-1' }));
    expect(mockInvalidate).toHaveBeenCalledTimes(1);

    // Simulate second notification
    callback(buildResponse({}));
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('cleans up listener on unmount', () => {
    const mockRemove = jest.fn();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValueOnce({
      remove: mockRemove,
    });

    const { unmount } = renderHook(() => useNotificationHandler());
    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('does not call remove if listener ref is null on unmount', () => {
    // Default mock returns { remove: jest.fn() }, but we verify the cleanup doesn't crash
    const { unmount } = renderHook(() => useNotificationHandler());
    expect(() => unmount()).not.toThrow();
  });

  it('navigates to notifications when actor_id is non-string', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ actor_id: 456 }));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to notifications when production_house_id is non-string', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ production_house_id: 789 }));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('prioritizes actor_id over production_house_id when both present', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ actor_id: 'actor-1', production_house_id: 'ph-1' }));

    expect(mockPush).toHaveBeenCalledWith('/actor/actor-1');
  });

  it('navigates to notifications when movie_id is empty string', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ movie_id: '' }));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to post detail when notification has feed_item_id', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ feed_item_id: 'fi-1' }));

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(mockPush).toHaveBeenCalledWith('/post/fi-1');
  });

  it('ignores feed_item_id when it is a non-string', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ feed_item_id: 999 }));

    // Falls through to /notifications since feed_item_id is not a string
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('prioritizes feed_item_id over movie_id when both present', () => {
    const callback = captureResponseCallback();
    renderHook(() => useNotificationHandler());

    callback(buildResponse({ feed_item_id: 'fi-1', movie_id: 'movie-1' }));

    expect(mockPush).toHaveBeenCalledWith('/post/fi-1');
  });
});
