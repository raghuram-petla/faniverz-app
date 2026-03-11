import React from 'react';
import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

const mockPush = jest.fn();
const mockInvalidate = jest.fn();

import { useNotificationHandler } from '../useNotificationHandler';

describe('useNotificationHandler', () => {
  it('sets notification handler on module load', () => {
    // setNotificationHandler is called at module top-level before any test runs
    // We check the mock from jest.setup.js was invoked during module import
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds notification response listener on mount', () => {
    renderHook(() => useNotificationHandler());

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('navigates to movie when notification has movie_id', () => {
    let capturedCallback: (response: unknown) => void;
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementationOnce(
      (cb: (response: unknown) => void) => {
        capturedCallback = cb;
        return { remove: jest.fn() };
      },
    );

    renderHook(() => useNotificationHandler());

    capturedCallback!({
      notification: {
        request: {
          content: {
            data: { movie_id: 'movie-123' },
          },
        },
      },
    });

    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-123');
  });

  it('navigates to notifications screen when no movie_id', () => {
    let capturedCallback: (response: unknown) => void;
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementationOnce(
      (cb: (response: unknown) => void) => {
        capturedCallback = cb;
        return { remove: jest.fn() };
      },
    );

    renderHook(() => useNotificationHandler());

    capturedCallback!({
      notification: {
        request: {
          content: {
            data: {},
          },
        },
      },
    });

    expect(mockPush).toHaveBeenCalledWith('/notifications');
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
});
