jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
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
import ChangePasswordScreen from '../change-password';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';

const mockUseAuth = useAuth as jest.Mock;
const mockUseEmailAuth = useEmailAuth as jest.Mock;

describe('ChangePasswordScreen', () => {
  const mockResetPassword = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'fan@example.com' } });
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
    });
  });

  it('renders "Change Password" header', () => {
    render(<ChangePasswordScreen />);
    expect(screen.getByText('settings.changePassword')).toBeTruthy();
  });

  it('shows user email in the email card', () => {
    render(<ChangePasswordScreen />);
    expect(screen.getByText('fan@example.com')).toBeTruthy();
  });

  it('shows "Send Reset Email" button', () => {
    render(<ChangePasswordScreen />);
    expect(screen.getByText('profile.sendResetEmail')).toBeTruthy();
  });

  it('calls resetPassword with user email on button press', async () => {
    render(<ChangePasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('profile.sendResetEmail'));
    });

    expect(mockResetPassword).toHaveBeenCalledWith('fan@example.com');
  });

  it('shows success state after successful send', async () => {
    render(<ChangePasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('profile.sendResetEmail'));
    });

    expect(screen.getByText('auth.checkInbox')).toBeTruthy();
    expect(screen.getByText('fan@example.com')).toBeTruthy();
  });

  it('shows error message when error exists', () => {
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: 'Something went wrong',
    });

    render(<ChangePasswordScreen />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseEmailAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: true,
      error: null,
    });

    render(<ChangePasswordScreen />);

    // "Send Reset Email" text should not be visible when loading
    expect(screen.queryByText('profile.sendResetEmail')).toBeNull();
  });

  it('does not call resetPassword when email is empty (user is null)', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<ChangePasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('profile.sendResetEmail'));
    });

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows instruction text before sending', () => {
    render(<ChangePasswordScreen />);
    expect(screen.getByText('profile.resetLinkDescription')).toBeTruthy();
  });

  it('shows follow-up hint in success state', async () => {
    render(<ChangePasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('profile.sendResetEmail'));
    });

    expect(screen.getByText('profile.followResetLink')).toBeTruthy();
  });

  it('handles resetPassword rejection without crashing', async () => {
    const rejectingReset = jest.fn().mockRejectedValue(new Error('Network error'));
    mockUseEmailAuth.mockReturnValue({
      resetPassword: rejectingReset,
      isLoading: false,
      error: null,
    });

    render(<ChangePasswordScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('profile.sendResetEmail'));
    });

    expect(rejectingReset).toHaveBeenCalled();
    // Should not crash and should remain in form state (not success state)
    expect(screen.queryByText('auth.checkInbox')).toBeNull();
    expect(screen.getByText('profile.sendResetEmail')).toBeTruthy();
  });
});
