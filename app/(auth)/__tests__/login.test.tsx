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

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: jest.fn(),
}));

const mockSignInWithGoogle = jest.fn();
jest.mock('@/features/auth/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({ signInWithGoogle: mockSignInWithGoogle, isLoading: false, error: null }),
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

jest.mock('@/features/auth/hooks/usePhoneAuth', () => ({
  usePhoneAuth: () => ({ sendOtp: jest.fn(), verifyOtp: jest.fn(), isLoading: false, error: null }),
}));

jest.mock('@/components/auth/SocialSignInButtons', () => ({
  SocialSignInButtons: ({ onGoogle, onApple, onPhone }: any) => {
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
        {onPhone && (
          <TouchableOpacity onPress={onPhone} accessibilityLabel="Sign in with Phone">
            <Text>Phone</Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
}));

jest.mock('@/components/auth/PhoneOtpModal', () => ({
  PhoneOtpModal: ({ onSuccess, onClose, visible }: any) => {
    if (!visible) return null;
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <>
        <TouchableOpacity onPress={onSuccess} accessibilityLabel="Phone OTP success">
          <Text>OTP Success</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Phone OTP close">
          <Text>Close OTP</Text>
        </TouchableOpacity>
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
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { useAppleAuth } from '@/features/auth/hooks/useAppleAuth';

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
    expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
  });

  it('renders password input', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('auth.password')).toBeTruthy();
  });

  it('renders Sign In / Sign Up button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('auth.signIn')).toBeTruthy();
  });

  it('renders Forgot password link', () => {
    render(<LoginScreen />);
    expect(screen.getByText('auth.forgotPassword')).toBeTruthy();
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

    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'password123');

    await act(async () => {
      fireEvent.press(screen.getByText('auth.signIn'));
    });

    expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'password123');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
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
      fireEvent.press(screen.getByText('auth.signIn'));
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('sets guest mode and navigates when Continue as Guest is pressed', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('auth.continueAsGuest'));

    expect(mockSetIsGuest).toHaveBeenCalledWith(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('toggles password visibility when eye icon is pressed', () => {
    render(<LoginScreen />);

    const passwordInput = screen.getByPlaceholderText('auth.password');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    // The Ionicons mock renders as a View with all props; find the eye icon and press its parent
    const eyeIcon = screen.UNSAFE_getByProps({ name: 'eye-outline' });
    fireEvent.press(eyeIcon.parent!);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('navigates to forgot password screen', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('auth.forgotPassword'));

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseEmailAuth.mockReturnValue({
      signIn: jest.fn(),
      isLoading: true,
      error: null,
    });

    render(<LoginScreen />);

    // Sign In / Sign Up text should not be visible during loading
    expect(screen.queryByText('auth.signIn')).toBeNull();
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

  it('opens phone OTP modal when phone button is pressed', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByLabelText('Sign in with Phone'));
    // PhoneOtpModal becomes visible — OTP success button should appear
    expect(screen.getByLabelText('Phone OTP success')).toBeTruthy();
  });

  it('navigates to tabs when OTP modal success is triggered', () => {
    render(<LoginScreen />);
    // Open phone modal first
    fireEvent.press(screen.getByLabelText('Sign in with Phone'));
    // Trigger OTP success
    fireEvent.press(screen.getByLabelText('Phone OTP success'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('closes phone OTP modal when onClose is called', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByLabelText('Sign in with Phone'));
    expect(screen.getByLabelText('Phone OTP success')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Phone OTP close'));
    // Modal should be closed — OTP success button should not be visible
    expect(screen.queryByLabelText('Phone OTP success')).toBeNull();
  });

  it('handles signIn rejection without crashing', async () => {
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'));
    mockUseEmailAuth.mockReturnValue({
      signIn: mockSignIn,
      isLoading: false,
      error: null,
    });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'password123');

    await act(async () => {
      fireEvent.press(screen.getByText('auth.signIn'));
    });

    expect(mockSignIn).toHaveBeenCalled();
    // Should not crash — router.replace should NOT be called on error
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/(tabs)');
  });
});
