jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: jest.fn(),
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
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';

const mockUseAuth = useAuth as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseEmailAuth = useEmailAuth as jest.Mock;

const mockSignOut = jest.fn();

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
  mockUseEmailAuth.mockReturnValue({
    signOut: mockSignOut,
    isLoading: false,
    error: null,
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
  mockUseEmailAuth.mockReturnValue({
    signOut: mockSignOut,
    isLoading: false,
    error: null,
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user display name', () => {
    setupLoggedIn({ display_name: 'Telugu Fan' });

    render(<ProfileScreen />);

    expect(screen.getByText('Telugu Fan')).toBeTruthy();
  });

  it('shows menu items', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Edit Profile')).toBeTruthy();
    expect(screen.getByText('My Reviews')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Favorite Actors')).toBeTruthy();
    expect(screen.getByText('Watched Movies')).toBeTruthy();
  });

  it('shows logout button when logged in', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Logout')).toBeTruthy();
  });

  it('shows login button when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('Login / Sign Up')).toBeTruthy();
  });

  it('shows guest user info when not logged in', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('Guest User')).toBeTruthy();
    expect(screen.getByText('guest@example.com')).toBeTruthy();
  });

  it('navigates to Edit Profile when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Edit Profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('calls signOut when Logout button is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Logout'));
    expect(mockSignOut).toHaveBeenCalled();
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

    // Notifications label exists but no badge should appear
    expect(screen.getByText('Notifications')).toBeTruthy();
    // The badge would show a number like "5"; with 0 unread there should be no badge
    expect(screen.queryByText('5')).toBeNull();
  });

  it('shows "Logging out..." text when signing out is in progress', () => {
    setupLoggedIn();
    mockUseEmailAuth.mockReturnValue({
      signOut: mockSignOut,
      isLoading: true,
      error: null,
    });

    render(<ProfileScreen />);

    expect(screen.getByText('Logging out\u2026')).toBeTruthy();
  });

  it('shows member since date for logged in user', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    // The formatMemberSince util produces text from the user's created_at
    expect(screen.getByText(/Member since/)).toBeTruthy();
  });

  it('does not show member since for guest user', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.queryByText(/Member since/)).toBeNull();
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

    // Average of 4 and 5 is 4.5
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // reviews count
  });

  it('shows watchlist count from hook data', () => {
    const { useWatchlist } = require('@/features/watchlist/hooks');
    useWatchlist.mockReturnValue({
      data: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
    });
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('3')).toBeTruthy(); // watchlist count
  });

  it('falls back to email username when display_name is null', () => {
    setupLoggedIn();
    mockUseProfile.mockReturnValue({ data: null });

    render(<ProfileScreen />);

    // user email is fan@example.com, so display name should be "fan"
    expect(screen.getByText('fan')).toBeTruthy();
  });

  it('navigates to login when Login / Sign Up button is pressed', () => {
    setupGuest();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('Login / Sign Up'));
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('shows the create account hint for guest users', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(
      screen.getByText('Create an account to sync your data and unlock more features'),
    ).toBeTruthy();
  });

  it('shows app footer', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('Faniverz v1.0.0')).toBeTruthy();
    expect(screen.getByText('Your Telugu Cinema Companion')).toBeTruthy();
  });

  it('handles signOut error gracefully', async () => {
    setupLoggedIn();
    mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

    render(<ProfileScreen />);

    // Should not throw when pressing Logout even though signOut rejects
    fireEvent.press(screen.getByText('Logout'));
    // Wait for the async handler to complete
    await screen.findByText('Logout');
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
});
