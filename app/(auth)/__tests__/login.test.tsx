import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const mockSignInWithEmail = jest.fn();

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    isLoading: false,
    error: null,
    setError: jest.fn(),
  }),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import LoginScreen from '../login';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
  });

  it('renders sign in button', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('sign-in-button')).toBeTruthy();
  });

  it('renders create account link', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('register-link')).toBeTruthy();
  });

  it('renders forgot password link', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('forgot-password-link')).toBeTruthy();
  });

  it('calls signInWithEmail on submit', async () => {
    mockSignInWithEmail.mockResolvedValue(true);
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@test.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('does not call signIn with empty fields', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignInWithEmail).not.toHaveBeenCalled();
    });
  });
});
