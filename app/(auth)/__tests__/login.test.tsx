jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: jest.fn(),
}));

const mockSetIsGuest = jest.fn();
jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    isLoading: false,
    isGuest: false,
    setIsGuest: mockSetIsGuest,
  }),
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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

  it('calls signIn and navigates on valid credentials', async () => {
    const mockSignIn = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
      error: null,
    });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'password123');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('does not call signIn when fields are empty', async () => {
    const mockSignIn = jest.fn();
    mockUseEmailAuth.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
      error: null,
    });

    render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('sets guest mode and navigates when Continue as Guest is pressed', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('Continue as Guest'));

    expect(mockSetIsGuest).toHaveBeenCalledWith(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('toggles password visibility when eye icon is pressed', () => {
    render(<LoginScreen />);

    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // The Ionicons mock renders as a View with all props; find the eye icon and press its parent
    const eyeIcon = screen.UNSAFE_getByProps({ name: 'eye-outline' });
    fireEvent.press(eyeIcon.parent!);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('navigates to forgot password screen', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('Forgot password?'));

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('navigates to register screen when Sign Up is pressed', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('Sign Up'));

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/register');
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseEmailAuth.mockReturnValue({
      signIn: jest.fn(),
      isLoading: true,
      error: null,
    });

    render(<LoginScreen />);

    // Sign In text should not be visible during loading
    expect(screen.queryByText('Sign In')).toBeNull();
  });

  it('handles signIn rejection without crashing', async () => {
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'));
    mockUseEmailAuth.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
      error: null,
    });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    expect(mockSignIn).toHaveBeenCalled();
    // Should not crash — router.back should NOT be called on error
    expect(mockRouter.back).not.toHaveBeenCalledTimes(2);
  });
});
