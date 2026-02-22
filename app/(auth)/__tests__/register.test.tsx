import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { replace: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const mockSignUpWithEmail = jest.fn();
const mockSetError = jest.fn();

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: () => ({
    signUpWithEmail: mockSignUpWithEmail,
    signInWithEmail: jest.fn(),
    isLoading: false,
    error: null,
    setError: mockSetError,
  }),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import RegisterScreen from '../register';

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input fields', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('name-input')).toBeTruthy();
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
  });

  it('renders sign up button', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('sign-up-button')).toBeTruthy();
  });

  it('calls signUp on submit', async () => {
    mockSignUpWithEmail.mockResolvedValue(true);
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByTestId('name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('email-input'), 'john@test.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(screen.getByTestId('sign-up-button'));

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith('john@test.com', 'password123', 'John');
    });
  });

  it('validates password match', async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByTestId('name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('email-input'), 'john@test.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'different');
    fireEvent.press(screen.getByTestId('sign-up-button'));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Passwords do not match');
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it('has login link', () => {
    render(<RegisterScreen />);
    expect(screen.getByTestId('login-link')).toBeTruthy();
  });
});
