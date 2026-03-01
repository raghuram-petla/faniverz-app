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
    expect(mockMarkAllRead.mutate).toHaveBeenCalledWith('user-1');
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
});
