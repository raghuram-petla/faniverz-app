jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
});
