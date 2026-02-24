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

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ForgotPasswordScreen from '../forgot-password';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';

const mockUseEmailAuth = useEmailAuth as jest.Mock;

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEmailAuth.mockReturnValue({
      resetPassword: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
      error: null,
    });
  });

  it('renders Reset Password header', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByText('Reset Password')).toBeTruthy();
  });

  it('renders email input', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy();
  });

  it('renders Send Reset Link button', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByText('Send Reset Link')).toBeTruthy();
  });

  it('renders Back to Sign In link', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByText('Back to Sign In')).toBeTruthy();
  });

  it('renders instruction text', () => {
    render(<ForgotPasswordScreen />);
    expect(
      screen.getByText("Enter your email and we'll send you a link to reset your password."),
    ).toBeTruthy();
  });

  it('shows success state after successful submit', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    // Type email
    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'test@test.com');

    // Press send
    await act(async () => {
      fireEvent.press(screen.getByText('Send Reset Link'));
    });

    expect(mockResetPassword).toHaveBeenCalledWith('test@test.com');
    expect(screen.getByText('Check your inbox')).toBeTruthy();
  });

  it('shows error message when auth error exists', () => {
    mockUseEmailAuth.mockReturnValue({
      resetPassword: jest.fn(),
      isLoading: false,
      error: 'User not found',
    });

    render(<ForgotPasswordScreen />);
    expect(screen.getByText('User not found')).toBeTruthy();
  });

  it('does not call resetPassword when email is empty', async () => {
    const mockResetPassword = jest.fn();
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Send Reset Link'));
    });

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('navigates back when Back to Sign In is pressed in success state', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'test@test.com');

    await act(async () => {
      fireEvent.press(screen.getByText('Send Reset Link'));
    });

    // Now in success state, press "Back to Sign In"
    fireEvent.press(screen.getByText('Back to Sign In'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseEmailAuth.mockReturnValue({
      resetPassword: jest.fn(),
      isLoading: true,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    // "Send Reset Link" text should not be visible when loading
    expect(screen.queryByText('Send Reset Link')).toBeNull();
  });

  it('handles resetPassword rejection without crashing and keeps form state', async () => {
    const mockResetPassword = jest.fn().mockRejectedValue(new Error('Network error'));
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'test@test.com');

    await act(async () => {
      fireEvent.press(screen.getByText('Send Reset Link'));
    });

    expect(mockResetPassword).toHaveBeenCalled();
    // Should not crash and should remain in form state (not success state)
    expect(screen.queryByText('Check your inbox')).toBeNull();
    expect(screen.getByText('Send Reset Link')).toBeTruthy();
  });

  it('navigates back when Back to Sign In is pressed in form state', () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByText('Back to Sign In'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('displays the submitted email in success view', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Email address'), 'hello@example.com');

    await act(async () => {
      fireEvent.press(screen.getByText('Send Reset Link'));
    });

    expect(screen.getByText('hello@example.com')).toBeTruthy();
  });
});
