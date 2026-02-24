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

  it('renders Full Name input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Full Name')).toBeTruthy();
  });

  it('renders Email input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  });

  it('renders Password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('renders Confirm Password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Confirm Password')).toBeTruthy();
  });

  it('renders Create Account button', () => {
    render(<RegisterScreen />);
    // The button text and the title both say "Create Account"
    const buttons = screen.getAllByText('Create Account');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders "Already have an account?" text with Sign In link', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Already have an account? ')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders page title and subtitle', () => {
    render(<RegisterScreen />);
    expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
    expect(screen.getByText('Join the Telugu cinema community')).toBeTruthy();
  });

  it('shows validation error when submitting with empty fields', () => {
    render(<RegisterScreen />);
    // The Create Account button text
    const buttons = screen.getAllByText('Create Account');
    // Press the button (second one is the button text, first is the title)
    fireEvent.press(buttons[buttons.length - 1]);
    expect(screen.getByText('All fields are required')).toBeTruthy();
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

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'secret123');

    const buttons = screen.getAllByText('Create Account');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockSignUp).toHaveBeenCalledWith('john@test.com', 'secret123', 'John Doe');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows validation error when password is too short', async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'ab');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'ab');

    const buttons = screen.getAllByText('Create Account');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(screen.getByText('Password must be at least 6 characters')).toBeTruthy();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'different');

    const buttons = screen.getAllByText('Create Account');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
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

    fireEvent.press(screen.getByText('Sign In'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('toggles password visibility when eye icon is pressed', () => {
    render(<RegisterScreen />);

    const passwordInput = screen.getByPlaceholderText('Password');
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
    const matches = screen.getAllByText('Create Account');
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

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'john@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'secret123');

    const buttons = screen.getAllByText('Create Account');
    await act(async () => {
      fireEvent.press(buttons[buttons.length - 1]);
    });

    expect(mockSignUp).toHaveBeenCalled();
    // Should not crash — router.replace should NOT be called on error
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
