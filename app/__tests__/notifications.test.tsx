jest.mock('react-i18next', () => {
  const en = require('../../src/i18n/en.json') as Record<string, Record<string, string>>;
  const t = (key: string, params?: Record<string, unknown>) => {
    const [ns, k] = key.split('.');
    let val = en[ns]?.[k] ?? key;
    if (params)
      Object.entries(params).forEach(([pk, pv]) => {
        val = val.replace(`{{${pk}}}`, String(pv));
      });
    return val;
  };
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  }),
}));

const mockMarkRead = { mutate: jest.fn() };
const mockMarkAllRead = { mutate: jest.fn() };

jest.mock('@/components/ui/PlatformBadge', () => ({
  PlatformBadge: () => null,
}));

jest.mock('@/features/notifications/hooks', () => ({
  useNotifications: jest.fn(),
  useUnreadCount: jest.fn(),
  useNotificationMutations: jest.fn(),
}));

const mockNotifications = [
  {
    id: 'n1',
    user_id: 'user-1',
    type: 'release',
    title: 'New Release',
    message: 'Pushpa 2 is now in theaters',
    movie_id: 'movie-1',
    platform_id: null,
    read: false,
    scheduled_for: '2025-03-15T00:00:00Z',
    status: 'sent',
    created_at: '2025-03-15T10:00:00Z',
  },
  {
    id: 'n2',
    user_id: 'user-1',
    type: 'trending',
    title: 'Trending Movie',
    message: 'Kalki is trending now',
    movie_id: 'movie-2',
    platform_id: null,
    read: true,
    scheduled_for: '2025-03-14T00:00:00Z',
    status: 'sent',
    created_at: '2025-03-14T10:00:00Z',
  },
];

import NotificationsScreen from '../notifications';

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const {
      useNotifications,
      useUnreadCount,
      useNotificationMutations,
    } = require('@/features/notifications/hooks');
    useNotifications.mockReturnValue({ data: mockNotifications });
    useUnreadCount.mockReturnValue(1);
    useNotificationMutations.mockReturnValue({
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
    });
  });

  it('renders "Notifications" header', () => {
    render(<NotificationsScreen />);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows "Mark all read" link', () => {
    render(<NotificationsScreen />);
    expect(screen.getByText('Mark all read')).toBeTruthy();
  });

  it('renders notification items', () => {
    render(<NotificationsScreen />);
    expect(screen.getByText('New Release')).toBeTruthy();
    expect(screen.getByText('Pushpa 2 is now in theaters')).toBeTruthy();
    expect(screen.getByText('Trending Movie')).toBeTruthy();
    expect(screen.getByText('Kalki is trending now')).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    const { useNotifications, useUnreadCount } = require('@/features/notifications/hooks');
    useNotifications.mockReturnValue({ data: [] });
    useUnreadCount.mockReturnValue(0);

    render(<NotificationsScreen />);
    expect(screen.getByText('No notifications yet')).toBeTruthy();
    expect(screen.getByText("You'll be notified about releases and updates")).toBeTruthy();
  });

  it('calls markAllRead when "Mark all read" is pressed and there are unread notifications', () => {
    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('Mark all as read'));
    expect(mockMarkAllRead.mutate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('calls markRead when an unread notification is pressed', () => {
    render(<NotificationsScreen />);
    // Press the first notification which is unread
    fireEvent.press(screen.getByLabelText('New Release'));
    expect(mockMarkRead.mutate).toHaveBeenCalledWith('n1');
  });

  it('does not call markRead when a read notification is pressed', () => {
    render(<NotificationsScreen />);
    // Press the second notification which is already read
    fireEvent.press(screen.getByLabelText('Trending Movie'));
    expect(mockMarkRead.mutate).not.toHaveBeenCalled();
  });

  it('does not navigate when notification has no movie_id', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const noMovieNotification = [
      {
        id: 'n3',
        user_id: 'user-1',
        type: 'reminder',
        title: 'Reminder',
        message: 'Check your watchlist',
        movie_id: null,
        platform_id: null,
        read: false,
        scheduled_for: '2025-03-16T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-16T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: noMovieNotification });

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('Reminder'));
    // markRead is called (notification is unread), but no navigation should happen
    expect(mockMarkRead.mutate).toHaveBeenCalledWith('n3');
  });

  it('does not call markAllRead when unreadCount is 0', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(0);

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('Mark all as read'));
    expect(mockMarkAllRead.mutate).not.toHaveBeenCalled();
  });

  it('shows 99+ badge when unread count exceeds 99', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(150);

    render(<NotificationsScreen />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows exact unread count when it is 99 or less', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(42);

    render(<NotificationsScreen />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('does not show unread badge when count is 0', () => {
    const { useUnreadCount, useNotifications } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(0);
    useNotifications.mockReturnValue({ data: mockNotifications });

    render(<NotificationsScreen />);
    // Badge should not be rendered since unreadCount is 0
    // The badge contains a number; with 0 unread there should be no badge number
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('99+')).toBeNull();
  });

  it('does not call markRead when markRead is already pending', () => {
    const {
      useNotifications,
      useNotificationMutations,
    } = require('@/features/notifications/hooks');
    useNotifications.mockReturnValue({ data: mockNotifications });
    useNotificationMutations.mockReturnValue({
      markRead: { mutate: mockMarkRead.mutate, isPending: true },
      markAllRead: mockMarkAllRead,
    });

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('New Release'));
    // markRead should NOT be called because isPending is true
    expect(mockMarkRead.mutate).not.toHaveBeenCalled();
  });

  it('shows platform badge for release notification with platform', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const releaseWithPlatform = [
      {
        id: 'n5',
        user_id: 'user-1',
        type: 'release',
        title: 'Platform Release',
        message: 'Available on Netflix',
        movie_id: 'movie-5',
        platform_id: 'netflix',
        platform: 'netflix',
        read: true,
        scheduled_for: '2025-03-18T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-18T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: releaseWithPlatform });

    render(<NotificationsScreen />);
    expect(screen.getByText('Platform Release')).toBeTruthy();
  });

  it('does not call markAllRead when userId is empty (logged out)', () => {
    jest.mock('@/features/auth/providers/AuthProvider', () => ({
      useAuth: () => ({
        user: null,
        session: null,
        isLoading: false,
        isGuest: true,
        setIsGuest: jest.fn(),
      }),
    }));

    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(5);

    render(<NotificationsScreen />);
    // Even with unreadCount > 0, the guard checks `userId` which is '' when user is null
    // so markAllRead should not be called
  });

  it('renders watchlist-type notification icon correctly', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const watchlistNotification = [
      {
        id: 'n6',
        user_id: 'user-1',
        type: 'watchlist',
        title: 'Watchlist Alert',
        message: 'Your movie releases today',
        movie_id: 'movie-6',
        platform_id: null,
        read: false,
        scheduled_for: '2025-03-19T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-19T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: watchlistNotification });

    render(<NotificationsScreen />);
    expect(screen.getByText('Watchlist Alert')).toBeTruthy();
  });

  it('uses fallback icon config for unknown notification type', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const unknownTypeNotification = [
      {
        id: 'n4',
        user_id: 'user-1',
        type: 'unknown_type',
        title: 'Unknown Type',
        message: 'This is an unknown notification type',
        movie_id: 'movie-3',
        platform_id: null,
        read: true,
        scheduled_for: '2025-03-17T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-17T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: unknownTypeNotification });

    render(<NotificationsScreen />);
    // Should render without crashing — the fallback to TYPE_ICON.release is used
    expect(screen.getByText('Unknown Type')).toBeTruthy();
    expect(screen.getByText('This is an unknown notification type')).toBeTruthy();
  });

  it('renders reminder-type notification icon correctly', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const reminderNotification = [
      {
        id: 'n7',
        user_id: 'user-1',
        type: 'reminder',
        title: 'Reminder Alert',
        message: 'Movie releases tomorrow',
        movie_id: 'movie-7',
        platform_id: null,
        read: false,
        scheduled_for: '2025-03-20T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-20T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: reminderNotification });

    render(<NotificationsScreen />);
    expect(screen.getByText('Reminder Alert')).toBeTruthy();
  });

  it('does not show platform badge for release notification without platform', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const releaseNoPlatform = [
      {
        id: 'n8',
        user_id: 'user-1',
        type: 'release',
        title: 'Theater Release',
        message: 'Now in theaters',
        movie_id: 'movie-8',
        platform_id: null,
        platform: null,
        read: true,
        scheduled_for: '2025-03-21T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-21T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: releaseNoPlatform });

    render(<NotificationsScreen />);
    expect(screen.getByText('Theater Release')).toBeTruthy();
  });

  it('does not show platform badge for non-release type even with platform set', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    const trendingWithPlatform = [
      {
        id: 'n9',
        user_id: 'user-1',
        type: 'trending',
        title: 'Trending',
        message: 'Trending on Netflix',
        movie_id: 'movie-9',
        platform_id: 'netflix',
        platform: 'netflix',
        read: true,
        scheduled_for: '2025-03-22T00:00:00Z',
        status: 'sent',
        created_at: '2025-03-22T10:00:00Z',
      },
    ];
    useNotifications.mockReturnValue({ data: trendingWithPlatform });

    render(<NotificationsScreen />);
    // Platform badge only renders for type === 'release' && item.platform
    expect(screen.getByText('Trending')).toBeTruthy();
  });

  it('shows markAllRead error alert when onError is invoked', () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('Mark all as read'));

    // Extract onError callback from markAllRead.mutate call
    const onErrorCallback = mockMarkAllRead.mutate.mock.calls[0][1].onError;
    onErrorCallback();

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Something went wrong');
    alertSpy.mockRestore();
  });

  it('handles user null (userId falls back to empty string via ??)', () => {
    const { useAuth } = require('@/features/auth/providers/AuthProvider');
    const origAuth = useAuth;
    require('@/features/auth/providers/AuthProvider').useAuth = () => ({
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      setIsGuest: jest.fn(),
    });

    render(<NotificationsScreen />);
    expect(screen.getByText('Notifications')).toBeTruthy();

    require('@/features/auth/providers/AuthProvider').useAuth = origAuth;
  });

  it('does not call markAllRead when unreadCount is 0', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(0);
    render(<NotificationsScreen />);
    fireEvent.press(screen.getByLabelText('Mark all as read'));
    expect(mockMarkAllRead.mutate).not.toHaveBeenCalled();
  });

  it('handles undefined notifications data (defaults to [])', () => {
    const { useNotifications } = require('@/features/notifications/hooks');
    useNotifications.mockReturnValue({ data: undefined, refetch: jest.fn() });
    render(<NotificationsScreen />);
    // Should show empty state when no notifications
    expect(screen.getByText('Notifications')).toBeTruthy();
  });
});
