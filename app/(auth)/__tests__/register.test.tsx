jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/hooks/useEmailAuth', () => ({
  useEmailAuth: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
});
