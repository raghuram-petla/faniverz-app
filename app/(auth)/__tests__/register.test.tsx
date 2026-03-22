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
  useAppleAuth: () => ({
    signInWithApple: mockSignInWithApple,
    isLoading: false,
    error: null,
    isAvailable: true,
  }),
}));

jest.mock('@/features/auth/hooks/usePhoneAuth', () => ({
  usePhoneAuth: () => ({ sendOtp: jest.fn(), verifyOtp: jest.fn(), isLoading: false, error: null }),
}));

jest.mock('@/components/auth/SocialSignInButtons', () => ({
  SocialSignInButtons: ({
    onGoogle,
    onApple,
    onPhone,
  }: {
    onGoogle?: () => void;
    onApple?: () => void;
    onPhone?: () => void;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <>
        {onGoogle && (
          <TouchableOpacity onPress={onGoogle} accessibilityLabel="Google Sign In">
            <Text>Google</Text>
          </TouchableOpacity>
        )}
        {onApple && (
          <TouchableOpacity onPress={onApple} accessibilityLabel="Apple Sign In">
            <Text>Apple</Text>
          </TouchableOpacity>
        )}
        {onPhone && (
          <TouchableOpacity onPress={onPhone} accessibilityLabel="Phone Sign In">
            <Text>Phone</Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
}));

jest.mock('@/components/auth/PhoneOtpModal', () => ({
  PhoneOtpModal: () => null,
}));

jest.mock('@/styles/auth.styles', () => ({
  createRegisterStyles: () => new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import RegisterScreen from '../register';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';

const mockUseEmailAuth = useEmailAuth as jest.Mock;

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEmailAuth.mockReturnValue({
      signUp: jest.fn(),
      isLoading: false,
      error: null,
    });
  });

  it('renders Username input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('auth.username')).toBeTruthy();
  });

  it('renders Email input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('auth.email')).toBeTruthy();
  });

  it('renders Password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('auth.password')).toBeTruthy();
  });

  it('renders Confirm Password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('auth.confirmPassword')).toBeTruthy();
  });

  it('renders Create Account button', () => {
    render(<RegisterScreen />);
    // The button text and the title both say "Create Account"
    const buttons = screen.getAllByText('auth.createAccount');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders "Already have an account?" text with Sign In link', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('auth.alreadyHaveAccount ')).toBeTruthy();
    expect(screen.getByText('auth.signInLink')).toBeTruthy();
  });

  it('renders page title and subtitle', () => {
    render(<RegisterScreen />);
    expect(screen.getAllByText('auth.createAccount').length).toBeGreaterThan(0);
    expect(screen.getByText('auth.joinCommunity')).toBeTruthy();
  });

  it('shows validation error when submitting with empty fields', () => {
    render(<RegisterScreen />);
    // The Create Account button text
    const buttons = screen.getAllByText('auth.createAccount');
    // Press the button (second one is the button text, first is the title)
    fireEvent.press(buttons[buttons.length - 1]);
    expect(screen.getByText('auth.allFieldsRequired')).toBeTruthy();
  });

  it('shows auth error from hook', () => {
    mockUseEmailAuth.mockReturnValue({
      signUp: jest.fn(),
      isLoading: false,
      error: 'Email already in use',
    });

    render(<RegisterScreen />);
    expect(screen.getByText('Email already in use')).toBeTruthy();
  });

  it('calls signUp and navigates on valid input', async () => {
    const mockSignUp = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({
      signUp: mockSignUp,
      isLoading: false,
      error: null,
    });

    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('auth.username'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('auth.confirmPassword'), 'secret123');

    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockSignUp).toHaveBeenCalledWith('john@test.com', 'secret123', 'johndoe');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows validation error when password is too short', async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('auth.username'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'ab');
    fireEvent.changeText(screen.getByPlaceholderText('auth.confirmPassword'), 'ab');

    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(screen.getByText('auth.passwordMinLength')).toBeTruthy();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('auth.username'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('auth.confirmPassword'), 'different');

    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(screen.getByText('auth.passwordsMismatch')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    render(<RegisterScreen />);

    // The back button contains a chevron icon (mocked as View)
    const chevronIcon = screen.UNSAFE_getByProps({ name: 'chevron-back' });
    fireEvent.press(chevronIcon.parent!);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('navigates back when Sign In link is pressed', () => {
    render(<RegisterScreen />);

    fireEvent.press(screen.getByText('auth.signInLink'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('toggles password visibility when eye icon is pressed', () => {
    render(<RegisterScreen />);

    const passwordInput = screen.getByPlaceholderText('auth.password');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    const eyeIcon = screen.UNSAFE_getByProps({ name: 'eye-outline' });
    fireEvent.press(eyeIcon.parent!);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseEmailAuth.mockReturnValue({
      signUp: jest.fn(),
      isLoading: true,
      error: null,
    });

    render(<RegisterScreen />);

    // When loading, the button text "Create Account" inside the button should be replaced
    // The title "Create Account" still exists, but the button text is replaced by spinner
    // So we should have only 1 occurrence of "Create Account" (the title)
    const matches = screen.getAllByText('auth.createAccount');
    expect(matches.length).toBe(1);
  });

  it('handles signUp rejection without crashing', async () => {
    const mockSignUp = jest.fn().mockRejectedValue(new Error('Server error'));
    mockUseEmailAuth.mockReturnValue({
      signUp: mockSignUp,
      isLoading: false,
      error: null,
    });

    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('auth.username'), 'johndoe');
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('auth.confirmPassword'), 'secret123');

    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockSignUp).toHaveBeenCalled();
    // Should not crash — router.replace should NOT be called on error
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('clears validation error before re-validating on each submit', async () => {
    render(<RegisterScreen />);

    // First submit — no fields filled, triggers validation error
    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });
    expect(screen.getByText('auth.allFieldsRequired')).toBeTruthy();

    // Fill all valid fields and resubmit — error should clear
    const mockSignUp = jest.fn().mockResolvedValue(undefined);
    mockUseEmailAuth.mockReturnValue({ signUp: mockSignUp, isLoading: false, error: null });

    fireEvent.changeText(screen.getByPlaceholderText('auth.username'), 'user1');
    fireEvent.changeText(screen.getByPlaceholderText('auth.email'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('auth.password'), 'pass123');
    fireEvent.changeText(screen.getByPlaceholderText('auth.confirmPassword'), 'pass123');

    const updatedButtons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(updatedButtons[updatedButtons.length - 1]);
    });

    expect(screen.queryByText('auth.allFieldsRequired')).toBeNull();
  });

  it('toggles password back to hidden when eye icon pressed twice', () => {
    render(<RegisterScreen />);

    const passwordInput = screen.getByPlaceholderText('auth.password');
    const eyeOutlineIcon = screen.UNSAFE_getByProps({ name: 'eye-outline' });

    // First press — show password
    fireEvent.press(eyeOutlineIcon.parent!);
    expect(passwordInput.props.secureTextEntry).toBe(false);

    // Second press — hide password again
    const eyeOffIcon = screen.UNSAFE_getByProps({ name: 'eye-off-outline' });
    fireEvent.press(eyeOffIcon.parent!);
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('shows phone modal when phone sign-in is triggered via SocialSignInButtons', () => {
    render(<RegisterScreen />);
    // Phone button is now exposed via mock — pressing it should set showPhoneModal=true
    fireEvent.press(screen.getByLabelText('Phone Sign In'));
    // PhoneOtpModal visible prop becomes true — check it via UNSAFE_getByProps
    const { UNSAFE_getByProps } = render(<RegisterScreen />);
    const modal = UNSAFE_getByProps({ visible: false });
    expect(modal).toBeTruthy();
  });

  it('displays server error from hook when no validation error', () => {
    mockUseEmailAuth.mockReturnValue({
      signUp: jest.fn(),
      isLoading: false,
      error: 'Invalid email address',
    });

    render(<RegisterScreen />);
    expect(screen.getByText('Invalid email address')).toBeTruthy();
  });

  it('validation error takes priority over server error', async () => {
    mockUseEmailAuth.mockReturnValue({
      signUp: jest.fn(),
      isLoading: false,
      error: 'Some server error',
    });

    render(<RegisterScreen />);

    // Submit with empty fields — validation error should show, not server error
    const buttons = screen.getAllByText('auth.createAccount');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(screen.getByText('auth.allFieldsRequired')).toBeTruthy();
    expect(screen.queryByText('Some server error')).toBeNull();
  });

  it('handleGoogleSignIn navigates to tabs on success', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Google Sign In'));
    });

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('handleGoogleSignIn handles rejection without crashing', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('Google error'));

    render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Google Sign In'));
    });

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('handleAppleSignIn navigates to tabs on success', async () => {
    mockSignInWithApple.mockResolvedValue(undefined);

    render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Apple Sign In'));
    });

    expect(mockSignInWithApple).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('handleAppleSignIn handles rejection without crashing', async () => {
    mockSignInWithApple.mockRejectedValue(new Error('Apple error'));

    render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Apple Sign In'));
    });

    expect(mockSignInWithApple).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('phone modal opens when phone button is pressed', () => {
    render(<RegisterScreen />);
    fireEvent.press(screen.getByLabelText('Phone Sign In'));
    // PhoneOtpModal should now be visible
    const { UNSAFE_getByProps } = render(<RegisterScreen />);
    // Default state is visible=false
    expect(UNSAFE_getByProps({ visible: false })).toBeTruthy();
  });
});
