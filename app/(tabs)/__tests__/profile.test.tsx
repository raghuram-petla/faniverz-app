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

jest.mock('@/features/feed', () => ({
  useEnrichedFollows: jest.fn(() => ({ data: [] })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.3.1' } },
}));

jest.mock('@/components/profile/FollowingSection', () => ({
  FollowingSection: () => null,
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
      display_name: 'Movie Fan',
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

    expect(screen.getByText('profile.signInTitle')).toBeTruthy();
    expect(screen.getByText('profile.signInSubtitle')).toBeTruthy();
    expect(screen.getByText('auth.signIn')).toBeTruthy();
  });

  it('does not show menu items when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.queryByText('profile.editProfile')).toBeNull();
    expect(screen.queryByText('profile.myReviews')).toBeNull();
    expect(screen.queryByText('profile.notifications')).toBeNull();
    expect(screen.queryByText('profile.favoriteActors')).toBeNull();
    expect(screen.queryByText('profile.watchedMovies')).toBeNull();
    expect(screen.queryByText('profile.accountDetails')).toBeNull();
  });

  it('shows Settings navigation row in guest view', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('profile.settings')).toBeTruthy();
    fireEvent.press(screen.getByText('profile.settings'));
    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  it('does not show profile card stats when guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.queryByText('profile.watchlistStat')).toBeNull();
    expect(screen.queryByText('profile.reviewsStat')).toBeNull();
    expect(screen.queryByText('profile.avgRating')).toBeNull();
  });

  it('navigates to login when Sign In / Sign Up button is pressed', () => {
    setupGuest();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('auth.signIn'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('shows app footer for guest', () => {
    setupGuest();

    render(<ProfileScreen />);

    expect(screen.getByText('profile.version')).toBeTruthy();
    expect(screen.getByText('profile.tagline')).toBeTruthy();
  });

  // ── Logged in ─────────────────────────────────────────────────────────

  it('renders user display name', () => {
    setupLoggedIn({ display_name: 'Movie Fan' });

    render(<ProfileScreen />);

    expect(screen.getByText('Movie Fan')).toBeTruthy();
  });

  it('shows menu items when logged in', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    expect(screen.getByText('profile.editProfile')).toBeTruthy();
    expect(screen.getByText('profile.username')).toBeTruthy();
    expect(screen.getByText('profile.myReviews')).toBeTruthy();
    expect(screen.getByText('profile.settings')).toBeTruthy();
    expect(screen.getByText('profile.notifications')).toBeTruthy();
    expect(screen.getByText('profile.following')).toBeTruthy();
    expect(screen.getByText('profile.activity')).toBeTruthy();
    expect(screen.getByText('profile.favoriteActors')).toBeTruthy();
    expect(screen.getByText('profile.watchedMovies')).toBeTruthy();
    expect(screen.getByText('profile.accountDetails')).toBeTruthy();
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

    expect(screen.getByText('profile.memberSince')).toBeTruthy();
  });

  it('navigates to Edit Profile when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.editProfile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('navigates to Settings when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.settings'));
    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  it('navigates to My Reviews when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.myReviews'));
    expect(mockPush).toHaveBeenCalledWith('/profile/reviews');
  });

  it('navigates to Notifications when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('navigates to Following when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.following'));
    expect(mockPush).toHaveBeenCalledWith('/profile/following');
  });

  it('navigates to Activity when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.activity'));
    expect(mockPush).toHaveBeenCalledWith('/profile/activity');
  });

  it('navigates to Favorite Actors when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.favoriteActors'));
    expect(mockPush).toHaveBeenCalledWith('/profile/favorite-actors');
  });

  it('navigates to Watched Movies when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.watchedMovies'));
    expect(mockPush).toHaveBeenCalledWith('/profile/watched');
  });

  it('navigates to Account Details when menu item is pressed', () => {
    setupLoggedIn();

    render(<ProfileScreen />);

    fireEvent.press(screen.getByText('profile.accountDetails'));
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

    expect(screen.getByText('profile.notifications')).toBeTruthy();
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

    expect(screen.getByText('profile.version')).toBeTruthy();
    expect(screen.getByText('profile.tagline')).toBeTruthy();
  });
});
