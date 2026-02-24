jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlist: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/features/reviews/hooks', () => ({
  useUserReviews: jest.fn(() => ({ data: [] })),
}));

jest.mock('@/features/notifications/hooks', () => ({
  useUnreadCount: jest.fn(() => 0),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../profile';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';

const mockUseAuth = useAuth as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;

function setupLoggedIn(profileOverrides: object = {}) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'user-1',
      email: 'fan@example.com',
      created_at: '2024-01-01T00:00:00Z',
    },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  });
  mockUseProfile.mockReturnValue({
    data: {
      id: 'user-1',
      display_name: 'Telugu Fan',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      ...profileOverrides,
    },
  });
}

function setupGuest() {
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    isLoading: false,
    isGuest: true,
    setIsGuest: jest.fn(),
  });
  mockUseProfile.mockReturnValue({ data: null });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Guest (not logged in) ──────────────────────────────────────────────

  it('shows login prompt when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('Sign in to Faniverz')).toBeTruthy();
    expect(
      screen.getByText('Create an account to track your watchlist, write reviews, and more'),
    ).toBeTruthy();
    expect(screen.getByText('Login / Sign Up')).toBeTruthy();
  });

  it('does not show menu items when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.queryByText('Edit Profile')).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
    expect(screen.queryByText('My Reviews')).toBeNull();
    expect(screen.queryByText('Notifications')).toBeNull();
    expect(screen.queryByText('Favorite Actors')).toBeNull();
    expect(screen.queryByText('Watched Movies')).toBeNull();
    expect(screen.queryByText('Account Details')).toBeNull();
  });

  it('does not show profile card stats when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.queryByText('Watchlist')).toBeNull();
    expect(screen.queryByText('Reviews')).toBeNull();
    expect(screen.queryByText('Avg Rating')).toBeNull();
  });

  it('navigates to login when Login / Sign Up button is pressed', () => {
    setupGuest();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Login / Sign Up'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('shows app footer for guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('Faniverz v1.0.0')).toBeTruthy();
    expect(screen.getByText('Your Telugu Cinema Companion')).toBeTruthy();
  });

  // ── Logged in ─────────────────────────────────────────────────────────

  it('renders user display name', () => {
    setupLoggedIn({ display_name: 'Telugu Fan' });

    render(<ProfileScreen />);

    expect(screen.getByText('Telugu Fan')).toBeTruthy();
  });

  it('shows menu items when logged in', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Edit Profile')).toBeTruthy();
    expect(screen.getByText('My Reviews')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Favorite Actors')).toBeTruthy();
    expect(screen.getByText('Watched Movies')).toBeTruthy();
    expect(screen.getByText('Account Details')).toBeTruthy();
  });

  it('does not show logout button on profile screen', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.queryByText('Logout')).toBeNull();
    expect(screen.queryByText('Log Out')).toBeNull();
  });

  it('shows member since date for logged in user', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText(/Member since/)).toBeTruthy();
  });

  it('navigates to Edit Profile when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Edit Profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('navigates to Settings when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Settings'));
    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  it('navigates to My Reviews when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('My Reviews'));
    expect(mockPush).toHaveBeenCalledWith('/profile/reviews');
  });

  it('navigates to Notifications when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to Favorite Actors when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Favorite Actors'));
    expect(mockPush).toHaveBeenCalledWith('/profile/favorite-actors');
  });

  it('navigates to Watched Movies when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Watched Movies'));
    expect(mockPush).toHaveBeenCalledWith('/profile/watched');
  });

  it('navigates to Account Details when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Account Details'));
    expect(mockPush).toHaveBeenCalledWith('/profile/account');
  });

  it('shows notification badge when there are unread notifications', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(5);
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does not show notification badge when unread count is 0', () => {
    const { useUnreadCount } = require('@/features/notifications/hooks');
    useUnreadCount.mockReturnValue(0);
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.queryByText('5')).toBeNull();
  });

  it('calculates and displays average rating when user has reviews', () => {
    const { useUserReviews } = require('@/features/reviews/hooks');
    useUserReviews.mockReturnValue({
      data: [
        {
          id: 'r1',
          rating: 4,
          title: '',
          body: '',
          contains_spoiler: false,
          helpful_count: 0,
          movie_id: 'm1',
          user_id: 'user-1',
          created_at: '',
        },
        {
          id: 'r2',
          rating: 5,
          title: '',
          body: '',
          contains_spoiler: false,
          helpful_count: 0,
          movie_id: 'm2',
          user_id: 'user-1',
          created_at: '',
        },
      ],
    });
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows watchlist count from hook data', () => {
    const { useWatchlist } = require('@/features/watchlist/hooks');
    useWatchlist.mockReturnValue({
      data: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
    });
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('falls back to email username when display_name is null', () => {
    setupLoggedIn();
    mockUseProfile.mockReturnValue({ data: null });

    render(<ProfileScreen />);

    expect(screen.getByText('fan')).toBeTruthy();
  });

  it('shows app footer', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Faniverz v1.0.0')).toBeTruthy();
    expect(screen.getByText('Your Telugu Cinema Companion')).toBeTruthy();
  });
});
