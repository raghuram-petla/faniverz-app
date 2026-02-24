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
});
