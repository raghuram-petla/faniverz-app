import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockResetPasswordForEmail = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import ForgotPasswordScreen from '../forgot-password';

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email input and reset button', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('reset-button')).toBeTruthy();
  });

  it('calls resetPasswordForEmail on submit', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@test.com');
    fireEvent.press(screen.getByTestId('reset-button'));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
    });
  });

  it('shows success message after sending reset link', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@test.com');
    fireEvent.press(screen.getByTestId('reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeTruthy();
    });
  });

  it('has back to login link', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('back-link')).toBeTruthy();
  });
});
