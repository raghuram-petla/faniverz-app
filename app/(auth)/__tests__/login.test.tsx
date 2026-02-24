jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: jest.fn(),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from '../login';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';

const mockUseEmailAuth = useEmailAuth as jest.Mock;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEmailAuth.mockReturnValue({
      signIn: jest.fn(),
      isLoading: false,
      error: null,
    });
  });

  it('renders email input', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  });

  it('renders password input', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('renders Sign In button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders Sign Up link', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('renders Forgot password link', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Forgot password?')).toBeTruthy();
  });

  it('renders Continue as Guest button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Continue as Guest')).toBeTruthy();
  });

  it('renders app branding', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Faniverz')).toBeTruthy();
    expect(screen.getByText('Your Telugu Cinema Companion')).toBeTruthy();
  });

  it('shows error message when auth error exists', () => {
    mockUseEmailAuth.mockReturnValue({
      signIn: jest.fn(),
      isLoading: false,
      error: 'Invalid credentials',
    });

    render(<LoginScreen />);
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('does not show error when no error exists', () => {
    render(<LoginScreen />);
    expect(screen.queryByText('Invalid credentials')).toBeNull();
  });
});
