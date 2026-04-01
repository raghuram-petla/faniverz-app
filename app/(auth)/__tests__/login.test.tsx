jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const mockSignInWithGoogle = jest.fn();
jest.mock('@/features/auth/hooks/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(() => ({
    signInWithGoogle: mockSignInWithGoogle,
    isLoading: false,
    error: null,
  })),
}));

const mockSignInWithApple = jest.fn();
jest.mock('@/features/auth/hooks/useAppleAuth', () => ({
  useAppleAuth: jest.fn(() => ({
    signInWithApple: mockSignInWithApple,
    isLoading: false,
    error: null,
    isAvailable: false,
  })),
}));

jest.mock('@/components/auth/SocialSignInButtons', () => ({
  SocialSignInButtons: ({ onGoogle, onApple }: Record<string, unknown>) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <>
        {onGoogle && (
          <TouchableOpacity onPress={onGoogle} accessibilityLabel="Sign in with Google">
            <Text>Google</Text>
          </TouchableOpacity>
        )}
        {onApple && (
          <TouchableOpacity onPress={onApple} accessibilityLabel="Sign in with Apple">
            <Text>Apple</Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
}));

jest.mock('@/styles/auth.styles', () => ({
  createLoginStyles: () => new Proxy({}, { get: () => ({}) }),
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
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGoogleAuth as jest.Mock).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      isLoading: false,
      error: null,
    });
    (useAppleAuth as jest.Mock).mockReturnValue({
      signInWithApple: mockSignInWithApple,
      isLoading: false,
      error: null,
      isAvailable: false,
    });
  });

  it('renders Continue as Guest button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('auth.continueAsGuest')).toBeTruthy();
  });

  it('renders close button and navigates back on press', () => {
    render(<LoginScreen />);
    const closeBtn = screen.getByLabelText('Close');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('renders app branding', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('Faniverz')).toBeTruthy();
    expect(screen.getByText('profile.tagline')).toBeTruthy();
  });

  it('sets guest mode and navigates when Continue as Guest is pressed', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('auth.continueAsGuest'));

    expect(mockSetIsGuest).toHaveBeenCalledWith(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('calls signInWithGoogle and navigates on success', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sign in with Google'));
    });

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('handles Google sign-in error without crashing', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google error'));
    render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sign in with Google'));
    });

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('calls signInWithApple and navigates on success when available', async () => {
    (useAppleAuth as jest.Mock).mockReturnValue({
      signInWithApple: mockSignInWithApple,
      isLoading: false,
      error: null,
      isAvailable: true,
    });
    mockSignInWithApple.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sign in with Apple'));
    });

    expect(mockSignInWithApple).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('handles Apple sign-in error without crashing', async () => {
    (useAppleAuth as jest.Mock).mockReturnValue({
      signInWithApple: mockSignInWithApple,
      isLoading: false,
      error: null,
      isAvailable: true,
    });
    mockSignInWithApple.mockRejectedValueOnce(new Error('Apple error'));
    render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sign in with Apple'));
    });

    expect(mockSignInWithApple).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error when Google auth has an error', () => {
    (useGoogleAuth as jest.Mock).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      isLoading: false,
      error: 'Google config error',
    });
    render(<LoginScreen />);
    expect(screen.getByText('Google config error')).toBeTruthy();
  });

  it('shows error when Apple auth has an error', () => {
    (useAppleAuth as jest.Mock).mockReturnValue({
      signInWithApple: mockSignInWithApple,
      isLoading: false,
      error: 'Apple auth error',
      isAvailable: true,
    });
    render(<LoginScreen />);
    expect(screen.getByText('Apple auth error')).toBeTruthy();
  });

  it('does not show error when no error exists', () => {
    render(<LoginScreen />);
    expect(screen.queryByText('Google config error')).toBeNull();
  });

  it('renders or divider', () => {
    render(<LoginScreen />);
    expect(screen.getByText('auth.or')).toBeTruthy();
  });
});
